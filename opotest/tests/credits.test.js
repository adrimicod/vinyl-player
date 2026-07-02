const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CreditManager, PLANS, COST_PER_QUESTION } = require('../js/core/credits.js');

const JAN = Date.UTC(2026, 0, 15);
const FEB = Date.UTC(2026, 1, 2);

function managerAt(ts, state) {
  let now = ts;
  const cm = new CreditManager(state, () => now);
  cm._setNow = (t) => { now = t; };
  return cm;
}

test('un usuario nuevo empieza en plan gratis con sus créditos', () => {
  const cm = managerAt(JAN);
  assert.equal(cm.plan, 'free');
  assert.equal(cm.credits, PLANS.free.monthlyCredits);
});

test('spend descuenta y falla sin saldo suficiente (sin gastar nada)', () => {
  const cm = managerAt(JAN);
  assert.equal(cm.spend(4, 'generar 4 preguntas'), true);
  assert.equal(cm.credits, 6);
  assert.equal(cm.spend(100, 'demasiado'), false);
  assert.equal(cm.credits, 6, 'un gasto fallido no descuenta');
});

test('earn suma con precisión de 2 decimales', () => {
  const cm = managerAt(JAN);
  cm.earn(0.2, 'evaluación');
  cm.earn(0.2, 'evaluación');
  cm.earn(0.2, 'evaluación');
  assert.equal(cm.credits, 10.6);
});

test('los créditos se renuevan al cambiar de mes', () => {
  const cm = managerAt(JAN);
  cm.spend(9, 'casi todo');
  assert.equal(cm.credits, 1);
  cm._setNow(FEB);
  assert.equal(cm.canSpend(10), true, 'en febrero vuelve a tener 10');
  assert.equal(cm.credits, PLANS.free.monthlyCredits);
});

test('la renovación no se aplica dentro del mismo mes', () => {
  const cm = managerAt(JAN);
  cm.spend(5);
  cm._setNow(Date.UTC(2026, 0, 31));
  cm.renewIfNeeded();
  assert.equal(cm.credits, 5);
});

test('subir de plan da la asignación del plan nuevo inmediatamente', () => {
  const cm = managerAt(JAN);
  cm.spend(8);
  cm.setPlan('pro');
  assert.equal(cm.plan, 'pro');
  assert.equal(cm.credits, PLANS.pro.monthlyCredits);
});

test('bajar de plan conserva los créditos restantes hasta la renovación', () => {
  const cm = managerAt(JAN, { plan: 'pro', credits: 250, cycle: '2026-01' });
  cm.setPlan('free');
  assert.equal(cm.credits, 250);
  cm._setNow(FEB);
  cm.renewIfNeeded();
  assert.equal(cm.credits, PLANS.free.monthlyCredits);
});

test('serialize/deserialize conserva el estado', () => {
  const cm = managerAt(JAN);
  cm.spend(3, 'test');
  const restored = managerAt(JAN, cm.serialize());
  assert.equal(restored.credits, 7);
  assert.equal(restored.plan, 'free');
  assert.ok(restored.log.length > 0);
});

test('questionsAvailable refleja el coste por pregunta', () => {
  const cm = managerAt(JAN);
  assert.equal(cm.questionsAvailable(), Math.floor(PLANS.free.monthlyCredits / COST_PER_QUESTION));
});

test('importes negativos se rechazan', () => {
  const cm = managerAt(JAN);
  assert.throws(() => cm.spend(-1));
  assert.throws(() => cm.earn(-1));
});

test('el log de movimientos registra razón y saldo', () => {
  const cm = managerAt(JAN);
  cm.spend(2, 'generar 2 preguntas');
  const last = cm.log[cm.log.length - 1];
  assert.equal(last.reason, 'generar 2 preguntas');
  assert.equal(last.delta, -2);
  assert.equal(last.balance, 8);
});
