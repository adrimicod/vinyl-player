/** Tests de la iteración 10: profile (talón de Aquiles), staleness (radar
 *  de olvido) y confusables (parejas gemelas). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildKindProfile, questionsByKind, KIND_LABELS } = require('../js/core/profile.js');
const staleness = require('../js/core/staleness.js');
const { findConfusablePairs, diffTokens } = require('../js/core/confusables.js');
const quiz = require('../js/core/quiz.js');
const { goodQuestion } = require('./fixtures.js');

function q(id, kind, text) {
  return Object.assign(goodQuestion({
    text: text || ('Pregunta ' + id + ' con un enunciado de longitud más que suficiente, ¿sí?'),
    kind,
  }), { id, quality: { status: 'active' } });
}

// ---------- profile.js ----------

test('buildKindProfile cruza kind con el historial y señala el más débil', () => {
  const bank = [q('n1', 'number'), q('n2', 'number'), q('d1', 'definition'), q('d2', 'definition')];
  const history = {
    n1: { attempts: 4, correct: 1 }, n2: { attempts: 4, correct: 2 },   // números: 3/8 = 38%
    d1: { attempts: 3, correct: 3 }, d2: { attempts: 3, correct: 2 },   // definiciones: 5/6 = 83%
  };
  const { rows, weakest } = buildKindProfile(bank, history);
  assert.equal(rows.length, 2);
  const numbers = rows.find((r) => r.kind === 'number');
  assert.equal(numbers.accuracy, 38);
  assert.equal(numbers.label, KIND_LABELS.number);
  assert.equal(weakest.kind, 'number');
});

test('por debajo del mínimo de intentos el tipo queda «sin datos» (accuracy null)', () => {
  const bank = [q('n1', 'number'), q('d1', 'definition')];
  const history = { n1: { attempts: 2, correct: 0 }, d1: { attempts: 6, correct: 5 } };
  const { rows, weakest } = buildKindProfile(bank, history);
  assert.equal(rows.find((r) => r.kind === 'number').accuracy, null, 'nunca un número engañoso');
  assert.equal(weakest, null, 'con un solo tipo medible no hay talón que señalar');
});

test('se ignoran preguntas sin kind o sin intentos', () => {
  const bank = [q('x1', undefined), q('n1', 'number')];
  const { rows } = buildKindProfile(bank, { x1: { attempts: 9, correct: 9 } });
  assert.equal(rows.length, 0);
});

test('questionsByKind filtra solo el tipo pedido', () => {
  const bank = [q('n1', 'number'), q('d1', 'definition'), q('n2', 'number')];
  assert.deepEqual(questionsByKind(bank, 'number').map((x) => x.id), ['n1', 'n2']);
});

// ---------- staleness.js ----------

test('isMastered exige ratio, intentos mínimos y confianza plena', () => {
  assert.equal(staleness.isMastered({ attempts: 5, correct: 5 }), true);
  assert.equal(staleness.isMastered({ attempts: 5, correct: 3 }), false, 'ratio bajo');
  assert.equal(staleness.isMastered({ attempts: 1, correct: 1 }), false, 'pocos intentos');
  assert.equal(staleness.isMastered({ attempts: 5, correct: 5, lastConfidence: 'guess' }), false, 'acertar adivinando no es saber');
  assert.equal(staleness.isMastered({ attempts: 5, correct: 5, lastConfidence: 'sure' }), true);
  assert.equal(staleness.isMastered(undefined), false);
});

test('coldMasteredQuestions: dominadas Y vistas hace mucho, las más frías primero', () => {
  const bank = Array.from({ length: 9 }, (_, i) => q('q' + i, 'number'));
  const userState = {
    seenIds: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'], // q0 la más antigua
    perQuestion: {
      q0: { attempts: 4, correct: 4 },  // dominada y fría → entra
      q1: { attempts: 4, correct: 1 },  // fría pero NO dominada
      q2: { attempts: 4, correct: 4, lastConfidence: 'doubt' }, // fría pero dudando
      q8: { attempts: 4, correct: 4 },  // dominada pero reciente → no entra
    },
  };
  const cold = staleness.coldMasteredQuestions(bank, userState);
  assert.deepEqual(cold.map((x) => x.id), ['q0']);
});

test('con poco historial no hay «frío» que medir', () => {
  const bank = [q('q0', 'number')];
  const userState = { seenIds: ['q0'], perQuestion: { q0: { attempts: 5, correct: 5 } } };
  assert.deepEqual(staleness.coldMasteredQuestions(bank, userState), []);
});

test('orderFailedByAge: las vistas hace más tiempo primero; desconocidas delante', () => {
  const seen = ['a', 'b', 'c', 'd'];
  assert.deepEqual(staleness.orderFailedByAge(['d', 'a', 'z', 'c'], seen), ['z', 'a', 'c', 'd']);
  assert.deepEqual(staleness.orderFailedByAge([], seen), []);
});

test('la última confianza viaja al historial vía updateHistory', () => {
  const questions = [Object.assign(q('q1', 'number'), { correctIndex: 0 })];
  const user = {};
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [0], { confidences: ['guess'] }));
  assert.equal(user.perQuestion.q1.lastConfidence, 'guess');
  // Un acierto posterior sin marcar confianza limpia la duda
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [0]));
  assert.equal(user.perQuestion.q1.lastConfidence, undefined);
});

// ---------- confusables.js ----------

const TWIN_A = 'Según el artículo 30, el plazo de las notificaciones administrativas será de 10 días hábiles contados desde la publicación oficial.';
const TWIN_B = 'Según el artículo 31, el plazo de las notificaciones administrativas será de 15 días hábiles contados desde la publicación oficial.';
const OTHER = '¿Qué órgano constitucional convoca el referéndum consultivo en España según la Constitución?';

test('findConfusablePairs detecta gemelas donde al menos una se falla', () => {
  const bank = [q('a', 'number', TWIN_A), q('b', 'number', TWIN_B), q('c', 'statement', OTHER)];
  const pairs = findConfusablePairs(bank, { failedIds: ['a'] });
  assert.equal(pairs.length, 1);
  assert.deepEqual([pairs[0].a.id, pairs[0].b.id].sort(), ['a', 'b']);
  assert.ok(pairs[0].score >= 0.5);
});

test('sin fallos implicados no hay parejas (aunque haya gemelas)', () => {
  const bank = [q('a', 'number', TWIN_A), q('b', 'number', TWIN_B)];
  assert.deepEqual(findConfusablePairs(bank, { failedIds: [] }), []);
  assert.deepEqual(findConfusablePairs(bank, {}), []);
});

test('los pares por debajo del umbral se descartan y no hay duplicados ni auto-pares', () => {
  const bank = [q('a', 'number', TWIN_A), q('c', 'statement', OTHER)];
  assert.deepEqual(findConfusablePairs(bank, { failedIds: ['a', 'c'] }), [], 'nada se parece');
  // Determinismo y unicidad con 3 gemelas: cada pregunta en un solo par
  const TWIN_C = TWIN_B.replace('15', '20').replace('31', '32');
  const triple = [q('a', 'number', TWIN_A), q('b', 'number', TWIN_B), q('c2', 'number', TWIN_C)];
  const pairs = findConfusablePairs(triple, { failedIds: ['a', 'b', 'c2'] });
  const ids = pairs.flatMap((p) => [p.a.id, p.b.id]);
  assert.equal(new Set(ids).size, ids.length, 'una pregunta solo aparece en un par');
});

test('diffTokens señala en qué difieren las gemelas', () => {
  const { onlyA, onlyB } = diffTokens(TWIN_A, TWIN_B);
  assert.ok(onlyA.includes('10'));
  assert.ok(onlyA.includes('30'));
  assert.ok(onlyB.includes('15'));
  assert.ok(onlyB.includes('31'));
});
