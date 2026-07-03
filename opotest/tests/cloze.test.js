const { test } = require('node:test');
const assert = require('node:assert/strict');
const cloze = require('../js/core/cloze.js');
const gen = require('../js/core/generator.js');
const { SAMPLE_LAW } = require('./fixtures.js');

test('buildClozeDeck extrae ejercicios con referencia y candidatos', () => {
  const deck = cloze.buildClozeDeck(SAMPLE_LAW);
  assert.ok(deck.length >= 3, 'esperaba varios ejercicios, salieron ' + deck.length);
  for (const item of deck) {
    assert.ok(item.candidates.length >= 1);
    assert.ok(item.sentence.length > 20);
  }
  assert.ok(deck.some((i) => i.ref === 'Artículo 1'));
  // Los ids son estables
  const again = cloze.buildClozeDeck(SAMPLE_LAW);
  assert.deepEqual(deck.map((i) => i.id), again.map((i) => i.id));
});

test('makeRound oculta tantos huecos como se pida (hasta los candidatos)', () => {
  const deck = cloze.buildClozeDeck(SAMPLE_LAW);
  const rich = deck.find((i) => i.candidates.length >= 2);
  assert.ok(rich, 'hace falta un ejercicio con 2+ candidatos');
  const one = cloze.makeRound(rich, 1, gen.createRng(3));
  assert.equal(one.answers.length, 1);
  assert.equal((one.display.match(/____/g) || []).length, 1);
  const two = cloze.makeRound(rich, 2, gen.createRng(3));
  assert.equal(two.answers.length, 2);
  assert.equal((two.display.match(/____/g) || []).length, 2);
  const many = cloze.makeRound(rich, 99, gen.createRng(3));
  assert.equal(many.answers.length, rich.candidates.length, 'se recorta a los candidatos');
});

test('makeRound es determinista y las respuestas van en orden de aparición', () => {
  const deck = cloze.buildClozeDeck(SAMPLE_LAW);
  const item = deck.find((i) => i.candidates.length >= 2);
  const a = cloze.makeRound(item, 2, gen.createRng(9));
  const b = cloze.makeRound(item, 2, gen.createRng(9));
  assert.deepEqual(a, b);
  const positions = a.answers.map((w) => item.sentence.indexOf(w));
  assert.deepEqual(positions, positions.slice().sort((x, y) => x - y));
});

test('los huecos de números no rompen números vecinos (6 no casa dentro de 16)', () => {
  const item = { sentence: 'Los menores de 16 años dispondrán de 6 meses para actuar.', ref: null, candidates: ['6'] };
  const round = cloze.makeRound(item, 1, gen.createRng(1));
  assert.ok(round.display.includes('16 años'), 'el 16 debe quedar intacto: ' + round.display);
  assert.ok(round.display.includes('____ meses'));
});

test('checkClozeAnswer: tildes y mayúsculas nunca cuentan; erratas menores se toleran', () => {
  assert.equal(cloze.checkClozeAnswer('Administración', 'administracion').correct, true);
  assert.equal(cloze.checkClozeAnswer('procedimiento', 'procedimeinto').correct, true, 'una transposición en palabra larga');
  assert.equal(cloze.checkClozeAnswer('interesado', 'internado').correct, false);
  assert.equal(cloze.checkClozeAnswer('plazo', 'plazos').correct, true, '1 error en palabra de 5');
  assert.equal(cloze.checkClozeAnswer('plazo', '').correct, false);
});

test('checkClozeAnswer: los números se exigen exactos', () => {
  assert.equal(cloze.checkClozeAnswer('15', '15').correct, true);
  assert.equal(cloze.checkClozeAnswer('15', '16').correct, false);
  assert.equal(cloze.checkClozeAnswer('2,5', '2.5').correct, true, 'coma y punto equivalen');
});

test('hintFor da pistas progresivas', () => {
  assert.equal(cloze.hintFor('plazo', 0), '');
  assert.ok(cloze.hintFor('plazo', 1).includes('«p»'));
  assert.ok(cloze.hintFor('plazo', 2).includes('5 caracteres'));
});
