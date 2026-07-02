/**
 * similarity.js — Normalización de texto y deduplicación de preguntas.
 * Módulo puro: sin DOM. Se carga como global en navegador y CommonJS en Node.
 */
(function () {
  'use strict';

  const STOPWORDS = new Set([
    'de', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'e', 'en', 'del', 'al', 'a',
    'que', 'se', 'por', 'con', 'un', 'una', 'unos', 'unas', 'es', 'son', 'su',
    'sus', 'lo', 'como', 'para', 'no', 'mas', 'segun', 'cual', 'cuales', 'ser',
    'este', 'esta', 'estos', 'estas', 'entre', 'sobre', 'siguiente', 'siguientes',
  ]);

  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ñ\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(s) {
    return normalizeText(s)
      .split(' ')
      .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  }

  function jaccard(tokensA, tokensB) {
    const a = new Set(tokensA);
    const b = new Set(tokensB);
    if (a.size === 0 && b.size === 0) return 1;
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
  }

  function similarity(textA, textB) {
    return jaccard(tokenize(textA), tokenize(textB));
  }

  const DEFAULT_THRESHOLD = 0.75;

  /**
   * Busca si `text` duplica alguno de `existingTexts`.
   * @returns {null | {index: number, score: number}}
   */
  function findDuplicate(text, existingTexts, threshold = DEFAULT_THRESHOLD) {
    const tokens = tokenize(text);
    let best = null;
    for (let i = 0; i < existingTexts.length; i++) {
      const score = jaccard(tokens, tokenize(existingTexts[i]));
      if (score >= threshold && (!best || score > best.score)) {
        best = { index: i, score };
      }
    }
    return best;
  }

  /**
   * Filtra candidatas duplicadas contra el banco Y entre sí.
   * @param {Array<{text:string}>} candidates
   * @param {string[]} bankTexts
   * @returns {{accepted: Array, rejected: Array<{candidate, reason, score}>}}
   */
  function filterDuplicates(candidates, bankTexts, threshold = DEFAULT_THRESHOLD) {
    const accepted = [];
    const rejected = [];
    const seen = bankTexts.slice();
    for (const c of candidates) {
      const dup = findDuplicate(c.text, seen, threshold);
      if (dup) {
        rejected.push({ candidate: c, reason: 'duplicada', score: dup.score });
      } else {
        accepted.push(c);
        seen.push(c.text);
      }
    }
    return { accepted, rejected };
  }

  const api = { normalizeText, tokenize, jaccard, similarity, findDuplicate, filterDuplicates, DEFAULT_THRESHOLD };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
