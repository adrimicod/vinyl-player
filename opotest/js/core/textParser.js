/**
 * textParser.js — Trocea un temario/ley en artículos, frases y "hechos"
 * (números, definiciones, enumeraciones) sobre los que generar preguntas.
 * Módulo puro: sin DOM.
 */
(function () {
  'use strict';

  function cleanText(raw) {
    return String(raw || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const ARTICLE_RE = /(?:^|\n)\s*(art(?:í|i)culo|art\.)\s*(\d+)\s*(bis|ter|quater)?\s*[.\-–—:]?/gi;

  /**
   * Divide el texto en secciones por "Artículo N". Si no hay artículos,
   * devuelve una única sección sin referencia.
   * @returns {Array<{ref: string|null, number: string|null, body: string}>}
   */
  function splitArticles(text) {
    const t = cleanText(text);
    const matches = Array.from(t.matchAll(ARTICLE_RE));
    if (matches.length === 0) {
      return t ? [{ ref: null, number: null, body: t }] : [];
    }
    const sections = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const start = m.index + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : t.length;
      const suffix = m[3] ? ' ' + m[3].toLowerCase() : '';
      const body = t.slice(start, end).trim();
      if (!body) continue;
      sections.push({ ref: 'Artículo ' + m[2] + suffix, number: m[2] + suffix.trim(), body });
    }
    return sections;
  }

  // Abreviaturas frecuentes que no cierran frase.
  const ABBREV_RE = /\b(art|arts|núm|num|pág|pag|apdo|cap|tít|tit|sr|sra|dr|dra|etc|ss|p\.ej)\.$/i;

  function splitSentences(body) {
    const parts = String(body || '')
      .split(/\n+/)
      .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ«"(])/));
    const out = [];
    for (const raw of parts) {
      // Los marcadores de enumeración «a) …» no forman parte de la frase.
      const s = raw.trim().replace(/^[a-z]\)\s+/i, '');
      if (!s) continue;
      // Reunir con la anterior si esta terminaba en abreviatura.
      if (out.length && ABBREV_RE.test(out[out.length - 1])) {
        out[out.length - 1] += ' ' + s;
      } else {
        out.push(s);
      }
    }
    return out.filter((s) => s.length >= 25);
  }

  const NUMBER_RE = /\b\d+(?:[.,]\d+)?\b/g;
  const DEFINITION_RE = /se\s+entiende(?:n)?\s+por\s+([^,:]{3,60})[,:]?\s+(.{15,300})/i;
  const ENUM_ITEM_RE = /(?:^|\n)\s*([a-z])\)\s+([^\n]{5,200})/gi;

  /** Normalización ligera para comparar frases (sin depender de similarity.js). */
  function normLite(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Números que NO son datos examinables: citas normativas («Ley 39/2015»,
  // «39/2015»), números de artículo y años sueltos. Preguntar por ellos
  // produce preguntas sin valor («¿Ley __/2015?»).
  const EXCLUDED_NUMBER_RE = /\b(?:ley|leyes|real\s+decreto|decreto|reglamento|directiva|orden)\s+\d+\/\d+|\bart(?:í|i)culos?\s+\d+(?:\s*(?:bis|ter|quater))?|\b\d+\/\d+\b|\b(?:1[89]\d{2}|20\d{2})\b/gi;

  /**
   * Números examinables de una frase (excluye citas de leyes/artículos/años).
   * @returns {Array<string>} valores en orden de aparición
   */
  function questionableNumbers(sentence) {
    const excluded = [];
    for (const m of sentence.matchAll(EXCLUDED_NUMBER_RE)) {
      excluded.push([m.index, m.index + m[0].length]);
    }
    const out = [];
    for (const m of sentence.matchAll(NUMBER_RE)) {
      const inExcluded = excluded.some(([a, b]) => m.index >= a && m.index < b);
      if (!inExcluded) out.push(m[0]);
    }
    return out;
  }

  /**
   * Sustituye la primera aparición COMPLETA de `value` por «____».
   * Los contornos evitan romper siglas («A1») y decimales («2,5»).
   * Si no hay aparición limpia, devuelve la frase intacta.
   */
  function gapReplace(sentence, value) {
    const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      '(?<![0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ_])(?<!\\d[.,])' + escaped + '(?![0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ_])(?![.,]\\d)'
    );
    return sentence.replace(re, '____');
  }

  /**
   * Extrae hechos cuestionables de una sección.
   * Tipos: 'number' | 'definition' | 'enumeration' | 'statement'
   */
  function extractFacts(section) {
    const facts = [];
    const sentences = splitSentences(section.body);

    // Enumeraciones a) b) c) a nivel de sección. Sus ítems NO deben volver a
    // extraerse como statement/number: dos preguntas del mismo lote acabarían
    // mostrándose la respuesta mutuamente (fuga de respuestas).
    const items = Array.from(section.body.matchAll(ENUM_ITEM_RE)).map((m) => m[2].trim());
    const itemSet = new Set(items.map(normLite));
    if (items.length >= 3) {
      facts.push({ type: 'enumeration', items, ref: section.ref, sentence: items.join('; ') });
    }

    for (const sentence of sentences) {
      if (itemSet.has(normLite(sentence))) continue; // ítem de enumeración: ya cubierto
      const def = sentence.match(DEFINITION_RE);
      if (def) {
        facts.push({
          type: 'definition',
          term: def[1].trim(),
          definition: def[2].trim().replace(/[.;]$/, ''),
          ref: section.ref,
          sentence,
        });
        continue;
      }
      // Solo números examinables: las citas «Ley 39/2015», años y números de
      // artículo no son datos que preguntar.
      const numbers = questionableNumbers(sentence);
      if (numbers.length && sentence.length <= 320) {
        facts.push({ type: 'number', value: numbers[0], ref: section.ref, sentence });
        continue;
      }
      // Las frases que terminan en ':' son introducciones de enumeraciones,
      // no afirmaciones completas: no sirven como hecho tipo statement.
      if (sentence.length >= 40 && sentence.length <= 320 && !sentence.endsWith(':')) {
        facts.push({ type: 'statement', ref: section.ref, sentence });
      }
    }
    return facts;
  }

  /**
   * Pipeline completo: texto bruto → hechos agrupados por sección.
   * @returns {{sections: Array, facts: Array}}
   */
  function parse(rawText) {
    const sections = splitArticles(rawText);
    const facts = [];
    for (const section of sections) {
      facts.push(...extractFacts(section));
    }
    return { sections, facts };
  }

  const api = { cleanText, splitArticles, splitSentences, extractFacts, parse, questionableNumbers, gapReplace };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
