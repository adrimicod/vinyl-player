/**
 * bank.js — Banco de preguntas comunitario (F0: localStorage; F1: BD).
 * CRUD, filtros por tema, export/import con deduplicación.
 * Módulo puro: el almacenamiento se inyecta ({get, set}).
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const sim = isNode ? require('./similarity.js') : window.OpoCore;
  const validator = isNode ? require('./validator.js') : window.OpoCore;

  function memoryStorage() {
    let data = null;
    return {
      get() { return data; },
      set(value) { data = value; },
    };
  }

  function newId(counter) {
    return 'q' + Date.now().toString(36) + '-' + counter.toString(36);
  }

  class QuestionBank {
    /**
     * @param {{get: Function, set: Function}} [storage] adaptador de persistencia
     * @param {{now: Function}} [clock] reloj inyectable
     */
    constructor(storage, clock) {
      this.storage = storage || memoryStorage();
      this.now = (clock && clock.now) || (() => Date.now());
      const saved = this.storage.get();
      this.questions = Array.isArray(saved) ? saved : [];
      this._counter = this.questions.length;
    }

    _persist() {
      this.storage.set(this.questions);
    }

    /**
     * Añade una pregunta ya validada. Devuelve la pregunta con id y metadatos.
     */
    add(question, authorId, origin) {
      const q = Object.assign({}, question, {
        id: newId(++this._counter),
        authorId: authorId || 'anon',
        origin: origin || 'demo',
        createdAt: this.now(),
        quality: { up: 0, down: 0, erratas: [], status: 'active', rewardedAt: null },
      });
      this.questions.push(q);
      this._persist();
      return q;
    }

    addMany(questions, authorId, origin) {
      return questions.map((q) => this.add(q, authorId, origin));
    }

    all() { return this.questions.slice(); }

    get(id) { return this.questions.find((q) => q.id === id) || null; }

    /** Preguntas activas (las únicas elegibles para tests). */
    active() {
      return this.questions.filter((q) => q.quality.status === 'active');
    }

    /**
     * Filtra por tema. Cualquier campo omitido no filtra.
     * @param {{oposicion?, ley?, tituloCapitulo?}} filter
     */
    byTopic(filter) {
      const f = filter || {};
      const match = (field, value) =>
        !f[field] || (value && sim.normalizeText(value) === sim.normalizeText(f[field]));
      return this.questions.filter((q) => {
        const t = q.topic || {};
        return match('oposicion', t.oposicion) && match('ley', t.ley) && match('tituloCapitulo', t.tituloCapitulo);
      });
    }

    /** Recuento de preguntas activas agrupadas por ley. */
    countByLey() {
      const counts = {};
      for (const q of this.active()) {
        const key = (q.topic && q.topic.ley) || '(sin ley)';
        counts[key] = (counts[key] || 0) + 1;
      }
      return counts;
    }

    update(id, patch) {
      const q = this.get(id);
      if (!q) return null;
      Object.assign(q, patch);
      this._persist();
      return q;
    }

    remove(id) {
      const idx = this.questions.findIndex((q) => q.id === id);
      if (idx === -1) return false;
      this.questions.splice(idx, 1);
      this._persist();
      return true;
    }

    /** Textos de comparación para deduplicación al generar. */
    dedupTexts() {
      return this.questions.map((q) => q.text + ' ' + (q.options || []).join(' '));
    }

    exportJSON() {
      return JSON.stringify({ version: 1, exportedAt: this.now(), questions: this.questions }, null, 2);
    }

    /**
     * Importa un export JSON. Valida estructura y descarta duplicadas.
     * @returns {{added: number, skipped: number, errors: string[]}}
     */
    importJSON(json) {
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch (e) {
        return { added: 0, skipped: 0, errors: ['JSON inválido: ' + e.message] };
      }
      const incoming = Array.isArray(parsed) ? parsed : parsed && parsed.questions;
      if (!Array.isArray(incoming)) {
        return { added: 0, skipped: 0, errors: ['Formato no reconocido: falta la lista de preguntas'] };
      }
      let added = 0;
      let skipped = 0;
      const errors = [];
      for (const raw of incoming) {
        const check = validator.validateQuestion(raw);
        if (!check.ok) {
          skipped++;
          errors.push('Pregunta descartada: ' + check.errors.join('; '));
          continue;
        }
        const text = raw.text + ' ' + raw.options.join(' ');
        if (sim.findDuplicate(text, this.dedupTexts())) {
          skipped++;
          continue;
        }
        const clean = {
          text: raw.text,
          options: raw.options,
          correctIndex: raw.correctIndex,
          explanation: raw.explanation,
          sourceQuote: raw.sourceQuote,
          topic: raw.topic || {},
          kind: raw.kind || 'imported',
        };
        this.add(clean, raw.authorId || 'import', 'import');
        added++;
      }
      return { added, skipped, errors };
    }
  }

  const api = { QuestionBank, memoryStorage };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
