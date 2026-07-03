/**
 * coverage.js — Radiografía del temario: cruza el banco con tu historial y
 * pinta cada ley × artículo según cobertura y dominio personal. Responde a
 * «¿qué me falta por cubrir y dónde flaqueo?» y dirige el gasto de créditos
 * a los huecos («reciclar antes que generar»).
 * Módulo puro: sin DOM.
 */
(function () {
  'use strict';

  const ARTICLE_RE = /art(?:í|i)culo\s+(\d+(?:\s+(?:bis|ter|quater))?)/i;

  const THRESHOLDS = {
    GOOD: 0.8,   // acierto ≥ 80% → verde
    MEDIUM: 0.5, // acierto ≥ 50% → ámbar; por debajo → rojo
  };

  /** Extrae el nº de artículo del enunciado de una pregunta ('14', '4 bis'…). */
  function articleOf(q) {
    const m = String(q.text || '').match(ARTICLE_RE);
    return m ? m[1].replace(/\s+/g, ' ').trim() : null;
  }

  /**
   * Expande la acotación declarada en topic.articulos: '1-4', '1,3,5', '2-3, 7'.
   * Devuelve números de artículo como strings; ignora lo no interpretable.
   */
  function parseArticleRange(str) {
    const out = new Set();
    for (const part of String(str || '').split(',')) {
      const range = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (range) {
        const from = parseInt(range[1], 10);
        const to = parseInt(range[2], 10);
        if (to >= from && to - from <= 500) {
          for (let n = from; n <= to; n++) out.add(String(n));
        }
      } else if (/^\d+$/.test(part.trim())) {
        out.add(part.trim());
      }
    }
    return Array.from(out);
  }

  function accuracyStatus(correct, attempts) {
    if (!attempts) return 'untried';
    const acc = correct / attempts;
    if (acc >= THRESHOLDS.GOOD) return 'good';
    if (acc >= THRESHOLDS.MEDIUM) return 'medium';
    return 'weak';
  }

  /** Orden natural de artículos: 4 < 4 bis < 5 < 14. */
  function compareArticles(a, b) {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return na !== nb ? na - nb : a.localeCompare(b);
  }

  /**
   * Construye la rejilla de cobertura.
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} perQuestion historial {id: {attempts, correct}} (userState.perQuestion)
   * @returns {Array<{ley, cells: Array<{article, status, total, attempts, correct,
   *   accuracy, questionIds}>}>}
   *   status: 'empty' (acotado en topic.articulos pero sin preguntas) |
   *           'untried' (con preguntas, sin intentos) | 'good' | 'medium' | 'weak'
   */
  function buildCoverageGrid(activeQuestions, perQuestion) {
    const history = perQuestion || {};
    const leyes = new Map(); // ley → Map(article → cell)

    const cellOf = (ley, article) => {
      if (!leyes.has(ley)) leyes.set(ley, new Map());
      const arts = leyes.get(ley);
      if (!arts.has(article)) {
        arts.set(article, { article, total: 0, attempts: 0, correct: 0, questionIds: [] });
      }
      return arts.get(article);
    };

    for (const q of activeQuestions) {
      const ley = (q.topic && q.topic.ley) || '(sin ley)';
      // Los artículos declarados sin preguntas aún → celdas grises accionables
      for (const declared of parseArticleRange(q.topic && q.topic.articulos)) {
        cellOf(ley, declared);
      }
      const article = articleOf(q);
      if (!article) continue;
      const cell = cellOf(ley, article);
      cell.total++;
      cell.questionIds.push(q.id);
      const h = history[q.id];
      if (h && h.attempts) {
        cell.attempts += h.attempts;
        cell.correct += h.correct;
      }
    }

    const grid = [];
    for (const [ley, arts] of leyes) {
      const cells = Array.from(arts.values())
        .sort((a, b) => compareArticles(a.article, b.article))
        .map((c) => ({
          article: c.article,
          total: c.total,
          attempts: c.attempts,
          correct: c.correct,
          accuracy: c.attempts ? Math.round((c.correct / c.attempts) * 100) / 100 : null,
          status: c.total === 0 ? 'empty' : accuracyStatus(c.correct, c.attempts),
          questionIds: c.questionIds,
        }));
      grid.push({ ley, cells });
    }
    return grid.sort((a, b) => a.ley.localeCompare(b.ley));
  }

  const api = { buildCoverageGrid, parseArticleRange, articleOf, THRESHOLDS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
