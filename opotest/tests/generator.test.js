const { test } = require('node:test');
const assert = require('node:assert/strict');
const gen = require('../js/core/generator.js');
const validator = require('../js/core/validator.js');
const { SAMPLE_LAW, SAMPLE_TOPIC } = require('./fixtures.js');

test('createRng es determinista para la misma semilla', () => {
  const a = gen.createRng(42);
  const b = gen.createRng(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('perturbNumber genera alternativas distintas y positivas', () => {
  const alts = gen.perturbNumber('10', gen.createRng(1));
  assert.ok(alts.length >= 3);
  assert.ok(!alts.includes('10'));
  for (const alt of alts) assert.ok(parseFloat(alt) > 0);
});

test('perturbNumber respeta decimales con coma', () => {
  const alts = gen.perturbNumber('2,5', gen.createRng(1));
  assert.ok(alts.every((a) => !a.includes('.')));
});

test('buildOptions devuelve 4 opciones únicas con la correcta incluida', () => {
  const built = gen.buildOptions('6 meses', ['3 meses', '6 MESES', '12 meses', '1 mes', '2 meses'], gen.createRng(7));
  assert.equal(built.options.length, 4);
  assert.equal(built.options[built.correctIndex], '6 meses');
  assert.equal(new Set(built.options).size, 4);
});

test('buildOptions devuelve null si no hay distractores suficientes', () => {
  assert.equal(gen.buildOptions('6 meses', ['3 meses'], gen.createRng(7)), null);
});

test('mutateNegation introduce una negación', () => {
  const m = gen.mutateNegation('El plazo será de 10 días hábiles');
  assert.ok(m.includes('no será'));
});

test('mutateSwap respeta la capitalización de la palabra sustituida', () => {
  const sentence = 'el procedimiento administrativo garantiza los derechos fundamentales de todas las personas interesadas';
  const corpus = ['Administraciones Públicas Constitución Española Reglamento'];
  // El corpus solo ofrece palabras capitalizadas y el objetivo es minúscula → sin intercambio posible
  assert.equal(gen.mutateSwap(sentence, corpus, gen.createRng(3)), null);
  const corpusLower = ['la notificación electrónica establece obligaciones administrativas concretas para responsables'];
  const swapped = gen.mutateSwap(sentence, corpusLower, gen.createRng(3));
  assert.ok(swapped && swapped !== sentence);
});

test('generateQuestions produce preguntas válidas y ancladas al texto', () => {
  const { questions } = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 8, { seed: 42 });
  assert.ok(questions.length >= 4, 'esperaba al menos 4 preguntas, salieron ' + questions.length);
  for (const q of questions) {
    const res = validator.validateQuestion(q, SAMPLE_LAW);
    assert.ok(res.ok, 'pregunta inválida: ' + res.errors.join('; ') + ' → ' + q.text);
    assert.deepEqual(q.topic, SAMPLE_TOPIC);
  }
});

test('generateQuestions es determinista con la misma semilla', () => {
  const a = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 5, { seed: 99 });
  const b = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 5, { seed: 99 });
  assert.deepEqual(a.questions.map((q) => q.text), b.questions.map((q) => q.text));
});

test('generateQuestions respeta el límite solicitado', () => {
  const { questions } = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 2, { seed: 42 });
  assert.ok(questions.length <= 2);
});

test('generateQuestions no repite preguntas ya existentes en el banco', () => {
  const sim = require('../js/core/similarity.js');
  const first = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 5, { seed: 42 });
  const existingTexts = first.questions.map((q) => q.text + ' ' + q.options.join(' '));
  const second = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 5, { seed: 42, existingTexts });
  // Las candidatas idénticas se descartan como duplicadas...
  assert.ok(second.discarded.some((d) => d.reason.includes('duplicada')));
  // ...y lo que sí entrega no duplica nada del banco (sigue con otros hechos del texto)
  for (const q of second.questions) {
    assert.equal(sim.findDuplicate(q.text + ' ' + q.options.join(' '), existingTexts), null);
  }
});

test('las preguntas mezclan tipos distintos cuando el texto lo permite', () => {
  const { questions } = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 10, { seed: 42 });
  const kinds = new Set(questions.map((q) => q.kind));
  assert.ok(kinds.size >= 2, 'esperaba variedad de tipos, solo salió: ' + [...kinds].join(','));
});

test('texto sin sustancia no genera preguntas', () => {
  const { questions } = gen.generateQuestions('Hola. Adiós.', SAMPLE_TOPIC, 5, { seed: 1 });
  assert.equal(questions.length, 0);
});
