const { test } = require('node:test');
const assert = require('node:assert/strict');
const chain = require('../js/core/chain.js');
const gen = require('../js/core/generator.js');
const { goodQuestion } = require('./fixtures.js');

function makeBank(n) {
  return Array.from({ length: n }, (_, i) => Object.assign(goodQuestion({
    text: 'Pregunta ' + i + ' con un enunciado suficientemente largo, ¿verdad?',
  }), { id: 'q' + i, correctIndex: 0 }));
}

test('acertar alarga la cadena; fallar la rompe y registra la culpable', () => {
  const bank = makeBank(5);
  const c = chain.createChain();
  const rng = gen.createRng(7);
  const q1 = chain.nextChainQuestion(c, bank, rng);
  assert.deepEqual(chain.answerChain(c, q1, 0), { correct: true, streak: 1, finished: false, breakerId: null });
  const q2 = chain.nextChainQuestion(c, bank, rng);
  const result = chain.answerChain(c, q2, 3);
  assert.equal(result.correct, false);
  assert.equal(result.finished, true);
  assert.equal(result.streak, 1, 'la racha se queda donde estaba');
  assert.equal(result.breakerId, q2.id);
  assert.equal(c.finished, true);
});

test('la cadena nunca repite pregunta', () => {
  const bank = makeBank(10);
  const c = chain.createChain();
  const rng = gen.createRng(3);
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    const q = chain.nextChainQuestion(c, bank, rng);
    assert.ok(!seen.has(q.id), 'repetida: ' + q.id);
    seen.add(q.id);
    chain.answerChain(c, q, 0);
  }
});

test('si el banco se agota, la cadena termina invicta (exhausted)', () => {
  const bank = makeBank(2);
  const c = chain.createChain();
  const rng = gen.createRng(1);
  chain.answerChain(c, chain.nextChainQuestion(c, bank, rng), 0);
  chain.answerChain(c, chain.nextChainQuestion(c, bank, rng), 0);
  assert.equal(chain.nextChainQuestion(c, bank, rng), null);
  assert.equal(c.exhausted, true);
  assert.equal(c.breakerId, null);
  assert.equal(c.streak, 2);
});

test('no se puede responder una cadena terminada', () => {
  const bank = makeBank(2);
  const c = chain.createChain();
  const q = chain.nextChainQuestion(c, bank, gen.createRng(1));
  chain.answerChain(c, q, 3); // fallo → termina
  assert.throws(() => chain.answerChain(c, bank[1], 0), /terminado/);
});

test('updateChainRecords: solo se baten al superar, global y por ley separados', () => {
  const records = {};
  assert.deepEqual(chain.updateChainRecords(records, 5, 'Ley 39/2015'), { globalBeaten: true, leyBeaten: true });
  assert.deepEqual(chain.updateChainRecords(records, 5, 'Ley 39/2015'), { globalBeaten: false, leyBeaten: false }, 'igualar no bate');
  assert.deepEqual(chain.updateChainRecords(records, 3, 'Ley 40/2015'), { globalBeaten: false, leyBeaten: true }, 'récord nuevo por ley sin batir el global');
  assert.equal(records.global, 5);
  assert.equal(records.byLey['Ley 39/2015'], 5);
  assert.equal(records.byLey['Ley 40/2015'], 3);
  assert.deepEqual(chain.updateChainRecords(records, 8, undefined), { globalBeaten: true, leyBeaten: true });
  assert.equal(records.byLey['todas'], 8, 'sin ley usa la clave «todas»');
});
