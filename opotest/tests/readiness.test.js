const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateReadiness, successProbability } = require('../js/core/readiness.js');
const gen = require('../js/core/generator.js');
const { goodQuestion } = require('./fixtures.js');

function bankQuestion(article, i) {
  return Object.assign(goodQuestion({
    text: 'Según el artículo ' + article + ' de la Ley 39/2015, ¿cuál es el supuesto ' + i + '?',
    topic: { ley: 'Ley 39/2015' },
  }), { id: 'q' + i });
}

function makeData(n, accuracy) {
  const questions = [];
  const history = {};
  for (let i = 0; i < n; i++) {
    questions.push(bankQuestion((i % 5) + 1, i));
    history['q' + i] = { attempts: 10, correct: Math.round(10 * accuracy) };
  }
  return { questions, history };
}

test('con pocos datos devuelve «insuficiente» en vez de un número engañoso', () => {
  const { questions, history } = makeData(5, 0.8);
  const res = estimateReadiness(questions, history, { rng: gen.createRng(1) });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'insufficient');
  assert.equal(res.attempted, 5);
  assert.equal(res.needed, 10);
});

test('un historial excelente da probabilidad alta; uno pobre, baja', () => {
  const good = makeData(20, 0.95);
  const strong = estimateReadiness(good.questions, good.history, { rng: gen.createRng(2) });
  assert.equal(strong.ok, true);
  assert.ok(strong.passRate > 0.9, 'passRate=' + strong.passRate);

  const bad = makeData(20, 0.2);
  const weak = estimateReadiness(bad.questions, bad.history, { rng: gen.createRng(2) });
  assert.ok(weak.passRate < 0.1, 'passRate=' + weak.passRate);
  assert.ok(weak.avgScore < strong.avgScore);
});

test('es determinista con la misma semilla', () => {
  const { questions, history } = makeData(15, 0.7);
  const a = estimateReadiness(questions, history, { rng: gen.createRng(9) });
  const b = estimateReadiness(questions, history, { rng: gen.createRng(9) });
  assert.deepEqual(a, b);
});

test('weakSpots señala los artículos con más pérdida esperada', () => {
  const questions = [];
  const history = {};
  // Artículo 1: dominado; artículo 2: desastre (3 preguntas malas)
  for (let i = 0; i < 10; i++) {
    questions.push(bankQuestion(1, i));
    history['q' + i] = { attempts: 10, correct: 10 };
  }
  for (let i = 10; i < 13; i++) {
    questions.push(bankQuestion(2, i));
    history['q' + i] = { attempts: 10, correct: 1 };
  }
  const res = estimateReadiness(questions, history, { rng: gen.createRng(3) });
  assert.equal(res.ok, true);
  assert.ok(res.weakSpots.length >= 1);
  assert.ok(res.weakSpots[0].label.includes('Artículo 2'), 'el peor es el 2: ' + res.weakSpots[0].label);
  assert.ok(res.weakSpots.length <= 3);
});

test('solo cuentan las preguntas intentadas (las no vistas no opinan)', () => {
  const { questions, history } = makeData(15, 0.9);
  questions.push(bankQuestion(9, 999)); // sin historial
  const res = estimateReadiness(questions, history, { rng: gen.createRng(4) });
  assert.equal(res.ok, true);
  assert.ok(!res.weakSpots.some((w) => w.label.includes('Artículo 9')));
});

test('successProbability suaviza los extremos (Laplace)', () => {
  assert.ok(successProbability({ attempts: 1, correct: 1 }) < 1);
  assert.ok(successProbability({ attempts: 1, correct: 0 }) > 0);
  const many = successProbability({ attempts: 100, correct: 100 });
  assert.ok(many > 0.98, 'con muchos datos converge: ' + many);
});

test('el guard de datos mínimos es configurable', () => {
  const { questions, history } = makeData(5, 0.8);
  const res = estimateReadiness(questions, history, { minAttempted: 5, rng: gen.createRng(5) });
  assert.equal(res.ok, true);
});
