const { test } = require('node:test');
const assert = require('node:assert/strict');
const { QuestionBank, memoryStorage } = require('../js/core/bank.js');
const { goodQuestion, SAMPLE_TOPIC } = require('./fixtures.js');

function makeBank() {
  return new QuestionBank(memoryStorage(), { now: () => 1700000000000 });
}

test('add asigna id, autor, origen y calidad inicial', () => {
  const bank = makeBank();
  const q = bank.add(goodQuestion(), 'user1', 'demo');
  assert.ok(q.id);
  assert.equal(q.authorId, 'user1');
  assert.equal(q.origin, 'demo');
  assert.deepEqual(q.quality, { up: 0, down: 0, erratas: [], status: 'active', rewardedAt: null });
  assert.equal(bank.all().length, 1);
});

test('los ids son únicos', () => {
  const bank = makeBank();
  const ids = new Set(
    Array.from({ length: 50 }, (_, i) => bank.add(goodQuestion({ text: 'Pregunta número ' + i + ' con longitud válida?' })).id)
  );
  assert.equal(ids.size, 50);
});

test('active excluye retiradas y en revisión no (solo retiradas... no: solo activas)', () => {
  const bank = makeBank();
  const a = bank.add(goodQuestion());
  const b = bank.add(goodQuestion({ text: 'Otra pregunta suficientemente larga para validar, ¿verdad que sí?' }));
  bank.update(b.id, { quality: Object.assign({}, b.quality, { status: 'retired' }) });
  const active = bank.active();
  assert.equal(active.length, 1);
  assert.equal(active[0].id, a.id);
});

test('byTopic filtra por ley ignorando tildes/mayúsculas', () => {
  const bank = makeBank();
  bank.add(goodQuestion());
  bank.add(goodQuestion({ topic: { ley: 'Constitución Española', oposicion: 'Policía' } }));
  assert.equal(bank.byTopic({ ley: 'ley 39/2015' }).length, 1);
  assert.equal(bank.byTopic({ ley: 'constitucion española' }).length, 1);
  assert.equal(bank.byTopic({}).length, 2);
  assert.equal(bank.byTopic({ ley: 'Ley 40/2015' }).length, 0);
});

test('countByLey agrupa solo activas', () => {
  const bank = makeBank();
  bank.add(goodQuestion());
  bank.add(goodQuestion({ text: 'Segunda pregunta de la misma ley con texto suficiente, ¿no?' }));
  const c = bank.add(goodQuestion({ topic: { ley: 'CE 1978' }, text: 'Tercera de otra ley con texto suficiente para pasar, ¿vale?' }));
  bank.update(c.id, { quality: Object.assign({}, c.quality, { status: 'retired' }) });
  assert.deepEqual(bank.countByLey(), { 'Ley 39/2015': 2 });
});

test('la persistencia inyectada guarda y recupera el banco', () => {
  const storage = memoryStorage();
  const bank1 = new QuestionBank(storage);
  bank1.add(goodQuestion(), 'user1');
  const bank2 = new QuestionBank(storage);
  assert.equal(bank2.all().length, 1);
  assert.equal(bank2.all()[0].authorId, 'user1');
});

test('remove elimina y devuelve false si no existe', () => {
  const bank = makeBank();
  const q = bank.add(goodQuestion());
  assert.equal(bank.remove(q.id), true);
  assert.equal(bank.remove('inexistente'), false);
  assert.equal(bank.all().length, 0);
});

test('export/import: ida y vuelta con deduplicación', () => {
  const bank1 = makeBank();
  bank1.add(goodQuestion(), 'user1');
  bank1.add(goodQuestion({ text: '¿Qué se entiende por interesado en el procedimiento administrativo?', options: ['Def A correcta', 'Def B', 'Def C', 'Def D'] }), 'user2');
  const json = bank1.exportJSON();

  const bank2 = makeBank();
  bank2.add(goodQuestion(), 'user3'); // ya tiene una idéntica → se salta
  const result = bank2.importJSON(json);
  assert.equal(result.added, 1);
  assert.equal(result.skipped, 1);
  assert.equal(bank2.all().length, 2);
});

test('importJSON rechaza JSON corrupto y preguntas malformadas', () => {
  const bank = makeBank();
  const bad = bank.importJSON('{esto no es json');
  assert.equal(bad.added, 0);
  assert.ok(bad.errors[0].includes('JSON inválido'));

  const result = bank.importJSON(JSON.stringify({ questions: [{ text: 'incompleta' }] }));
  assert.equal(result.added, 0);
  assert.equal(result.skipped, 1);
  assert.ok(result.errors.length > 0);
});
