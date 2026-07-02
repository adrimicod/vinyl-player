const { test } = require('node:test');
const assert = require('node:assert/strict');
const parser = require('../js/core/textParser.js');
const { SAMPLE_LAW } = require('./fixtures.js');

test('cleanText normaliza saltos de línea y espacios', () => {
  assert.equal(parser.cleanText('hola\r\nmundo\t \tya'), 'hola\nmundo ya');
  assert.equal(parser.cleanText('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(parser.cleanText('  con espacios  '), 'con espacios');
});

test('splitArticles detecta artículos numerados y bis', () => {
  const sections = parser.splitArticles(SAMPLE_LAW);
  const refs = sections.map((s) => s.ref);
  assert.deepEqual(refs, ['Artículo 1', 'Artículo 2', 'Artículo 3', 'Artículo 4 bis']);
  assert.ok(sections[0].body.includes('plazo máximo para resolver'));
  assert.ok(sections[3].body.includes('15 días naturales'));
});

test('splitArticles sin artículos devuelve sección única sin ref', () => {
  const sections = parser.splitArticles('Un tema cualquiera sin estructura legal, con contenido suficiente.');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].ref, null);
});

test('splitArticles con texto vacío devuelve lista vacía', () => {
  assert.deepEqual(parser.splitArticles(''), []);
});

test('splitSentences divide frases y respeta abreviaturas', () => {
  const sentences = parser.splitSentences(
    'El plazo será de 10 días según el art. 5 del reglamento vigente. La notificación se practicará por medios electrónicos siempre.'
  );
  assert.equal(sentences.length, 2);
  assert.ok(sentences[0].includes('art. 5'));
});

test('splitSentences descarta fragmentos demasiado cortos', () => {
  const sentences = parser.splitSentences('Sí. La Administración deberá resolver en todo caso de forma expresa.');
  assert.equal(sentences.length, 1);
});

test('extractFacts detecta números, definiciones y enumeraciones', () => {
  const { facts } = parser.parse(SAMPLE_LAW);
  const types = new Set(facts.map((f) => f.type));
  assert.ok(types.has('number'), 'debe detectar hechos numéricos');
  assert.ok(types.has('definition'), 'debe detectar definiciones');
  assert.ok(types.has('enumeration'), 'debe detectar enumeraciones');

  const def = facts.find((f) => f.type === 'definition');
  assert.equal(def.term, 'interesado');
  assert.ok(def.definition.startsWith('aquella persona'));

  const enumFact = facts.find((f) => f.type === 'enumeration');
  assert.equal(enumFact.items.length, 4);
  assert.equal(enumFact.ref, 'Artículo 3');
});

test('splitSentences limpia los marcadores de enumeración «a) …»', () => {
  const sentences = parser.splitSentences('a) Al acceso a la información pública, a los archivos y a los registros administrativos.');
  assert.equal(sentences.length, 1);
  assert.ok(sentences[0].startsWith('Al acceso'), 'no debe arrastrar el prefijo: ' + sentences[0]);
});

test('las frases que terminan en «:» no se usan como afirmaciones', () => {
  const { facts } = parser.parse(
    'Artículo 9. Derechos.\nLas personas tienen los siguientes derechos en sus relaciones con las Administraciones:'
  );
  assert.ok(!facts.some((f) => f.type === 'statement'), 'una introducción de enumeración no es una afirmación');
});

test('los hechos llevan la referencia del artículo al que pertenecen', () => {
  const { facts } = parser.parse(SAMPLE_LAW);
  const numberFacts = facts.filter((f) => f.type === 'number');
  assert.ok(numberFacts.some((f) => f.ref === 'Artículo 1'));
  assert.ok(numberFacts.some((f) => f.ref === 'Artículo 4 bis'));
});
