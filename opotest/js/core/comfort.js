/**
 * comfort.js — Detector de estudio-confort: la anti-recomendación. Todo lo
 * demás sugiere QUÉ hacer; esto avisa cuando lo que acabas de hacer es
 * cómodo pero estéril (repetir lo que ya dominas), el sesgo nº 1 del
 * opositor. Informativo, nunca penaliza. Módulo puro.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const staleness = isNode ? require('./staleness.js') : window.OpoCore;

  const DEFAULTS = {
    threshold: 0.7,      // ≥70% ya dominado → sesión de confort
    minWithHistory: 4,   // por debajo, «sin veredicto» (nunca un falso aviso)
  };

  /**
   * Evalúa el test recién corregido contra el historial PREVIO (llamar antes
   * de updateHistory: el propio test no debe contaminar el diagnóstico).
   * @param {object} scored resultado de scoreQuiz
   * @param {object} perQuestionBefore historial {id: {attempts, correct, lastConfidence?}}
   * @returns {{ok: false, reason: 'insufficient'} |
   *   {ok: true, comfort: boolean, masteredCount, withHistory, total, ratio}}
   */
  function assessSession(scored, perQuestionBefore, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const history = perQuestionBefore || {};
    let withHistory = 0;
    let masteredCount = 0;
    for (const r of scored.results) {
      const tally = history[r.id];
      if (!tally || !tally.attempts) continue;
      withHistory++;
      if (staleness.isMastered(tally)) masteredCount++;
    }
    if (withHistory < o.minWithHistory) return { ok: false, reason: 'insufficient' };
    const ratio = masteredCount / withHistory;
    return {
      ok: true,
      comfort: ratio >= o.threshold,
      masteredCount,
      withHistory,
      total: scored.results.length,
      ratio: Math.round(ratio * 100) / 100,
    };
  }

  const api = { assessSession, COMFORT_DEFAULTS: DEFAULTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
