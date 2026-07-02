/**
 * app.js — Orquestador de la UI de OpoTest.
 * Único fichero con acceso al DOM: todo el dominio vive en js/core/.
 */
(function () {
  'use strict';

  const C = window.OpoCore;
  const USER_ID = 'yo';

  // ---------- Persistencia (localStorage con fallback a memoria) ----------

  function storageAvailable() {
    try {
      localStorage.setItem('opotest.ping', '1');
      localStorage.removeItem('opotest.ping');
      return true;
    } catch (e) {
      return false;
    }
  }
  const hasLS = storageAvailable();
  const memoryFallback = {};

  function storageAdapter(key) {
    return {
      get() {
        try {
          if (hasLS) {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
          }
        } catch (e) { /* datos corruptos → empezar de cero */ }
        return memoryFallback[key] || null;
      },
      set(value) {
        if (hasLS) {
          try { localStorage.setItem(key, JSON.stringify(value)); return; } catch (e) { /* cuota llena */ }
        }
        memoryFallback[key] = value;
      },
    };
  }

  const bank = new C.QuestionBank(storageAdapter('opotest.bank'));
  const userStore = storageAdapter('opotest.user');
  const user = Object.assign(
    { seenIds: [], failedIds: [], stats: { tests: 0, correct: 0, wrong: 0, blank: 0 }, credits: null, evalDay: null, contributed: 0 },
    userStore.get() || {}
  );
  const credits = new C.CreditManager(user.credits || undefined);

  function saveUser() {
    user.credits = credits.serialize();
    userStore.set(user);
    renderCredits();
  }

  // ---------- Utilidades DOM ----------

  const $ = (id) => document.getElementById(id);

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const child of [].concat(children || [])) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  // ---------- Pestañas ----------

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      $('panel-' + tab.dataset.tab).classList.add('active');
      if (tab.dataset.tab === 'bank') renderBank();
      if (tab.dataset.tab === 'quiz') renderQuizSetup();
      if (tab.dataset.tab === 'account') renderAccount();
    });
  });

  function renderCredits() {
    $('creditBalance').textContent = credits.credits;
  }

  // ---------- Generar ----------

  $('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $('sourceText').value = reader.result; };
    reader.readAsText(file);
  });

  $('genProvider').addEventListener('change', () => {
    $('apiKeyLabel').classList.toggle('hidden', $('genProvider').value !== 'claude');
  });

  $('metaLey').addEventListener('input', updateRecycleHint);
  function updateRecycleHint() {
    const ley = $('metaLey').value.trim();
    const hint = $('recycleHint');
    if (!ley) { hint.textContent = ''; return; }
    const existing = bank.byTopic({ ley }).filter((q) => q.quality.status === 'active').length;
    hint.textContent = existing > 0
      ? '♻️ Ya hay ' + existing + ' preguntas de «' + ley + '» en el banco: puedes hacer test gratis sin generar.'
      : '';
  }

  function currentTopic() {
    return {
      oposicion: $('metaOposicion').value.trim(),
      tipo: 'ley',
      ley: $('metaLey').value.trim(),
      tituloCapitulo: $('metaTitulo').value.trim(),
      articulos: $('metaArticulos').value.trim(),
    };
  }

  $('generateBtn').addEventListener('click', async () => {
    const resultBox = $('generateResult');
    const show = (cls, content) => {
      resultBox.className = 'result ' + cls;
      resultBox.innerHTML = '';
      [].concat(content).forEach((c) => resultBox.appendChild(typeof c === 'string' ? el('p', {}, c) : c));
      resultBox.classList.remove('hidden');
    };

    const text = $('sourceText').value.trim();
    const count = parseInt($('genCount').value, 10);
    if (text.length < 200) {
      return show('error', 'El texto es demasiado corto (mínimo ~200 caracteres) para generar preguntas de calidad.');
    }
    if (!credits.canSpend(1)) {
      return show('error', 'No te quedan créditos este mes. Puedes seguir haciendo tests del banco gratis, o subir de plan en «Mi cuenta».');
    }
    const affordable = Math.min(count, credits.questionsAvailable());

    let provider;
    try {
      provider = $('genProvider').value === 'claude'
        ? new C.ClaudeProvider($('apiKey').value.trim())
        : new C.DemoProvider({ seed: Math.floor(Math.random() * 1e9) });
    } catch (e) {
      return show('error', e.message);
    }

    $('generateBtn').disabled = true;
    show('', 'Generando… (motor: ' + provider.name + ')');
    try {
      const topic = currentTopic();
      const { questions, discarded } = await provider.generate(text, topic, affordable, bank.dedupTexts());
      if (!questions.length) {
        return show('error', [
          'No se pudo generar ninguna pregunta nueva de este texto.',
          el('ul', {}, discarded.slice(0, 5).map((d) => el('li', {}, d.reason))),
        ]);
      }
      credits.spend(questions.length, 'Generar ' + questions.length + ' preguntas (' + (topic.ley || 'sin ley') + ')');
      bank.addMany(questions, USER_ID, provider.name);
      user.contributed += questions.length;
      saveUser();
      updateRecycleHint();

      const parts = [
        el('p', {}, '✅ ' + questions.length + ' preguntas añadidas al banco (coste: ' + questions.length + ' créditos).'),
      ];
      if (affordable < count) parts.push(el('p', {}, '⚠️ Pediste ' + count + ' pero tus créditos solo permitían ' + affordable + '.'));
      if (discarded.length) {
        parts.push(el('p', {}, '🔍 ' + discarded.length + ' candidatas descartadas por el control de calidad:'));
        parts.push(el('ul', {}, discarded.slice(0, 5).map((d) => el('li', {}, d.reason))));
      }
      parts.push(el('button', { class: 'btn primary', onclick: () => document.querySelector('[data-tab="quiz"]').click() }, '📝 Hacer test ahora'));
      show('ok', parts);
    } catch (e) {
      show('error', 'Error al generar: ' + e.message);
    } finally {
      $('generateBtn').disabled = false;
    }
  });

  // ---------- Hacer test ----------

  let currentQuiz = null;

  function renderQuizSetup() {
    const select = $('quizLey');
    const previous = select.value;
    select.innerHTML = '<option value="">Todas</option>';
    for (const [ley, n] of Object.entries(bank.countByLey())) {
      select.appendChild(el('option', { value: ley }, ley + ' (' + n + ')'));
    }
    select.value = previous;
    $('failedCount').textContent = user.failedIds.length;
    updateQuizPoolInfo();
  }
  $('quizLey').addEventListener('change', updateQuizPoolInfo);

  function quizPool() {
    const ley = $('quizLey').value;
    let pool = bank.active();
    if (ley) pool = pool.filter((q) => q.topic && q.topic.ley === ley);
    return pool;
  }

  function updateQuizPoolInfo() {
    const pool = quizPool();
    const fresh = pool.filter((q) => !user.seenIds.includes(q.id)).length;
    $('quizPoolInfo').textContent = pool.length
      ? pool.length + ' preguntas disponibles (' + fresh + ' que aún no has visto).'
      : 'El banco está vacío para ese filtro: genera preguntas en la pestaña «Generar».';
  }

  $('startQuizBtn').addEventListener('click', () => {
    const count = parseInt($('quizCount').value, 10);
    const pool = quizPool();
    let questions;
    if ($('quizOnlyFailed').checked) {
      questions = C.buildReviewQuiz(pool, user.failedIds, count);
      if (!questions.length) return alert('No tienes preguntas falladas pendientes de repaso. ¡Bien!');
    } else {
      questions = C.buildQuiz(pool, { count, seenIds: user.seenIds, rng: C.createRng(Math.floor(Math.random() * 1e9)) }).questions;
      if (!questions.length) return alert('No hay preguntas en el banco para ese filtro. Genera algunas primero.');
    }
    currentQuiz = { questions, submitted: false };
    renderQuizArea();
  });

  function renderQuizArea() {
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    $('quizResult').classList.add('hidden');
    $('quizSetup').classList.add('hidden');

    currentQuiz.questions.forEach((q, i) => {
      const qBox = el('div', { class: 'quiz-question', id: 'qq' + i }, [
        el('h3', {}, [el('span', { class: 'qnum' }, (i + 1) + '.'), q.text]),
      ]);
      q.options.forEach((opt, j) => {
        qBox.appendChild(el('label', { class: 'option', 'data-q': i, 'data-opt': j }, [
          el('input', { type: 'radio', name: 'q' + i, value: j }),
          String.fromCharCode(65 + j) + ') ' + opt,
        ]));
      });
      area.appendChild(qBox);
    });
    area.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', onclick: submitQuiz }, '✔ Corregir test'),
      el('button', { class: 'btn', onclick: exitQuiz }, '✖ Cancelar'),
    ]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exitQuiz() {
    currentQuiz = null;
    $('quizArea').classList.add('hidden');
    $('quizResult').classList.add('hidden');
    $('quizSetup').classList.remove('hidden');
    renderQuizSetup();
  }

  function submitQuiz() {
    if (!currentQuiz || currentQuiz.submitted) return;
    const answers = currentQuiz.questions.map((q, i) => {
      const checked = document.querySelector('input[name="q' + i + '"]:checked');
      return checked ? parseInt(checked.value, 10) : null;
    });
    const scored = C.scoreQuiz(currentQuiz.questions, answers);
    currentQuiz.submitted = true;
    C.updateHistory(user, scored);
    saveUser();

    // Marcar visualmente cada pregunta
    currentQuiz.questions.forEach((q, i) => {
      const qBox = $('qq' + i);
      qBox.querySelectorAll('.option').forEach((optEl, j) => {
        if (j === q.correctIndex) optEl.classList.add('correct');
        else if (answers[i] === j) optEl.classList.add('wrong');
        optEl.querySelector('input').disabled = true;
      });
      qBox.appendChild(el('div', { class: 'explanation' }, '💡 ' + q.explanation));
      qBox.appendChild(qualityActions(q));
    });

    const banner = $('quizResult');
    banner.innerHTML = '';
    banner.classList.remove('hidden');
    banner.appendChild(el('div', { class: 'score-banner' }, [
      el('div', { class: 'big' }, scored.score10.toFixed(2) + ' / 10'),
      el('div', { class: 'detail' },
        '✅ ' + scored.correct + ' aciertos · ❌ ' + scored.wrong + ' fallos · ⚪ ' + scored.blank +
        ' en blanco · (cada fallo resta 1/3, baremo de oposición)'),
      el('div', { class: 'row', style: 'justify-content: center; margin-top: 10px;' }, [
        el('button', { class: 'btn primary', onclick: exitQuiz }, '↩ Nuevo test'),
      ]),
    ]));
    banner.scrollIntoView({ behavior: 'smooth' });
  }

  /** Botones 👍/👎/errata bajo cada pregunta corregida (evaluación comunitaria). */
  function qualityActions(q) {
    const box = el('div', { class: 'q-actions' });
    const feedback = el('span', { class: 'voted' }, '');
    const doVote = (value) => {
      const { changed } = C.vote(q, USER_ID, value);
      if (!changed) { feedback.textContent = 'Ya habías votado eso.'; return; }
      bank.update(q.id, { quality: q.quality });
      rewardEvaluation();
      C.applyAuthorReward(q, credits) && bank.update(q.id, { quality: q.quality });
      saveUser();
      feedback.textContent = value === 1 ? '¡Gracias! Voto positivo registrado.' : 'Voto negativo registrado.';
    };
    box.appendChild(el('button', { class: 'btn small', onclick: () => doVote(1) }, '👍 Buena pregunta'));
    box.appendChild(el('button', { class: 'btn small', onclick: () => doVote(-1) }, '👎 Mala'));
    box.appendChild(el('button', {
      class: 'btn small',
      onclick: () => {
        const msg = prompt('Describe la errata (ej.: «la opción B también es correcta»):');
        if (!msg || !msg.trim()) return;
        C.reportErrata(q, USER_ID, msg);
        bank.update(q.id, { quality: q.quality });
        rewardEvaluation();
        saveUser();
        feedback.textContent = 'Errata enviada: la pregunta pasa a revisión.';
      },
    }, '🚩 Errata'));
    box.appendChild(feedback);
    return box;
  }

  /** Recompensa por evaluar, con tope diario (quality.REWARDS). */
  function rewardEvaluation() {
    const today = new Date().toISOString().slice(0, 10);
    if (!user.evalDay || user.evalDay.date !== today) user.evalDay = { date: today, count: 0 };
    C.rewardEvaluator(credits, user.evalDay);
  }

  // ---------- Banco ----------

  function renderBank() {
    const counts = bank.countByLey();
    const total = bank.all().length;
    const active = bank.active().length;
    $('bankSummary').textContent = total + ' preguntas (' + active + ' activas) · ' +
      Object.entries(counts).map(([l, n]) => l + ': ' + n).join(' · ');

    const list = $('bankList');
    list.innerHTML = '';
    const items = bank.all().slice().reverse().slice(0, 100);
    if (!items.length) {
      list.appendChild(el('p', { class: 'hint' }, 'Aún no hay preguntas. Genera las primeras en la pestaña «Generar».'));
      return;
    }
    for (const q of items) {
      const score = C.score(q.quality);
      list.appendChild(el('div', { class: 'bank-item' }, [
        el('div', {}, q.text),
        el('div', { class: 'meta' }, [
          el('span', { class: 'badge ' + q.quality.status }, q.quality.status),
          el('span', {}, (q.topic && q.topic.ley) || 'sin ley'),
          el('span', {}, 'score ' + (score > 0 ? '+' : '') + score),
          el('span', {}, 'motor: ' + q.origin),
          el('span', {}, (q.quality.erratas || []).filter((e) => !e.resolved).length + ' erratas abiertas'),
        ]),
      ]));
    }
  }

  $('exportBtn').addEventListener('click', () => {
    const blob = new Blob([bank.exportJSON()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'opotest-banco.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = bank.importJSON(reader.result);
      alert('Importación: ' + result.added + ' añadidas, ' + result.skipped + ' descartadas (duplicadas o inválidas).');
      renderBank();
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ---------- Mi cuenta ----------

  function renderAccount() {
    const plansBox = $('plansBox');
    plansBox.innerHTML = '';
    for (const [key, plan] of Object.entries(C.PLANS)) {
      plansBox.appendChild(el('div', {
        class: 'plan' + (credits.plan === key ? ' current' : ''),
        onclick: () => {
          if (credits.plan === key) return;
          if (!confirm('¿Cambiar al plan ' + plan.name + ' (' + plan.pricePerMonth + ' €/mes, ' + plan.monthlyCredits + ' créditos)?')) return;
          credits.setPlan(key);
          saveUser();
          renderAccount();
        },
      }, [
        el('div', { class: 'name' }, plan.name),
        el('div', { class: 'price' }, plan.pricePerMonth + ' €'),
        el('div', { class: 'name' }, plan.monthlyCredits + ' créditos/mes'),
        credits.plan === key ? el('div', { class: 'badge active' }, 'plan actual') : el('span', {}, ''),
      ]));
    }

    const s = user.stats;
    const answered = s.correct + s.wrong;
    const statsBox = $('statsBox');
    statsBox.innerHTML = '';
    const stats = [
      [s.tests, 'tests hechos'],
      [answered ? Math.round((s.correct / answered) * 100) + '%' : '–', 'acierto'],
      [user.failedIds.length, 'falladas por repasar'],
      [user.contributed, 'preguntas aportadas'],
      [user.seenIds.length, 'preguntas vistas'],
    ];
    for (const [value, label] of stats) {
      statsBox.appendChild(el('div', { class: 'stat' }, [
        el('div', { class: 'value' }, String(value)),
        el('div', { class: 'label' }, label),
      ]));
    }

    const logBox = $('creditLog');
    logBox.innerHTML = '';
    const entries = credits.log.slice().reverse().slice(0, 30);
    if (!entries.length) logBox.appendChild(el('p', { class: 'hint' }, 'Sin movimientos todavía.'));
    for (const entry of entries) {
      logBox.appendChild(el('div', { class: 'entry' }, [
        el('span', {}, entry.reason),
        el('span', { class: 'delta ' + (entry.delta >= 0 ? 'pos' : 'neg') },
          (entry.delta >= 0 ? '+' : '') + entry.delta + ' → ' + entry.balance),
      ]));
    }
  }

  // ---------- Arranque ----------

  renderCredits();
  renderQuizSetup();
  saveUser();
})();
