const { test } = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../js/core/similarity.js');

test('normalizeText quita tildes, puntuación y mayúsculas', () => {
  assert.equal(sim.normalizeText('¿Cuál es el PLAZO máximo?'), 'cual es el plazo maximo');
  assert.equal(sim.normalizeText('  Artículo 15.- Régimen  '), 'articulo 15 regimen');
});

test('tokenize elimina stopwords y tokens de un carácter', () => {
  const tokens = sim.tokenize('El plazo de la notificación es de 10 días');
  assert.ok(!tokens.includes('el'));
  assert.ok(!tokens.includes('de'));
  assert.ok(tokens.includes('plazo'));
  assert.ok(tokens.includes('10'));
});

test('jaccard: idénticos=1, disjuntos=0', () => {
  assert.equal(sim.jaccard(['a1', 'b2'], ['a1', 'b2']), 1);
  assert.equal(sim.jaccard(['a1'], ['b2']), 0);
  assert.equal(sim.jaccard([], []), 1);
  assert.equal(sim.jaccard([], ['x1']), 0);
});

test('similarity detecta preguntas casi iguales pese a variaciones', () => {
  const a = '¿Cuál es el plazo máximo para resolver y notificar la solicitud?';
  const b = 'Cual es el plazo maximo para resolver y notificar la solicitud';
  assert.ok(sim.similarity(a, b) >= 0.9);
});

test('similarity baja para preguntas distintas', () => {
  const a = '¿Cuál es el plazo máximo para resolver?';
  const b = '¿Qué órgano es competente para sancionar las infracciones graves?';
  assert.ok(sim.similarity(a, b) < 0.3);
});

test('findDuplicate devuelve el mejor match sobre el umbral', () => {
  const bank = [
    '¿Qué órgano resuelve el recurso de alzada en vía administrativa?',
    '¿Cuál es el plazo máximo para resolver y notificar la solicitud presentada?',
  ];
  const dup = sim.findDuplicate('Cuál es el plazo máximo para resolver y notificar la solicitud presentada', bank);
  assert.ok(dup);
  assert.equal(dup.index, 1);
  assert.equal(sim.findDuplicate('¿Quién nombra al Defensor del Pueblo según la Constitución?', bank), null);
});

test('filterDuplicates deduplica contra el banco y entre candidatas', () => {
  const candidates = [
    { text: '¿Cuál es el plazo máximo para resolver y notificar la solicitud presentada?' },
    { text: 'Cuál es el plazo máximo para resolver y notificar la solicitud presentada' }, // dup de la anterior
    { text: '¿Qué se entiende por interesado en el procedimiento administrativo común?' },
  ];
  const { accepted, rejected } = sim.filterDuplicates(candidates, []);
  assert.equal(accepted.length, 2);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'duplicada');
});
