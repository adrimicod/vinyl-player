/**
 * cheatsheet.js — Chuleta sinóptica auto-generada del temario: tabla de
 * plazos/números, definiciones y enumeraciones extraídas por el parser,
 * cada fila con su artículo (anclaje §1.3). Puede personalizarse marcando
 * lo que el usuario falla (failedIds / falsas certezas). El puente
 * pantalla → papel: los opositores estudian los últimos días en papel.
 * Módulo puro: sin DOM.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const parser = isNode ? require('./textParser.js') : window.OpoCore;
  const coverage = isNode ? require('./coverage.js') : window.OpoCore;

  /** Orden natural por artículo ('Artículo 4' < 'Artículo 4 bis' < 'Artículo 14'). */
  function refOrder(ref) {
    const m = String(ref || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  }

  function sortByRef(rows) {
    return rows.slice().sort((a, b) =>
      refOrder(a.ref) - refOrder(b.ref) || String(a.ref || '').localeCompare(String(b.ref || ''))
    );
  }

  /**
   * Construye la chuleta a partir del texto del temario.
   * @returns {{plazos, definiciones, enumeraciones, total}} filas con {ref, weak?: bool}
   */
  function buildCheatsheet(rawText) {
    const { facts } = parser.parse(rawText);
    const plazos = [];
    const definiciones = [];
    const enumeraciones = [];
    for (const f of facts) {
      if (f.type === 'number') plazos.push({ value: f.value, sentence: f.sentence, ref: f.ref || null });
      else if (f.type === 'definition') definiciones.push({ term: f.term, definition: f.definition, ref: f.ref || null });
      else if (f.type === 'enumeration') enumeraciones.push({ items: f.items, ref: f.ref || null });
    }
    const sheet = {
      plazos: sortByRef(plazos),
      definiciones: sortByRef(definiciones),
      enumeraciones: sortByRef(enumeraciones),
    };
    sheet.total = sheet.plazos.length + sheet.definiciones.length + sheet.enumeraciones.length;
    return sheet;
  }

  /**
   * Artículos («Artículo N») en los que el usuario falla, a partir de las
   * preguntas del banco cuyos ids están en failedIds/falseCertaintyIds.
   * @returns {Set<string>}
   */
  function weakRefs(bankQuestions, weakIds) {
    const ids = new Set(weakIds || []);
    const refs = new Set();
    for (const q of bankQuestions || []) {
      if (!ids.has(q.id)) continue;
      const article = coverage.articleOf(q);
      if (article) refs.add('Artículo ' + article);
    }
    return refs;
  }

  /**
   * Marca `weak: true` en las filas cuyos artículos fallas — la chuleta
   * personalizada destaca justo lo que se te resiste.
   * @returns {number} filas marcadas
   */
  function annotateWeak(sheet, weakRefSet) {
    let marked = 0;
    for (const section of ['plazos', 'definiciones', 'enumeraciones']) {
      for (const row of sheet[section]) {
        row.weak = !!(row.ref && weakRefSet.has(row.ref));
        if (row.weak) marked++;
      }
    }
    return marked;
  }

  const api = { buildCheatsheet, weakRefs, annotateWeak };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
