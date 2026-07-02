/**
 * quiz.js — Construcción de tests (anti-repetición, reparto por temas),
 * corrección con penalización de oposición y repaso de falladas.
 * Módulo puro: sin DOM. RNG inyectable.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  /**
   * Selecciona preguntas para un test evitando las ya vistas por el usuario.
   * Si no hay suficientes nuevas, rellena con vistas (las más antiguas primero).
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} opts {count, seenIds: string[], rng}
   * @returns {{questions: Array, reused: number}}
   */
  function buildQuiz(activeQuestions, opts) {
    const o = opts || {};
    const count = o.count || 10;
    const rng = o.rng || gen.createRng(Date.now ? 987654321 : 1);
    const seen = new Set(o.seenIds || []);

    const fresh = gen.shuffle(activeQuestions.filter((q) => !seen.has(q.id)), rng);
    const picked = fresh.slice(0, count);
    let reused = 0;

    if (picked.length < count) {
      // Rellenar con vistas, en el orden del historial (las vistas hace más tiempo primero)
      const seenOrder = (o.seenIds || []);
      const byId = new Map(activeQuestions.map((q) => [q.id, q]));
      for (const id of seenOrder) {
        if (picked.length >= count) break;
        const q = byId.get(id);
        if (q && !picked.includes(q)) {
          picked.push(q);
          reused++;
        }
      }
    }
    return { questions: picked, reused };
  }

  /**
   * Test compuesto por varios temas: [{questions: Array activas del tema, count}].
   * Reparte y concatena; útil para "40 de tema A, 30 de B, 30 de C".
   */
  function buildDistributedQuiz(requests, opts) {
    const o = opts || {};
    const rng = o.rng || gen.createRng(24680);
    const all = [];
    let reusedTotal = 0;
    const perTopic = [];
    for (const req of requests) {
      const { questions, reused } = buildQuiz(req.questions, { count: req.count, seenIds: o.seenIds, rng });
      perTopic.push({ requested: req.count, served: questions.length });
      reusedTotal += reused;
      for (const q of questions) if (!all.includes(q)) all.push(q);
    }
    return { questions: gen.shuffle(all, rng), reused: reusedTotal, perTopic };
  }

  /**
   * Corrige un test.
   * @param {Array} questions preguntas del test
   * @param {Array<number|null>} answers índice elegido por pregunta (null = en blanco)
   * @param {object} [opts] {penalty: fracción que descuenta cada fallo, por defecto 1/3 (baremo habitual)}
   * @returns {{correct, wrong, blank, total, score10, results: Array}}
   */
  function scoreQuiz(questions, answers, opts) {
    const penalty = opts && typeof opts.penalty === 'number' ? opts.penalty : 1 / 3;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const results = questions.map((q, i) => {
      const answer = answers[i];
      if (answer === null || answer === undefined) {
        blank++;
        return { id: q.id, outcome: 'blank', correctIndex: q.correctIndex };
      }
      if (answer === q.correctIndex) {
        correct++;
        return { id: q.id, outcome: 'correct', correctIndex: q.correctIndex };
      }
      wrong++;
      return { id: q.id, outcome: 'wrong', correctIndex: q.correctIndex, given: answer };
    });
    const total = questions.length;
    const raw = total ? ((correct - wrong * penalty) / total) * 10 : 0;
    const score10 = Math.max(0, Math.round(raw * 100) / 100);
    return { correct, wrong, blank, total, score10, results };
  }

  /**
   * Actualiza el historial del usuario tras corregir un test.
   * Muta y devuelve userState {seenIds: [], failedIds: [], stats}.
   */
  function updateHistory(userState, scored) {
    userState.seenIds = userState.seenIds || [];
    userState.failedIds = userState.failedIds || [];
    userState.stats = userState.stats || { tests: 0, correct: 0, wrong: 0, blank: 0 };
    for (const r of scored.results) {
      // Mover al final: es la más recientemente vista
      const idx = userState.seenIds.indexOf(r.id);
      if (idx !== -1) userState.seenIds.splice(idx, 1);
      userState.seenIds.push(r.id);
      const fIdx = userState.failedIds.indexOf(r.id);
      if (r.outcome === 'wrong') {
        if (fIdx === -1) userState.failedIds.push(r.id);
      } else if (r.outcome === 'correct' && fIdx !== -1) {
        userState.failedIds.splice(fIdx, 1); // acertada: sale del repaso
      }
    }
    userState.stats.tests++;
    userState.stats.correct += scored.correct;
    userState.stats.wrong += scored.wrong;
    userState.stats.blank += scored.blank;
    return userState;
  }

  /** Test de repaso: solo preguntas falladas previamente. */
  function buildReviewQuiz(activeQuestions, failedIds, count, rng) {
    const byId = new Map(activeQuestions.map((q) => [q.id, q]));
    const pool = (failedIds || []).map((id) => byId.get(id)).filter(Boolean);
    const shuffled = gen.shuffle(pool, rng || gen.createRng(13579));
    return shuffled.slice(0, count || shuffled.length);
  }

  const api = { buildQuiz, buildDistributedQuiz, scoreQuiz, updateHistory, buildReviewQuiz };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
