const { test } = require('node:test');
const assert = require('node:assert/strict');
const quiz = require('../js/core/quiz.js');
const gen = require('../js/core/generator.js');
const { goodQuestion } = require('./fixtures.js');

function makeQuestions(n, ley) {
  return Array.from({ length: n }, (_, i) => Object.assign(goodQuestion({
    text: 'Pregunta ' + i + ' con enunciado suficientemente largo, ¿correcta?',
    topic: { ley: ley || 'Ley 39/2015' },
  }), { id: 'q' + (ley || '') + i, quality: { status: 'active' } }));
}

test('buildQuiz prioriza preguntas no vistas', () => {
  const questions = makeQuestions(10);
  const seen = ['q0', 'q1', 'q2', 'q3', 'q4'];
  const { questions: picked, reused } = quiz.buildQuiz(questions, { count: 5, seenIds: seen, rng: gen.createRng(1) });
  assert.equal(picked.length, 5);
  assert.equal(reused, 0);
  for (const q of picked) assert.ok(!seen.includes(q.id), q.id + ' estaba vista');
});

test('buildQuiz rellena con vistas si no hay suficientes nuevas', () => {
  const questions = makeQuestions(6);
  const seen = ['q0', 'q1', 'q2', 'q3'];
  const { questions: picked, reused } = quiz.buildQuiz(questions, { count: 5, seenIds: seen, rng: gen.createRng(1) });
  assert.equal(picked.length, 5);
  assert.equal(reused, 3);
  // Las recicladas son las vistas hace más tiempo (principio del historial)
  const pickedIds = picked.map((q) => q.id);
  assert.ok(pickedIds.includes('q0'));
});

test('buildQuiz no revienta con banco menor que el test pedido', () => {
  const { questions: picked } = quiz.buildQuiz(makeQuestions(3), { count: 10, rng: gen.createRng(1) });
  assert.equal(picked.length, 3);
});

test('buildDistributedQuiz reparte por temas (40/30/30 → aquí 2/2/1)', () => {
  const requests = [
    { questions: makeQuestions(5, 'A'), count: 2 },
    { questions: makeQuestions(5, 'B'), count: 2 },
    { questions: makeQuestions(5, 'C'), count: 1 },
  ];
  const { questions, perTopic } = quiz.buildDistributedQuiz(requests, { rng: gen.createRng(3) });
  assert.equal(questions.length, 5);
  assert.deepEqual(perTopic.map((p) => p.served), [2, 2, 1]);
});

test('scoreQuiz aplica la penalización de oposición (fallo resta 1/3)', () => {
  const questions = makeQuestions(10).map((q) => Object.assign(q, { correctIndex: 0 }));
  // 6 aciertos, 3 fallos, 1 blanco → (6 - 1) / 10 * 10 = 5
  const answers = [0, 0, 0, 0, 0, 0, 1, 1, 1, null];
  const scored = quiz.scoreQuiz(questions, answers);
  assert.equal(scored.correct, 6);
  assert.equal(scored.wrong, 3);
  assert.equal(scored.blank, 1);
  assert.equal(scored.score10, 5);
});

test('scoreQuiz sin penalización y nota nunca negativa', () => {
  const questions = makeQuestions(4).map((q) => Object.assign(q, { correctIndex: 0 }));
  const noPenalty = quiz.scoreQuiz(questions, [0, 1, 1, 1], { penalty: 0 });
  assert.equal(noPenalty.score10, 2.5);
  const harsh = quiz.scoreQuiz(questions, [1, 1, 1, 1]);
  assert.equal(harsh.score10, 0, 'la nota se trunca en 0');
});

test('scoreQuiz trata respuestas ausentes como blancos', () => {
  const questions = makeQuestions(3).map((q) => Object.assign(q, { correctIndex: 0 }));
  const scored = quiz.scoreQuiz(questions, [0]);
  assert.equal(scored.blank, 2);
});

