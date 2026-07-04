/** Tests de la iteración 11: sessionPlanner («Estudia ahora»), exitTicket
 *  (rescate diferido) y comfort (detector de estudio-confort). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { composeSession } = require('../js/core/sessionPlanner.js');
const { buildExitTicket, applyTicketRescue } = require('../js/core/exitTicket.js');
const { assessSession } = require('../js/core/comfort.js');
const quiz = require('../js/core/quiz.js');
const gen = require('../js/core/generator.js');
const { goodQuestion } = require('./fixtures.js');

function q(id) {
  return Object.assign(goodQuestion({
    text: 'Pregunta ' + id + ' con un enunciado suficientemente largo para validar, ¿sí?',
  }), { id, correctIndex: 0, quality: { status: 'active' } });
}

function manyQuestions(prefix, n) {
  return Array.from({ length: n }, (_, i) => q(prefix + i));
}

// ---------- sessionPlanner ----------

test('composeSession prioriza tarjetas → falsas certezas → falladas → frías', () => {
  const session = composeSession(40, {
    dueCards: [{ id: 'c1' }, { id: 'c2' }],
    falseCertainties: manyQuestions('fc', 2),
    failed: manyQuestions('f', 3),
    cold: manyQuestions('cold', 2),
    fresh: manyQuestions('n', 5),
    dailyPending: false,
  });
  const types = session.blocks.map((b) => b.type);
  assert.deepEqual(types, ['cards', 'falseCertainties', 'failed', 'cold', 'fresh']);
  assert.equal(session.degraded, false);
  for (const b of session.blocks) assert.ok(b.reason.length > 5, 'cada bloque lleva su razón');
});

test('el presupuesto nunca se excede y recorta las fuentes', () => {
  for (const budget of [10, 20, 40]) {
    const session = composeSession(budget, {
      dueCards: Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i })),
      falseCertainties: manyQuestions('fc', 10),
      failed: manyQuestions('f', 20),
      cold: manyQuestions('cold', 10),
      fresh: manyQuestions('n', 30),
      dailyPending: true,
      dailyCount: 5,
    });
    const spent = session.blocks.reduce((a, b) => a + b.estMinutes, 0);
    assert.ok(spent <= budget + 1e-9, 'presupuesto ' + budget + ' excedido: ' + spent);
    assert.ok(session.blocks.length >= 2, 'con presupuesto ' + budget + ' salen varios bloques');
  }
});

test('las fuentes vacías se saltan sin bloque', () => {
  const session = composeSession(20, {
    dueCards: [], falseCertainties: [], failed: manyQuestions('f', 2), cold: [], fresh: [],
    dailyPending: false,
  });
  assert.deepEqual(session.blocks.map((b) => b.type), ['failed']);
});

test('usuario nuevo: sesión degradada honesta (reto + nunca vistas)', () => {
  const session = composeSession(10, {
    dueCards: [], falseCertainties: [], failed: [], cold: [],
    fresh: manyQuestions('n', 8), dailyPending: true, dailyCount: 5,
  });
  assert.equal(session.degraded, true);
  assert.deepEqual(session.blocks.map((b) => b.type), ['daily', 'fresh']);
});

test('composeSession es determinista', () => {
  const inputs = () => ({
    dueCards: [{ id: 'c1' }], falseCertainties: manyQuestions('fc', 1),
    failed: manyQuestions('f', 4), cold: [], fresh: manyQuestions('n', 3), dailyPending: false,
  });
  assert.deepEqual(composeSession(20, inputs()), composeSession(20, inputs()));
});

// ---------- exitTicket ----------

test('buildExitTicket solo usa lo trabajado y prioriza falladas', () => {
  const bank = manyQuestions('q', 10);
  const practiced = [
    { id: 'q0', outcome: 'correct' },
    { id: 'q1', outcome: 'wrong' },
    { id: 'q2', outcome: 'wrong', falseCertainty: true },
    { id: 'q3', outcome: 'correct' },
    { id: 'q4', outcome: 'blank' },
  ];
  const ticket = buildExitTicket(practiced, bank, { rng: gen.createRng(1) });
  assert.equal(ticket.length, 3);
  assert.equal(ticket[0].id, 'q2', 'la falsa certeza va primero');
  assert.equal(ticket[1].id, 'q1');
  assert.ok(['q0', 'q3'].includes(ticket[2].id), 'relleno con acertadas de la sesión');
  for (const t of ticket) assert.ok(practiced.some((p) => p.id === t.id), 'nunca preguntas ajenas');
});

test('con pocas candidatas el ticket es menor o vacío, sin error', () => {
  const bank = manyQuestions('q', 3);
  assert.equal(buildExitTicket([{ id: 'q0', outcome: 'wrong' }], bank, { rng: gen.createRng(1) }).length, 1);
  assert.deepEqual(buildExitTicket([], bank, { rng: gen.createRng(1) }), []);
  // ids que ya no están activos en el banco se ignoran
  assert.deepEqual(buildExitTicket([{ id: 'zz', outcome: 'wrong' }], bank, { rng: gen.createRng(1) }), []);
});

test('rescate diferido: noRescue mantiene la fallada y el ticket la rescata', () => {
  const questions = [q('q1')];
  const user = { failedIds: ['q1'], falseCertaintyIds: ['q1'] };
  // Acierto durante la sesión con noRescue → sigue fallada
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [0]), { noRescue: true });
  assert.deepEqual(user.failedIds, ['q1'], 'el acierto inmediato no rescata');
  assert.deepEqual(user.falseCertaintyIds, ['q1']);
  // Acierto en el ticket → rescatada
  const rescued = applyTicketRescue(user, quiz.scoreQuiz(questions, [0]));
  assert.equal(rescued, 1);
  assert.deepEqual(user.failedIds, []);
  assert.deepEqual(user.falseCertaintyIds, []);
});

test('el comportamiento por defecto (rescate inmediato) no cambia', () => {
  const questions = [q('q1')];
  const user = { failedIds: ['q1'] };
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [0]));
  assert.deepEqual(user.failedIds, [], 'sin flag, el acierto rescata como siempre');
});

test('fallar en el ticket no rescata', () => {
  const questions = [q('q1')];
  const user = { failedIds: ['q1'], falseCertaintyIds: [] };
  const rescued = applyTicketRescue(user, quiz.scoreQuiz(questions, [3]));
  assert.equal(rescued, 0);
  assert.deepEqual(user.failedIds, ['q1']);
});

// ---------- comfort ----------

function historyMastered(ids) {
  const h = {};
  for (const id of ids) h[id] = { attempts: 5, correct: 5 };
  return h;
}

test('detecta la sesión de confort (≥70% ya dominado)', () => {
  const questions = manyQuestions('q', 5);
  const scored = quiz.scoreQuiz(questions, [0, 0, 0, 0, 0]);
  const res = assessSession(scored, historyMastered(['q0', 'q1', 'q2', 'q3']));
  assert.equal(res.ok, true);
  assert.equal(res.comfort, true);
  assert.equal(res.masteredCount, 4);
});

test('una sesión útil no se marca', () => {
  const questions = manyQuestions('q', 5);
  const scored = quiz.scoreQuiz(questions, [0, 0, 0, 0, 0]);
  const history = historyMastered(['q0']);
  history.q1 = { attempts: 5, correct: 1 }; // no dominada
  history.q2 = { attempts: 5, correct: 2 };
  history.q3 = { attempts: 4, correct: 2 };
  const res = assessSession(scored, history);
  assert.equal(res.ok, true);
  assert.equal(res.comfort, false);
});

test('guard de datos mínimos: sin historial suficiente no hay veredicto', () => {
  const questions = manyQuestions('q', 5);
  const scored = quiz.scoreQuiz(questions, [0, 0, 0, 0, 0]);
  assert.deepEqual(assessSession(scored, historyMastered(['q0', 'q1'])), { ok: false, reason: 'insufficient' });
  assert.deepEqual(assessSession(scored, {}), { ok: false, reason: 'insufficient' });
});

test('acertar dudando no cuenta como dominio (coherente con staleness)', () => {
  const questions = manyQuestions('q', 4);
  const scored = quiz.scoreQuiz(questions, [0, 0, 0, 0]);
  const history = historyMastered(['q0', 'q1', 'q2', 'q3']);
  history.q0.lastConfidence = 'doubt';
  history.q1.lastConfidence = 'guess';
  const res = assessSession(scored, history);
  assert.equal(res.comfort, false, '2/4 dominadas de verdad < 70%');
});
