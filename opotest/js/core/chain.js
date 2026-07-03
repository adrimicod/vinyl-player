/**
 * chain.js — Modo cadena (muerte súbita): preguntas encadenadas hasta el
 * primer fallo, con récord global y por ley. La pregunta que rompe la
 * cadena entra prioritaria en el repaso. Sesión arcade de 2 minutos que
 * dispara la frecuencia de uso: 0 créditos, 0 IA.
 * Módulo puro: RNG inyectable, testeable con node --test.
 */
(function () {
  'use strict';

  function createChain() {
    return { streak: 0, usedIds: [], finished: false, exhausted: false, breakerId: null };
  }

  /**
   * Siguiente pregunta de la cadena (nunca repite dentro de la misma cadena).
   * Si el banco se agota, la cadena termina invicta (exhausted).
   * @returns {object|null}
   */
  function nextChainQuestion(chain, activeQuestions, rng) {
    if (chain.finished) return null;
    const used = new Set(chain.usedIds);
    const pool = activeQuestions.filter((q) => !used.has(q.id));
    if (!pool.length) {
      chain.finished = true;
      chain.exhausted = true;
      return null;
    }
    return pool[Math.floor(rng() * pool.length)];
  }

  /**
   * Registra la respuesta: acierto alarga la cadena, fallo la rompe.
   * @returns {{correct: boolean, streak: number, finished: boolean, breakerId: string|null}}
   */
  function answerChain(chain, question, answerIndex) {
    if (chain.finished) throw new Error('La cadena ya ha terminado');
    chain.usedIds.push(question.id);
    if (answerIndex === question.correctIndex) {
      chain.streak++;
      return { correct: true, streak: chain.streak, finished: false, breakerId: null };
    }
    chain.finished = true;
    chain.breakerId = question.id;
    return { correct: false, streak: chain.streak, finished: true, breakerId: question.id };
  }

  /**
   * Actualiza los récords si la cadena los supera.
   * @param {object} records {global: number, byLey: {}} (muta y persiste el llamador)
   * @param {string} leyKey ley filtrada o 'todas'
   * @returns {{globalBeaten: boolean, leyBeaten: boolean}}
   */
  function updateChainRecords(records, streak, leyKey) {
    records.byLey = records.byLey || {};
    const result = { globalBeaten: false, leyBeaten: false };
    if (streak > (records.global || 0)) {
      records.global = streak;
      result.globalBeaten = true;
    }
    const key = leyKey || 'todas';
    if (streak > (records.byLey[key] || 0)) {
      records.byLey[key] = streak;
      result.leyBeaten = true;
    }
    return result;
  }

  const api = { createChain, nextChainQuestion, answerChain, updateChainRecords };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
