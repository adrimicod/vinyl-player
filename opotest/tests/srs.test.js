const { test } = require('node:test');
const assert = require('node:assert/strict');
const srs = require('../js/core/srs.js');
const parser = require('../js/core/textParser.js');
const { SAMPLE_LAW } = require('./fixtures.js');

const DAY = 86400000;
const T0 = 1750000000000;

function sampleCards() {
  return srs.cardsFromFacts(parser.parse(SAMPLE_LAW).facts);
}

test('cardsFromFacts crea tarjetas de definiciones, números y enumeraciones', () => {
  const cards = sampleCards();
  const types = new Set(cards.map((c) => c.type));
  assert.ok(types.has('definition'));
  assert.ok(types.has('number'));
  assert.ok(types.has('enumeration'));
  assert.ok(!types.has('statement'), 'los statements no son tarjetas');
  const def = cards.find((c) => c.type === 'definition');
  assert.ok(def.front.includes('interesado'));
  assert.ok(def.back.startsWith('aquella persona'));
  const num = cards.find((c) => c.type === 'number');
  assert.ok(num.front.includes('____'));
});

test('los ids son estables: mismo contenido → misma tarjeta', () => {
  const a = sampleCards().map((c) => c.id);
  const b = sampleCards().map((c) => c.id);
  assert.deepEqual(a, b);
});

test('addCards añade en caja 1 vencidas ya, y no duplica', () => {
  const state = srs.emptySrsState();
  const cards = sampleCards();
  const first = srs.addCards(state, cards, T0);
  assert.equal(first.added, cards.length);
  assert.equal(first.skipped, 0);
  const again = srs.addCards(state, cards, T0);
  assert.equal(again.added, 0);
  assert.equal(again.skipped, cards.length);
  assert.equal(srs.dueCards(state, T0).length, cards.length);
  assert.ok(Object.values(state.cards).every((c) => c.box === 1));
});

test('«la sabía» sube de caja y aleja el vencimiento según el intervalo', () => {
  const state = srs.emptySrsState();
  const [card] = sampleCards();
  srs.addCards(state, [card], T0);
  const r1 = srs.review(state, card.id, 'know', T0);
  assert.equal(r1.box, 2);
  assert.equal(r1.due, T0 + srs.INTERVAL_DAYS[1] * DAY);
  assert.equal(srs.dueCards(state, T0).length, 0, 'ya no vence hoy');
  assert.equal(srs.dueCards(state, T0 + 1 * DAY).length, 1, 'vence al día siguiente');
});

test('«dudé» repite caja y «no la sabía» vuelve a la caja 1', () => {
  const state = srs.emptySrsState();
  const [card] = sampleCards();
  srs.addCards(state, [card], T0);
  srs.review(state, card.id, 'know', T0);
  srs.review(state, card.id, 'know', T0 + DAY);
  assert.equal(state.cards[card.id].box, 3);
  const doubt = srs.review(state, card.id, 'doubt', T0 + 5 * DAY);
  assert.equal(doubt.box, 3, 'dudar mantiene la caja');
  const fail = srs.review(state, card.id, 'fail', T0 + 10 * DAY);
  assert.equal(fail.box, 1, 'fallar reinicia');
});

test('la caja máxima no se supera', () => {
  const state = srs.emptySrsState();
  const [card] = sampleCards();
  srs.addCards(state, [card], T0);
  for (let i = 0; i < 10; i++) srs.review(state, card.id, 'know', T0 + i * 20 * DAY);
  assert.equal(state.cards[card.id].box, srs.MAX_BOX);
});

test('dueCards ordena las cajas bajas primero (las más frágiles)', () => {
  const state = srs.emptySrsState();
  const cards = sampleCards().slice(0, 3);
  srs.addCards(state, cards, T0);
  srs.review(state, cards[0].id, 'know', T0); // caja 2, vence T0+1d
  const due = srs.dueCards(state, T0 + 2 * DAY);
  assert.equal(due[due.length - 1].id, cards[0].id, 'la de caja 2 va al final');
});

test('review con valoración o tarjeta inválida lanza error', () => {
  const state = srs.emptySrsState();
  const [card] = sampleCards();
  srs.addCards(state, [card], T0);
  assert.throws(() => srs.review(state, card.id, 'meh', T0));
  assert.throws(() => srs.review(state, 'no-existe', 'know', T0));
});

test('nextDue y boxCounts alimentan la UI', () => {
  const state = srs.emptySrsState();
  const cards = sampleCards().slice(0, 2);
  srs.addCards(state, cards, T0);
  assert.equal(srs.nextDue(state, T0), null, 'todo vence ya: no hay futuro pendiente');
  srs.review(state, cards[0].id, 'know', T0);
  assert.equal(srs.nextDue(state, T0), T0 + 1 * DAY);
  const counts = srs.boxCounts(state);
  assert.equal(counts[1], 1);
  assert.equal(counts[2], 1);
});
