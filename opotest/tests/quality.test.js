const { test } = require('node:test');
const assert = require('node:assert/strict');
const quality = require('../js/core/quality.js');
const { QuestionBank, memoryStorage } = require('../js/core/bank.js');
const { goodQuestion } = require('./fixtures.js');

function freshQuestion() {
  const bank = new QuestionBank(memoryStorage());
  return bank.add(goodQuestion(), 'author1');
}

test('vote suma y no permite votar dos veces igual', () => {
  const q = freshQuestion();
  assert.equal(quality.vote(q, 'u1', 1).changed, true);
  assert.equal(quality.vote(q, 'u1', 1).changed, false);
  assert.equal(q.quality.up, 1);
});

test('un usuario puede cambiar su voto', () => {
  const q = freshQuestion();
  quality.vote(q, 'u1', 1);
  quality.vote(q, 'u1', -1);
  assert.equal(q.quality.up, 0);
  assert.equal(q.quality.down, 1);
  assert.equal(quality.score(q.quality), -1);
});

test('vote rechaza valores inválidos', () => {
  const q = freshQuestion();
  assert.throws(() => quality.vote(q, 'u1', 0));
});

test('score <= -3 pasa a revisión, score <= -5 se retira', () => {
  const q = freshQuestion();
  for (let i = 1; i <= 3; i++) quality.vote(q, 'down' + i, -1);
  assert.equal(q.quality.status, 'review');
  for (let i = 4; i <= 5; i++) quality.vote(q, 'down' + i, -1);
  assert.equal(q.quality.status, 'retired');
});

test('una retirada no resucita aunque reciba votos positivos', () => {
  const q = freshQuestion();
  for (let i = 1; i <= 5; i++) quality.vote(q, 'down' + i, -1);
  assert.equal(q.quality.status, 'retired');
  for (let i = 1; i <= 10; i++) quality.vote(q, 'up' + i, 1);
  assert.equal(q.quality.status, 'retired');
});

test('reportErrata pasa la pregunta a revisión y exige mensaje', () => {
  const q = freshQuestion();
  assert.throws(() => quality.reportErrata(q, 'u1', '  '));
  const status = quality.reportErrata(q, 'u1', 'La opción B también podría ser correcta');
  assert.equal(status, 'review');
});

test('resolveErrata aceptada aplica la corrección y reactiva la pregunta', () => {
  const q = freshQuestion();
  quality.vote(q, 'u9', -1);
  quality.reportErrata(q, 'u1', 'El plazo correcto es 3 meses, no 6');
  const status = quality.resolveErrata(q, 0, true, { text: 'Según el artículo 1, ¿cuál es el plazo máximo corregido para resolver?' });
  assert.equal(status, 'active');
  assert.ok(q.text.includes('corregido'));
  assert.equal(q.quality.down, 0, 'la corrección resetea los votos negativos');
});

test('resolveErrata rechazada solo cierra la errata', () => {
  const q = freshQuestion();
  const originalText = q.text;
  quality.reportErrata(q, 'u1', 'No estoy de acuerdo con la respuesta');
  const status = quality.resolveErrata(q, 0, false);
  assert.equal(status, 'active');
  assert.equal(q.text, originalText);
});

test('applyAuthorReward paga una sola vez al llegar a +5', () => {
  const q = freshQuestion();
  let earned = 0;
  const credits = { earn: (n) => { earned += n; } };
  assert.equal(quality.applyAuthorReward(q, credits), false, 'sin votos no hay recompensa');
  for (let i = 1; i <= 5; i++) quality.vote(q, 'up' + i, 1);
  assert.equal(quality.applyAuthorReward(q, credits), true);
  assert.equal(earned, quality.REWARDS.AUTHOR_GOOD_QUESTION);
  assert.equal(quality.applyAuthorReward(q, credits), false, 'idempotente');
  assert.equal(earned, quality.REWARDS.AUTHOR_GOOD_QUESTION);
});

test('applyCorrectorReward paga solo cuando la corrección se confirma', () => {
  const q = freshQuestion();
  let earned = 0;
  const credits = { earn: (n) => { earned += n; } };
  quality.reportErrata(q, 'u1', 'El plazo está mal');
  quality.resolveErrata(q, 0, true, { explanation: 'Explicación corregida y ampliada.' }, 'corrector1');
  assert.equal(q.quality.correctedBy, 'corrector1');
  // Recién corregida: aún sin score positivo → no se paga
  assert.equal(quality.applyCorrectorReward(q, credits), false);
  quality.vote(q, 'u2', 1);
  assert.equal(quality.applyCorrectorReward(q, credits), true, 'con score confirmado se paga');
  assert.equal(earned, quality.REWARDS.CORRECTOR_FIX);
  assert.equal(quality.applyCorrectorReward(q, credits), false, 'idempotente');
  assert.equal(earned, quality.REWARDS.CORRECTOR_FIX);
});

test('applyCorrectorReward no paga sin corrector registrado', () => {
  const q = freshQuestion();
  quality.vote(q, 'u2', 1);
  assert.equal(quality.applyCorrectorReward(q, { earn: () => { throw new Error('no debería pagar'); } }), false);
});

test('resolveErrata sin correctorId no registra corrector (compatibilidad)', () => {
  const q = freshQuestion();
  quality.reportErrata(q, 'u1', 'Errata cualquiera');
  quality.resolveErrata(q, 0, true, { explanation: 'Arreglada sin firmar la corrección.' });
  assert.equal(q.quality.correctedBy, undefined);
});

test('hasVoted distingue el primer voto de un cambio de sentido (B2, anti-granja)', () => {
  const q = freshQuestion();
  assert.equal(quality.hasVoted(q, 'u1'), false, 'antes de votar no ha votado');
  quality.vote(q, 'u1', 1);
  assert.equal(quality.hasVoted(q, 'u1'), true);
  quality.vote(q, 'u1', -1); // cambia el sentido: sigue siendo el mismo evaluador
  assert.equal(quality.hasVoted(q, 'u1'), true);
  assert.equal(quality.hasVoted(q, 'u2'), false);
});

test('rewardEvaluator respeta el tope diario', () => {
  let earned = 0;
  const credits = { earn: (n) => { earned += n; } };
  const day = { count: 0 };
  for (let i = 0; i < 10; i++) quality.rewardEvaluator(credits, day);
  assert.equal(day.count, quality.REWARDS.EVALUATOR_DAILY_CAP);
  assert.ok(Math.abs(earned - quality.REWARDS.EVALUATOR_VOTE * quality.REWARDS.EVALUATOR_DAILY_CAP) < 1e-9);
});
