const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildReverseQuiz, sourceLabel } = require('../js/core/reverse.js');
const gen = require('../js/core/generator.js');
const validator = require('../js/core/validator.js');
const { goodQuestion } = require('./fixtures.js');

function bankQuestion(article, ley, i) {
  return goodQuestion({
    text: 'Según el artículo ' + article + ' de la ' + ley + ', ¿cuál es el plazo aplicable al caso ' + i + '?',
    sourceQuote: 'Cita literal de prueba número ' + i + ' con contenido suficiente.',
    topic: { ley },
    id: 'q' + i,
  });
}

test('sourceLabel extrae artículo y ley del enunciado y el topic', () => {
  assert.equal(sourceLabel(bankQuestion(14, 'Ley 39/2015', 1)), 'Artículo 14 — Ley 39/2015');
  assert.equal(sourceLabel(goodQuestion({ text: 'Pregunta genérica sin referencia legal pero larga, ¿vale?', topic: { ley: 'CE 1978' } })), 'CE 1978');
  assert.equal(sourceLabel(goodQuestion({ text: 'Pregunta genérica sin nada de nada pero suficientemente larga', topic: {} })), null);
  assert.equal(sourceLabel(bankQuestion('4 bis', 'Ley 39/2015', 2)), 'Artículo 4 bis — Ley 39/2015');
});

test('buildReverseQuiz genera preguntas válidas con la procedencia correcta', () => {
  const bank = [14, 21, 30, 47, 53].map((a, i) => bankQuestion(a, 'Ley 39/2015', i));
  const quiz = buildReverseQuiz(bank, { count: 5, rng: gen.createRng(7) });
  assert.ok(quiz.length >= 4);
  for (const q of quiz) {
    const res = validator.validateQuestion(q);
    assert.ok(res.ok, res.errors.join('; '));
    assert.equal(q.kind, 'reverse');
    assert.ok(q.text.includes('¿De qué precepto procede'));
    // La opción correcta coincide con la procedencia real de la cita
    const src = bank.find((b) => q.sourceQuote === b.sourceQuote);
    assert.equal(q.options[q.correctIndex], sourceLabel(src));
  }
});

test('las 4 opciones son únicas y usan procedencias reales del banco', () => {
  const bank = [1, 2, 3, 4, 5, 6].map((a, i) => bankQuestion(a, 'Ley 40/2015', i));
  const quiz = buildReverseQuiz(bank, { count: 3, rng: gen.createRng(1) });
  for (const q of quiz) {
    assert.equal(new Set(q.options).size, 4);
  }
});

test('con banco pequeño completa distractores perturbando el número de artículo', () => {
  // Solo 1 pregunta en el banco: no hay otras procedencias reales
  const quiz = buildReverseQuiz([bankQuestion(30, 'Ley 39/2015', 0)], { count: 1, rng: gen.createRng(2) });
  assert.equal(quiz.length, 1);
  assert.equal(new Set(quiz[0].options).size, 4);
  assert.ok(quiz[0].options.every((o) => o.includes('Ley 39/2015')));
});

test('descarta preguntas sin metadatos suficientes', () => {
  const noMeta = goodQuestion({
    text: 'Pregunta sin referencia a ningún precepto pero con longitud válida',
    topic: {},
  });
  assert.deepEqual(buildReverseQuiz([noMeta], { count: 5, rng: gen.createRng(3) }), []);
});

test('no consume créditos: es una transformación pura del banco', () => {
  // Garantía de contrato: no toca CreditManager ni proveedor alguno —
  // la función no recibe créditos ni red, solo datos.
  const bank = [10, 20].map((a, i) => bankQuestion(a, 'Ley 39/2015', i));
  const quiz = buildReverseQuiz(bank, { count: 2, rng: gen.createRng(4) });
  assert.ok(Array.isArray(quiz));
});

test('es determinista con el mismo rng', () => {
  const bank = [14, 21, 30].map((a, i) => bankQuestion(a, 'Ley 39/2015', i));
  const a = buildReverseQuiz(bank, { count: 3, rng: gen.createRng(9) });
  const b = buildReverseQuiz(bank, { count: 3, rng: gen.createRng(9) });
  assert.deepEqual(a.map((q) => q.text), b.map((q) => q.text));
});
