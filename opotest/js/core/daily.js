/**
 * daily.js — Reto diario con racha: un test corto cada día con semilla
 * derivada de la fecha (mismo día + mismo banco → mismo reto), racha que
 * solo suma con el primer reto completado de cada día natural y se rompe
 * al saltarse uno. 0 créditos, 0 IA: solo usa el banco activo.
 * Módulo puro: reloj inyectable, testeable con node --test.
 */
(function () {
  'use strict';

  const isNode = typeof module !== 'undefined' && typeof require !== 'undefined';
  const gen = isNode ? require('./generator.js') : window.OpoCore;

  const DAILY_COUNT = 5;
  const HISTORY_LIMIT = 90; // días completados que se conservan (calendario)

  /** Clave de día natural LOCAL (el reto cambia a medianoche del usuario). */
  function dateKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /** Días naturales entre dos dateKeys (b − a). Inmune a DST vía mediodía UTC. */
  function daysBetween(keyA, keyB) {
    const toUtcNoon = (k) => {
      const [y, m, d] = k.split('-').map(Number);
      return Date.UTC(y, m - 1, d, 12);
    };
    return Math.round((toUtcNoon(keyB) - toUtcNoon(keyA)) / 86400000);
  }

  /** Semilla determinista a partir de la clave del día (djb2). */
  function seedFromDate(key) {
    let h = 5381;
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    return h;
  }

  /**
   * Construye el reto de hoy: determinista para el mismo día y el mismo banco.
   * @param {Array} activeQuestions preguntas activas del banco
   * @param {object} [opts] {now: ms epoch, count}
   * @returns {{questions: Array, dateKey: string}}
   */
  function buildDailyQuiz(activeQuestions, opts) {
    const o = opts || {};
    const now = o.now != null ? o.now : Date.now();
    const key = dateKey(now);
    const count = o.count || DAILY_COUNT;
    // Orden estable por id antes de barajar: el resultado no depende del
    // orden de inserción en el banco, solo de su contenido y de la fecha.
    const sorted = activeQuestions.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const rng = gen.createRng(seedFromDate(key));
    return { questions: gen.shuffle(sorted, rng).slice(0, count), dateKey: key };
  }

  /** Estado inicial de la racha (vive en userState.daily). */
  function emptyDailyState() {
    return { lastDate: null, streak: 0, history: [] };
  }

  /** ¿Está ya completado el reto de hoy? */
  function isDailyDone(daily, now) {
    return !!daily && daily.lastDate === dateKey(now != null ? now : Date.now());
  }

  /**
   * Registra la finalización del reto de hoy. Idempotente dentro del día:
   * solo el primer reto completado de cada día natural cuenta para la racha.
   * @returns {{counted: boolean, streak: number}}
   */
  function completeDaily(daily, now) {
    const key = dateKey(now != null ? now : Date.now());
    if (daily.lastDate === key) {
      return { counted: false, streak: daily.streak };
    }
    const gap = daily.lastDate ? daysBetween(daily.lastDate, key) : Infinity;
    daily.streak = gap === 1 ? daily.streak + 1 : 1;
    daily.lastDate = key;
    daily.history.push(key);
    if (daily.history.length > HISTORY_LIMIT) {
      daily.history.splice(0, daily.history.length - HISTORY_LIMIT);
    }
    return { counted: true, streak: daily.streak };
  }

  /**
   * Calendario del mes de `now`: [{day, key, done, isToday}] para pintar
   * el mini-calendario de «Mi cuenta».
   */
  function monthCalendar(daily, now) {
    const ts = now != null ? now : Date.now();
    const d = new Date(ts);
    const done = new Set((daily && daily.history) || []);
    const today = dateKey(ts);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const out = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const key = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(day).padStart(2, '0');
      out.push({ day, key, done: done.has(key), isToday: key === today });
    }
    return out;
  }

  const api = { buildDailyQuiz, completeDaily, isDailyDone, emptyDailyState, monthCalendar, dateKey, daysBetween, seedFromDate, DAILY_COUNT };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
