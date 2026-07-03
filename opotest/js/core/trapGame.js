/**
 * trapGame.js — «Cazador de erratas»: 4 afirmaciones extraídas de las citas
 * literales del banco, exactamente UNA saboteada con los mutadores del
 * generador. El jugador debe detectarla y decir qué se cambió. Entrena el
 * ojo crítico que después alimenta los reportes de erratas reales (§3.3).
 * Módulo puro: sin DOM, RNG inyectable.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  const MIN_QUOTE_LENGTH = 30;
  const ROUND_SIZE = 4;

  const KIND_LABELS = {
    negation: 'Negación añadida',
    number: 'Número alterado',
    swap: 'Término cambiado',
  };

  /** Citas únicas y con sustancia del banco activo. */
  function usableQuotes(questions) {
    const seen = new Set();
    const quotes = [];
    for (const q of questions || []) {
      const quote = String(q.sourceQuote || '').trim();
      if (quote.length < MIN_QUOTE_LENGTH || seen.has(quote)) continue;
      seen.add(quote);
      quotes.push(quote);
    }
    return quotes;
  }

  /** Intenta sabotear una cita; devuelve {text, kind} o null. */
  function sabotage(quote, corpus, rng) {
    const attempts = gen.shuffle(['negation', 'number', 'swap'], rng);
    for (const kind of attempts) {
      let mutated = null;
      if (kind === 'negation') mutated = gen.mutateNegation(quote);
      else if (kind === 'number') mutated = gen.mutateNumber(quote, rng);
      else mutated = gen.mutateSwap(quote, corpus, rng);
      if (mutated && mutated !== quote) return { text: mutated, kind };
    }
    return null;
  }

  /**
   * Construye una ronda del juego.
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} [opts] {rng}
   * @returns {null | {statements: string[], trapIndex: number, mutationKind: string,
   *   original: string}} null si no hay material suficiente
   */
  function buildTrapRound(activeQuestions, opts) {
    const rng = (opts && opts.rng) || gen.createRng(86420);
    const quotes = gen.shuffle(usableQuotes(activeQuestions), rng);
    if (quotes.length < ROUND_SIZE) return null;

    // Elegir la víctima entre las candidatas hasta que un mutador funcione
    for (let attempt = 0; attempt < quotes.length; attempt++) {
      const picked = quotes.slice(attempt, attempt + ROUND_SIZE);
      if (picked.length < ROUND_SIZE) break;
      const trapSource = Math.floor(rng() * ROUND_SIZE);
      const corpus = picked.filter((_, i) => i !== trapSource);
      const trap = sabotage(picked[trapSource], corpus, rng);
      if (!trap) continue; // esta cita no admite sabotaje → probar otra ventana

      const statements = picked.slice();
      statements[trapSource] = trap.text;
      // Barajar el orden final conservando la posición de la trampa
      const order = gen.shuffle(statements.map((_, i) => i), rng);
      return {
        statements: order.map((i) => statements[i]),
        trapIndex: order.indexOf(trapSource),
        mutationKind: trap.kind,
        original: picked[trapSource],
      };
    }
    return null;
  }

  /**
   * Corrige la jugada.
   * @returns {{statementCorrect: boolean, kindCorrect: boolean}}
   */
  function checkAnswer(round, pickedIndex, pickedKind) {
    return {
      statementCorrect: pickedIndex === round.trapIndex,
      kindCorrect: pickedKind === round.mutationKind,
    };
  }

  const api = { buildTrapRound, checkAnswer, usableQuotes, KIND_LABELS, ROUND_SIZE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
