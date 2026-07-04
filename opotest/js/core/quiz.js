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

  /** Niveles de confianza del termómetro metacognitivo. */
  const CONFIDENCE = { SURE: 'sure', DOUBT: 'doubt', GUESS: 'guess' };

  /**
   * Corrige un test.
   * @param {Array} questions preguntas del test
   * @param {Array<number|null>} answers índice elegido por pregunta (null = en blanco)
   * @param {object} [opts] {penalty: fracción que descuenta cada fallo (1/3 por defecto),
   *                         confidences: Array<'sure'|'doubt'|'guess'|null> por pregunta}
   * @returns {{correct, wrong, blank, total, score10, falseCertainties, results: Array}}
   *   Una «falsa certeza» es un fallo respondido con confianza 'sure': el
   *   conocimiento erróneo que más suspende oposiciones.
   */
  function scoreQuiz(questions, answers, opts) {
    const penalty = opts && typeof opts.penalty === 'number' ? opts.penalty : 1 / 3;
    const confidences = (opts && opts.confidences) || [];
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    const results = questions.map((q, i) => {
      const answer = answers[i];
      const confidence = confidences[i] || null;
      let r;
      if (answer === null || answer === undefined) {
        blank++;
        r = { id: q.id, outcome: 'blank', correctIndex: q.correctIndex };
      } else if (answer === q.correctIndex) {
        correct++;
        r = { id: q.id, outcome: 'correct', correctIndex: q.correctIndex };
      } else {
        wrong++;
        r = { id: q.id, outcome: 'wrong', correctIndex: q.correctIndex, given: answer };
      }
      if (confidence) r.confidence = confidence;
      if (r.outcome === 'wrong' && confidence === CONFIDENCE.SURE) r.falseCertainty = true;
      return r;
    });
    const total = questions.length;
    const raw = total ? ((correct - wrong * penalty) / total) * 10 : 0;
    const score10 = Math.max(0, Math.round(raw * 100) / 100);
    const falseCertainties = results.filter((r) => r.falseCertainty).length;
    return { correct, wrong, blank, total, score10, falseCertainties, results };
  }

  /**
   * Actualiza el historial del usuario tras corregir un test.
   * Muta y devuelve userState {seenIds: [], failedIds: [], stats}.
   */
  /**
   * @param {object} [opts]
   *   {countAsTest: false} — modos que corrigen pregunta a pregunta (cadena):
   *     acumulan aciertos/fallos pero no suman un «test hecho» por respuesta.
   *   {noRescue: true} — rescate diferido (ticket de salida): un acierto NO
   *     saca la pregunta de failedIds/falseCertaintyIds; solo el ticket
   *     posterior rescata (exitTicket.applyTicketRescue). Por defecto, el
   *     comportamiento clásico (acierto = rescate inmediato) no cambia.
   */
  function updateHistory(userState, scored, opts) {
    const noRescue = !!(opts && opts.noRescue);
    userState.seenIds = userState.seenIds || [];
    userState.failedIds = userState.failedIds || [];
    userState.falseCertaintyIds = userState.falseCertaintyIds || [];
    userState.stats = userState.stats || { tests: 0, correct: 0, wrong: 0, blank: 0 };
    // Historial por pregunta (alimenta la radiografía del temario). Tolerante
    // con estados antiguos que no lo tenían.
    userState.perQuestion = userState.perQuestion || {};
    for (const r of scored.results) {
      if (r.outcome !== 'blank') {
        const tally = userState.perQuestion[r.id] || (userState.perQuestion[r.id] = { attempts: 0, correct: 0 });
        tally.attempts++;
        if (r.outcome === 'correct') tally.correct++;
        // La última confianza matiza el «dominio» (radar de olvido): un
        // acierto adivinando no es saber. Campo opcional, tolerante con
        // estados antiguos que no lo tienen.
        if (r.confidence) tally.lastConfidence = r.confidence;
        else if (r.outcome === 'correct') delete tally.lastConfidence;
      }
    }
    for (const r of scored.results) {
      // Mover al final: es la más recientemente vista
      const idx = userState.seenIds.indexOf(r.id);
      if (idx !== -1) userState.seenIds.splice(idx, 1);
      userState.seenIds.push(r.id);
      const fIdx = userState.failedIds.indexOf(r.id);
      if (r.outcome === 'wrong') {
        if (fIdx === -1) userState.failedIds.push(r.id);
      } else if (r.outcome === 'correct' && fIdx !== -1 && !noRescue) {
        userState.failedIds.splice(fIdx, 1); // acertada: sale del repaso
      }
      // Falsas certezas: entran al fallar con «Seguro», salen al acertar
      const fcIdx = userState.falseCertaintyIds.indexOf(r.id);
      if (r.falseCertainty) {
        if (fcIdx === -1) userState.falseCertaintyIds.push(r.id);
      } else if (r.outcome === 'correct' && fcIdx !== -1 && !noRescue) {
        userState.falseCertaintyIds.splice(fcIdx, 1);
      }
      // Rompe-cadenas (si el estado los usa): un acierto también los redime
      if (Array.isArray(userState.chainBreakerIds) && r.outcome === 'correct' && !noRescue) {
        const cbIdx = userState.chainBreakerIds.indexOf(r.id);
        if (cbIdx !== -1) userState.chainBreakerIds.splice(cbIdx, 1);
      }
    }
    if (!opts || opts.countAsTest !== false) userState.stats.tests++;
    userState.stats.correct += scored.correct;
    userState.stats.wrong += scored.wrong;
    userState.stats.blank += scored.blank;
    return userState;
  }

  /**
   * Test de repaso: solo preguntas falladas previamente. Las falsas certezas
   * (priorityIds) van primero: son el conocimiento erróneo más peligroso.
   */
  function buildReviewQuiz(activeQuestions, failedIds, count, rng, priorityIds) {
    const random = rng || gen.createRng(13579);
    const byId = new Map(activeQuestions.map((q) => [q.id, q]));
    const priority = new Set(priorityIds || []);
    const pool = (failedIds || []).map((id) => byId.get(id)).filter(Boolean);
    const first = gen.shuffle(pool.filter((q) => priority.has(q.id)), random);
    // El resto respeta el orden recibido: el llamador puede pasar las falladas
    // ordenadas por antigüedad (staleness.orderFailedByAge) — repaso espaciado.
    const rest = pool.filter((q) => !priority.has(q.id));
    return first.concat(rest).slice(0, count || pool.length);
  }

  const api = { buildQuiz, buildDistributedQuiz, scoreQuiz, updateHistory, buildReviewQuiz, CONFIDENCE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
