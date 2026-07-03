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
    { seenIds: [], failedIds: [], stats: { tests: 0, correct: 0, wrong: 0, blank: 0 }, credits: null, evalDay: null, contributed: 0, alias: '' },
    userStore.get() || {}
  );
  user.daily = user.daily || C.emptyDailyState();
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
      if (tab.dataset.tab === 'coverage') renderCoverage();
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

  // Fragmento real de la Ley 39/2015 para probar la app sin material propio.
  const EXAMPLE = {
    oposicion: 'Bombero',
    ley: 'Ley 39/2015',
    titulo: 'Título Preliminar y Título I',
    articulos: '1-4',
    text: 'Artículo 1. Objeto de la Ley.\n' +
      'La presente Ley tiene por objeto regular los requisitos de validez y eficacia de los actos administrativos, el procedimiento administrativo común a todas las Administraciones Públicas, incluyendo el sancionador y el de reclamación de responsabilidad de las Administraciones Públicas. Solo mediante ley, cuando resulte eficaz, proporcionado y necesario para la consecución de los fines propios del procedimiento, podrán incluirse trámites adicionales o distintos a los contemplados en esta Ley.\n\n' +
      'Artículo 3. Capacidad de obrar.\n' +
      'A los efectos previstos en esta Ley, tendrán capacidad de obrar ante las Administraciones Públicas:\n' +
      'a) Las personas físicas o jurídicas que ostenten capacidad de obrar con arreglo a las normas civiles.\n' +
      'b) Los menores de edad para el ejercicio y defensa de aquellos de sus derechos e intereses cuya actuación esté permitida por el ordenamiento jurídico sin la asistencia de la persona que ejerza la patria potestad, tutela o curatela.\n' +
      'c) Los grupos de afectados, las uniones y entidades sin personalidad jurídica y los patrimonios independientes o autónomos, cuando la Ley así lo declare expresamente.\n\n' +
      'Artículo 4. Concepto de interesado.\n' +
      'Se consideran interesados en el procedimiento administrativo quienes lo promuevan como titulares de derechos o intereses legítimos individuales o colectivos. Las asociaciones y organizaciones representativas de intereses económicos y sociales serán titulares de intereses legítimos colectivos en los términos que la Ley reconozca.\n\n' +
      'Artículo 30. Cómputo de plazos.\n' +
      'Los plazos expresados en días se contarán a partir del día siguiente a aquel en que tenga lugar la notificación o publicación del acto de que se trate. Cuando los plazos se señalen por días, se entiende que estos son hábiles, excluyéndose del cómputo los sábados, los domingos y los declarados festivos. Los plazos expresados en horas se contarán de hora en hora y de minuto en minuto desde la hora y minuto en que tenga lugar la notificación o publicación del acto y no podrán tener una duración superior a 24 horas, en cuyo caso se expresarán en días.',
  };

  $('loadExampleBtn').addEventListener('click', () => {
    $('metaOposicion').value = EXAMPLE.oposicion;
    $('metaLey').value = EXAMPLE.ley;
    $('metaTitulo').value = EXAMPLE.titulo;
    $('metaArticulos').value = EXAMPLE.articulos;
    $('sourceText').value = EXAMPLE.text;
    updateRecycleHint();
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

  /** Tarjeta «Reto de hoy»: hábito diario con racha, sin coste de créditos. */
  function renderDailyCard() {
    const card = $('dailyCard');
    card.innerHTML = '';
    const done = C.isDailyDone(user.daily);
    const streak = user.daily.streak || 0;
    const pool = bank.active();
    card.appendChild(el('h2', {}, '🔥 Reto de hoy' + (streak ? ' · racha: ' + streak + ' día' + (streak > 1 ? 's' : '') : '')));
    if (done) {
      card.appendChild(el('p', { class: 'hint' }, '✅ Completado. Vuelve mañana para mantener la racha.'));
      return;
    }
    if (pool.length < C.DAILY_COUNT) {
      card.appendChild(el('p', { class: 'hint' }, 'Necesitas al menos ' + C.DAILY_COUNT + ' preguntas activas en el banco para el reto diario.'));
      return;
    }
    card.appendChild(el('p', { class: 'hint' }, C.DAILY_COUNT + ' preguntas, las mismas para todos los que compartan tu banco. Completa el reto cada día para no romper la racha.'));
    card.appendChild(el('button', {
      class: 'btn primary',
      onclick: () => {
        const { questions } = C.buildDailyQuiz(pool, {});
        currentQuiz = { questions, submitted: false, mode: 'daily' };
        renderQuizArea();
      },
    }, '▶ Hacer el reto de hoy'));
  }

  function renderQuizSetup() {
    renderDailyCard();
    const select = $('quizLey');
    const previous = select.value;
    select.innerHTML = '<option value="">Todas</option>';
    for (const [ley, n] of Object.entries(bank.countByLey())) {
      select.appendChild(el('option', { value: ley }, ley + ' (' + n + ')'));
    }
    select.value = previous;
    const failedOpt = $('quizMode').querySelector('option[value="failed"]');
    failedOpt.textContent = 'Repaso de falladas (' + user.failedIds.length +
      (user.falseCertaintyIds && user.falseCertaintyIds.length ? ', ' + user.falseCertaintyIds.length + ' falsas certezas' : '') + ')';
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
    const mode = $('quizMode').value;
    const pool = quizPool();
    const rng = C.createRng(Math.floor(Math.random() * 1e9));
    let questions;
    if (mode === 'failed') {
      // Las falsas certezas (fallos con «Seguro») se repasan primero
      questions = C.buildReviewQuiz(pool, user.failedIds, count, rng, user.falseCertaintyIds);
      if (!questions.length) return alert('No tienes preguntas falladas pendientes de repaso. ¡Bien!');
    } else if (mode === 'reverse') {
      questions = C.buildReverseQuiz(pool, { count, rng });
      if (!questions.length) return alert('El modo inverso necesita preguntas en el banco con artículo y ley identificados. Genera algunas primero.');
    } else {
      questions = C.buildQuiz(pool, { count, seenIds: user.seenIds, rng }).questions;
      if (!questions.length) return alert('No hay preguntas en el banco para ese filtro. Genera algunas primero.');
    }
    currentQuiz = { questions, submitted: false, mode };
    renderQuizArea();
  });

  function renderQuizArea() {
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    $('quizResult').classList.add('hidden');
    $('quizSetup').classList.add('hidden');

    currentQuiz.confidences = currentQuiz.questions.map(() => null);
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
      qBox.appendChild(confidenceSelector(i));
      area.appendChild(qBox);
    });
    area.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', onclick: submitQuiz }, '✔ Corregir test'),
      el('button', { class: 'btn', onclick: exitQuiz }, '✖ Cancelar'),
    ]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Termómetro de confianza: «¿Cómo de seguro estás?» por pregunta. */
  const CONFIDENCE_LEVELS = [
    { value: 'sure', label: '😎 Seguro' },
    { value: 'doubt', label: '🤔 Dudo' },
    { value: 'guess', label: '🎲 Adivino' },
  ];

  function confidenceSelector(i) {
    const box = el('div', { class: 'confidence' }, [el('span', { class: 'conf-label' }, 'Confianza:')]);
    for (const level of CONFIDENCE_LEVELS) {
      box.appendChild(el('button', {
        class: 'btn small conf-btn',
        'data-conf': level.value,
        onclick: (ev) => {
          if (currentQuiz.submitted) return;
          currentQuiz.confidences[i] = level.value;
          box.querySelectorAll('.conf-btn').forEach((b) => b.classList.remove('selected'));
          ev.currentTarget.classList.add('selected');
        },
      }, level.label));
    }
    return box;
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
    const scored = C.scoreQuiz(currentQuiz.questions, answers, { confidences: currentQuiz.confidences });
    currentQuiz.submitted = true;
    currentQuiz.scored = scored;
    // Los modos efímeros (inverso, test compartido sin importar) no tocan el
    // historial: sus preguntas no viven en el banco.
    const ephemeral = currentQuiz.mode === 'reverse' || currentQuiz.mode === 'shared';
    if (!ephemeral) C.updateHistory(user, scored);
    let dailyResult = null;
    if (currentQuiz.mode === 'daily') dailyResult = C.completeDaily(user.daily);
    saveUser();

    // Marcar visualmente cada pregunta
    currentQuiz.questions.forEach((q, i) => {
      const qBox = $('qq' + i);
      qBox.querySelectorAll('.option').forEach((optEl, j) => {
        if (j === q.correctIndex) optEl.classList.add('correct');
        else if (answers[i] === j) optEl.classList.add('wrong');
        optEl.querySelector('input').disabled = true;
      });
      if (scored.results[i].falseCertainty) {
        qBox.appendChild(el('div', { class: 'false-certainty' },
          '🔥 Falsa certeza: estabas seguro y era incorrecta. Esta es de las que suspenden — prioridad en tu repaso.'));
      }
      qBox.appendChild(el('div', { class: 'explanation' }, '💡 ' + q.explanation));
      if (bank.get(q.id)) qBox.appendChild(qualityActions(q));
    });

    const detailParts = ['✅ ' + scored.correct + ' aciertos · ❌ ' + scored.wrong + ' fallos · ⚪ ' + scored.blank +
      ' en blanco · (cada fallo resta 1/3, baremo de oposición)'];
    const banner = $('quizResult');
    banner.innerHTML = '';
    banner.classList.remove('hidden');
    const bannerChildren = [
      el('div', { class: 'big' }, scored.score10.toFixed(2) + ' / 10'),
      el('div', { class: 'detail' }, detailParts.join('')),
    ];
    if (scored.falseCertainties > 0) {
      bannerChildren.push(el('div', { class: 'detail warn' },
        '🔥 ' + scored.falseCertainties + ' falsa' + (scored.falseCertainties > 1 ? 's' : '') +
        ' certeza' + (scored.falseCertainties > 1 ? 's' : '') +
        ' — fallos respondidos con «Seguro». Se priorizan en el repaso de falladas.'));
    }
    if (dailyResult) {
      bannerChildren.push(el('div', { class: 'detail streak' }, dailyResult.counted
        ? '🔥 ¡Reto diario completado! Racha: ' + dailyResult.streak + ' día' + (dailyResult.streak > 1 ? 's' : '') + '.'
        : '🔥 El reto de hoy ya contaba para tu racha (' + dailyResult.streak + ').'));
    }
    // Reto compartido: veredicto contra el marcador del retador
    if (currentQuiz.challenge) {
      const rival = currentQuiz.challenge;
      const diff = scored.score10 - rival.score10;
      const verdict = diff > 0
        ? '🏆 ¡Victoria! Has superado a ' + rival.alias + ' (' + scored.score10.toFixed(2) + ' vs ' + rival.score10.toFixed(2) + ').'
        : diff < 0
          ? '😅 ' + rival.alias + ' sigue por delante (' + rival.score10.toFixed(2) + ' vs tu ' + scored.score10.toFixed(2) + '). ¡Revancha!'
          : '🤝 Empate con ' + rival.alias + ' (' + scored.score10.toFixed(2) + ').';
      bannerChildren.push(el('div', { class: 'detail challenge-verdict' }, verdict));
      bannerChildren.push(el('div', { class: 'detail' }, 'Comparte tu nota con «🔗 Compartir este test» y devuelve el reto.'));
    }
    bannerChildren.push(el('div', { class: 'row', style: 'justify-content: center; margin-top: 10px;' }, [
      el('button', { class: 'btn primary', onclick: exitQuiz }, '↩ Nuevo test'),
      el('button', { class: 'btn', onclick: shareCurrentQuiz }, '🔗 Compartir este test'),
    ]));
    banner.appendChild(el('div', { class: 'score-banner' }, bannerChildren));
    banner.scrollIntoView({ behavior: 'smooth' });
  }

  /** Compartir el test actual: las preguntas viajan en el fragmento de la URL.
   *  Si el test está corregido, se ofrece lanzar un reto con tu nota y alias. */
  function shareCurrentQuiz() {
    if (!currentQuiz) return;
    try {
      let challenge = null;
      if (currentQuiz.scored) {
        const alias = prompt(
          '¿Lanzar un reto con tu nota (' + currentQuiz.scored.score10.toFixed(2) + ')?\n' +
          'Escribe tu alias, o deja vacío para compartir sin reto:',
          user.alias || ''
        );
        if (alias && alias.trim()) {
          user.alias = alias.trim().slice(0, C.MAX_ALIAS);
          saveUser();
          challenge = { alias: user.alias, score10: currentQuiz.scored.score10 };
        }
      }
      const fragment = C.encodeShare(currentQuiz.questions, { challenge });
      const url = location.href.split('#')[0] + '#' + fragment;
      const done = () => alert('Enlace copiado. Cualquiera que lo abra podrá hacer este test e importar las preguntas a su banco.');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, () => prompt('Copia el enlace del test:', url));
      } else {
        prompt('Copia el enlace del test:', url);
      }
    } catch (e) {
      alert('No se pudo compartir: ' + e.message);
    }
  }

  /** Si la URL trae un test compartido (#share=…), ofrecerlo al usuario. */
  function handleIncomingShare() {
    if (!location.hash || !location.hash.includes('share=')) return;
    let decoded;
    try {
      decoded = C.decodeShare(location.hash);
    } catch (e) {
      alert('Test compartido: ' + e.message);
      return;
    }
    document.querySelector('[data-tab="quiz"]').click();
    const setup = $('quizSetup');
    const offer = el('div', { class: 'card share-offer', id: 'shareOffer' }, [
      el('h2', {}, decoded.challenge
        ? '🥊 ' + decoded.challenge.alias + ' te reta: sacó ' + decoded.challenge.score10.toFixed(2) + ' — ¿puedes superarlo?'
        : '📩 Te han compartido un test'),
      el('p', { class: 'hint' }, decoded.questions.length + ' preguntas' +
        (decoded.skipped ? ' (' + decoded.skipped + ' descartadas por inválidas)' : '') +
        (decoded.questions[0].topic && decoded.questions[0].topic.ley ? ' · ' + decoded.questions[0].topic.ley : '')),
      el('div', { class: 'row wrap' }, [
        el('button', {
          class: 'btn primary',
          onclick: () => {
            currentQuiz = {
              questions: decoded.questions.map((q, i) => Object.assign({ id: 'sh-' + i }, q)),
              submitted: false,
              mode: 'shared',
              challenge: decoded.challenge,
            };
            renderQuizArea();
          },
        }, decoded.challenge ? '🥊 Aceptar el reto' : '▶ Hacer este test'),
        el('button', {
          class: 'btn',
          onclick: () => {
            const res = bank.importJSON(JSON.stringify({ questions: decoded.questions }));
            alert('Importación: ' + res.added + ' preguntas añadidas a tu banco, ' + res.skipped + ' descartadas (duplicadas o inválidas).');
            $('shareOffer').remove();
            renderQuizSetup();
          },
        }, '⬇ Importar a mi banco'),
        el('button', { class: 'btn', onclick: () => $('shareOffer').remove() }, '✖ Descartar'),
      ]),
    ]);
    setup.parentNode.insertBefore(offer, setup);
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

  // ---------- Radiografía del temario ----------

  const COVERAGE_ICONS = { empty: '⬜', untried: '🔵', good: '🟢', medium: '🟡', weak: '🔴' };

  function renderCoverage() {
    const box = $('coverageGrid');
    box.innerHTML = '';
    const grid = C.buildCoverageGrid(bank.active(), user.perQuestion);
    if (!grid.length) {
      box.appendChild(el('p', { class: 'hint' }, 'Aún no hay preguntas en el banco. Genera las primeras en «Generar».'));
      return;
    }
    for (const row of grid) {
      box.appendChild(el('h3', { class: 'coverage-ley' }, row.ley));
      const cells = el('div', { class: 'coverage-row' });
      for (const cell of row.cells) {
        const tip = cell.status === 'empty'
          ? 'Artículo ' + cell.article + ': acotado pero sin preguntas. Clic para generar.'
          : 'Artículo ' + cell.article + ': ' + cell.total + ' preguntas · ' +
            (cell.attempts ? cell.correct + '/' + cell.attempts + ' aciertos (' + Math.round(cell.accuracy * 100) + '%)' : 'sin intentar') +
            '. Clic para hacer test.';
        cells.appendChild(el('button', {
          class: 'coverage-cell ' + cell.status,
          title: tip,
          onclick: () => onCoverageCellClick(row.ley, cell),
        }, [COVERAGE_ICONS[cell.status] + ' ', el('span', {}, cell.article)]));
      }
      box.appendChild(cells);
    }
  }

  function onCoverageCellClick(ley, cell) {
    if (cell.status === 'empty') {
      // Hueco del temario → a Generar con los metadatos precargados
      $('metaLey').value = ley === '(sin ley)' ? '' : ley;
      $('metaArticulos').value = cell.article;
      document.querySelector('[data-tab="generate"]').click();
      updateRecycleHint();
      $('sourceText').focus();
      return;
    }
    const ids = new Set(cell.questionIds);
    const questions = bank.active().filter((q) => ids.has(q.id));
    if (!questions.length) return;
    currentQuiz = {
      questions: C.shuffle(questions, C.createRng(Math.floor(Math.random() * 1e9))).slice(0, 10),
      submitted: false,
      mode: 'normal',
    };
    document.querySelector('[data-tab="quiz"]').click();
    renderQuizArea();
  }

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

    // Racha y mini-calendario del reto diario
    const streakBox = $('streakBox');
    streakBox.innerHTML = '';
    const streak = user.daily.streak || 0;
    streakBox.appendChild(el('div', { class: 'stat' }, [
      el('div', { class: 'value' }, '🔥 ' + streak),
      el('div', { class: 'label' }, streak === 1 ? 'día de racha' : 'días de racha'),
    ]));
    const calBox = $('dailyCalendar');
    calBox.innerHTML = '';
    for (const day of C.monthCalendar(user.daily)) {
      calBox.appendChild(el('span', {
        class: 'cal-day' + (day.done ? ' done' : '') + (day.isToday ? ' today' : ''),
        title: day.key + (day.done ? ' · reto completado' : ''),
      }, String(day.day)));
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
  handleIncomingShare();
})();
