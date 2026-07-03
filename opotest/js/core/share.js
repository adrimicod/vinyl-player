/**
 * share.js — Compartir tests por enlace SIN servidor: las preguntas viajan
 * codificadas en el fragmento (#) de la URL. Comunidad en F0 a coste cero.
 * Módulo puro: sin DOM (usa btoa/atob, disponibles en navegador y Node ≥16).
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const validator = isNode ? require('./validator.js') : window.OpoCore;

  const SHARE_VERSION = 1;
  const MAX_SHARE = 10;
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

  /**
   * Codifica hasta MAX_SHARE preguntas en un fragmento de URL.
   * @returns {string} p.ej. "share=eyJ2IjoxLC…" (añadir tras «#» en la URL)
   */
  function encodeShare(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No hay preguntas que compartir');
    }
    const payload = { v: SHARE_VERSION, q: questions.slice(0, MAX_SHARE).map(pack) };
    // encodeURIComponent produce ASCII puro (apto para btoa) y preserva UTF-8.
    return PARAM + '=' + toBase64Url(encodeURIComponent(JSON.stringify(payload)));
  }

  /**
   * Decodifica un fragmento (o hash completo) de URL compartida.
   * Lanza errores con mensajes claros; nunca devuelve preguntas malformadas.
   * @returns {{questions: Array, skipped: number}}
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
    if (!payload || payload.v !== SHARE_VERSION) {
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
    return { questions, skipped };
  }

  const api = { encodeShare, decodeShare, SHARE_VERSION, MAX_SHARE };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
