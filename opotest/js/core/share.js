/**
 * share.js — Compartir tests por enlace SIN servidor: las preguntas viajan
 * codificadas en el fragmento (#) de la URL. Comunidad en F0 a coste cero.
 * v2 añade el «reto»: el enlace puede llevar la nota y el alias del retador
 * («Adri sacó 8,33 — ¿puedes superarlo?»). Los enlaces v1 siguen funcionando.
 * Módulo puro: sin DOM (usa btoa/atob, disponibles en navegador y Node ≥16).
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const validator = isNode ? require('./validator.js') : window.OpoCore;

  const SHARE_VERSION = 2;
  const MIN_SUPPORTED_VERSION = 1;
  const MAX_SHARE = 10;
  const MAX_ALIAS = 30;
  const PARAM = 'share';

  function toBase64Url(ascii) {
    return btoa(ascii).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return atob(b64);
  }

  /** Campos mínimos que viajan en el enlace. */
  function pack(q) {
    return {
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      sourceQuote: q.sourceQuote,
      topic: q.topic || {},
      kind: q.kind || 'shared',
    };
  }

  /** Valida y normaliza un reto; devuelve null si es inutilizable. */
  function sanitizeChallenge(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const alias = String(raw.alias || '').trim().slice(0, MAX_ALIAS);
    const score10 = Number(raw.score10);
    if (!alias || !Number.isFinite(score10) || score10 < 0 || score10 > 10) return null;
    return { alias, score10: Math.round(score10 * 100) / 100 };
  }

  /**
   * Codifica hasta MAX_SHARE preguntas en un fragmento de URL.
   * @param {Array} questions
   * @param {object} [opts] {challenge: {alias, score10}} — marcador a batir
   * @returns {string} p.ej. "share=eyJ2IjoyLC…" (añadir tras «#» en la URL)
   */
  function encodeShare(questions, opts) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No hay preguntas que compartir');
    }
    const payload = { v: SHARE_VERSION, q: questions.slice(0, MAX_SHARE).map(pack) };
    const challenge = sanitizeChallenge(opts && opts.challenge);
    if (challenge) payload.c = challenge;
    // encodeURIComponent produce ASCII puro (apto para btoa) y preserva UTF-8.
    return PARAM + '=' + toBase64Url(encodeURIComponent(JSON.stringify(payload)));
  }

  /**
   * Decodifica un fragmento (o hash completo) de URL compartida.
   * Lanza errores con mensajes claros; nunca devuelve preguntas malformadas.
   * Un reto malformado degrada a compartir normal (challenge: null).
   * @returns {{questions: Array, skipped: number, challenge: {alias, score10}|null}}
   */
  function decodeShare(fragmentOrHash) {
    const str = String(fragmentOrHash || '');
    const match = str.match(/(?:^|[#&?])share=([A-Za-z0-9\-_]+)/);
    if (!match) throw new Error('El enlace no contiene un test compartido');

    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(fromBase64Url(match[1])));
    } catch (e) {
      throw new Error('El enlace está dañado o incompleto');
    }
    if (!payload || !Number.isInteger(payload.v) ||
        payload.v < MIN_SUPPORTED_VERSION || payload.v > SHARE_VERSION) {
      throw new Error('El enlace usa una versión de formato no soportada por esta app');
    }
    if (!Array.isArray(payload.q) || payload.q.length === 0) {
      throw new Error('El enlace no contiene preguntas');
    }
    const questions = [];
    let skipped = 0;
    for (const raw of payload.q.slice(0, MAX_SHARE)) {
      if (validator.validateQuestion(raw).ok) questions.push(pack(raw));
      else skipped++;
    }
    if (!questions.length) throw new Error('El enlace no contiene preguntas válidas');
    return { questions, skipped, challenge: sanitizeChallenge(payload.c) };
  }

  const api = { encodeShare, decodeShare, SHARE_VERSION, MAX_SHARE, MAX_ALIAS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
