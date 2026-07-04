const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCheatsheet, weakRefs, annotateWeak } = require('../js/core/cheatsheet.js');
const { SAMPLE_LAW, goodQuestion } = require('./fixtures.js');

test('buildCheatsheet agrupa plazos, definiciones y enumeraciones con su artículo', () => {
  const sheet = buildCheatsheet(SAMPLE_LAW);
  assert.ok(sheet.plazos.length >= 2);
  assert.ok(sheet.plazos.some((p) => p.value === '6' && p.ref === 'Artículo 1'));
  assert.equal(sheet.definiciones.length, 1);
  assert.equal(sheet.definiciones[0].term, 'interesado');
  assert.equal(sheet.definiciones[0].ref, 'Artículo 2');
  assert.equal(sheet.enumeraciones.length, 1);
  assert.equal(sheet.enumeraciones[0].items.length, 4);
  assert.equal(sheet.total,
    sheet.plazos.length + sheet.cifras.length + sheet.definiciones.length + sheet.enumeraciones.length);
});

test('solo los números con contexto temporal son plazos (Q9)', () => {
  const sheet = buildCheatsheet(
    'Artículo 12. Mayoría de edad.\nLos españoles son mayores de edad a los 18 años cumplidos conforme a la Constitución.\n' +
    'Artículo 66. Composición.\nEl Congreso se compone de un mínimo de 300 Diputados elegidos por sufragio universal.\n' +
    'Artículo 21. Plazos.\nEl plazo máximo para resolver el procedimiento será de 3 meses desde su iniciación.'
  );
  assert.equal(sheet.plazos.length, 1, 'solo el plazo real');
  assert.equal(sheet.plazos[0].value, '3');
  assert.equal(sheet.cifras.length, 2, 'edad y diputados son cifras, no plazos');
  assert.ok(sheet.cifras.some((c) => c.value === '18'));
  assert.ok(sheet.cifras.some((c) => c.value === '300'));
});

test('las filas van ordenadas por número de artículo', () => {
  const sheet = buildCheatsheet(SAMPLE_LAW);
  const orders = sheet.plazos.map((p) => parseInt((p.ref || '').match(/\d+/) || '9999', 10));
  assert.deepEqual(orders, orders.slice().sort((a, b) => a - b));
});

test('la chuleta es determinista (mismo texto → misma chuleta)', () => {
  assert.deepEqual(buildCheatsheet(SAMPLE_LAW), buildCheatsheet(SAMPLE_LAW));
});

test('weakRefs extrae los artículos de las preguntas falladas', () => {
  const bank = [
    Object.assign(goodQuestion({ text: 'Según el artículo 1 de la Ley 39/2015, ¿cuál es el plazo previsto?' }), { id: 'a' }),
    Object.assign(goodQuestion({ text: 'Según el artículo 2 de la Ley 39/2015, ¿qué se entiende por interesado?' }), { id: 'b' }),
  ];
  const refs = weakRefs(bank, ['a']);
  assert.deepEqual(Array.from(refs), ['Artículo 1']);
  assert.equal(weakRefs(bank, []).size, 0);
  assert.equal(weakRefs(bank, undefined).size, 0);
});

test('annotateWeak marca solo las filas de los artículos que fallas', () => {
  const sheet = buildCheatsheet(SAMPLE_LAW);
  const marked = annotateWeak(sheet, new Set(['Artículo 1']));
  assert.ok(marked >= 1);
  for (const row of sheet.plazos) {
    assert.equal(row.weak, row.ref === 'Artículo 1');
  }
  assert.equal(sheet.definiciones[0].weak, false, 'el artículo 2 no está marcado');
});
