/**
 * profile.js — «Talón de Aquiles»: perfil de acierto por TIPO de dato
 * (plazos/cifras, definiciones, enumeraciones, afirmaciones), cruzando el
 * `kind` de cada pregunta con el historial `perQuestion`. La radiografía
 * agrega por artículo; esto agrega por naturaleza cognitiva del fallo.
 * 0 IA, 0 créditos. Módulo puro.
 */
(function () {
  'use strict';

  const KIND_LABELS = {
    number: 'Plazos y cifras',
    definition: 'Definiciones',
    enumeration: 'Enumeraciones',
    statement: 'Afirmaciones literales',
  };

  const MIN_ATTEMPTS_PER_KIND = 5;

  /**
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} perQuestion historial {id: {attempts, correct}}
   * @param {object} [opts] {minAttempts}
   * @returns {{rows: Array<{kind, label, attempts, correct, accuracy|null}>,
   *   weakest: object|null}} accuracy null = «sin datos» (nunca un número engañoso)
   */
  function buildKindProfile(activeQuestions, perQuestion, opts) {
    const minAttempts = (opts && opts.minAttempts) || MIN_ATTEMPTS_PER_KIND;
    const history = perQuestion || {};
    const byKind = new Map();
    for (const q of activeQuestions || []) {
      if (!q.kind || !KIND_LABELS[q.kind]) continue;
      const tally = history[q.id];
      if (!tally || !tally.attempts) continue;
      const agg = byKind.get(q.kind) || { kind: q.kind, label: KIND_LABELS[q.kind], attempts: 0, correct: 0 };
      agg.attempts += tally.attempts;
      agg.correct += tally.correct;
      byKind.set(q.kind, agg);
    }
    const rows = Object.keys(KIND_LABELS)
      .filter((kind) => byKind.has(kind))
      .map((kind) => {
        const agg = byKind.get(kind);
        return Object.assign({}, agg, {
          accuracy: agg.attempts >= minAttempts ? Math.round((agg.correct / agg.attempts) * 100) : null,
        });
      });
    const withData = rows.filter((r) => r.accuracy !== null);
    const weakest = withData.length >= 2
      ? withData.reduce((a, b) => (b.accuracy < a.accuracy ? b : a))
      : null; // con un solo tipo medible no hay «talón» que señalar
    return { rows, weakest };
  }

  /** Preguntas activas de un tipo concreto (para «Entrenar solo plazos»). */
  function questionsByKind(activeQuestions, kind) {
    return (activeQuestions || []).filter((q) => q.kind === kind);
  }

  const api = { buildKindProfile, questionsByKind, KIND_LABELS, MIN_ATTEMPTS_PER_KIND };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
