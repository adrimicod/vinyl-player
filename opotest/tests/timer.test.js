const { test } = require('node:test');
const assert = require('node:assert/strict');
const timer = require('../js/core/timer.js');

const T0 = 1750000000000;
const MIN = 60000;

test('createExam fija el tiempo por defecto a 1 min/pregunta', () => {
  const exam = timer.createExam(20, { now: T0 });
  assert.equal(exam.totalMs, 20 * MIN);
  assert.equal(timer.remainingMs(exam, T0), 20 * MIN);
  const custom = timer.createExam(10, { now: T0, totalMs: 5 * MIN });
  assert.equal(custom.totalMs, 5 * MIN);
});

test('la cuenta atrás baja, expira y nunca es negativa', () => {
  const exam = timer.createExam(2, { now: T0, totalMs: 2 * MIN });
  assert.equal(timer.remainingMs(exam, T0 + MIN), MIN);
  assert.equal(timer.isExpired(exam, T0 + MIN), false);
  assert.equal(timer.remainingMs(exam, T0 + 5 * MIN), 0);
  assert.equal(timer.isExpired(exam, T0 + 5 * MIN), true);
});

test('shouldWarn avisa solo dentro de los últimos 5 minutos', () => {
  const exam = timer.createExam(10, { now: T0, totalMs: 10 * MIN });
  assert.equal(timer.shouldWarn(exam, T0), false);
  assert.equal(timer.shouldWarn(exam, T0 + 6 * MIN), true);
  assert.equal(timer.shouldWarn(exam, T0 + 11 * MIN), false, 'expirado ya no avisa');
});

test('answerExam registra respuesta y evento; no se puede tras terminar', () => {
  const exam = timer.createExam(3, { now: T0 });
  timer.answerExam(exam, 0, 2, T0 + 10000);
  assert.equal(exam.answers[0], 2);
  assert.equal(exam.events.length, 1);
  timer.answerExam(exam, 0, 1, T0 + 20000); // cambiar de respuesta es legal
  assert.equal(exam.answers[0], 1);
  timer.finishExam(exam, T0 + 30000);
  assert.throws(() => timer.answerExam(exam, 1, 0, T0 + 40000), /terminado/);
  assert.throws(() => timer.answerExam(exam, 99, 0, T0), /terminado|rango/);
});

test('finishExam recorta el cierre al tiempo máximo (autoenvío)', () => {
  const exam = timer.createExam(2, { now: T0, totalMs: 2 * MIN });
  timer.finishExam(exam, T0 + 10 * MIN); // llegó tardísimo
  assert.equal(exam.finishedAt, T0 + 2 * MIN);
  assert.equal(timer.remainingMs(exam), 0);
});

test('toggleMark marca y desmarca para revisar', () => {
  const exam = timer.createExam(3, { now: T0 });
  assert.equal(timer.toggleMark(exam, 1), true);
  assert.equal(timer.toggleMark(exam, 1), false);
});

test('timePerQuestion atribuye los deltas entre eventos', () => {
  const exam = timer.createExam(3, { now: T0 });
  timer.answerExam(exam, 0, 0, T0 + 30000);   // 30s en la 0
  timer.answerExam(exam, 1, 0, T0 + 90000);   // 60s en la 1
  timer.answerExam(exam, 2, 0, T0 + 100000);  // 10s en la 2
  const times = timer.timePerQuestion(exam);
  assert.equal(times[0], 30000);
  assert.equal(times[1], 60000);
  assert.equal(times[2], 10000);
});

test('paceReport: mediana, preguntas lentas y proyección de ritmo', () => {
  const exam = timer.createExam(10, { now: T0, totalMs: 10 * MIN });
  // 4 respuestas: 30s, 30s, 30s y una de 150s (más del doble de la mediana)
  timer.answerExam(exam, 0, 0, T0 + 30000);
  timer.answerExam(exam, 1, 0, T0 + 60000);
  timer.answerExam(exam, 2, 0, T0 + 90000);
  timer.answerExam(exam, 3, 0, T0 + 240000);
  timer.finishExam(exam, T0 + 240000);
  const report = timer.paceReport(exam);
  assert.equal(report.answered, 4);
  assert.equal(report.unanswered, 6);
  assert.equal(report.medianMs, 30000);
  assert.deepEqual(report.slowIndexes, [3]);
  assert.equal(report.avgMs, 60000);
  // A 60s/pregunta con 10 min de examen: llegarías justo a la 10
  assert.equal(report.wouldReach, 10);
});

test('paceReport con ritmo lento proyecta que no llegas al final', () => {
  const exam = timer.createExam(10, { now: T0, totalMs: 10 * MIN });
  timer.answerExam(exam, 0, 0, T0 + 2 * MIN); // 2 min/pregunta
  timer.finishExam(exam, T0 + 2 * MIN);
  assert.equal(timer.paceReport(exam).wouldReach, 5);
});

test('paceReport sin respuestas no divide por cero', () => {
  const exam = timer.createExam(5, { now: T0 });
  timer.finishExam(exam, T0 + MIN);
  const report = timer.paceReport(exam);
  assert.equal(report.answered, 0);
  assert.equal(report.medianMs, 0);
  assert.equal(report.wouldReach, 5);
});
