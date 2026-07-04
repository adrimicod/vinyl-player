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
  user.srs = user.srs || C.emptySrsState();
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
      if (tab.dataset.tab === 'review') renderReview();
    });
  });

  function renderCredits() {
    // Se muestra el saldo entero utilizable: «0.2 créditos» sugiere poder
    // generar cuando el coste mínimo es 1. El exacto queda en el tooltip.
    const whole = Math.floor(credits.credits);
    $('creditBalance').textContent = whole;
    $('creditPill').title = 'Saldo exacto: ' + credits.credits + ' créditos (1 crédito = 1 pregunta generada)';
    updateGenCost();
  }

  /** Previsualización del coste antes de generar (nunca gastar a ciegas). */
  function updateGenCost() {
    const box = $('genCost');
    if (!box) return;
    const count = parseInt($('genCount').value, 10) || 0;
    const affordable = Math.min(count, credits.questionsAvailable());
    box.textContent = affordable > 0
      ? '· coste: ' + affordable + (affordable === 1 ? ' crédito' : ' créditos')
      : '· sin créditos';
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

  $('genCount').addEventListener('change', updateGenCost);

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
      if (questions.length < affordable) {
        parts.push(el('p', {}, '📄 El texto solo dio para ' + questions.length + ' de las ' + affordable +
          ' pedidas: cada dato del texto genera una pregunta. Añade más artículos para llegar a más.'));
      }
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
  let currentSession = null;

  // ---------- «Estudia ahora»: compositor de sesión ----------

  function sessionInputs() {
    const active = bank.active();
    const byId = new Map(active.map((x) => [x.id, x]));
    const fcSet = new Set(user.falseCertaintyIds || []);
    return {
      dueCards: C.dueCards(user.srs),
      falseCertainties: (user.falseCertaintyIds || []).map((id) => byId.get(id)).filter(Boolean),
      failed: C.orderFailedByAge(user.failedIds, user.seenIds)
        .filter((id) => !fcSet.has(id)).map((id) => byId.get(id)).filter(Boolean),
      cold: C.coldMasteredQuestions(active, user),
      fresh: active.filter((x) => !(user.seenIds || []).includes(x.id)),
      dailyPending: !C.isDailyDone(user.daily) && active.length >= C.DAILY_COUNT,
      dailyCount: C.DAILY_COUNT,
    };
  }

  $('composeSessionBtn').addEventListener('click', () => {
    const budget = parseInt($('sessionBudget').value, 10);
    const session = C.composeSession(budget, sessionInputs());
    const agenda = $('sessionAgenda');
    agenda.innerHTML = '';
    if (!session.blocks.length) {
      agenda.appendChild(el('p', { class: 'hint' }, 'Nada que componer: genera preguntas o crea flashcards primero.'));
      return;
    }
    if (session.degraded) {
      agenda.appendChild(el('p', { class: 'hint' }, 'Aún no hay historial que diagnosticar: sesión genérica para empezar a generar señal.'));
    }
    const list = el('ol', { class: 'session-agenda' });
    for (const b of session.blocks) {
      const count = b.items.length;
      const countLabel = count ? count + (count === 1 ? ' ítem, ' : ' ítems, ') : '';
      list.appendChild(el('li', {}, [
        el('strong', {}, b.label + ' '),
        el('span', { class: 'hint' }, '(' + countLabel + '~' + b.estMinutes + ' min) — ' + b.reason),
      ]));
    }
    agenda.appendChild(list);
    if (session.totalMinutes < budget * 0.7) {
      agenda.appendChild(el('p', { class: 'hint' },
        '⏳ Solo hay material para ~' + session.totalMinutes + ' de los ' + budget +
        ' min pedidos: genera más preguntas o crea flashcards para llenar tu sesión.'));
    }
    agenda.appendChild(el('button', {
      class: 'btn primary',
      onclick: () => {
        currentSession = { blocks: session.blocks, index: 0, practiced: [] };
        runSessionBlock();
      },
    }, '▶ Empezar sesión (' + session.totalMinutes + ' min)'));
  });

  function sessionHeader() {
    const { blocks, index } = currentSession;
    const b = blocks[index];
    return el('div', { class: 'exam-header' }, [
      el('div', { class: 'row' }, [
        el('strong', {}, '⚡ Bloque ' + (index + 1) + ' de ' + blocks.length + ' · ' + b.label),
        el('span', { class: 'spacer' }),
        el('span', { class: 'hint' }, '~' + b.estMinutes + ' min'),
      ]),
      el('p', { class: 'hint' }, 'Por qué: ' + b.reason),
    ]);
  }

  function runSessionBlock() {
    const { blocks, index } = currentSession;
    if (index >= blocks.length) return finishSession();
    const block = blocks[index];
    if (block.type === 'cards') return runSessionCards(block);
    if (block.type === 'daily') {
      const { questions } = C.buildDailyQuiz(bank.active(), {});
      currentQuiz = { questions, submitted: false, mode: 'daily' };
    } else {
      currentQuiz = { questions: block.items, submitted: false, mode: 'session' };
    }
    renderQuizArea();
    $('quizArea').insertBefore(sessionHeader(), $('quizArea').firstChild);
  }

  /** Bloque de flashcards dentro de la sesión (mismo SRS, otra pantalla). */
  function runSessionCards(block) {
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    $('quizSetup').classList.add('hidden');
    $('quizResult').classList.add('hidden');
    $('dailyCard').classList.add('hidden');
    $('sessionCard').classList.add('hidden');
    area.appendChild(sessionHeader());
    area.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn', onclick: exitQuiz }, '✖ Abandonar sesión'),
    ]));
    const queue = block.items.slice();
    const next = () => {
      if (!queue.length) {
        currentSession.index++;
        return runSessionBlock();
      }
      const card = user.srs.cards[queue[0].id] || queue[0];
      area.querySelectorAll('.flashcard').forEach((n) => n.remove());
      const box = el('div', { class: 'flashcard' }, [
        el('div', { class: 'meta' }, 'Caja ' + card.box + ' · quedan ' + queue.length),
        el('div', { class: 'front' }, card.front),
      ]);
      const reveal = el('button', {
        class: 'btn primary',
        onclick: () => {
          reveal.remove();
          box.appendChild(el('div', { class: 'back' }, card.back));
          box.appendChild(el('div', { class: 'row' }, [['know', '😎 La sabía'], ['doubt', '🤔 Dudé'], ['fail', '❌ No la sabía']].map(([grade, label]) =>
            el('button', {
              class: 'btn small',
              onclick: () => {
                C.review(user.srs, card.id, grade);
                saveUser();
                queue.shift();
                next();
              },
            }, label))));
        },
      }, '👁 Mostrar respuesta');
      box.appendChild(reveal);
      area.appendChild(box);
    };
    next();
  }

  function finishSession() {
    const practiced = currentSession.practiced;
    currentSession = null;
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    const hasWrong = practiced.some((r) => r.outcome === 'wrong');
    const parts = [
      el('div', { class: 'big' }, '⚡ Sesión completada'),
      el('div', { class: 'detail' }, hasWrong
        ? practiced.length + ' preguntas trabajadas. Las falladas quedan pendientes de rescate: acredítalas en el ticket de salida.'
        : '🏆 ' + practiced.length + ' preguntas trabajadas sin fallar ninguna. Nada que rescatar.'),
    ];
    const row = el('div', { class: 'row', style: 'justify-content: center; margin-top: 10px;' });
    if (hasWrong) {
      const ticket = C.buildExitTicket(practiced, bank.active(), { rng: C.createRng(Math.floor(Math.random() * 1e9)) });
      if (ticket.length) {
        row.appendChild(el('button', { class: 'btn primary', onclick: () => startExitTicket(ticket) }, '🎟 Ticket de salida (' + ticket.length + ')'));
      }
    }
    row.appendChild(el('button', { class: 'btn' + (hasWrong ? '' : ' primary'), onclick: exitQuiz }, '↩ Terminar'));
    parts.push(row);
    area.appendChild(el('div', { class: 'score-banner' }, parts));
  }

  /** Micro-examen de cierre: rescata (sesión) o consolida (tras test normal). */
  function startExitTicket(questions, opts) {
    currentQuiz = { questions, submitted: false, mode: 'ticket', consolidateOnly: !!(opts && opts.consolidateOnly) };
    renderQuizArea();
    $('quizArea').insertBefore(el('div', { class: 'exam-header' }, [
      el('strong', {}, '🎟 Ticket de salida'),
      el('p', { class: 'hint' }, currentQuiz.consolidateOnly
        ? 'Repaso inmediato de lo fallado para fijarlo. No rescata: eso se gana acertándolas en otra sesión.'
        : 'Última pasada sobre lo recién trabajado: solo lo que aciertes ahora se rescata del repaso.'),
    ]), $('quizArea').firstChild);
  }

  /** Tarjeta «Reto de hoy»: hábito diario con racha, sin coste de créditos. */
  function renderDailyCard() {
    const card = $('dailyCard');
    // Con un test/sesión/cadena en marcha la tarjeta no puede reaparecer
    // (cambiar de pestaña y volver la resucitaba y destruía el test en curso).
    const busy = (currentQuiz && !currentQuiz.submitted) || currentSession || currentChain;
    card.classList.toggle('hidden', !!busy);
    if (busy) return;
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
    // El compositor tampoco puede reaparecer sobre un test/sesión en curso
    const busy = (currentQuiz && !currentQuiz.submitted) || currentSession || currentChain;
    $('sessionCard').classList.toggle('hidden', !!busy);
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
    if (mode === 'chain') {
      if (pool.length < 3) return alert('La cadena necesita al menos 3 preguntas activas en el banco.');
      return startChain(pool);
    }
    if (mode === 'failed') {
      // Primero lo más peligroso (falsas certezas, rompe-cadenas); el resto,
      // por antigüedad: lo fallado hace más tiempo es lo más olvidado.
      const priority = (user.falseCertaintyIds || []).concat(user.chainBreakerIds || []);
      const byAge = C.orderFailedByAge(user.failedIds, user.seenIds);
      questions = C.buildReviewQuiz(pool, byAge, count, rng, priority);
      if (!questions.length) return alert('No tienes preguntas falladas pendientes de repaso. ¡Bien!');
    } else if (mode === 'reverse') {
      questions = C.buildReverseQuiz(pool, { count, rng });
      if (!questions.length) return alert('El modo inverso necesita preguntas en el banco con artículo y ley identificados. Genera algunas primero.');
    } else {
      questions = C.buildQuiz(pool, { count, seenIds: user.seenIds, rng }).questions;
      if (!questions.length) return alert('No hay preguntas en el banco para ese filtro. Genera algunas primero.');
    }
    currentQuiz = { questions, submitted: false, mode };
    if (mode === 'exam') currentQuiz.exam = C.createExam(questions.length);
    renderQuizArea();
  });

  function renderQuizArea() {
    // Un lanzamiento externo (falladas, gemelas, celda de radiografía…)
    // abandona la sesión en curso: si no, el test heredaría su encadenado.
    if (currentSession && !['session', 'daily', 'ticket'].includes(currentQuiz.mode)) {
      currentSession = null;
    }
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    // Vaciar (no solo ocultar) el banner anterior: sus botones vivos
    // permitían saltarse bloques con una doble activación.
    $('quizResult').innerHTML = '';
    $('quizResult').classList.add('hidden');
    $('quizSetup').classList.add('hidden');
    // Con un test en marcha, ni el «Reto de hoy» ni el compositor pueden
    // quedar clicables: reemplazarían el test en curso sin confirmación.
    $('dailyCard').classList.add('hidden');
    $('sessionCard').classList.add('hidden');

    const isExam = currentQuiz.mode === 'exam';
    if (isExam) area.appendChild(examHeader());

    currentQuiz.confidences = currentQuiz.questions.map(() => null);
    currentQuiz.questions.forEach((q, i) => {
      const qBox = el('div', { class: 'quiz-question', id: 'qq' + i }, [
        el('h3', {}, [el('span', { class: 'qnum' }, (i + 1) + '.'), q.text]),
      ]);
      q.options.forEach((opt, j) => {
        qBox.appendChild(el('label', { class: 'option', 'data-q': i, 'data-opt': j }, [
          el('input', {
            type: 'radio', name: 'q' + i, value: j,
            onchange: isExam ? () => onExamAnswer(i, j) : () => {},
          }),
          String.fromCharCode(65 + j) + ') ' + opt,
        ]));
      });
      if (isExam) {
        qBox.appendChild(el('button', {
          class: 'btn small mark-btn', id: 'mark' + i,
          onclick: (ev) => {
            const marked = C.toggleMark(currentQuiz.exam, i);
            ev.currentTarget.classList.toggle('marked', marked);
            const sheetCell = $('sheet' + i);
            if (sheetCell) sheetCell.classList.toggle('marked', marked);
          },
        }, '🚩 Marcar para revisar'));
      } else {
        qBox.appendChild(confidenceSelector(i));
      }
      area.appendChild(qBox);
    });
    area.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', onclick: submitQuiz }, '✔ Corregir test'),
      el('button', { class: 'btn', onclick: exitQuiz }, '✖ Cancelar'),
    ]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Modo cadena (muerte súbita) ----------

  let currentChain = null;

  function startChain(pool) {
    currentChain = { chain: C.createChain(), pool, rng: C.createRng(Math.floor(Math.random() * 1e9)) };
    $('quizSetup').classList.add('hidden');
    $('quizResult').classList.add('hidden');
    $('dailyCard').classList.add('hidden');
    $('sessionCard').classList.add('hidden');
    nextChainStep();
  }

  function chainLeyKey() {
    return $('quizLey').value || 'todas';
  }

  function nextChainStep() {
    const { chain, pool, rng } = currentChain;
    const question = C.nextChainQuestion(chain, pool, rng);
    const area = $('quizArea');
    area.innerHTML = '';
    area.classList.remove('hidden');
    if (!question) return endChain(null, null); // banco agotado: invicto
    const records = user.chainRecords || {};
    area.appendChild(el('div', { class: 'exam-header' }, [
      el('div', { class: 'row' }, [
        el('strong', {}, '🔗 Cadena: ' + chain.streak),
        el('span', { class: 'spacer' }),
        el('span', { class: 'hint' }, 'Récord global: ' + (records.global || 0) +
          ' · ' + (chainLeyKey() === 'todas' ? 'todas las leyes' : chainLeyKey()) + ': ' + ((records.byLey || {})[chainLeyKey()] || 0)),
      ]),
      el('p', { class: 'hint' }, 'Muerte súbita: al primer fallo se acabó.'),
    ]));
    const qBox = el('div', { class: 'quiz-question' }, [el('h3', {}, question.text)]);
    question.options.forEach((opt, j) => {
      qBox.appendChild(el('button', {
        class: 'option trap-option',
        onclick: () => answerChainStep(question, j),
      }, String.fromCharCode(65 + j) + ') ' + opt));
    });
    qBox.appendChild(el('div', { class: 'row' }, [el('button', { class: 'btn', onclick: exitQuiz }, '✖ Abandonar')]));
    area.appendChild(qBox);
  }

  function answerChainStep(question, answerIndex) {
    const { chain } = currentChain;
    const result = C.answerChain(chain, question, answerIndex);
    // La cadena alimenta el historial pregunta a pregunta, pero solo cuenta
    // como UN test hecho (se suma al terminar, en endChain).
    C.updateHistory(user, C.scoreQuiz([question], [answerIndex]), { countAsTest: false });
    if (result.correct) {
      saveUser();
      return nextChainStep();
    }
    // Rompe-cadena: prioridad máxima en el repaso
    user.chainBreakerIds = user.chainBreakerIds || [];
    if (!user.chainBreakerIds.includes(question.id)) user.chainBreakerIds.push(question.id);
    endChain(question, answerIndex);
  }

  function endChain(breakerQuestion, givenIndex) {
    const { chain } = currentChain;
    user.chainRecords = user.chainRecords || {};
    const beaten = C.updateChainRecords(user.chainRecords, chain.streak, chainLeyKey());
    user.stats = user.stats || { tests: 0, correct: 0, wrong: 0, blank: 0 };
    user.stats.tests++; // la cadena completa cuenta como un único test
    saveUser();
    const area = $('quizArea');
    area.innerHTML = '';
    const parts = [
      el('div', { class: 'big' }, '🔗 ' + chain.streak),
      el('div', { class: 'detail' }, breakerQuestion
        ? 'Cadena rota tras ' + chain.streak + ' acierto' + (chain.streak === 1 ? '' : 's') + '.'
        : '🏆 ¡Banco agotado sin fallar! Cadena invicta de ' + chain.streak + '.'),
    ];
    if (beaten.globalBeaten) parts.push(el('div', { class: 'detail warn' }, '🏅 ¡Nuevo récord global!'));
    else if (beaten.leyBeaten) parts.push(el('div', { class: 'detail warn' }, '🏅 ¡Nuevo récord de ' + (chainLeyKey() === 'todas' ? 'todas las leyes' : chainLeyKey()) + '!'));
    parts.push(el('div', { class: 'row', style: 'justify-content: center; margin-top: 10px;' }, [
      el('button', { class: 'btn primary', onclick: () => startChain(currentChain.pool) }, '🔗 Otra cadena'),
      el('button', { class: 'btn', onclick: exitQuiz }, '↩ Salir'),
    ]));
    area.appendChild(el('div', { class: 'score-banner' }, parts));
    if (breakerQuestion) {
      const qBox = el('div', { class: 'quiz-question' }, [el('h3', {}, breakerQuestion.text)]);
      breakerQuestion.options.forEach((opt, j) => {
        const cls = j === breakerQuestion.correctIndex ? 'option correct' : (j === givenIndex ? 'option wrong' : 'option');
        qBox.appendChild(el('div', { class: cls }, String.fromCharCode(65 + j) + ') ' + opt));
      });
      qBox.appendChild(el('div', { class: 'explanation' }, '💡 ' + breakerQuestion.explanation +
        ' Esta pregunta entra con máxima prioridad en tu repaso de falladas.'));
      area.appendChild(qBox);
    }
  }

  // ---------- Simulacro cronometrado ----------

  let examTicker = null;

  function examHeader() {
    const exam = currentQuiz.exam;
    const clock = el('span', { class: 'exam-clock', id: 'examClock' }, formatMs(C.remainingMs(exam)));
    const sheet = el('div', { class: 'exam-sheet' });
    currentQuiz.questions.forEach((_, i) => {
      sheet.appendChild(el('button', {
        class: 'sheet-cell', id: 'sheet' + i, title: 'Ir a la pregunta ' + (i + 1),
        onclick: () => {
          const target = $('qq' + i);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
      }, String(i + 1)));
    });
    const warning = el('div', { class: 'detail warn hidden', id: 'examWarning' }, '⏰ ¡Quedan menos de 5 minutos!');
    startExamTicker();
    return el('div', { class: 'exam-header' }, [
      el('div', { class: 'row' }, [el('strong', {}, '⏱ Simulacro'), el('span', { class: 'spacer' }), clock]),
      warning,
      sheet,
      el('p', { class: 'hint' }, 'Sin corrección hasta el final, como en el examen real. La hoja de respuestas te lleva a cualquier pregunta; 🚩 marca las que quieras revisar. Se autocorrige al agotarse el tiempo.'),
    ]);
  }

  function startExamTicker() {
    stopExamTicker();
    examTicker = setInterval(() => {
      if (!currentQuiz || !currentQuiz.exam || currentQuiz.submitted) return stopExamTicker();
      const exam = currentQuiz.exam;
      const clock = $('examClock');
      if (clock) clock.textContent = formatMs(C.remainingMs(exam));
      if (C.shouldWarn(exam) && $('examWarning')) $('examWarning').classList.remove('hidden');
      if (C.isExpired(exam)) {
        stopExamTicker();
        submitQuiz(); // autoenvío al agotarse el tiempo
      }
    }, 1000);
  }

  function stopExamTicker() {
    if (examTicker) clearInterval(examTicker);
    examTicker = null;
  }

  function onExamAnswer(questionIndex, optionIndex) {
    if (!currentQuiz.exam || currentQuiz.submitted) return;
    C.answerExam(currentQuiz.exam, questionIndex, optionIndex);
    const cell = $('sheet' + questionIndex);
    if (cell) cell.classList.add('answered');
  }

  function formatMs(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
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
    stopExamTicker();
    currentQuiz = null;
    currentChain = null;
    currentSession = null;
    $('sessionCard').classList.remove('hidden');
    $('sessionAgenda').innerHTML = '';
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
    // Detector de estudio-confort: se evalúa ANTES de updateHistory para que
    // el propio test no contamine el diagnóstico.
    // No aplica a tests que la propia app recomendó con dominadas a propósito
    // (Antióxido, entrenar tipo): recomendarlo y luego reñir sería absurdo.
    const comfortCheck = ['normal', 'session', 'daily'].includes(currentQuiz.mode) && !currentQuiz.recommended
      ? C.assessSession(scored, user.perQuestion)
      : { ok: false };
    // Los modos efímeros (inverso, test compartido sin importar) no tocan el
    // historial: sus preguntas no viven en el banco.
    const ephemeral = currentQuiz.mode === 'reverse' || currentQuiz.mode === 'shared';
    let ticketRescued = 0;
    let ticketHadRescuable = false;
    if (currentQuiz.mode === 'ticket') {
      ticketHadRescuable = currentQuiz.questions.some((tq) => (user.failedIds || []).includes(tq.id));
      if (currentQuiz.consolidateOnly) {
        // Ticket tras un test normal: la solución se acaba de mostrar, así
        // que acertarla ahora es memoria a corto plazo — consolida, no rescata.
        C.updateHistory(user, scored, { countAsTest: false, noRescue: true });
      } else {
        // Ticket de cierre de sesión: el árbitro del rescate diferido
        ticketRescued = C.applyTicketRescue(user, scored);
        C.updateHistory(user, scored, { countAsTest: false });
      }
    } else if (currentQuiz.mode === 'session' || (currentSession && currentQuiz.mode === 'daily')) {
      // Rescate diferido: dentro de la sesión (incluido su bloque de reto
      // diario) el acierto no saca la fallada del repaso; lo decide el ticket.
      C.updateHistory(user, scored, { noRescue: true });
    } else if (!ephemeral) {
      C.updateHistory(user, scored);
    }
    if (currentSession && (currentQuiz.mode === 'session' || currentQuiz.mode === 'daily')) {
      currentSession.practiced.push(...scored.results);
    }
    let dailyResult = null;
    // Entregar el reto totalmente en blanco no mantiene la racha: el hábito
    // que premia la racha es estudiar, no abrir la app.
    if (currentQuiz.mode === 'daily' && scored.blank < scored.total) {
      dailyResult = C.completeDaily(user.daily);
    }
    let pace = null;
    if (currentQuiz.mode === 'exam' && currentQuiz.exam) {
      stopExamTicker();
      C.finishExam(currentQuiz.exam);
      pace = C.paceReport(currentQuiz.exam);
    }
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

    // Modo gemelas: mostrar lado a lado en qué difieren las dos preguntas
    if (currentQuiz.mode === 'twins' && currentQuiz.pair) {
      const { a, b } = currentQuiz.pair;
      const diff = C.diffTokens(a.text + ' ' + a.sourceQuote, b.text + ' ' + b.sourceQuote);
      $('quizArea').appendChild(el('div', { class: 'card twins-compare' }, [
        el('h2', {}, '👯 En qué se diferencian'),
        el('div', { class: 'grid-2' }, [
          el('div', {}, [
            el('p', { class: 'hint' }, 'Pregunta 1 — difiere en: ' + (diff.onlyA.join(', ') || '(matices)')),
            el('div', { class: 'explanation' }, '«' + a.sourceQuote + '»'),
          ]),
          el('div', {}, [
            el('p', { class: 'hint' }, 'Pregunta 2 — difiere en: ' + (diff.onlyB.join(', ') || '(matices)')),
            el('div', { class: 'explanation' }, '«' + b.sourceQuote + '»'),
          ]),
        ]),
      ]));
    }

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
    if (pace) {
      const paceLines = [
        '⏱ Ritmo: mediana ' + Math.round(pace.medianMs / 1000) + 's/pregunta · a tu ritmo habrías llegado a la ' +
        pace.wouldReach + ' de ' + currentQuiz.questions.length +
        (pace.unanswered ? ' · ' + pace.unanswered + ' sin responder' : ''),
      ];
      if (pace.slowIndexes.length) {
        paceLines.push('🐢 Te atascaste (más del doble de tu mediana) en: ' +
          pace.slowIndexes.map((i) => 'nº ' + (i + 1)).join(', ') + '.');
      }
      for (const line of paceLines) bannerChildren.push(el('div', { class: 'detail' }, line));
    }
    if (dailyResult) {
      bannerChildren.push(el('div', { class: 'detail streak' }, dailyResult.counted
        ? '🔥 ¡Reto diario completado! Racha: ' + dailyResult.streak + ' día' + (dailyResult.streak > 1 ? 's' : '') + '.'
        : '🔥 El reto de hoy ya contaba para tu racha (' + dailyResult.streak + ').'));
    } else if (currentQuiz.mode === 'daily') {
      bannerChildren.push(el('div', { class: 'detail warn' },
        '🔥 Un reto entregado todo en blanco no cuenta para la racha: responde al menos una pregunta.'));
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
    // Estudio-confort: aviso honesto cuando el test apenas enseña nada nuevo
    if (comfortCheck.ok && comfortCheck.comfort) {
      bannerChildren.push(el('div', { class: 'detail warn' },
        '🛋 ' + comfortCheck.masteredCount + ' de ' + comfortCheck.withHistory +
        ' ya las dominabas: este test te ha enseñado poco nuevo.'));
    }
    if (currentQuiz.mode === 'ticket') {
      let ticketMsg;
      if (currentQuiz.consolidateOnly) {
        ticketMsg = 'Consolidación: acabas de ver las soluciones, así que esto no rescata — las falladas saldrán del repaso cuando las aciertes en otra sesión.';
      } else if (ticketRescued) {
        ticketMsg = ticketRescued + ' pregunta' + (ticketRescued > 1 ? 's' : '') + ' rescatada' + (ticketRescued > 1 ? 's' : '') + ' del repaso.';
      } else if (ticketHadRescuable) {
        ticketMsg = 'Nada rescatado: lo fallado sigue pendiente.';
      } else {
        ticketMsg = 'No había nada que rescatar: puro repaso de consolidación.';
      }
      bannerChildren.push(el('div', { class: 'detail streak' }, '🎟 ' + ticketMsg));
    }

    const actionRow = el('div', { class: 'row', style: 'justify-content: center; margin-top: 10px;' });
    if (currentSession && currentSession.index < currentSession.blocks.length - 1) {
      actionRow.appendChild(el('button', {
        class: 'btn primary',
        onclick: () => {
          currentSession.index++;
          runSessionBlock();
        },
      }, '▶ Siguiente bloque (' + (currentSession.index + 2) + '/' + currentSession.blocks.length + ')'));
    } else if (currentSession) {
      actionRow.appendChild(el('button', {
        class: 'btn primary',
        onclick: () => {
          currentSession.index++;
          runSessionBlock(); // → finishSession con ticket de salida
        },
      }, '🏁 Cerrar sesión'));
    } else {
      actionRow.appendChild(el('button', { class: 'btn primary', onclick: exitQuiz }, '↩ Nuevo test'));
      if (comfortCheck.ok && comfortCheck.comfort) {
        actionRow.appendChild(el('button', {
          class: 'btn',
          onclick: () => {
            exitQuiz();
            if ((user.failedIds || []).length) {
              $('quizMode').value = 'failed';
              $('startQuizBtn').click();
            } else {
              $('composeSessionBtn').click();
            }
          },
        }, '🎯 Ir a lo útil'));
      }
      // Ticket también tras un test normal, pero SOLO como consolidación:
      // la solución acaba de mostrarse y acertarla ya no demuestra nada.
      if (currentQuiz.mode === 'normal' || currentQuiz.mode === 'failed') {
        const ticket = C.buildExitTicket(scored.results, bank.active(), { rng: C.createRng(Math.floor(Math.random() * 1e9)) });
        if (ticket.length && scored.wrong > 0) {
          actionRow.appendChild(el('button', { class: 'btn', onclick: () => startExitTicket(ticket, { consolidateOnly: true }) }, '🎟 Consolidar fallos'));
        }
      }
    }
    actionRow.appendChild(el('button', { class: 'btn', onclick: shareCurrentQuiz }, '🔗 Compartir este test'));
    bannerChildren.push(actionRow);
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
      if (currentQuiz.questions.length > C.MAX_SHARE) {
        const goOn = confirm('Los enlaces llevan como máximo ' + C.MAX_SHARE + ' preguntas: se compartirán las ' +
          C.MAX_SHARE + ' primeras de las ' + currentQuiz.questions.length + ' de este test. ¿Continuar?');
        if (!goOn) return;
      }
      const fragment = C.encodeShare(currentQuiz.questions, { challenge });
      const url = location.href.split('#')[0] + '#' + fragment;
      showShareBox(url);
    } catch (e) {
      alert('No se pudo compartir: ' + e.message);
    }
  }

  /**
   * Caja inline con el enlace y botón «Copiar»: en `file://` el portapapeles
   * asíncrono falla y un prompt() con una URL de miles de caracteres es
   * inmanejable. La selección + execCommand funciona en todos los casos.
   */
  function showShareBox(url) {
    const old = document.getElementById('shareBox');
    if (old) old.remove();
    const input = el('input', { type: 'text', value: url, readonly: 'readonly', onclick: (ev) => ev.currentTarget.select() });
    const status = el('span', { class: 'hint' }, '');
    const copy = () => {
      input.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (e) { /* sin permiso */ }
      if (done) status.textContent = '✅ Copiado. Quien lo abra podrá hacer el test e importarlo.';
      else status.textContent = 'Selecciona el enlace y cópialo con Ctrl+C.';
    };
    const box = el('div', { class: 'card share-offer', id: 'shareBox' }, [
      el('h2', {}, '🔗 Enlace del test'),
      el('div', { class: 'row wrap' }, [
        input,
        el('button', { class: 'btn primary', onclick: copy }, '📋 Copiar'),
        el('button', { class: 'btn', onclick: () => box.remove() }, '✖ Cerrar'),
      ]),
      status,
    ]);
    $('quizResult').appendChild(box);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => { status.textContent = '✅ Copiado. Quien lo abra podrá hacer el test e importarlo.'; },
        copy
      );
    } else {
      copy();
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
    // El hash se consume: si quedara en la URL, cada recarga re-ofrecería el
    // mismo test y el reimport parecería un error («0 añadidas»).
    history.replaceState(null, '', location.pathname + location.search);
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
      // La recompensa de evaluador se paga solo con el PRIMER voto sobre la
      // pregunta: cambiar el sentido no es evaluar de nuevo (anti-granja).
      const firstVote = !C.hasVoted(q, USER_ID);
      const { changed } = C.vote(q, USER_ID, value);
      if (!changed) { feedback.textContent = 'Ya habías votado eso.'; return; }
      bank.update(q.id, { quality: q.quality });
      if (firstVote) rewardEvaluation();
      C.applyAuthorReward(q, credits) && bank.update(q.id, { quality: q.quality });
      // El corrector de una errata cobra cuando la comunidad confirma su arreglo
      C.applyCorrectorReward(q, credits) && bank.update(q.id, { quality: q.quality });
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

  // ---------- Editor de preguntas (manual + corrección de erratas) ----------

  /**
   * Editor compartido con validator.js como linter en vivo.
   * @param {object} cfg {title, initial?, errata?, saveLabel, onSave(clean), extraButtons?}
   */
  function questionEditor(cfg) {
    const q = cfg.initial || { text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', sourceQuote: '' };
    const lint = el('div', { class: 'hint lint' }, '');
    const fields = {};

    const optionRows = q.options.map((opt, i) => {
      fields['opt' + i] = el('input', { type: 'text', value: opt, oninput: relint });
      const radio = el('input', { type: 'radio', name: 'editorCorrect', value: i, onchange: relint });
      if (i === q.correctIndex) radio.checked = true;
      return el('div', { class: 'row editor-opt' }, [radio, el('span', { class: 'hint' }, String.fromCharCode(65 + i) + ')'), fields['opt' + i]]);
    });
    fields.text = el('textarea', { rows: 2, oninput: relint }, q.text);
    fields.explanation = el('textarea', { rows: 2, oninput: relint }, q.explanation);
    fields.sourceQuote = el('textarea', { rows: 2, oninput: relint }, q.sourceQuote);

    function collect() {
      const checked = box.querySelector('input[name="editorCorrect"]:checked');
      return {
        text: fields.text.value.trim(),
        options: [0, 1, 2, 3].map((i) => fields['opt' + i].value.trim()),
        correctIndex: checked ? parseInt(checked.value, 10) : -1,
        explanation: fields.explanation.value.trim(),
        sourceQuote: fields.sourceQuote.value.trim(),
      };
    }

    function relint() {
      const res = C.validateQuestion(collect());
      lint.textContent = res.ok ? '✅ La pregunta pasa la validación.' : '⚠ ' + res.errors.join(' · ');
      lint.classList.toggle('lint-ok', res.ok);
    }

    const box = el('div', { class: 'card editor' }, [
      el('h2', {}, cfg.title),
      cfg.errata ? el('div', { class: 'false-certainty' }, '🚩 Errata reportada: «' + cfg.errata + '»') : el('span', {}, ''),
      el('label', {}, ['Enunciado', fields.text]),
      el('div', { class: 'hint' }, 'Opciones (marca la correcta):'),
      ...optionRows,
      el('label', {}, ['Explicación', fields.explanation]),
      el('label', {}, ['Cita literal de la fuente', fields.sourceQuote]),
      lint,
      el('div', { class: 'row' }, [
        el('button', {
          class: 'btn primary',
          onclick: () => {
            const clean = collect();
            const res = C.validateQuestion(clean);
            if (!res.ok) return alert('La pregunta no es válida:\n· ' + res.errors.join('\n· '));
            cfg.onSave(clean);
          },
        }, cfg.saveLabel),
        ...(cfg.extraButtons || []),
        el('button', { class: 'btn', onclick: () => box.remove() }, '✖ Cancelar'),
      ]),
    ]);
    relint();
    return box;
  }

  $('writeQuestionBtn').addEventListener('click', () => {
    const area = $('editorArea');
    area.innerHTML = '';
    area.appendChild(questionEditor({
      title: '✍️ Aporta tu pregunta (gratis, sin IA)',
      saveLabel: '💾 Publicar en el banco',
      onSave: (clean) => {
        const dup = C.findDuplicate(clean.text + ' ' + clean.options.join(' '), bank.dedupTexts());
        if (dup) return alert('Ya existe una pregunta casi idéntica en el banco (similitud ' + Math.round(dup.score * 100) + '%).');
        clean.topic = currentTopic();
        clean.kind = 'manual';
        bank.add(clean, USER_ID, 'manual');
        user.contributed++;
        saveUser();
        $('editorArea').innerHTML = '';
        renderBank();
        alert('Pregunta publicada. Sin coste de créditos: la recompensa llegará si la comunidad la valora bien.');
      },
    }));
    area.scrollIntoView({ behavior: 'smooth' });
  });

  /** Abre el editor para corregir la primera errata abierta de una pregunta en revisión. */
  function openErrataEditor(q) {
    const idx = (q.quality.erratas || []).findIndex((e) => !e.resolved);
    if (idx === -1) return;
    const area = $('editorArea');
    area.innerHTML = '';
    area.appendChild(questionEditor({
      title: '🛠 Corregir errata',
      initial: q,
      errata: q.quality.erratas[idx].message,
      saveLabel: '💾 Guardar corrección',
      onSave: (clean) => {
        C.resolveErrata(q, idx, true, clean, USER_ID);
        bank.update(q.id, { quality: q.quality });
        saveUser();
        $('editorArea').innerHTML = '';
        renderBank();
        alert('Corrección aplicada: la pregunta vuelve al banco activo. Cobrarás ' + C.REWARDS.CORRECTOR_FIX +
          ' créditos cuando la comunidad confirme la corrección con votos positivos.');
      },
      extraButtons: [el('button', {
        class: 'btn',
        onclick: () => {
          C.resolveErrata(q, idx, false);
          bank.update(q.id, { quality: q.quality });
          $('editorArea').innerHTML = '';
          renderBank();
        },
      }, '🙅 Rechazar errata (la pregunta estaba bien)')],
    }));
    area.scrollIntoView({ behavior: 'smooth' });
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
    if (total > items.length) {
      list.appendChild(el('p', { class: 'hint' }, 'Mostrando las ' + items.length + ' más recientes de ' + total + '.'));
    }
    for (const q of items) {
      const score = C.score(q.quality);
      const openErratas = (q.quality.erratas || []).filter((e) => !e.resolved).length;
      const meta = el('div', { class: 'meta' }, [
        el('span', { class: 'badge ' + q.quality.status }, q.quality.status),
        el('span', {}, (q.topic && q.topic.ley) || 'sin ley'),
        el('span', {}, 'score ' + (score > 0 ? '+' : '') + score),
        el('span', {}, 'motor: ' + q.origin),
        el('span', {}, openErratas + ' erratas abiertas'),
      ]);
      if (q.quality.status === 'review' && openErratas > 0) {
        meta.appendChild(el('button', { class: 'btn small', onclick: () => openErrataEditor(q) }, '🛠 Corregir'));
      }
      list.appendChild(el('div', { class: 'bank-item' }, [el('div', {}, q.text), meta]));
    }
  }

  $('exportBtn').addEventListener('click', () => {
    const n = bank.all().length;
    if (!n) return alert('El banco está vacío: no hay nada que exportar.');
    const blob = new Blob([bank.exportJSON()], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'opotest-banco.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    $('bankSummary').textContent = '⬇ Exportadas ' + n + ' preguntas a opotest-banco.json · ' + $('bankSummary').textContent;
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

  // ---------- Repaso: flashcards Leitner + cazador de erratas ----------

  $('makeCardsBtn').addEventListener('click', () => {
    const text = $('sourceText').value.trim();
    if (text.length < 100) return alert('Pega antes un texto (o usa «Cargar ejemplo») para crear flashcards.');
    const cards = C.cardsFromFacts(C.parse(text).facts);
    if (!cards.length) return alert('No se encontraron definiciones, plazos ni enumeraciones convertibles en tarjetas.');
    const res = C.addCards(user.srs, cards);
    // Los mismos hechos alimentan los ejercicios «Completa el literal»
    const deck = C.buildClozeDeck(text);
    user.clozeDeck = user.clozeDeck || [];
    const existing = new Set(user.clozeDeck.map((i) => i.id));
    let clozeAdded = 0;
    for (const item of deck) {
      if (!existing.has(item.id)) {
        user.clozeDeck.push(item);
        clozeAdded++;
      }
    }
    saveUser();
    const cardsTxt = res.added === 1 ? '1 flashcard nueva' : res.added + ' flashcards nuevas';
    const clozeTxt = clozeAdded === 1 ? '1 ejercicio de completar' : clozeAdded + ' ejercicios de completar';
    alert('🧠 ' + cardsTxt + (res.skipped ? ' (' + res.skipped + ' ya existían)' : '') +
      (clozeAdded ? ' y ⌨️ ' + clozeTxt : '') + '. Todo en la pestaña «Repaso».');
  });

  // ---------- Chuleta sinóptica imprimible ----------

  $('cheatsheetBtn').addEventListener('click', () => {
    const text = $('sourceText').value.trim();
    if (text.length < 100) return alert('Pega antes un texto (o usa «Cargar ejemplo») para generar la chuleta.');
    const sheet = C.buildCheatsheet(text);
    if (!sheet.total) return alert('El texto no contiene plazos, definiciones ni enumeraciones que resumir.');
    const weak = C.weakRefs(bank.active(), (user.failedIds || []).concat(user.falseCertaintyIds || []));
    C.annotateWeak(sheet, weak);
    renderCheatsheet(sheet, $('metaLey').value.trim());
  });

  function renderCheatsheet(sheet, ley) {
    const old = document.getElementById('cheatsheetView');
    if (old) old.remove();
    const rows = (list, renderRow) => list.map((row) =>
      el('tr', { class: row.weak ? 'weak-row' : '' }, renderRow(row)));

    const view = el('div', { class: 'card cheatsheet', id: 'cheatsheetView' }, [
      el('h2', {}, '🖨 Chuleta' + (ley ? ' — ' + ley : '')),
      el('p', { class: 'hint no-print' }, 'Las filas destacadas 🔥 son artículos en los que fallas. «Imprimir» genera un PDF desde el navegador.'),
      el('h3', {}, '⏱ Plazos y números (' + sheet.plazos.length + ')'),
      el('table', {}, [el('tbody', {}, rows(sheet.plazos, (r) => [
        el('td', { class: 'cs-val' }, (r.weak ? '🔥 ' : '') + r.value),
        el('td', {}, r.sentence),
        el('td', { class: 'cs-ref' }, r.ref || ''),
      ]))]),
      el('h3', {}, '🔢 Otras cifras (' + sheet.cifras.length + ')'),
      el('table', {}, [el('tbody', {}, rows(sheet.cifras, (r) => [
        el('td', { class: 'cs-val' }, (r.weak ? '🔥 ' : '') + r.value),
        el('td', {}, r.sentence),
        el('td', { class: 'cs-ref' }, r.ref || ''),
      ]))]),
      el('h3', {}, '📖 Definiciones (' + sheet.definiciones.length + ')'),
      el('table', {}, [el('tbody', {}, rows(sheet.definiciones, (r) => [
        el('td', { class: 'cs-val' }, (r.weak ? '🔥 ' : '') + r.term),
        el('td', {}, r.definition),
        el('td', { class: 'cs-ref' }, r.ref || ''),
      ]))]),
      el('h3', {}, '📋 Enumeraciones (' + sheet.enumeraciones.length + ')'),
      el('div', {}, sheet.enumeraciones.map((e2) => el('div', { class: 'cs-enum' + (e2.weak ? ' weak-row' : '') }, [
        el('strong', {}, (e2.weak ? '🔥 ' : '') + (e2.ref || 'Lista')),
        el('ol', { class: 'cs-items' }, e2.items.map((it) => el('li', {}, it))),
      ]))),
      el('div', { class: 'row no-print' }, [
        el('button', { class: 'btn primary', onclick: () => window.print() }, '🖨 Imprimir / guardar PDF'),
        el('button', { class: 'btn', onclick: () => $('cheatsheetView').remove() }, '✖ Cerrar'),
      ]),
    ]);
    $('generateResult').parentNode.appendChild(view);
    view.scrollIntoView({ behavior: 'smooth' });
  }

  function renderReview() {
    // Cada tarjeta se inserta arriba: el orden de llamada es el INVERSO de la
    // prioridad visual (falladas arriba, como en el compositor de sesión).
    renderTwinsCard();
    renderStalenessCard();
    renderFailedCard();
    renderSrs();
    renderTrapIntro();
    renderClozeInfo();
  }

  /** Radar de olvido: protege lo que ya sabes antes de que se enfríe. */
  function renderStalenessCard() {
    const old = document.getElementById('stalenessCard');
    if (old) old.remove();
    const cold = C.coldMasteredQuestions(bank.active(), user);
    if (!cold.length) return;
    const card = el('div', { class: 'card', id: 'stalenessCard' }, [
      el('h2', {}, '🧊 ' + cold.length + ' dominada' + (cold.length > 1 ? 's' : '') + ' se está' + (cold.length > 1 ? 'n' : '') + ' enfriando'),
      el('p', { class: 'hint' }, 'Las preguntas que sabes pero llevan más tests sin aparecer: repásalas antes de que el olvido las borre.'),
      el('button', {
        class: 'btn primary',
        onclick: () => {
          // recommended: la app lo pide a propósito con dominadas → el
          // detector de confort no debe reñir por hacerle caso
          currentQuiz = { questions: cold.slice(0, 10), submitted: false, mode: 'normal', recommended: true };
          document.querySelector('[data-tab="quiz"]').click();
          renderQuizArea();
        },
      }, '❄️ Antióxido: repasar las frías'),
    ]);
    const panel = $('panel-review');
    panel.insertBefore(card, panel.firstChild);
  }

  /** Parejas confundibles: entrena la diferencia entre casi-iguales. */
  function renderTwinsCard() {
    const old = document.getElementById('twinsCard');
    if (old) old.remove();
    const pairs = C.findConfusablePairs(bank.active(), user);
    if (!pairs.length) return; // sin pares no hay tarjeta: un cajón vacío arriba solo estorba
    const card = el('div', { class: 'card', id: 'twinsCard' }, [el('h2', {}, '👯 Parejas confundibles')]);
    {
      card.appendChild(el('p', { class: 'hint' }, pairs.length + ' pareja' + (pairs.length > 1 ? 's' : '') +
        ' detectada' + (pairs.length > 1 ? 's' : '') + ': dos preguntas casi iguales donde caes. Respóndelas seguidas y aprende a distinguirlas.'));
      card.appendChild(el('button', {
        class: 'btn primary',
        onclick: () => {
          const pair = pairs[0];
          currentQuiz = { questions: [pair.a, pair.b], submitted: false, mode: 'twins', pair };
          document.querySelector('[data-tab="quiz"]').click();
          renderQuizArea();
        },
      }, '👯 Jugar la pareja más traicionera'));
    }
    const panel = $('panel-review');
    panel.insertBefore(card, panel.firstChild);
  }

  /**
   * El «repaso de falladas» vive en Hacer test, pero su sitio natural de
   * descubrimiento es esta pestaña: tarjeta con el pendiente y acceso directo.
   */
  function renderFailedCard() {
    const old = document.getElementById('failedCard');
    if (old) old.remove();
    const failed = (user.failedIds || []).length;
    if (!failed) return;
    const fc = (user.falseCertaintyIds || []).length;
    const cb = (user.chainBreakerIds || []).length;
    const detail = [fc && fc + ' falsas certezas', cb && cb + ' rompe-cadenas'].filter(Boolean).join(', ');
    const card = el('div', { class: 'card', id: 'failedCard' }, [
      el('h2', {}, '📌 Falladas pendientes: ' + failed),
      el('p', { class: 'hint' }, (detail ? 'Prioridad: ' + detail + '. ' : '') +
        'Acertarlas las saca del repaso.'),
      el('button', {
        class: 'btn primary',
        onclick: () => {
          document.querySelector('[data-tab="quiz"]').click();
          $('quizMode').value = 'failed';
          $('startQuizBtn').click();
        },
      }, '▶ Repasar falladas ahora'),
    ]);
    const panel = $('panel-review');
    panel.insertBefore(card, panel.firstChild);
  }

  // ---------- Completa el literal (cloze) ----------

  function renderClozeInfo() {
    const deck = user.clozeDeck || [];
    $('clozeInfo').textContent = deck.length
      ? deck.length + ' ejercicios disponibles.'
      : 'Sin ejercicios: créalos con «🧠 Crear flashcards» en Generar.';
    $('clozeArea').innerHTML = '';
  }

  $('clozeStartBtn').addEventListener('click', () => {
    const deck = user.clozeDeck || [];
    if (!deck.length) return alert('Primero crea ejercicios con «🧠 Crear flashcards» en la pestaña Generar.');
    const item = deck[Math.floor(Math.random() * deck.length)];
    const blanks = parseInt($('clozeBlanks').value, 10);
    const round = C.makeRound(item, blanks, C.createRng(Math.floor(Math.random() * 1e9)));
    renderClozeRound(round);
  });

  function renderClozeRound(round) {
    const area = $('clozeArea');
    area.innerHTML = '';
    const inputs = [];
    const box = el('div', { class: 'flashcard' }, [
      el('div', { class: 'meta' }, round.ref || 'Texto'),
      el('div', { class: 'front' }, round.display),
    ]);
    round.answers.forEach((word, i) => {
      let hintLevel = 0;
      const input = el('input', { type: 'text', placeholder: 'Hueco ' + (i + 1) });
      const hintBtn = el('button', {
        class: 'btn small',
        onclick: () => {
          hintLevel = Math.min(2, hintLevel + 1);
          hintSpan.textContent = C.hintFor(word, hintLevel);
        },
      }, '💡 Pista');
      const hintSpan = el('span', { class: 'hint' }, '');
      inputs.push(input);
      box.appendChild(el('div', { class: 'row cloze-row' }, [input, hintBtn, hintSpan]));
    });
    const correctBtn = el('button', {
      class: 'btn primary',
      onclick: (ev) => {
        // Un solo uso: re-corregir contaminaría los inputs con la solución.
        ev.currentTarget.disabled = true;
        let allCorrect = true;
        round.answers.forEach((word, i) => {
          const res = C.checkClozeAnswer(word, inputs[i].value);
          inputs[i].classList.add(res.correct ? 'cloze-ok' : 'cloze-bad');
          inputs[i].disabled = true;
          if (!res.correct) {
            allCorrect = false;
            // La solución va en un rótulo aparte, nunca dentro del input
            inputs[i].insertAdjacentElement('afterend',
              el('span', { class: 'cloze-solution' }, '→ ' + word + (res.close ? ' (¡casi!)' : '')));
          }
        });
        box.appendChild(el('div', { class: 'explanation' },
          (allCorrect ? '✅ ¡Literal clavado!' : '📖 Revisa el literal completo arriba.') +
          (round.ref ? ' (' + round.ref + ')' : '')));
      },
    }, '✔ Corregir');
    box.appendChild(el('div', { class: 'row' }, [
      correctBtn,
      el('button', { class: 'btn', onclick: () => $('clozeStartBtn').click() }, '↻ Otro ejercicio'),
    ]));
    area.appendChild(box);
  }

  function renderSrs() {
    const summary = $('srsSummary');
    const area = $('srsArea');
    summary.innerHTML = '';
    area.innerHTML = '';
    const counts = C.boxCounts(user.srs);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    summary.appendChild(el('span', { class: 'hint' }, total
      ? 'Cajas: ' + [1, 2, 3, 4, 5].map((b) => 'C' + b + ':' + counts[b]).join(' · ')
      : 'Aún no tienes tarjetas.'));
    if (!total) return;

    const due = C.dueCards(user.srs);
    if (!due.length) {
      const next = C.nextDue(user.srs);
      area.appendChild(el('p', { class: 'hint' }, '✅ Nada pendiente hoy.' +
        (next ? ' Próximo repaso: ' + new Date(next).toLocaleDateString() + '.' : '')));
      return;
    }
    area.appendChild(el('p', { class: 'hint' }, due.length + ' tarjeta' + (due.length > 1 ? 's' : '') + ' por repasar hoy.'));
    showFlashcard(area, due[0], due.length);
  }

  function showFlashcard(area, card, remaining) {
    const box = el('div', { class: 'flashcard' }, [
      el('div', { class: 'meta' }, 'Caja ' + card.box + ' · quedan ' + remaining),
      el('div', { class: 'front' }, card.front),
    ]);
    const reveal = el('button', {
      class: 'btn primary',
      onclick: () => {
        reveal.remove();
        box.appendChild(el('div', { class: 'back' }, card.back));
        box.appendChild(el('div', { class: 'row' }, [
          el('button', { class: 'btn small', onclick: () => gradeCard(card, 'know') }, '😎 La sabía'),
          el('button', { class: 'btn small', onclick: () => gradeCard(card, 'doubt') }, '🤔 Dudé'),
          el('button', { class: 'btn small', onclick: () => gradeCard(card, 'fail') }, '❌ No la sabía'),
        ]));
      },
    }, '👁 Mostrar respuesta');
    box.appendChild(reveal);
    area.appendChild(box);
  }

  function gradeCard(card, grade) {
    C.review(user.srs, card.id, grade);
    saveUser();
    renderSrs();
  }

  let currentTrapRound = null;

  function renderTrapIntro() {
    const area = $('trapArea');
    area.innerHTML = '';
    currentTrapRound = null;
    const round = C.buildTrapRound(bank.active(), { rng: C.createRng(Math.floor(Math.random() * 1e9)) });
    if (!round) {
      area.appendChild(el('p', { class: 'hint' }, 'Necesitas al menos 4 preguntas en el banco con citas distintas. Genera más en «Generar».'));
      return;
    }
    area.appendChild(el('button', { class: 'btn primary', onclick: () => startTrapRound(round) }, '🎯 Jugar una ronda'));
  }

  function startTrapRound(round) {
    currentTrapRound = { round, picked: null };
    const area = $('trapArea');
    area.innerHTML = '';
    area.appendChild(el('p', { class: 'hint' }, '¿Cuál de estas afirmaciones está saboteada?'));
    round.statements.forEach((s, i) => {
      area.appendChild(el('button', {
        class: 'option trap-option',
        'data-i': i,
        onclick: (ev) => pickTrapStatement(i, ev.currentTarget),
      }, String.fromCharCode(65 + i) + ') ' + s));
    });
  }

  function pickTrapStatement(index, node) {
    if (currentTrapRound.picked !== null) return;
    currentTrapRound.picked = index;
    node.classList.add('selected');
    const area = $('trapArea');
    area.appendChild(el('p', { class: 'hint' }, '¿Y qué se cambió?'));
    const kindRow = el('div', { class: 'row wrap' });
    for (const [kind, label] of Object.entries(C.KIND_LABELS)) {
      kindRow.appendChild(el('button', { class: 'btn small', onclick: () => finishTrapRound(kind) }, label));
    }
    area.appendChild(kindRow);
  }

  function finishTrapRound(pickedKind) {
    if (currentTrapRound.finished) return; // un solo veredicto por ronda
    currentTrapRound.finished = true;
    const { round, picked } = currentTrapRound;
    const verdict = C.checkAnswer(round, picked, pickedKind);
    const area = $('trapArea');
    area.querySelectorAll('.btn.small').forEach((b) => { b.disabled = true; });
    area.querySelectorAll('.trap-option').forEach((optEl, i) => {
      if (i === round.trapIndex) optEl.classList.add('wrong');
      optEl.disabled = true;
    });
    const messages = [
      verdict.statementCorrect ? '✅ ¡Cazada! Señalaste la afirmación saboteada.' : '❌ La saboteada era la ' + String.fromCharCode(65 + round.trapIndex) + '.',
      (verdict.kindCorrect ? '✅' : '❌') + ' Tipo de sabotaje: ' + C.KIND_LABELS[round.mutationKind] + '.',
      'Original: «' + round.original + '»',
    ];
    area.appendChild(el('div', { class: 'explanation' }, messages.join(' ')));
    area.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', onclick: renderTrapIntro }, '🎯 Otra ronda'),
      el('span', { class: 'hint' }, 'Este ojo entrenado vale oro: cuando veas una errata real en un test, repórtala con 🚩.'),
    ]));
  }

  /** Test de entrenamiento filtrado por tipo de dato (0 IA, 0 créditos). */
  function startKindTraining(kind, label) {
    const pool = C.questionsByKind(bank.active(), kind);
    if (!pool.length) return alert('No quedan preguntas activas de tipo «' + label + '».');
    const { questions } = C.buildQuiz(pool, {
      count: Math.min(10, pool.length),
      seenIds: user.seenIds,
      rng: C.createRng(Math.floor(Math.random() * 1e9)),
    });
    // recommended: entrenamiento propuesto por la app → sin aviso de confort
    currentQuiz = { questions, submitted: false, mode: 'normal', recommended: true };
    document.querySelector('[data-tab="quiz"]').click();
    renderQuizArea();
  }

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
    // Celdas con preguntas dominadas «frías» (radar de olvido): matiz ❄️
    const coldByCell = new Set();
    for (const q of C.coldMasteredQuestions(bank.active(), user)) {
      const article = C.articleOf(q);
      if (article) coldByCell.add(((q.topic && q.topic.ley) || '(sin ley)') + '|' + article);
    }

    for (const row of grid) {
      box.appendChild(el('h3', { class: 'coverage-ley' }, row.ley));
      const cells = el('div', { class: 'coverage-row' });
      for (const cell of row.cells) {
        const isCold = coldByCell.has(row.ley + '|' + cell.article);
        const tip = cell.status === 'empty'
          ? 'Artículo ' + cell.article + ': acotado pero sin preguntas. Clic para generar.'
          : 'Artículo ' + cell.article + ': ' + cell.total + ' preguntas · ' +
            (cell.attempts ? cell.correct + '/' + cell.attempts + ' aciertos (' + Math.round(cell.accuracy * 100) + '%)' : 'sin intentar') +
            (isCold ? ' · dominado pero enfriándose' : '') +
            '. Clic para hacer test.';
        cells.appendChild(el('button', {
          class: 'coverage-cell ' + cell.status,
          title: tip,
          onclick: () => onCoverageCellClick(row.ley, cell),
        }, [COVERAGE_ICONS[cell.status] + (isCold ? '❄️' : '') + ' ', el('span', {}, cell.article)]));
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

    // ¿Aprobarías hoy? (Monte Carlo sobre el historial por pregunta)
    const readyBox = $('readinessBox');
    readyBox.innerHTML = '';
    const readiness = C.estimateReadiness(bank.active(), user.perQuestion, {
      rng: C.createRng(Math.floor(Math.random() * 1e9)),
    });
    if (!readiness.ok) {
      // Con banco menor que el mínimo, «haz más tests» sería inalcanzable
      const advice = bank.active().length < readiness.needed
        ? 'Tu banco tiene ' + bank.active().length + ' preguntas activas y el medidor necesita ' + readiness.needed + ': genera más preguntas primero.'
        : 'Has practicado ' + readiness.attempted + ' de las ' + readiness.needed + ' mínimas. Haz más tests y vuelve.';
      readyBox.appendChild(el('p', { class: 'hint' }, 'Aún no hay datos suficientes. ' + advice));
    } else {
      const pct = Math.round(readiness.passRate * 100);
      readyBox.appendChild(el('div', { class: 'readiness-dial ' + (pct >= 70 ? 'good' : pct >= 40 ? 'medium' : 'weak') }, [
        el('div', { class: 'big' }, pct + '%'),
        el('div', { class: 'detail' }, 'Hoy aprobarías ~' + readiness.passed + ' de ' + readiness.simulations +
          ' exámenes simulados (nota media ' + readiness.avgScore.toFixed(2) + ').'),
      ]));
      if (readiness.weakSpots.length) {
        readyBox.appendChild(el('p', { class: 'hint' }, 'Dónde pierdes más nota:'));
        const list = el('ul', { class: 'weak-list' });
        for (const spot of readiness.weakSpots) {
          list.appendChild(el('li', {}, [
            spot.label + ' (' + spot.questions + ' preguntas practicadas) ',
            el('button', {
              class: 'btn small',
              onclick: () => {
                document.querySelector('[data-tab="coverage"]').click();
              },
            }, '📊 Ver en radiografía'),
          ]));
        }
        readyBox.appendChild(list);
      }
    }

    // Talón de Aquiles: acierto por tipo de dato
    const kindBox = $('kindProfileBox');
    kindBox.innerHTML = '';
    const profile = C.buildKindProfile(bank.active(), user.perQuestion);
    if (!profile.rows.length) {
      kindBox.appendChild(el('p', { class: 'hint' }, 'Haz tests para descubrir qué tipo de dato se te resiste.'));
    } else {
      for (const row of profile.rows) {
        const isWeakest = profile.weakest && row.kind === profile.weakest.kind;
        kindBox.appendChild(el('div', { class: 'kind-row' + (isWeakest ? ' weakest' : '') }, [
          el('span', { class: 'kind-label' }, (isWeakest ? '🎯 ' : '') + row.label),
          el('span', { class: 'kind-acc' }, row.accuracy === null
            ? 'sin datos (' + row.attempts + '/' + C.MIN_ATTEMPTS_PER_KIND + ' intentos)'
            : row.accuracy + '% en ' + row.attempts + ' intentos'),
          row.accuracy !== null ? el('button', {
            class: 'btn small',
            onclick: () => startKindTraining(row.kind, row.label),
          }, '▶ Entrenar') : el('span', {}, ''),
        ]));
      }
      if (profile.weakest) {
        kindBox.appendChild(el('p', { class: 'hint' },
          '🎯 Tu talón de Aquiles: ' + profile.weakest.label.toLowerCase() + ' (' + profile.weakest.accuracy + '%).'));
      }
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

  // Un simulacro cronometrado a medias no debe perderse por una recarga
  // accidental: el navegador pide confirmación mientras haya uno en curso.
  window.addEventListener('beforeunload', (e) => {
    if (currentQuiz && currentQuiz.mode === 'exam' && !currentQuiz.submitted) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---------- Arranque ----------

  renderCredits();
  renderQuizSetup();
  saveUser();
  handleIncomingShare();
})();
