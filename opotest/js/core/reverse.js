/**
 * reverse.js — Modo inverso «¿Qué artículo es?»: muestra la cita literal
 * (sourceQuote) de una pregunta del banco y hay que identificar de qué
 * precepto procede. No consume créditos: explota el anclaje obligatorio
 * a la fuente como materia prima de una mecánica de estudio nueva.
 * Módulo puro: sin DOM.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  const ARTICLE_RE = /art(?:í|i)culo\s+(\d+(?:\s+(?:bis|ter|quater))?)/i;

  /** Extrae la etiqueta de procedencia de una pregunta del banco. */
  function sourceLabel(q) {
    const m = String(q.text || '').match(ARTICLE_RE);
    const ley = (q.topic && q.topic.ley) || null;
    const article = m ? m[1].replace(/\s+/g, ' ').trim() : null;
    if (!article && !ley) return null;
    if (article && ley) return 'Artículo ' + article + ' — ' + ley;
    if (article) return 'Artículo ' + article;
    return ley;
  }

  function truncateQuote(quote, max) {
    const s = String(quote || '').trim();
    return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
  }

  /**
   * Distractores extra para bancos pequeños: SOLO artículos adyacentes
   * (n±1..3), que existen en casi cualquier ley. Los saltos grandes
   * (n×2, n+10) inventaban preceptos inverosímiles que se descartan solos.
   */
  function perturbedLabels(q, rng) {
    const m = String(q.text || '').match(ARTICLE_RE);
    if (!m) return [];
    const n = parseInt(m[1], 10);
    const ley = (q.topic && q.topic.ley) || null;
    const neighbors = [n - 2, n - 1, n + 1, n + 2, n + 3].filter((x) => x > 0);
    return gen.shuffle(neighbors, rng).map((alt) =>
      'Artículo ' + alt + (ley ? ' — ' + ley : '')
    );
  }

  /**
   * Construye un test inverso a partir de preguntas activas del banco.
   * Las preguntas resultantes son efímeras (no entran al banco).
   * @param {Array} activeQuestions
   * @param {object} [opts] {count, rng}
   * @returns {Array} preguntas tipo test (kind: 'reverse')
   */
  function buildReverseQuiz(activeQuestions, opts) {
    const o = opts || {};
    const count = o.count || 10;
    const rng = o.rng || gen.createRng(97531);

    const labeled = activeQuestions
      .map((q) => ({ q, label: sourceLabel(q) }))
      .filter((x) => x.label && x.q.sourceQuote);

    const allLabels = Array.from(new Set(labeled.map((x) => x.label)));
    const out = [];

    for (const { q, label } of gen.shuffle(labeled, rng)) {
      if (out.length >= count) break;
      // Distractores: primero procedencias reales de otras preguntas del banco;
      // si el banco es pequeño, se completan con números de artículo perturbados.
      const pool = gen.shuffle(allLabels.filter((l) => l !== label), rng)
        .concat(perturbedLabels(q, rng));
      const built = gen.buildOptions(label, pool, rng);
      if (!built) continue; // sin metadatos suficientes para 4 opciones únicas
      out.push({
        id: 'rev-' + (q.id || out.length),
        text: '¿De qué precepto procede la siguiente cita?: «' + truncateQuote(q.sourceQuote, 220) + '»',
        options: built.options,
        correctIndex: built.correctIndex,
        explanation: 'La cita pertenece a ' + label + '.',
        sourceQuote: q.sourceQuote,
        topic: q.topic || {},
        kind: 'reverse',
      });
    }
    return out;
  }

  const api = { buildReverseQuiz, sourceLabel };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
