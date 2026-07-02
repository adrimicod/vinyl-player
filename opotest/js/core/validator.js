/**
 * validator.js — Validación automática de calidad de una pregunta antes de
 * entrar al banco. Primera barrera del sistema de calidad (ver PLAN.md §3.3).
 * Módulo puro: sin DOM.
 */
(function () {
  'use strict';

  const sim = (typeof require !== 'undefined' && typeof module !== 'undefined')
    ? require('./similarity.js')
    : window.OpoCore;

  const OPTION_COUNT = 4;

  /**
   * @param {object} q pregunta candidata
   * @param {string} [sourceText] texto fuente; si se pasa, exige anclaje real
   * @returns {{ok: boolean, errors: string[]}}
   */
  function validateQuestion(q, sourceText) {
    const errors = [];
    if (!q || typeof q !== 'object') {
      return { ok: false, errors: ['La pregunta no es un objeto válido'] };
    }
    const text = String(q.text || '').trim();
    if (text.length < 15) errors.push('Enunciado demasiado corto');
    if (text.length > 500) errors.push('Enunciado demasiado largo');

    if (!Array.isArray(q.options) || q.options.length !== OPTION_COUNT) {
      errors.push('Debe tener exactamente ' + OPTION_COUNT + ' opciones');
    } else {
      const normalized = q.options.map((o) => sim.normalizeText(o));
      if (normalized.some((o) => !o)) errors.push('Hay opciones vacías');
      if (new Set(normalized).size !== OPTION_COUNT) errors.push('Hay opciones duplicadas');
      if (q.options.some((o) => String(o).length > 350)) errors.push('Opciones demasiado largas');
    }

    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= OPTION_COUNT) {
      errors.push('correctIndex fuera de rango');
    }

    if (!String(q.explanation || '').trim()) errors.push('Falta la explicación');

    const quote = String(q.sourceQuote || '').trim();
    if (!quote) {
      errors.push('Falta la cita de la fuente (sourceQuote)');
    } else if (sourceText) {
      const normSource = sim.normalizeText(sourceText);
      const normQuote = sim.normalizeText(quote);
      if (!normSource.includes(normQuote)) {
        errors.push('La cita no aparece en el texto fuente (pregunta no anclada)');
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Valida un lote y separa aceptadas de rechazadas.
   */
  function validateBatch(candidates, sourceText) {
    const accepted = [];
    const rejected = [];
    for (const c of candidates || []) {
      const res = validateQuestion(c, sourceText);
      if (res.ok) accepted.push(c);
      else rejected.push({ candidate: c, errors: res.errors });
    }
    return { accepted, rejected };
  }

  const api = { validateQuestion, validateBatch, OPTION_COUNT };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
