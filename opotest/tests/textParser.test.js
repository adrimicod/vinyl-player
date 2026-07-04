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

// ---- Regresión auditoría it.8 ----

test('questionableNumbers excluye citas de leyes, artículos y años (Q3)', () => {
  assert.deepEqual(
    parser.questionableNumbers('De conformidad con la Ley 39/2015, el plazo para subsanar será de 10 días hábiles.'),
    ['10'],
    'la cita «Ley 39/2015» no es un dato examinable'
  );
  assert.deepEqual(parser.questionableNumbers('Según el artículo 66, el Congreso se compone de 350 diputados.'), ['350']);
  assert.deepEqual(parser.questionableNumbers('La Constitución de 1978 fija la mayoría de edad en 18 años.'), ['18']);
  assert.deepEqual(parser.questionableNumbers('Lo dispuesto en el Real Decreto 5/2015 y en la Ley 40/2015.'), []);
  assert.deepEqual(parser.questionableNumbers('El plazo del 39/2015 es de 3 meses.'), ['3'], 'cita numérica suelta también se excluye');
});

test('el hecho number usa el primer número examinable, no la cita legal (Q3)', () => {
  const { facts } = parser.parse(
    'Artículo 5. Plazos.\nDe conformidad con la Ley 39/2015, el plazo máximo para resolver será de 10 días hábiles contados desde la notificación.'
  );
  const num = facts.find((f) => f.type === 'number');
  assert.ok(num, 'debe haber hecho numérico');
  assert.equal(num.value, '10');
});

test('los ítems de enumeración no se re-extraen como statement/number (Q2)', () => {
  const { facts } = parser.parse(SAMPLE_LAW);
  const enumFact = facts.find((f) => f.type === 'enumeration');
  assert.ok(enumFact);
  const itemTexts = enumFact.items;
  for (const f of facts) {
    if (f.type === 'enumeration') continue;
    for (const item of itemTexts) {
      assert.notEqual(f.sentence, item, 'ítem re-extraído como ' + f.type + ': ' + item);
    }
  }
});

test('gapReplace respeta contornos: siglas, decimales y números vecinos (Q4)', () => {
  assert.equal(
    parser.gapReplace('Los funcionarios del subgrupo A1 consolidarán 1 trienio.', '1'),
    'Los funcionarios del subgrupo A1 consolidarán ____ trienio.',
    'no debe romper la sigla A1'
  );
  assert.ok(parser.gapReplace('Los menores de 16 años tendrán 6 meses.', '6').includes('16 años'));
  assert.equal(parser.gapReplace('El porcentaje será del 2,5 por ciento.', '2,5'), 'El porcentaje será del ____ por ciento.');
  assert.ok(parser.gapReplace('interesado en el procedimiento', 'interesado').startsWith('____'));
  assert.equal(
    parser.gapReplace('los desinteresados no computan', 'interesados'),
    'los desinteresados no computan',
    'no debe cortar dentro de otra palabra'
  );
});

test('las definiciones sin coma cortan el término ante el determinante (Q5)', () => {
  const { facts } = parser.parse(
    'Artículo 1. Definiciones.\nSe entiende por vehículo de motor todo vehículo provisto de motor para su propulsión destinado a circular por las vías públicas.'
  );
  const def = facts.find((f) => f.type === 'definition');
  assert.ok(def, 'debe detectar la definición');
  assert.equal(def.term, 'vehículo de motor');
  assert.ok(def.definition.startsWith('todo vehículo provisto'));
});

test('las definiciones con coma no cambian (regresión Q5)', () => {
  const { facts } = parser.parse(SAMPLE_LAW);
  const def = facts.find((f) => f.type === 'definition');
  assert.equal(def.term, 'interesado');
  assert.ok(def.definition.startsWith('aquella persona'));
});

test('los hechos llevan la referencia del artículo al que pertenecen', () => {
  const { facts } = parser.parse(SAMPLE_LAW);
  const numberFacts = facts.filter((f) => f.type === 'number');
  assert.ok(numberFacts.some((f) => f.ref === 'Artículo 1'));
  assert.ok(numberFacts.some((f) => f.ref === 'Artículo 4 bis'));
});
