const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTrapRound, checkAnswer, usableQuotes, KIND_LABELS, ROUND_SIZE } = require('../js/core/trapGame.js');
const gen = require('../js/core/generator.js');
const { goodQuestion } = require('./fixtures.js');

function bankWithQuotes(quotes) {
  return quotes.map((quote, i) => Object.assign(goodQuestion({
    text: 'Pregunta ' + i + ' con un enunciado de longitud suficiente, ¿de acuerdo?',
    sourceQuote: quote,
  }), { id: 'q' + i }));
}

const QUOTES = [
  'El plazo máximo para resolver y notificar será de 6 meses desde la entrada de la solicitud.',
  'Los interesados podrán actuar mediante representante ante las Administraciones Públicas.',
  'Las notificaciones deberán practicarse en un plazo de 10 días desde que el acto sea dictado.',
  'Los plazos señalados por días se entienden referidos a días hábiles salvo indicación expresa.',
  'La Administración deberá dictar resolución expresa en todos los procedimientos iniciados.',
];

test('usableQuotes filtra citas cortas y duplicadas', () => {
  const bank = bankWithQuotes(QUOTES.concat([QUOTES[0], 'corta']));
  assert.equal(usableQuotes(bank).length, QUOTES.length);
});

test('la ronda tiene 4 afirmaciones y exactamente una saboteada', () => {
  const round = buildTrapRound(bankWithQuotes(QUOTES), { rng: gen.createRng(11) });
  assert.ok(round, 'debe salir ronda con material suficiente');
  assert.equal(round.statements.length, ROUND_SIZE);
  assert.ok(round.trapIndex >= 0 && round.trapIndex < ROUND_SIZE);
  // La saboteada difiere del original; las otras 3 son citas intactas del banco
  assert.notEqual(round.statements[round.trapIndex], round.original);
  const intact = round.statements.filter((_, i) => i !== round.trapIndex);
  for (const s of intact) assert.ok(QUOTES.includes(s), 'intacta debe ser cita literal: ' + s);
  assert.ok(!round.statements.includes(round.original), 'el original no puede aparecer a la vez que su sabotaje');
  assert.ok(Object.keys(KIND_LABELS).includes(round.mutationKind));
});

test('es determinista con el mismo rng', () => {
  const a = buildTrapRound(bankWithQuotes(QUOTES), { rng: gen.createRng(7) });
  const b = buildTrapRound(bankWithQuotes(QUOTES), { rng: gen.createRng(7) });
  assert.deepEqual(a, b);
});

test('sin material suficiente devuelve null sin error', () => {
  assert.equal(buildTrapRound(bankWithQuotes(QUOTES.slice(0, 3)), { rng: gen.createRng(1) }), null);
  assert.equal(buildTrapRound([], { rng: gen.createRng(1) }), null);
});

test('checkAnswer valora afirmación y tipo por separado', () => {
  const round = buildTrapRound(bankWithQuotes(QUOTES), { rng: gen.createRng(11) });
  const right = checkAnswer(round, round.trapIndex, round.mutationKind);
  assert.deepEqual(right, { statementCorrect: true, kindCorrect: true });
  const wrongIndex = (round.trapIndex + 1) % ROUND_SIZE;
  const partial = checkAnswer(round, wrongIndex, round.mutationKind);
  assert.equal(partial.statementCorrect, false);
  assert.equal(partial.kindCorrect, true);
});

test('las preguntas demo llevan anotado cómo se fabricó cada distractor', () => {
  const { SAMPLE_LAW, SAMPLE_TOPIC } = require('./fixtures.js');
  const { questions } = gen.generateQuestions(SAMPLE_LAW, SAMPLE_TOPIC, 8, { seed: 42 });
  assert.ok(questions.length > 0);
  for (const q of questions) {
    assert.ok(q.mutations && typeof q.mutations === 'object', 'falta mutations en ' + q.kind);
    assert.ok(!(q.correctIndex in q.mutations), 'la correcta no es una mutación');
    for (const kind of Object.values(q.mutations)) {
      assert.ok(['negation', 'number', 'swap', 'combo'].includes(kind), 'tipo desconocido: ' + kind);
    }
    assert.ok(Object.keys(q.mutations).length >= 1, 'al menos un distractor anotado');
  }
});

test('mutateStatementAnnotated conserva la equivalencia con mutateStatement', () => {
  const sentence = 'El plazo será de 10 días hábiles contados desde la notificación de la resolución.';
  const corpus = ['La Administración deberá resolver mediante resolución expresa suficientemente motivada.'];
  const annotated = gen.mutateStatementAnnotated(sentence, corpus, gen.createRng(5));
  const plain = gen.mutateStatement(sentence, corpus, gen.createRng(5));
  assert.deepEqual(annotated.map((a) => a.text), plain);
});
