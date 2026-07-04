/**
 * sessionPlanner.js — «Estudia ahora»: compone la sesión óptima para el
 * tiempo disponible (10/20/40 min) mezclando todas las señales que la app
 * ya persiste, cada bloque con su razón. Responde a la pregunta del
 * opositor: «¿qué estudio ahora mismo y por qué?».
 * 0 IA, 0 créditos. Módulo puro: RNG inyectable, determinista.
 */
(function () {
  'use strict';

  // Coste estimado por ítem (minutos): pregunta con corrección ≈ 45 s,
  // flashcard ≈ 20 s.
  const COST = { question: 0.75, card: 0.34 };

  // Prioridad y tope por fuente: lo más peligroso primero, sin que una
  // fuente monopolice la sesión.
  const SOURCES = [
    { key: 'dueCards', type: 'cards', cap: 12, label: '🗃️ Flashcards vencidas', reason: (n) => n + ' tarjeta' + (n > 1 ? 's' : '') + ' vencen hoy: repasarlas ahora evita que caigan de caja' },
    { key: 'falseCertainties', type: 'questions', cap: 4, label: '🔥 Falsas certezas', reason: (n) => n + ' pregunta' + (n > 1 ? 's' : '') + ' que fallaste estando seguro: el error que más suspende' },
    { key: 'failed', type: 'questions', cap: 6, label: '📌 Falladas más antiguas', reason: (n) => n + ' fallada' + (n > 1 ? 's' : '') + ' que llevan más tiempo sin repasar' },
    { key: 'cold', type: 'questions', cap: 3, label: '❄️ Dominadas enfriándose', reason: (n) => n + ' pregunta' + (n > 1 ? 's' : '') + ' que sabes pero llevas mucho sin ver' },
    { key: 'daily', type: 'daily', cap: 1, label: '🔥 Reto de hoy', reason: () => 'mantiene tu racha diaria' },
    { key: 'fresh', type: 'questions', cap: 10, label: '🆕 Nunca vistas', reason: (n) => n + ' pregunta' + (n > 1 ? 's' : '') + ' nuevas del banco para ampliar cobertura' },
  ];

  /**
   * @param {number} budgetMinutes 10 | 20 | 40 (o cualquier positivo)
   * @param {object} inputs {falseCertainties: [preguntas], failed: [preguntas
   *   ya ordenadas por antigüedad], dueCards: [tarjetas], cold: [preguntas],
   *   fresh: [preguntas nunca vistas], dailyPending: bool, dailyCount: number}
   * @returns {{blocks: Array<{type,label,reason,items,estMinutes}>,
   *   totalMinutes: number, degraded: boolean}}
   *   degraded: sin historial que diagnosticar → sesión genérica honesta.
   */
  function composeSession(budgetMinutes, inputs) {
    const budget = Math.max(1, budgetMinutes || 10);
    const src = inputs || {};
    const blocks = [];
    let remaining = budget;

    for (const def of SOURCES) {
      if (remaining <= 0) break;
      if (def.type === 'daily') {
        if (!src.dailyPending) continue;
        const est = round1((src.dailyCount || 5) * COST.question);
        if (est > remaining && blocks.length) continue; // no cabe: se queda para otra sesión
        blocks.push({ type: 'daily', label: def.label, reason: def.reason(), items: [], estMinutes: est });
        remaining = round1(remaining - est);
        continue;
      }
      const pool = src[def.key] || [];
      if (!pool.length) continue;
      const unitCost = def.type === 'cards' ? COST.card : COST.question;
      const fit = Math.floor(remaining / unitCost);
      const take = Math.min(def.cap, pool.length, fit);
      if (take <= 0) continue;
      const items = pool.slice(0, take);
      const est = round1(take * unitCost);
      blocks.push({ type: def.type === 'cards' ? 'cards' : def.key, label: def.label, reason: def.reason(take), items, estMinutes: est });
      remaining = round1(remaining - est);
    }

    // Sin señales personales (ni tarjetas ni fallos ni frías): sesión genérica
    const personal = blocks.some((b) => ['cards', 'falseCertainties', 'failed', 'cold'].includes(b.type));
    return {
      blocks,
      totalMinutes: round1(budget - remaining),
      degraded: !personal,
    };
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  const api = { composeSession, SESSION_COST: COST };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
