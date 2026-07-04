/**
 * staleness.js — Radar de olvido: todo el repaso mira lo que fallas; nadie
 * protege lo que ya sabes. Cruza el dominio (perQuestion) con la recencia
 * (posición en seenIds, que updateHistory mantiene de más antigua a más
 * reciente) para detectar preguntas dominadas que se están «enfriando».
 * También ordena las falladas por antigüedad (repaso espaciado).
 * Sin timestamps nuevos ni migración de datos. Módulo puro.
 */
(function () {
  'use strict';

  const DEFAULTS = {
    masteryRatio: 0.8,  // ≥80% de acierto…
    minAttempts: 2,     // …con un mínimo de intentos
    coldFraction: 1 / 3, // primer tercio de seenIds = vistas hace más tiempo
    minSeen: 6,          // con menos historial no hay «frío» que medir
  };

  /**
   * ¿Está dominada esta pregunta? Un acierto dudando o adivinando
   * (lastConfidence) no es dominio pleno.
   */
  function isMastered(tally, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    if (!tally || tally.attempts < o.minAttempts) return false;
    if (tally.correct / tally.attempts < o.masteryRatio) return false;
    return tally.lastConfidence !== 'doubt' && tally.lastConfidence !== 'guess';
  }

  /**
   * Preguntas dominadas pero vistas hace mucho: en riesgo de olvido.
   * @returns {Array} preguntas activas «frías», las más antiguas primero
   */
  function coldMasteredQuestions(activeQuestions, userState, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const seen = (userState && userState.seenIds) || [];
    if (seen.length < o.minSeen) return [];
    const history = (userState && userState.perQuestion) || {};
    const coldCount = Math.floor(seen.length * o.coldFraction);
    const coldOrder = new Map(seen.slice(0, coldCount).map((id, i) => [id, i]));
    return (activeQuestions || [])
      .filter((q) => coldOrder.has(q.id) && isMastered(history[q.id], o))
      .sort((a, b) => coldOrder.get(a.id) - coldOrder.get(b.id));
  }

  /**
   * Falladas ordenadas por antigüedad (las vistas hace más tiempo primero):
   * el orden natural del repaso espaciado. Las que no constan en seenIds
   * van delante (más «olvidadas» aún).
   */
  function orderFailedByAge(failedIds, seenIds) {
    const pos = new Map((seenIds || []).map((id, i) => [id, i]));
    return (failedIds || []).slice().sort((a, b) => {
      const pa = pos.has(a) ? pos.get(a) : -1;
      const pb = pos.has(b) ? pos.get(b) : -1;
      return pa - pb;
    });
  }

  /** Ids fríos por celda para la radiografía (matiz ❄️). */
  function coldIds(activeQuestions, userState, opts) {
    return new Set(coldMasteredQuestions(activeQuestions, userState, opts).map((q) => q.id));
  }

  const api = { isMastered, coldMasteredQuestions, orderFailedByAge, coldIds, STALENESS_DEFAULTS: DEFAULTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
