/**
 * confusables.js — Parejas confundibles («gemelas»): el motor de similitud
 * usado al revés. La deduplicación busca casi-iguales para RECHAZAR; aquí
 * se buscan a propósito los pares parecidos-pero-distintos (10 vs 15 días,
 * órgano A vs órgano B) donde el usuario falla: la interferencia entre
 * contenidos casi iguales es la causa raíz de muchos fallos de examen.
 * Módulo puro.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const sim = isNode ? require('./similarity.js') : window.OpoCore;

  const DEFAULTS = {
    threshold: 0.5, // parecidas de verdad, pero por debajo del 0.75 de dedup
    maxPairs: 8,
  };

  function comparable(q) {
    return q.text + ' ' + (q.sourceQuote || '');
  }

  /**
   * Pares de preguntas activas muy parecidas donde al menos una está entre
   * las que fallas. Determinista: sin duplicados A–B/B–A ni auto-pares;
   * cada pregunta aparece como mucho en un par (diversidad).
   * @returns {Array<{a, b, score}>} de más a menos parecidas
   */
  function findConfusablePairs(activeQuestions, userState, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const weak = new Set([]
      .concat((userState && userState.failedIds) || [])
      .concat((userState && userState.falseCertaintyIds) || []));
    if (!weak.size) return [];
    // Orden estable por id para que el resultado sea determinista
    const pool = (activeQuestions || []).slice().sort((x, y) => String(x.id).localeCompare(String(y.id)));
    const tokens = pool.map((q) => sim.tokenize(comparable(q)));
    const candidates = [];
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (!weak.has(pool[i].id) && !weak.has(pool[j].id)) continue;
        const score = sim.jaccard(tokens[i], tokens[j]);
        if (score >= o.threshold && score < 1) {
          candidates.push({ a: pool[i], b: pool[j], score });
        }
      }
    }
    candidates.sort((x, y) => y.score - x.score || String(x.a.id).localeCompare(String(y.a.id)));
    const used = new Set();
    const pairs = [];
    for (const c of candidates) {
      if (pairs.length >= o.maxPairs) break;
      if (used.has(c.a.id) || used.has(c.b.id)) continue;
      used.add(c.a.id);
      used.add(c.b.id);
      pairs.push(c);
    }
    return pairs;
  }

  /**
   * En qué difieren dos textos (para mostrar la diferencia lado a lado):
   * términos que están en uno y no en el otro, en orden de aparición.
   * @returns {{onlyA: string[], onlyB: string[]}}
   */
  function diffTokens(textA, textB, limit) {
    const max = limit || 6;
    const a = sim.tokenize(textA);
    const b = sim.tokenize(textB);
    const setA = new Set(a);
    const setB = new Set(b);
    const dedupe = (list, other) => {
      const seen = new Set();
      const out = [];
      for (const t of list) {
        if (!other.has(t) && !seen.has(t)) {
          seen.add(t);
          out.push(t);
          if (out.length >= max) break;
        }
      }
      return out;
    };
    return { onlyA: dedupe(a, setB), onlyB: dedupe(b, setA) };
  }

  const api = { findConfusablePairs, diffTokens, CONFUSABLE_DEFAULTS: DEFAULTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
