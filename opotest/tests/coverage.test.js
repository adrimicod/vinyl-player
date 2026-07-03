const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCoverageGrid, parseArticleRange, articleOf, THRESHOLDS } = require('../js/core/coverage.js');
const { goodQuestion } = require('./fixtures.js');

function bankQuestion(article, ley, i, articulos) {
  return Object.assign(goodQuestion({
    text: 'Según el artículo ' + article + ' de la ' + ley + ', ¿cuál es el plazo del caso ' + i + '?',
    topic: { ley, articulos: articulos || '' },
  }), { id: 'q' + i });
}

test('parseArticleRange entiende rangos, listas y combinaciones', () => {
  assert.deepEqual(parseArticleRange('1-4').sort(), ['1', '2', '3', '4'].sort());
  assert.deepEqual(parseArticleRange('1,3,5').sort(), ['1', '3', '5'].sort());
  assert.deepEqual(parseArticleRange('2-3, 7').sort(), ['2', '3', '7'].sort());
  assert.deepEqual(parseArticleRange(''), []);
  assert.deepEqual(parseArticleRange('sin sentido'), []);
  assert.deepEqual(parseArticleRange('9-5'), [], 'rango invertido se ignora');
});

test('articleOf extrae el artículo del enunciado', () => {
  assert.equal(articleOf({ text: 'Según el artículo 14 de la Ley…' }), '14');
  assert.equal(articleOf({ text: 'Según el artículo 4 bis de la Ley…' }), '4 bis');
  assert.equal(articleOf({ text: 'Pregunta sin referencia' }), null);
});

test('la rejilla clasifica: untried, good, medium, weak', () => {
  const questions = [
    bankQuestion(1, 'Ley 39/2015', 0), // sin intentos → untried
    bankQuestion(2, 'Ley 39/2015', 1), // 100% → good
    bankQuestion(3, 'Ley 39/2015', 2), // 50% → medium
    bankQuestion(4, 'Ley 39/2015', 3), // 0% → weak
  ];
  const history = {
    q1: { attempts: 4, correct: 4 },
    q2: { attempts: 4, correct: 2 },
    q3: { attempts: 4, correct: 0 },
  };
  const grid = buildCoverageGrid(questions, history);
  assert.equal(grid.length, 1);
  const byArticle = Object.fromEntries(grid[0].cells.map((c) => [c.article, c]));
  assert.equal(byArticle['1'].status, 'untried');
  assert.equal(byArticle['2'].status, 'good');
  assert.equal(byArticle['3'].status, 'medium');
  assert.equal(byArticle['4'].status, 'weak');
  assert.equal(byArticle['2'].accuracy, 1);
  assert.equal(byArticle['3'].accuracy, 0.5);
});

test('los umbrales exactos caen del lado correcto', () => {
  const q = [bankQuestion(1, 'L', 0)];
  const at = (correct, attempts) =>
    buildCoverageGrid(q, { q0: { attempts, correct } })[0].cells[0].status;
  assert.equal(at(8, 10), 'good', THRESHOLDS.GOOD + ' es good');
  assert.equal(at(7, 10), 'medium');
  assert.equal(at(5, 10), 'medium', THRESHOLDS.MEDIUM + ' es medium');
  assert.equal(at(4, 10), 'weak');
});

test('los artículos acotados sin preguntas aparecen como celdas grises (empty)', () => {
  // La pregunta cubre el art. 1 pero declara la acotación 1-3
  const questions = [bankQuestion(1, 'Ley 39/2015', 0, '1-3')];
  const grid = buildCoverageGrid(questions, {});
  const byArticle = Object.fromEntries(grid[0].cells.map((c) => [c.article, c]));
  assert.equal(byArticle['1'].status, 'untried');
  assert.equal(byArticle['2'].status, 'empty');
  assert.equal(byArticle['3'].status, 'empty');
  assert.equal(byArticle['2'].total, 0);
});

test('las celdas se ordenan de forma natural (4 < 4 bis < 14)', () => {
  const questions = [
    bankQuestion(14, 'L', 0),
    bankQuestion('4 bis', 'L', 1),
    bankQuestion(4, 'L', 2),
  ];
  const grid = buildCoverageGrid(questions, {});
  assert.deepEqual(grid[0].cells.map((c) => c.article), ['4', '4 bis', '14']);
});

test('varias leyes generan filas separadas y ordenadas', () => {
  const questions = [
    bankQuestion(1, 'Ley 40/2015', 0),
    bankQuestion(1, 'Ley 39/2015', 1),
  ];
  const grid = buildCoverageGrid(questions, {});
  assert.deepEqual(grid.map((g) => g.ley), ['Ley 39/2015', 'Ley 40/2015']);
});

test('tolerante con historial ausente o vacío', () => {
  const questions = [bankQuestion(1, 'L', 0)];
  assert.equal(buildCoverageGrid(questions, undefined)[0].cells[0].status, 'untried');
  assert.equal(buildCoverageGrid(questions, {})[0].cells[0].status, 'untried');
});

test('el historial por pregunta de quiz.updateHistory alimenta la rejilla', () => {
  const quiz = require('../js/core/quiz.js');
  const questions = [Object.assign(bankQuestion(7, 'L', 0), { correctIndex: 0 })];
  const user = { seenIds: ['viejo'] }; // estado antiguo sin perQuestion
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [0]));
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [1]));
  quiz.updateHistory(user, quiz.scoreQuiz(questions, [null])); // blanco: no cuenta
  assert.deepEqual(user.perQuestion.q0, { attempts: 2, correct: 1 });
  const grid = buildCoverageGrid(questions, user.perQuestion);
  assert.equal(grid[0].cells[0].status, 'medium');
});
