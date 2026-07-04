/**
 * exitTicket.js — «Ticket de salida»: micro-examen de consolidación con lo
 * recién trabajado. Hoy una fallada sale del repaso con un acierto inmediato
 * (memoria a corto plazo); el ticket introduce la verificación diferida:
 * la fallada solo se «rescata» si se acierta también en el ticket.
 * Módulo puro: RNG inyectable.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  const TICKET_SIZE = 3;

  /**
   * Selecciona hasta 3 preguntas SOLO de lo trabajado en la sesión,
   * priorizando lo fallado y las falsas certezas sobre lo acertado.
   * @param {Array<{id, outcome, falseCertainty?}>} practiced resultados acumulados de la sesión
   * @param {Array} activeQuestions banco activo (para resolver ids)
   * @param {object} [opts] {rng, size}
   * @returns {Array} preguntas del ticket (puede ser menor o vacío, sin error)
   */
  function buildExitTicket(practiced, activeQuestions, opts) {
    const o = opts || {};
    const size = o.size || TICKET_SIZE;
    const rng = o.rng || gen.createRng(112233);
    const byId = new Map((activeQuestions || []).map((q) => [q.id, q]));
    const seen = new Set();
    const wrong = [];
    const right = [];
    for (const r of practiced || []) {
      if (seen.has(r.id) || !byId.has(r.id)) continue;
      seen.add(r.id);
      if (r.outcome === 'wrong') wrong.push({ r, weight: r.falseCertainty ? 0 : 1 });
      else if (r.outcome === 'correct') right.push(r);
    }
    // Falsas certezas primero, luego el resto de falladas, y acertadas de relleno
    wrong.sort((a, b) => a.weight - b.weight);
    const picked = wrong.map((w) => w.r).concat(gen.shuffle(right, rng)).slice(0, size);
    return picked.map((r) => byId.get(r.id));
  }

  /**
   * Aplica el resultado del ticket: las falladas acertadas AHORA se rescatan
   * (salen de failedIds/falseCertaintyIds). Las falladas de nuevo se quedan.
   * @returns {number} preguntas rescatadas
   */
  function applyTicketRescue(userState, ticketScored) {
    let rescued = 0;
    userState.failedIds = userState.failedIds || [];
    userState.falseCertaintyIds = userState.falseCertaintyIds || [];
    for (const r of ticketScored.results) {
      if (r.outcome !== 'correct') continue;
      const fIdx = userState.failedIds.indexOf(r.id);
      if (fIdx !== -1) {
        userState.failedIds.splice(fIdx, 1);
        rescued++;
      }
      const fcIdx = userState.falseCertaintyIds.indexOf(r.id);
      if (fcIdx !== -1) userState.falseCertaintyIds.splice(fcIdx, 1);
    }
    return rescued;
  }

  const api = { buildExitTicket, applyTicketRescue, TICKET_SIZE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
