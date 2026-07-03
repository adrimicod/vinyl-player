const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encodeShare, decodeShare, MAX_SHARE } = require('../js/core/share.js');
const { goodQuestion } = require('./fixtures.js');

test('encode/decode: ida y vuelta sin pérdidas (incluye tildes y comillas)', () => {
  const original = [
    goodQuestion(),
    goodQuestion({ text: '¿Qué se entiende por «interesado» según el artículo 4 de la Ley?', options: ['Definición Á', 'Definición B', 'Definición C', 'Definición D'] }),
  ];
  const fragment = encodeShare(original);
  assert.ok(fragment.startsWith('share='));
  assert.ok(/^share=[A-Za-z0-9\-_]+$/.test(fragment), 'el fragmento debe ser seguro para URL');
  const { questions, skipped } = decodeShare(fragment);
  assert.equal(skipped, 0);
  assert.equal(questions.length, 2);
  assert.equal(questions[0].text, original[0].text);
  assert.deepEqual(questions[1].options, original[1].options);
  assert.equal(questions[1].correctIndex, original[1].correctIndex);
});

test('decodeShare acepta el hash completo de una URL', () => {
  const fragment = encodeShare([goodQuestion()]);
  const { questions } = decodeShare('#' + fragment);
  assert.equal(questions.length, 1);
});

test('encodeShare recorta a MAX_SHARE preguntas', () => {
  const many = Array.from({ length: 25 }, (_, i) =>
    goodQuestion({ text: 'Pregunta número ' + i + ' con enunciado de longitud suficiente, ¿ok?' })
  );
  const { questions } = decodeShare(encodeShare(many));
  assert.equal(questions.length, MAX_SHARE);
});

test('encodeShare rechaza listas vacías', () => {
  assert.throws(() => encodeShare([]), /No hay preguntas/);
  assert.throws(() => encodeShare(null), /No hay preguntas/);
});

test('los fragmentos corruptos fallan con mensaje claro sin romper', () => {
  assert.throws(() => decodeShare('share=%%%no-base64%%%'), /no contiene un test/);
  assert.throws(() => decodeShare('share=' + 'AAAA'.repeat(10)), /dañado|no soportada|no contiene/);
  assert.throws(() => decodeShare('#otracosa=123'), /no contiene un test/);
  assert.throws(() => decodeShare(''), /no contiene un test/);
});

test('una versión de formato desconocida se rechaza', () => {
  const fake = 'share=' + btoa(encodeURIComponent(JSON.stringify({ v: 99, q: [goodQuestion()] })))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.throws(() => decodeShare(fake), /versión de formato/);
});

test('las preguntas malformadas del enlace se descartan (skipped)', () => {
  const payload = { v: 1, q: [goodQuestion(), { text: 'rota' }] };
  const fake = 'share=' + btoa(encodeURIComponent(JSON.stringify(payload)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const { questions, skipped } = decodeShare(fake);
  assert.equal(questions.length, 1);
  assert.equal(skipped, 1);
});

test('un enlace solo con preguntas inválidas falla con mensaje claro', () => {
  const payload = { v: 1, q: [{ text: 'rota' }] };
  const fake = 'share=' + btoa(encodeURIComponent(JSON.stringify(payload)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.throws(() => decodeShare(fake), /no contiene preguntas válidas/);
});

// ---- Reto con marcador a batir (v2, iteración 4) ----

test('round-trip con reto: alias y nota viajan en el enlace', () => {
  const fragment = encodeShare([goodQuestion()], { challenge: { alias: 'Adri', score10: 8.33 } });
  const { challenge } = decodeShare(fragment);
  assert.deepEqual(challenge, { alias: 'Adri', score10: 8.33 });
});

test('sin reto, challenge es null', () => {
  const { challenge } = decodeShare(encodeShare([goodQuestion()]));
  assert.equal(challenge, null);
});

test('un reto malformado degrada a compartir normal sin romper', () => {
  assert.equal(decodeShare(encodeShare([goodQuestion()], { challenge: { alias: '', score10: 5 } })).challenge, null);
  assert.equal(decodeShare(encodeShare([goodQuestion()], { challenge: { alias: 'X', score10: 47 } })).challenge, null);
  assert.equal(decodeShare(encodeShare([goodQuestion()], { challenge: 'basura' })).challenge, null);
  // Payload v2 fabricado con challenge corrupto: las preguntas sobreviven
  const fake = 'share=' + btoa(encodeURIComponent(JSON.stringify({ v: 2, q: [goodQuestion()], c: { alias: 42 } })))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decoded = decodeShare(fake);
  assert.equal(decoded.questions.length, 1);
  assert.equal(decoded.challenge, null);
});

test('el alias se recorta al máximo permitido', () => {
  const long = 'A'.repeat(100);
  const { challenge } = decodeShare(encodeShare([goodQuestion()], { challenge: { alias: long, score10: 5 } }));
  assert.equal(challenge.alias.length, 30);
});

test('retrocompatibilidad: los enlaces v1 se siguen decodificando', () => {
  const v1 = 'share=' + btoa(encodeURIComponent(JSON.stringify({ v: 1, q: [goodQuestion()] })))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const decoded = decodeShare(v1);
  assert.equal(decoded.questions.length, 1);
  assert.equal(decoded.challenge, null);
});

test('lo decodificado es importable al banco (formato compatible)', () => {
  const { QuestionBank, memoryStorage } = require('../js/core/bank.js');
  const bank = new QuestionBank(memoryStorage());
  const { questions } = decodeShare(encodeShare([goodQuestion()]));
  const res = bank.importJSON(JSON.stringify({ questions }));
  assert.equal(res.added, 1);
});
