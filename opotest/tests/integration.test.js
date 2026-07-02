/**
 * Test de integración: recorre el flujo completo del producto igual que lo
 * hace la UI (generar → banco → test → corrección → evaluación → recompensas).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DemoProvider } = require('../js/aiProvider.js');
const { QuestionBank, memoryStorage } = require('../js/core/bank.js');
const { CreditManager } = require('../js/core/credits.js');
const quality = require('../js/core/quality.js');
const quiz = require('../js/core/quiz.js');
const gen = require('../js/core/generator.js');
const { SAMPLE_LAW, SAMPLE_TOPIC } = require('./fixtures.js');

test('flujo completo: generar → banco → test → corregir → evaluar → recompensar', async () => {
  const bank = new QuestionBank(memoryStorage());
  const credits = new CreditManager({ plan: 'free' }, () => Date.UTC(2026, 0, 10));
  const user = { seenIds: [], failedIds: [], stats: { tests: 0, correct: 0, wrong: 0, blank: 0 } };

  // 1. Generar preguntas con el proveedor demo (respetando créditos)
  const provider = new DemoProvider({ seed: 7 });
  const affordable = Math.min(10, credits.questionsAvailable());
  const { questions } = await provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, affordable, bank.dedupTexts());
  assert.ok(questions.length >= 3, 'el texto de ejemplo debe dar al menos 3 preguntas');

  // 2. Cobrar créditos solo por lo aceptado y añadir al banco
  assert.equal(credits.spend(questions.length, 'generación'), true);
  const added = bank.addMany(questions, 'autor1', 'demo');
  assert.equal(bank.active().length, questions.length);

  // 3. Segunda generación sobre el mismo texto: no duplica el banco
  const second = await provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, 10, bank.dedupTexts());
  const sim = require('../js/core/similarity.js');
  for (const q of second.questions) {
    assert.equal(sim.findDuplicate(q.text + ' ' + q.options.join(' '), bank.dedupTexts()), null);
  }

  // 4. Construir un test (gratis) y corregirlo: todo aciertos menos la última en blanco
  const { questions: quizQs } = quiz.buildQuiz(bank.active(), { count: 4, seenIds: user.seenIds, rng: gen.createRng(1) });
  assert.ok(quizQs.length >= 3);
  const answers = quizQs.map((q, i) => (i === quizQs.length - 1 ? null : q.correctIndex));
  const scored = quiz.scoreQuiz(quizQs, answers);
  assert.equal(scored.wrong, 0);
  assert.equal(scored.blank, 1);
  quiz.updateHistory(user, scored);
  assert.equal(user.seenIds.length, quizQs.length);

  // 5. La comunidad evalúa: 5 usuarios votan positiva la primera → recompensa al autor (una vez)
  const target = added[0];
  for (let i = 1; i <= 5; i++) quality.vote(target, 'user' + i, 1);
  const authorCredits = new CreditManager({ plan: 'free' }, () => Date.UTC(2026, 0, 10));
  const before = authorCredits.credits;
  assert.equal(quality.applyAuthorReward(target, authorCredits), true);
  assert.equal(quality.applyAuthorReward(target, authorCredits), false);
  assert.equal(authorCredits.credits, before + quality.REWARDS.AUTHOR_GOOD_QUESTION);

  // 6. Una errata retira la pregunta a revisión y desaparece de los tests
  quality.reportErrata(added[1], 'user9', 'La opción C también es correcta');
  bank.update(added[1].id, { quality: added[1].quality });
  assert.ok(!bank.active().some((q) => q.id === added[1].id));

  // 7. La corrección aceptada la reactiva
  quality.resolveErrata(added[1], 0, true, { explanation: 'Explicación corregida tras la errata.' });
  bank.update(added[1].id, { quality: added[1].quality });
  assert.ok(bank.active().some((q) => q.id === added[1].id));

  // 8. El banco sobrevive a un export/import (compartir con la comunidad)
  const other = new QuestionBank(memoryStorage());
  const res = other.importJSON(bank.exportJSON());
  assert.equal(res.added, bank.all().length);
});
