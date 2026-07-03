/**
 * srs.js — Repaso espaciado con cajas de Leitner (1-5). Las tarjetas nacen de
 * los `facts` del parser (definiciones, plazos, enumeraciones): memorizar
 * literales de la ley sin IA y sin créditos.
 * «La sabía» sube de caja, «dudé» repite caja, «no la sabía» vuelve a la 1.
 * Módulo puro: reloj inyectable, testeable con node --test.
 */
(function () {
  'use strict';

  const DAY_MS = 86400000;
  /** Intervalo en días hasta el próximo repaso, por caja (1-5). */
  const INTERVAL_DAYS = [0, 1, 3, 7, 16];
  const MAX_BOX = INTERVAL_DAYS.length;
  const GRADES = { KNOW: 'know', DOUBT: 'doubt', FAIL: 'fail' };

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /**
   * Convierte hechos del parser en tarjetas pregunta/respuesta.
   * Los hechos tipo 'statement' se omiten (demasiado genéricos para tarjeta).
   * El id es estable: mismo contenido → misma tarjeta (no se duplica al re-crear).
   */
  function cardsFromFacts(facts) {
    const cards = [];
    for (const f of facts || []) {
      let front = null;
      let back = null;
      if (f.type === 'definition') {
        front = '¿Qué se entiende por «' + f.term + '»?';
        back = f.definition;
      } else if (f.type === 'number') {
        const gapped = f.sentence.replace(f.value, '____');
        if (gapped === f.sentence) continue;
        front = 'Completa: «' + gapped + '»';
        back = f.value;
      } else if (f.type === 'enumeration') {
        front = '¿Qué elementos enumera ' + (f.ref ? 'el ' + f.ref.toLowerCase() : 'la lista') + '?';
        back = f.items.map((it, i) => String.fromCharCode(97 + i) + ') ' + it).join('\n');
      } else {
        continue;
      }
      if (f.ref) front += ' (' + f.ref + ')';
      cards.push({ id: 'c' + hash(front + '|' + back), type: f.type, front, back, ref: f.ref || null });
    }
    return cards;
  }

  function emptySrsState() {
    return { cards: {} };
  }

  /**
   * Añade tarjetas nuevas al estado (caja 1, vencen ya). Las existentes se saltan.
   * @returns {{added: number, skipped: number}}
   */
  function addCards(state, cards, now) {
    const ts = now != null ? now : Date.now();
    let added = 0;
    let skipped = 0;
    for (const card of cards) {
      if (state.cards[card.id]) {
        skipped++;
        continue;
      }
      state.cards[card.id] = Object.assign({}, card, { box: 1, due: ts });
      added++;
    }
    return { added, skipped };
  }

  /** Tarjetas vencidas, las de caja más baja primero (las más frágiles). */
  function dueCards(state, now) {
    const ts = now != null ? now : Date.now();
    return Object.values(state.cards)
      .filter((c) => c.due <= ts)
      .sort((a, b) => a.box - b.box || a.due - b.due);
  }

  /**
   * Registra el resultado de repasar una tarjeta y la reprograma.
   * @param {string} grade 'know' | 'doubt' | 'fail'
   * @returns {{box: number, due: number}} nueva situación
   */
  function review(state, cardId, grade, now) {
    const card = state.cards[cardId];
    if (!card) throw new Error('Tarjeta inexistente: ' + cardId);
    const ts = now != null ? now : Date.now();
    if (grade === GRADES.KNOW) card.box = Math.min(MAX_BOX, card.box + 1);
    else if (grade === GRADES.FAIL) card.box = 1;
    else if (grade !== GRADES.DOUBT) throw new Error('Valoración inválida: ' + grade);
    card.due = ts + INTERVAL_DAYS[card.box - 1] * DAY_MS;
    return { box: card.box, due: card.due };
  }

  /** Próximo vencimiento futuro (para «vuelve el día X»), o null si nada pendiente. */
  function nextDue(state, now) {
    const ts = now != null ? now : Date.now();
    let min = null;
    for (const c of Object.values(state.cards)) {
      if (c.due > ts && (min === null || c.due < min)) min = c.due;
    }
    return min;
  }

  /** Recuento por caja para la UI ({1: n, …, 5: n}). */
  function boxCounts(state) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const c of Object.values(state.cards)) counts[c.box]++;
    return counts;
  }

  const api = { cardsFromFacts, emptySrsState, addCards, dueCards, review, nextDue, boxCounts, INTERVAL_DAYS, GRADES, MAX_BOX };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
