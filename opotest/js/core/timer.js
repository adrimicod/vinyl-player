/**
 * timer.js — Simulacro de examen cronometrado: cuenta atrás, timestamp por
 * respuesta, marcar-para-revisar, autoenvío al agotarse y análisis de ritmo
 * («a este ritmo habrías llegado a la pregunta X de Y»). La gestión del
 * tiempo es la mitad del examen real y ningún test normal la entrena.
 * Módulo puro: reloj inyectable, testeable con node --test.
 */
(function () {
  'use strict';

  const MS_PER_QUESTION = 60000; // ritmo de examen oficial: ~1 min/pregunta
  const EXAM_WARNING_MS = 5 * 60000; // aviso a 5 minutos del final

  /** Crea el estado de un simulacro de `count` preguntas. */
  function createExam(count, opts) {
    const o = opts || {};
    const now = o.now != null ? o.now : Date.now();
    return {
      count,
      totalMs: o.totalMs != null ? o.totalMs : count * MS_PER_QUESTION,
      startedAt: now,
      finishedAt: null,
      answers: new Array(count).fill(null),
      marked: new Array(count).fill(false),
      events: [], // {index, at} por cada respuesta: base del análisis de ritmo
    };
  }

  function remainingMs(state, now) {
    const ref = state.finishedAt != null ? state.finishedAt : (now != null ? now : Date.now());
    return Math.max(0, state.totalMs - (ref - state.startedAt));
  }

  function isExpired(state, now) {
    return remainingMs(state, now) <= 0;
  }

  function shouldWarn(state, now) {
    const left = remainingMs(state, now);
    return left > 0 && left <= EXAM_WARNING_MS;
  }

  /** Registra una respuesta (o cambio de respuesta) con su timestamp. */
  function answerExam(state, index, optionIndex, now) {
    if (state.finishedAt != null) throw new Error('El simulacro ya ha terminado');
    if (index < 0 || index >= state.count) throw new Error('Pregunta fuera de rango');
    state.answers[index] = optionIndex;
    state.events.push({ index, at: now != null ? now : Date.now() });
  }

  function toggleMark(state, index) {
    state.marked[index] = !state.marked[index];
    return state.marked[index];
  }

  /** Cierra el simulacro (envío manual o autoenvío por agotamiento). */
  function finishExam(state, now) {
    if (state.finishedAt == null) {
      const ts = now != null ? now : Date.now();
      state.finishedAt = Math.min(ts, state.startedAt + state.totalMs);
    }
    return state;
  }

  /**
   * Tiempo invertido por pregunta: el delta entre eventos de respuesta
   * consecutivos se atribuye a la pregunta respondida en cada evento.
   * @returns {Object<number, number>} índice → ms acumulados
   */
  function timePerQuestion(state) {
    const times = {};
    let prev = state.startedAt;
    for (const e of state.events) {
      times[e.index] = (times[e.index] || 0) + (e.at - prev);
      prev = e.at;
    }
    return times;
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Informe de ritmo post-examen.
   * @returns {{answered, unanswered, medianMs, slowIndexes: number[], avgMs,
   *   wouldReach: number}} wouldReach: a tu ritmo medio, a qué pregunta
   *   habrías llegado dentro del tiempo total.
   */
  function paceReport(state) {
    const times = timePerQuestion(state);
    const values = Object.values(times);
    const answered = state.answers.filter((a) => a !== null).length;
    const med = median(values);
    const slowIndexes = Object.keys(times)
      .map(Number)
      .filter((i) => med > 0 && times[i] > 2 * med)
      .sort((a, b) => a - b);
    const totalAnswerTime = values.reduce((a, b) => a + b, 0);
    const avgMs = state.events.length ? totalAnswerTime / state.events.length : 0;
    const wouldReach = avgMs > 0 ? Math.min(state.count, Math.floor(state.totalMs / avgMs)) : state.count;
    return {
      answered,
      unanswered: state.count - answered,
      medianMs: med,
      slowIndexes,
      avgMs: Math.round(avgMs),
      wouldReach,
    };
  }

  const api = { createExam, answerExam, toggleMark, finishExam, remainingMs, isExpired, shouldWarn, timePerQuestion, paceReport, EXAM_WARNING_MS, MS_PER_QUESTION };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
