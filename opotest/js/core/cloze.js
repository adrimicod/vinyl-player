/**
 * cloze.js — «Completa el literal»: frases del temario con el dato clave
 * oculto que el usuario TECLEA (recuerdo activo por producción, un escalón
 * por encima del reconocimiento del test). Corrección tolerante a tildes y
 * erratas menores; los números se exigen exactos. Pistas progresivas.
 * 0 créditos, 0 IA. Módulo puro: RNG inyectable, testeable con node --test.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const parser = isNode ? require('./textParser.js') : window.OpoCore;
  const sim = isNode ? require('./similarity.js') : window.OpoCore;
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  const NUMBER_RE = /\b\d+(?:[.,]\d+)?\b/g;
  const MAX_CANDIDATES = 4;

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /** Palabras ocultables de una frase: números, término definido y palabras largas. */
  function candidatesFor(fact) {
    const seen = new Set();
    const out = [];
    const push = (w) => {
      const norm = sim.normalizeText(w);
      if (!norm || seen.has(norm) || out.length >= MAX_CANDIDATES) return;
      seen.add(norm);
      out.push(w);
    };
    if (fact.type === 'number') {
      for (const m of fact.sentence.matchAll(NUMBER_RE)) push(m[0]);
    }
    if (fact.type === 'definition') {
      const key = fact.term.split(/\s+/).find((w) => sim.normalizeText(w).length >= 5);
      if (key) push(key.replace(/[.,;:]$/, ''));
    }
    for (const w of fact.sentence.split(/\s+/)) {
      const clean = w.replace(/[.,;:()«»]/g, '');
      if (sim.normalizeText(clean).length >= 9) push(clean);
    }
    return out;
  }

  /**
   * Construye el mazo de ejercicios cloze a partir del texto del temario.
   * @returns {Array<{id, sentence, ref, candidates: string[]}>}
   */
  function buildClozeDeck(rawText) {
    const { facts } = parser.parse(rawText);
    const deck = [];
    const seen = new Set();
    for (const fact of facts) {
      if (fact.type !== 'number' && fact.type !== 'definition') continue;
      const candidates = candidatesFor(fact);
      if (!candidates.length) continue;
      const id = 'z' + hash(fact.sentence);
      if (seen.has(id)) continue;
      seen.add(id);
      deck.push({ id, sentence: fact.sentence, ref: fact.ref || null, candidates });
    }
    return deck;
  }

  /** Oculta la PRIMERA aparición exacta de `word` (los números, con contorno). */
  function replaceOnce(sentence, word) {
    if (/^\d/.test(word)) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return sentence.replace(new RegExp('(?<![\\d.,])' + escaped + '(?![\\d.,])'), '____');
    }
    const idx = sentence.indexOf(word);
    if (idx === -1) return sentence;
    return sentence.slice(0, idx) + '____' + sentence.slice(idx + word.length);
  }

  /**
   * Prepara una ronda sobre un ejercicio: a más ronda, más huecos.
   * @param {object} item elemento del mazo
   * @param {number} blanks nº de huecos deseado (se recorta a los candidatos)
   * @returns {{display: string, answers: string[], ref}} answers en orden de aparición
   */
  function makeRound(item, blanks, rng) {
    const chosen = gen.shuffle(item.candidates, rng || gen.createRng(1357))
      .slice(0, Math.max(1, Math.min(blanks, item.candidates.length)))
      .sort((a, b) => item.sentence.indexOf(a) - item.sentence.indexOf(b));
    let display = item.sentence;
    for (const w of chosen) display = replaceOnce(display, w);
    return { display, answers: chosen, ref: item.ref };
  }

  /** Pistas progresivas: 1 = primera letra, 2 = + longitud. */
  function hintFor(word, level) {
    if (level <= 0) return '';
    let hint = 'Empieza por «' + word[0] + '»';
    if (level >= 2) hint += ' y tiene ' + word.length + ' caracteres';
    return hint + '.';
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(new Array(b.length).fill(0)));
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[a.length][b.length];
  }

  /**
   * Corrección tolerante: tildes y mayúsculas nunca cuentan; se admite una
   * errata menor en palabras largas. Los números se exigen exactos.
   * @returns {{correct: boolean, close: boolean}} close: casi (una errata de más)
   */
  function checkClozeAnswer(expected, typed) {
    const e = sim.normalizeText(expected);
    const t = sim.normalizeText(typed);
    if (!t) return { correct: false, close: false };
    if (/^\d/.test(e)) {
      const norm = (s) => s.replace(',', '.');
      return { correct: norm(e) === norm(t), close: false };
    }
    if (e === t) return { correct: true, close: false };
    const dist = levenshtein(e, t);
    // 2 erratas solo en palabras muy largas: con 2 en palabras medias se
    // colarían palabras distintas («internado» por «interesado»).
    const tolerance = e.length >= 12 ? 2 : e.length >= 5 ? 1 : 0;
    return { correct: dist <= tolerance, close: dist === tolerance + 1 };
  }

  const api = { buildClozeDeck, makeRound, checkClozeAnswer, hintFor, candidatesFor };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
