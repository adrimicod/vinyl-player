const { test } = require('node:test');
const assert = require('node:assert/strict');
const validator = require('../js/core/validator.js');
const { SAMPLE_LAW, goodQuestion } = require('./fixtures.js');

test('una pregunta bien formada y anclada pasa la validación', () => {
  const res = validator.validateQuestion(goodQuestion(), SAMPLE_LAW);
  assert.deepEqual(res, { ok: true, errors: [] });
});

test('rechaza preguntas sin 4 opciones', () => {
  const res = validator.validateQuestion(goodQuestion({ options: ['a', 'b', 'c'] }));
  assert.ok(!res.ok);
  assert.ok(res.errors.some((e) => e.includes('4 opciones')));
});

test('rechaza opciones duplicadas (ignorando tildes/mayúsculas)', () => {
  const res = validator.validateQuestion(goodQuestion({ options: ['6 meses', '6 MESES', '3 meses', '1 mes'] }));
  assert.ok(!res.ok);
  assert.ok(res.errors.some((e) => e.includes('duplicadas')));
});

test('rechaza correctIndex fuera de rango', () => {
  assert.ok(!validator.validateQuestion(goodQuestion({ correctIndex: 4 })).ok);
  assert.ok(!validator.validateQuestion(goodQuestion({ correctIndex: -1 })).ok);
  assert.ok(!validator.validateQuestion(goodQuestion({ correctIndex: 1.5 })).ok);
});

test('rechaza citas que no aparecen en el texto fuente (no ancladas)', () => {
  const res = validator.validateQuestion(
    goodQuestion({ sourceQuote: 'Este texto no existe en la fuente original de la ley' }),
    SAMPLE_LAW
  );
  assert.ok(!res.ok);
  assert.ok(res.errors.some((e) => e.includes('no anclada')));
});

test('el anclaje ignora tildes y puntuación', () => {
  const res = validator.validateQuestion(
    goodQuestion({ sourceQuote: 'el plazo maximo para resolver y notificar sera de 6 meses' }),
    SAMPLE_LAW
  );
  assert.ok(res.ok, res.errors.join('; '));
});

test('sin texto fuente solo exige que exista la cita', () => {
  assert.ok(validator.validateQuestion(goodQuestion()).ok);
  assert.ok(!validator.validateQuestion(goodQuestion({ sourceQuote: '' })).ok);
});

test('rechaza enunciados vacíos, explicación ausente y objetos inválidos', () => {
  assert.ok(!validator.validateQuestion(goodQuestion({ text: 'corto' })).ok);
  assert.ok(!validator.validateQuestion(goodQuestion({ explanation: '  ' })).ok);
  assert.ok(!validator.validateQuestion(null).ok);
});

test('validateBatch separa aceptadas y rechazadas', () => {
  const { accepted, rejected } = validator.validateBatch(
    [goodQuestion(), goodQuestion({ options: ['solo', 'tres', 'opciones'] })],
    SAMPLE_LAW
  );
  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].errors.length > 0);
});