test('updateHistory registra vistas y gestiona falladas', () => {
  const questions = makeQuestions(3).map((q) => Object.assign(q, { correctIndex: 0 }));
  const user = {};
  const first = quiz.scoreQuiz(questions, [0, 1, null]);
  quiz.updateHistory(user, first);
  assert.deepEqual(user.seenIds, ['q0', 'q1', 'q2']);
  assert.deepEqual(user.failedIds, ['q1']);
  assert.equal(user.stats.tests, 1);

  // Segundo intento: acierta la que falló → sale del repaso
  const second = quiz.scoreQuiz([questions[1]], [0]);
  quiz.updateHistory(user, second);
  assert.deepEqual(user.failedIds, []);
  assert.equal(user.seenIds[user.seenIds.length - 1], 'q1', 'la última vista pasa al final');
});

test('buildReviewQuiz devuelve solo falladas aún activas', () => {
  const questions = makeQuestions(5);
  const review = quiz.buildReviewQuiz(questions, ['q1', 'q3', 'inexistente'], 10, gen.createRng(2));
  const ids = review.map((q) => q.id).sort();
  assert.deepEqual(ids, ['q1', 'q3']);
});

// ---- Termómetro de confianza (iteración 3) ----

test('scoreQuiz marca las falsas certezas (fallo con confianza «Seguro»)', () => {
  const questions = makeQuestions(4).map((q) => Object.assign(q, { correctIndex: 0 }));
  const answers = [0, 1, 1, null];
  const confidences = ['sure', 'sure', 'guess', 'sure'];
  const scored = quiz.scoreQuiz(questions, answers, { confidences });
  assert.equal(scored.falseCertainties, 1, 'solo el fallo con «sure» es falsa certeza');
  assert.equal(scored.results[1].falseCertainty, true);
  assert.equal(scored.results[0].falseCertainty, undefined, 'un acierto seguro no es falsa certeza');
  assert.equal(scored.results[3].falseCertainty, undefined, 'un blanco no es falsa certeza');
  assert.equal(scored.results[2].confidence, 'guess');
});

test('scoreQuiz sin confianzas funciona igual que antes (retrocompatible)', () => {
  const questions = makeQuestions(2).map((q) => Object.assign(q, { correctIndex: 0 }));
  const scored = quiz.scoreQuiz(questions, [0, 1]);
  assert.equal(scored.falseCertainties, 0);
  assert.ok(!('confidence' in scored.results[0]));
});

test('updateHistory registra y limpia las falsas certezas', () => {
  const questions = makeQuestions(2).map((q) => Object.assign(q, { correctIndex: 0 }));
  const user = {};
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [1, 0], { confidences: ['sure', 'sure'] }));
  assert.deepEqual(user.falseCertaintyIds, ['q0']);
  // La acierta después → sale de las falsas certezas (y de falladas)
  quiz.updateHistory(user, quiz.scoreQuiz([questions[0]], [0]));
  assert.deepEqual(user.falseCertaintyIds, []);
});

test('updateHistory con countAsTest:false no suma tests pero sí aciertos/fallos (B3)', () => {
  const questions = makeQuestions(3).map((q) => Object.assign(q, { correctIndex: 0 }));
  const user = {};
  // Una «cadena» de 3 respuestas sueltas
  for (let i = 0; i < 3; i++) {
    quiz.updateHistory(user, quiz.scoreQuiz([questions[i]], [i === 2 ? 1 : 0]), { countAsTest: false });
  }
  assert.equal(user.stats.tests, 0, 'las respuestas sueltas no son tests');
  assert.equal(user.stats.correct, 2);
  assert.equal(user.stats.wrong, 1);
  assert.equal(user.seenIds.length, 3);
  // El comportamiento por defecto no cambia
  quiz.updateHistory(user, quiz.scoreQuiz([questions[0]], [0]));
  assert.equal(user.stats.tests, 1);
});

test('buildReviewQuiz prioriza las falsas certezas sobre el resto de falladas', () => {
  const questions = makeQuestions(6);
  const failed = ['q0', 'q1', 'q2', 'q3', 'q4'];
  const falseCertainties = ['q3', 'q4'];
  const review = quiz.buildReviewQuiz(questions, failed, 3, gen.createRng(5), falseCertainties);
  assert.equal(review.length, 3);
  const firstTwo = review.slice(0, 2).map((q) => q.id).sort();
  assert.deepEqual(firstTwo, ['q3', 'q4'], 'las falsas certezas van primero');
});
