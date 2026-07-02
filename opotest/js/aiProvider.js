/**
 * aiProvider.js — Proveedores de generación de preguntas.
 *  - DemoProvider: heurístico, offline y gratis (envuelve generator.js).
 *  - ClaudeProvider: llama a la API de Claude con la clave del usuario (F0);
 *    en F1 esta llamada vive en el backend con doble pase verificador.
 * Interfaz común: generate(rawText, topic, count) → Promise<{questions, discarded}>
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./core/generator.js') : window.OpoCore;
  const validator = isNode ? require('./core/validator.js') : window.OpoCore;
  const sim = isNode ? require('./core/similarity.js') : window.OpoCore;

  class DemoProvider {
    constructor(opts) {
      this.opts = opts || {};
    }

    get name() { return 'demo'; }

    async generate(rawText, topic, count, existingTexts) {
      const result = gen.generateQuestions(rawText, topic, count, {
        seed: this.opts.seed,
        existingTexts: existingTexts || [],
      });
      return { questions: result.questions, discarded: result.discarded };
    }
  }

  const CLAUDE_MODEL = 'claude-sonnet-5';
  const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

  function buildPrompt(rawText, topic, count) {
    const meta = [
      topic.oposicion && 'Oposición: ' + topic.oposicion,
      topic.ley && 'Fuente: ' + topic.ley,
      topic.tituloCapitulo && 'Parte: ' + topic.tituloCapitulo,
      topic.articulos && 'Artículos: ' + topic.articulos,
    ].filter(Boolean).join('\n');

    return 'Eres un preparador de oposiciones experto en redactar preguntas tipo test de calidad oficial.\n'
      + 'Genera exactamente ' + count + ' preguntas tipo test sobre el TEXTO FUENTE.\n\n'
      + (meta ? meta + '\n\n' : '')
      + 'Reglas estrictas:\n'
      + '1. Cada pregunta debe poder responderse SOLO con el texto fuente.\n'
      + '2. 4 opciones, una única correcta. Distractores plausibles (números perturbados, órganos/plazos confundibles, negaciones sutiles).\n'
      + '3. "sourceQuote" debe ser una cita LITERAL del texto fuente que justifica la respuesta.\n'
      + '4. Estilo de examen oficial: enunciado cerrado, sin ambigüedad, cita el artículo cuando exista.\n'
      + '5. Responde ÚNICAMENTE con un array JSON, sin texto adicional:\n'
      + '[{"text": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "...", "sourceQuote": "..."}]\n\n'
      + 'TEXTO FUENTE:\n"""\n' + rawText + '\n"""';
  }

  function extractJsonArray(text) {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) throw new Error('La respuesta no contiene un array JSON');
    return JSON.parse(text.slice(start, end + 1));
  }

  class ClaudeProvider {
    /**
     * @param {string} apiKey clave del usuario
     * @param {object} [opts] {fetch: fetch inyectable para tests, model}
     */
    constructor(apiKey, opts) {
      if (!apiKey) throw new Error('ClaudeProvider necesita una API key');
      this.apiKey = apiKey;
      this.fetch = (opts && opts.fetch) || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
      this.model = (opts && opts.model) || CLAUDE_MODEL;
      if (!this.fetch) throw new Error('fetch no disponible');
    }

    get name() { return 'claude'; }

    async generate(rawText, topic, count, existingTexts) {
      const response = await this.fetch(CLAUDE_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: buildPrompt(rawText, topic, count) }],
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error('Error de la API de Claude (' + response.status + '): ' + detail.slice(0, 200));
      }
      const data = await response.json();
      const text = (data.content || []).map((b) => b.text || '').join('');
      const raw = extractJsonArray(text);

      // Mismo pipeline de calidad que el modo demo: validar + deduplicar.
      // El criterio de comparación (enunciado + opciones) es el mismo que
      // usa el generador y bank.dedupTexts().
      const { accepted, rejected } = validator.validateBatch(raw, rawText);
      const discarded = rejected.map((r) => ({ question: r.candidate, reason: r.errors.join('; ') }));
      const questions = [];
      const seen = (existingTexts || []).slice();
      for (const q of accepted) {
        const comparable = q.text + ' ' + q.options.join(' ');
        if (sim.findDuplicate(comparable, seen)) {
          discarded.push({ question: q, reason: 'duplicada' });
          continue;
        }
        seen.push(comparable);
        questions.push(Object.assign({}, q, { topic }));
      }
      return { questions, discarded };
    }
  }

  const api = { DemoProvider, ClaudeProvider, buildPrompt, extractJsonArray };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
