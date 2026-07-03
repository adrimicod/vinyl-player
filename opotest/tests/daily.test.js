const { test } = require('node:test');
const assert = require('node:assert/strict');
const daily = require('../js/core/daily.js');
const { goodQuestion } = require('./fixtures.js');

// Mediodía local de días concretos (evita rarezas de medianoche/DST)
const day = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

function makeBank(n) {
  return Array.from({ length: n }, (_, i) => Object.assign(goodQuestion({
    text: 'Pregunta ' + i + ' con enunciado de longitud más que suficiente, ¿ok?',
  }), { id: 'q' + String(i).padStart(2, '0') }));
}

test('el reto es determinista: mismo día + mismo banco → mismo test', () => {
  const bank = makeBank(20);
  const a = daily.buildDailyQuiz(bank, { now: day(2026, 7, 3) });
  const b = daily.buildDailyQuiz(bank.slice().reverse(), { now: day(2026, 7, 3) });
  assert.deepEqual(a.questions.map((q) => q.id), b.questions.map((q) => q.id),
    'ni siquiera el orden de inserción del banco debe cambiar el reto');
  assert.equal(a.dateKey, '2026-07-03');
  assert.equal(a.questions.length, daily.DAILY_COUNT);
});

test('días distintos dan retos distintos (con banco suficiente)', () => {
  const bank = makeBank(30);
  const a = daily.buildDailyQuiz(bank, { now: day(2026, 7, 3) });
  const b = daily.buildDailyQuiz(bank, { now: day(2026, 7, 4) });
  assert.notDeepEqual(a.questions.map((q) => q.id), b.questions.map((q) => q.id));
});

test('completeDaily: el primer reto del día cuenta, el segundo no', () => {
  const state = daily.emptyDailyState();
  const first = daily.completeDaily(state, day(2026, 7, 3));
  assert.deepEqual(first, { counted: true, streak: 1 });
  const second = daily.completeDaily(state, day(2026, 7, 3));
  assert.deepEqual(second, { counted: false, streak: 1 });
  assert.deepEqual(state.history, ['2026-07-03']);
});

test('la racha crece con días consecutivos y se rompe al saltarse uno', () => {
  const state = daily.emptyDailyState();
  daily.completeDaily(state, day(2026, 7, 1));
  daily.completeDaily(state, day(2026, 7, 2));
  daily.completeDaily(state, day(2026, 7, 3));
  assert.equal(state.streak, 3);
  // Se salta el día 4 → el 5 arranca racha nueva
  const after = daily.completeDaily(state, day(2026, 7, 5));
  assert.deepEqual(after, { counted: true, streak: 1 });
});

test('la racha cruza meses correctamente', () => {
  const state = daily.emptyDailyState();
  daily.completeDaily(state, day(2026, 6, 30));
  daily.completeDaily(state, day(2026, 7, 1));
  assert.equal(state.streak, 2);
});

test('isDailyDone refleja el estado del día actual', () => {
  const state = daily.emptyDailyState();
  assert.equal(daily.isDailyDone(state, day(2026, 7, 3)), false);
  daily.completeDaily(state, day(2026, 7, 3));
  assert.equal(daily.isDailyDone(state, day(2026, 7, 3)), true);
  assert.equal(daily.isDailyDone(state, day(2026, 7, 4)), false);
});

test('el historial se recorta al límite (no crece sin fin)', () => {
  const state = daily.emptyDailyState();
  for (let i = 0; i < 120; i++) daily.completeDaily(state, day(2026, 1, 1) + i * 86400000);
  assert.ok(state.history.length <= 90);
});

test('monthCalendar marca días completados y el día de hoy', () => {
  const state = daily.emptyDailyState();
  daily.completeDaily(state, day(2026, 7, 1));
  daily.completeDaily(state, day(2026, 7, 2));
  const cal = daily.monthCalendar(state, day(2026, 7, 3));
  assert.equal(cal.length, 31);
  assert.equal(cal[0].done, true);
  assert.equal(cal[1].done, true);
  assert.equal(cal[2].done, false);
  assert.equal(cal[2].isToday, true);
});

test('daysBetween cuenta días naturales', () => {
  assert.equal(daily.daysBetween('2026-07-03', '2026-07-04'), 1);
  assert.equal(daily.daysBetween('2026-06-30', '2026-07-01'), 1);
  assert.equal(daily.daysBetween('2026-07-03', '2026-07-03'), 0);
  assert.equal(daily.daysBetween('2026-07-04', '2026-07-03'), -1);
});
