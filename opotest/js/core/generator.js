/**
 * generator.js — Generador heurístico de preguntas tipo test (modo demo).
 * Produce preguntas ancladas al texto fuente sin coste de IA: sirve para
 * probar todo el producto offline y como fallback gratuito.
 * Módulo puro: sin DOM. RNG inyectable para tests deterministas.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const parser = isNode ? require('./textParser.js') : window.OpoCore;
  const sim = isNode ? require('./similarity.js') : window.OpoCore;
  const validator = isNode ? require('./validator.js') : window.OpoCore;

  /** RNG determinista (mulberry32) para poder testear la generación. */
  function createRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refLabel(ref, topic) {
    if (ref && topic && topic.ley) return 'el ' + ref.toLowerCase() + ' de la ' + topic.ley;
    if (ref) return 'el ' + ref.toLowerCase();
    if (topic && topic.ley) return 'la ' + topic.ley;
    return 'el texto';
  }

  /** Perturba un número manteniendo formato plausible. */
  function perturbNumber(value, rng) {
    const isDecimal = /[.,]/.test(value);
    if (isDecimal) {
      const sep = value.includes(',') ? ',' : '.';
      const n = parseFloat(value.replace(',', '.'));
      const deltas = [n + 1, Math.max(0.1, n - 1), n * 2, n / 2];
      return deltas.map((d) => {
        const s = (Math.round(d * 100) / 100).toString();
        return sep === ',' ? s.replace('.', ',') : s;
      });
    }
    const n = parseInt(value, 10);
    const candidates = [n + 1, n - 1, n + 5, n * 2, n + 10, Math.floor(n / 2)]
      .filter((x) => x > 0 && x !== n);
    return Array.from(new Set(candidates)).map(String);
  }

  /** Construye 4 opciones únicas: la correcta + 3 distractores. */
  function buildOptions(correct, distractorPool, rng) {
    const seen = new Set([sim.normalizeText(correct)]);
    const distractors = [];
    for (const d of distractorPool) {
      const norm = sim.normalizeText(d);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      distractors.push(d);
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) return null;
    const options = shuffle([correct].concat(distractors), rng);
    return { options, correctIndex: options.indexOf(correct) };
  }

  // ---------- Mutadores de frases (crean afirmaciones FALSAS plausibles) ----------

  // \b no funciona con tildes en JS: usamos lookarounds sobre letras españolas.
  const NEGATABLE_RE = /(?<![a-záéíóúñ])(deberá|deberán|podrá|podrán|será|serán|es|son|tiene|tienen|tendrá|tendrán|corresponde|corresponden|garantiza|garantizan|exige|exigen|requiere|requieren)(?![a-záéíóúñ])/i;

  function mutateNegation(sentence) {
    const m = sentence.match(NEGATABLE_RE);
    if (!m) return null;
    return sentence.replace(NEGATABLE_RE, 'no ' + m[0].toLowerCase());
  }

  function mutateNumber(sentence, rng) {
    const m = sentence.match(/\b\d+(?:[.,]\d+)?\b/);
    if (!m) return null;
    const alts = perturbNumber(m[0], rng);
    if (!alts.length) return null;
    return sentence.replace(m[0], alts[Math.floor(rng() * alts.length)]);
  }

  function mutateSwap(sentence, corpus, rng) {
    const words = sentence.split(/\s+/);
    const eligible = words
      .map((w, i) => ({ w, i }))
      .filter(({ w }) => sim.normalizeText(w).length >= 7);
    if (!eligible.length) return null;
    const target = eligible[Math.floor(rng() * eligible.length)];
    const pool = [];
    for (const other of corpus) {
      if (other === sentence) continue;
      for (const w of other.split(/\s+/)) {
        const norm = sim.normalizeText(w);
        if (norm.length >= 7 && norm !== sim.normalizeText(target.w)) pool.push(w.replace(/[.,;:]$/, ''));
      }
    }
    if (!pool.length) return null;
    const replacement = pool[Math.floor(rng() * pool.length)];
    const mutated = words.slice();
    mutated[target.i] = replacement;
    return mutated.join(' ');
  }

  function mutateStatement(sentence, corpus, rng) {
    const seen = new Set([sim.normalizeText(sentence)]);
    const muts = [];
    const push = (m) => {
      if (!m) return;
      const norm = sim.normalizeText(m);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        muts.push(m);
      }
    };
    push(mutateNegation(sentence));
    push(mutateNumber(sentence, rng));
    // El swap es aleatorio: varios intentos producen distractores distintos.
    for (let i = 0; i < 8 && muts.length < 3; i++) {
      push(mutateSwap(sentence, corpus, rng));
    }
    // Combinaciones si aún faltan distractores
    if (muts.length < 3 && muts[0]) push(mutateNumber(muts[0], rng));
    for (let i = 0; i < 4 && muts.length < 3 && muts.length > 0; i++) {
      push(mutateSwap(muts[muts.length - 1], corpus, rng));
    }
    return muts;
  }

  // ---------- Constructores por tipo de hecho ----------

  function questionFromNumber(fact, topic, rng) {
    const gap = fact.sentence.replace(fact.value, '____');
    if (gap === fact.sentence) return null;
    const alts = perturbNumber(fact.value, rng);
    const built = buildOptions(fact.value, shuffle(alts, rng), rng);
    if (!built) return null;
    return {
      text: 'Según ' + refLabel(fact.ref, topic) + ', ¿qué valor completa correctamente el texto: «' + gap + '»?',
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: 'El texto original establece: «' + fact.sentence + '».',
      sourceQuote: fact.sentence,
      kind: 'number',
    };
  }

  function questionFromDefinition(fact, topic, corpus, rng) {
    const distractors = mutateStatement(fact.definition, corpus, rng);
    const built = buildOptions(fact.definition, distractors, rng);
    if (!built) return null;
    return {
      text: 'Según ' + refLabel(fact.ref, topic) + ', ¿qué se entiende por «' + fact.term + '»?',
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: 'La fuente lo define así: «' + fact.sentence + '».',
      sourceQuote: fact.sentence,
      kind: 'definition',
    };
  }

  function questionFromStatement(fact, topic, corpus, rng) {
    const distractors = mutateStatement(fact.sentence, corpus, rng);
    if (distractors.length < 3) return null;
    const built = buildOptions(fact.sentence, distractors, rng);
    if (!built) return null;
    return {
      text: 'Según ' + refLabel(fact.ref, topic) + ', señale la afirmación CORRECTA:',
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: 'Es la única literal de la fuente: «' + fact.sentence + '». Las demás contienen alteraciones.',
      sourceQuote: fact.sentence,
      kind: 'statement',
    };
  }

  function questionFromEnumeration(fact, topic, corpus, rng) {
    if (fact.items.length < 3) return null;
    const correct = fact.items[Math.floor(rng() * fact.items.length)];
    const distractors = mutateStatement(correct, corpus.concat(fact.items), rng);
    const built = buildOptions(correct, distractors, rng);
    if (!built) return null;
    return {
      text: 'Según ' + refLabel(fact.ref, topic) + ', ¿cuál de los siguientes figura entre los supuestos enumerados?',
      options: built.options,
      correctIndex: built.correctIndex,
      explanation: 'Figura literalmente en la enumeración de la fuente.',
      sourceQuote: correct,
      kind: 'enumeration',
    };
  }

  /**
   * Genera hasta `count` preguntas válidas y no duplicadas.
   * @param {string} rawText texto del temario
   * @param {object} topic  {oposicion, tipo, ley, tituloCapitulo, articulos}
   * @param {number} count  nº de preguntas deseado
   * @param {object} [opts] {seed, existingTexts: string[] (banco, para dedup)}
   * @returns {{questions: Array, discarded: Array, factsUsed: number}}
   */
  function generateQuestions(rawText, topic, count, opts) {
    const options = opts || {};
    const rng = createRng(options.seed != null ? options.seed : 12345);
    const { facts } = parser.parse(rawText);
    const corpus = facts.map((f) => f.sentence);
    const existing = (options.existingTexts || []).slice();
    const questions = [];
    const discarded = [];

    // Round-robin por tipo para variedad
    const byType = { number: [], definition: [], enumeration: [], statement: [] };
    for (const f of shuffle(facts, rng)) byType[f.type].push(f);
    const order = ['definition', 'number', 'enumeration', 'statement'];

    let progress = true;
    while (questions.length < count && progress) {
      progress = false;
      for (const type of order) {
        if (questions.length >= count) break;
        const fact = byType[type].shift();
        if (!fact) continue;
        progress = true;
        let q = null;
        if (type === 'number') q = questionFromNumber(fact, topic, rng);
        else if (type === 'definition') q = questionFromDefinition(fact, topic, corpus, rng);
        else if (type === 'enumeration') q = questionFromEnumeration(fact, topic, corpus, rng);
        else q = questionFromStatement(fact, topic, corpus, rng);
        if (!q) continue;

        const valid = validator.validateQuestion(q, rawText);
        if (!valid.ok) {
          discarded.push({ question: q, reason: valid.errors.join('; ') });
          continue;
        }
        const dup = sim.findDuplicate(q.text + ' ' + q.options.join(' '), existing);
        if (dup) {
          discarded.push({ question: q, reason: 'duplicada (similitud ' + dup.score.toFixed(2) + ')' });
          continue;
        }
        q.topic = topic;
        existing.push(q.text + ' ' + q.options.join(' '));
        questions.push(q);
      }
    }
    return { questions, discarded, factsUsed: facts.length };
  }

  const api = { createRng, shuffle, perturbNumber, buildOptions, mutateNegation, mutateNumber, mutateStatement, generateQuestions };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
