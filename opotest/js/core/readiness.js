/**
 * readiness.js — «¿Aprobarías hoy?»: estima la probabilidad de aprobar
 * simulando N exámenes virtuales (Monte Carlo) sobre tu historial por
 * pregunta (perQuestion, de quiz.updateHistory). Con pocos datos NO da
 * número: un porcentaje engañoso es peor que ninguno.
 * Módulo puro: RNG inyectable, determinista en tests.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;
  const coverage = isNode ? require('./coverage.js') : window.OpoCore;

  const DEFAULTS = {
    simulations: 100,
    examSize: 20,
    passMark: 5,     // nota de corte sobre 10
    penalty: 1 / 3,  // baremo: cada fallo resta 1/3
    minAttempted: 10, // guard: mínimo de preguntas intentadas para estimar
  };

  /**
   * Probabilidad de acierto por pregunta con suavizado de Laplace:
   * evita 0% y 100% con muy pocos intentos.
   */
  function successProbability(tally) {
    return (tally.correct + 1) / (tally.attempts + 2);
  }

  /**
   * Estima la preparación del opositor.
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} perQuestion historial {id: {attempts, correct}}
   * @param {object} [opts] {simulations, examSize, passMark, penalty, minAttempted, rng}
   * @returns {{ok: false, reason: 'insufficient', attempted, needed} |
   *   {ok: true, passRate, passed, simulations, avgScore, weakSpots: Array}}
   */
  function estimateReadiness(activeQuestions, perQuestion, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const history = perQuestion || {};
    const pool = activeQuestions
      .filter((q) => history[q.id] && history[q.id].attempts > 0)
      .map((q) => ({ q, p: successProbability(history[q.id]) }));

    if (pool.length < o.minAttempted) {
      return { ok: false, reason: 'insufficient', attempted: pool.length, needed: o.minAttempted };
    }

    const rng = o.rng || gen.createRng(24681357);
    let passed = 0;
    let scoreSum = 0;
    for (let s = 0; s < o.simulations; s++) {
      let correct = 0;
      let wrong = 0;
      for (let i = 0; i < o.examSize; i++) {
        // Muestreo con reemplazo: el examen virtual pregunta lo que tú ya practicaste
        const pick = pool[Math.floor(rng() * pool.length)];
        if (rng() < pick.p) correct++;
        else wrong++;
      }
      const score10 = Math.max(0, ((correct - wrong * o.penalty) / o.examSize) * 10);
      scoreSum += score10;
      if (score10 >= o.passMark) passed++;
    }

    return {
      ok: true,
      passed,
      simulations: o.simulations,
      passRate: passed / o.simulations,
      avgScore: Math.round((scoreSum / o.simulations) * 100) / 100,
      weakSpots: weakSpots(pool, o.penalty),
    };
  }

  /**
   * Los 3 artículos que más nota te quitan: pérdida esperada por pregunta
   * (1 − p) · (1 + penalización), agregada por ley × artículo.
   */
  function weakSpots(pool, penalty) {
    const byLabel = new Map();
    for (const { q, p } of pool) {
      const article = coverage.articleOf(q);
      const ley = (q.topic && q.topic.ley) || '(sin ley)';
      const label = article ? 'Artículo ' + article + ' — ' + ley : ley;
      const entry = byLabel.get(label) || { label, ley, article, loss: 0, questions: 0 };
      entry.loss += (1 - p) * (1 + penalty);
      entry.questions++;
      byLabel.set(label, entry);
    }
    return Array.from(byLabel.values())
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 3)
      .map((e) => ({ label: e.label, ley: e.ley, article: e.article, loss: Math.round(e.loss * 100) / 100, questions: e.questions }));
  }

  const api = { estimateReadiness, successProbability, READINESS_DEFAULTS: DEFAULTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
