const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DemoProvider, ClaudeProvider, buildPrompt, extractJsonArray } = require('../js/aiProvider.js');
const { SAMPLE_LAW, SAMPLE_TOPIC, goodQuestion } = require('./fixtures.js');

test('DemoProvider genera preguntas sin red ni API key', async () => {
  const provider = new DemoProvider({ seed: 42 });
  const { questions } = await provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, 5, []);
  assert.ok(questions.length > 0);
  assert.equal(provider.name, 'demo');
});

test('buildPrompt incluye metadatos del tema y el contrato JSON', () => {
  const prompt = buildPrompt(SAMPLE_LAW, SAMPLE_TOPIC, 10);
  assert.ok(prompt.includes('Ley 39/2015'));
  assert.ok(prompt.includes('Bombero'));
  assert.ok(prompt.includes('exactamente 10 preguntas'));
  assert.ok(prompt.includes('sourceQuote'));
  assert.ok(prompt.includes(SAMPLE_LAW.slice(0, 50)));
});

test('extractJsonArray tolera texto alrededor del JSON', () => {
  const arr = extractJsonArray('Aquí tienes:\n[{"a": 1}]\nEspero que sirva');
  assert.deepEqual(arr, [{ a: 1 }]);
  assert.throws(() => extractJsonArray('sin json'));
});

function mockFetch(payload, status = 200) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    };
  };
  fn.calls = calls;
  return fn;
}

test('ClaudeProvider parsea, valida y ancla las preguntas de la API', async () => {
  const apiQuestions = [
    goodQuestion(),
    goodQuestion({ sourceQuote: 'cita inventada que no está en el texto fuente legal' }), // no anclada → fuera
  ];
  const fetchMock = mockFetch({ content: [{ type: 'text', text: 'Claro:\n' + JSON.stringify(apiQuestions) }] });
  const provider = new ClaudeProvider('sk-test', { fetch: fetchMock });
  const { questions, discarded } = await provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, 2, []);

  assert.equal(questions.length, 1);
  assert.equal(discarded.length, 1);
  assert.ok(discarded[0].reason.includes('no anclada'));
  assert.deepEqual(questions[0].topic, SAMPLE_TOPIC);

  const call = fetchMock.calls[0];
  assert.ok(call.url.includes('api.anthropic.com'));
  assert.equal(call.init.headers['x-api-key'], 'sk-test');
  const body = JSON.parse(call.init.body);
  assert.equal(body.model, 'claude-sonnet-5');
});

test('ClaudeProvider deduplica contra el banco existente', async () => {
  const q = goodQuestion();
  const fetchMock = mockFetch({ content: [{ text: JSON.stringify([q]) }] });
  const provider = new ClaudeProvider('sk-test', { fetch: fetchMock });
  const existing = [q.text + ' ' + q.options.join(' ')];
  const { questions, discarded } = await provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, 1, existing);
  assert.equal(questions.length, 0);
  assert.equal(discarded.length, 1);
});

test('ClaudeProvider lanza error legible si la API falla', async () => {
  const provider = new ClaudeProvider('sk-test', { fetch: mockFetch({ error: 'rate limited' }, 429) });
  await assert.rejects(
    () => provider.generate(SAMPLE_LAW, SAMPLE_TOPIC, 1, []),
    /429/
  );
});

test('ClaudeProvider exige API key', () => {
  assert.throws(() => new ClaudeProvider(''), /API key/);
});
