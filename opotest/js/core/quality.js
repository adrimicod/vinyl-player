/**
 * quality.js — Sistema de calidad comunitario: votos, erratas, ciclo de vida
 * de las preguntas y recompensas al autor/evaluador (PLAN.md §3.3).
 * Módulo puro: opera sobre objetos pregunta del banco.
 */
(function () {
  'use strict';

  const THRESHOLDS = {
    REVIEW_SCORE: -3,   // score <= -3 → revisión
    RETIRE_SCORE: -5,   // score <= -5 → retirada
    REWARD_SCORE: 5,    // score >= +5 → recompensa al autor (una sola vez)
  };

  const REWARDS = {
    AUTHOR_GOOD_QUESTION: 1,   // créditos al autor por pregunta bien valorada
    EVALUATOR_VOTE: 0.2,       // créditos por evaluar
    EVALUATOR_DAILY_CAP: 5,    // máximo de votos recompensados al día
    CORRECTOR_FIX: 0.5,        // créditos por corregir una errata (cuando la corrección se confirma)
    CORRECTOR_SCORE: 1,        // score que debe recuperar la pregunta corregida para pagar
  };

  function score(quality) {
    return (quality.up || 0) - (quality.down || 0);
  }

  /** Recalcula el estado según score y erratas abiertas. Nunca "resucita" una retirada. */
  function computeStatus(quality) {
    if (quality.status === 'retired') return 'retired';
    const s = score(quality);
    if (s <= THRESHOLDS.RETIRE_SCORE) return 'retired';
    const openErratas = (quality.erratas || []).some((e) => !e.resolved);
    if (s <= THRESHOLDS.REVIEW_SCORE || openErratas) return 'review';
    return 'active';
  }

  /**
   * Registra un voto (+1 / -1) de un usuario. Un usuario solo vota una vez
   * por pregunta (puede cambiar su voto).
   * @returns {{changed: boolean, status: string}}
   */
  function vote(question, userId, value) {
    if (value !== 1 && value !== -1) throw new Error('Voto inválido: debe ser +1 o -1');
    const q = question.quality;
    q.voters = q.voters || {};
    const prev = q.voters[userId];
    if (prev === value) return { changed: false, status: q.status };
    if (prev === 1) q.up--;
    if (prev === -1) q.down--;
    if (value === 1) q.up++;
    else q.down++;
    q.voters[userId] = value;
    q.status = computeStatus(q);
    return { changed: true, status: q.status };
  }

  /** Reporta una errata; la pregunta pasa a revisión. */
  function reportErrata(question, userId, message) {
    const text = String(message || '').trim();
    if (!text) throw new Error('La errata necesita una descripción');
    const q = question.quality;
    q.erratas = q.erratas || [];
    q.erratas.push({ userId, message: text, createdAt: null, resolved: false });
    q.status = computeStatus(q);
    return q.status;
  }

  /**
   * Resuelve una errata. Si se acepta con corrección, se aplica el parche a
   * la pregunta (autocorrección solicitada → revisada → ajustada).
   * @param {object} patch  campos corregidos (text, options, correctIndex, explanation)
   */
  function resolveErrata(question, errataIndex, accepted, patch, correctorId) {
    const q = question.quality;
    const errata = (q.erratas || [])[errataIndex];
    if (!errata) throw new Error('Errata inexistente');
    errata.resolved = true;
    errata.accepted = !!accepted;
    if (accepted && patch) {
      for (const key of ['text', 'options', 'correctIndex', 'explanation', 'sourceQuote']) {
        if (patch[key] !== undefined) question[key] = patch[key];
      }
      // Una corrección aceptada resetea los votos negativos: la pregunta cambió.
      q.down = 0;
      q.voters = {};
      if (correctorId) {
        q.correctedBy = correctorId;
        q.correctorRewardedAt = q.correctorRewardedAt || null;
      }
    }
    q.status = computeStatus(q);
    return q.status;
  }

  /**
   * Recompensa al corrector de una errata cuando la corrección se CONFIRMA:
   * la pregunta corregida vuelve a estar activa y recupera score positivo
   * (§1.3: «créditos solo por calidad confirmada», nunca al guardar).
   * Idempotente, como applyAuthorReward.
   * @returns {boolean} true si se pagó ahora
   */
  function applyCorrectorReward(question, creditFns) {
    const q = question.quality;
    if (!q.correctedBy || q.correctorRewardedAt) return false;
    if (q.status !== 'active' || score(q) < REWARDS.CORRECTOR_SCORE) return false;
    creditFns.earn(REWARDS.CORRECTOR_FIX, 'Corrección de errata confirmada: ' + (question.id || ''));
    q.correctorRewardedAt = true;
    return true;
  }

  /**
   * Recompensa al autor si la pregunta alcanza el umbral (idempotente).
   * @param {object} creditFns {earn(amount, reason)} — normalmente el CreditManager del autor
   * @returns {boolean} true si se pagó la recompensa ahora
   */
  function applyAuthorReward(question, creditFns) {
    const q = question.quality;
    if (q.rewardedAt) return false;
    if (score(q) < THRESHOLDS.REWARD_SCORE || q.status !== 'active') return false;
    creditFns.earn(REWARDS.AUTHOR_GOOD_QUESTION, 'Pregunta bien valorada: ' + (question.id || ''));
    q.rewardedAt = true;
    return true;
  }

  /**
   * Recompensa a un evaluador por votar, con tope diario.
   * @param {object} creditFns {earn}
   * @param {object} dayState  {count} votos recompensados hoy (lo gestiona el llamador)
   * @returns {boolean} true si se recompensó
   */
  function rewardEvaluator(creditFns, dayState) {
    if (dayState.count >= REWARDS.EVALUATOR_DAILY_CAP) return false;
    creditFns.earn(REWARDS.EVALUATOR_VOTE, 'Evaluación de pregunta');
    dayState.count++;
    return true;
  }

  const api = { score, computeStatus, vote, reportErrata, resolveErrata, applyAuthorReward, applyCorrectorReward, rewardEvaluator, THRESHOLDS, REWARDS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
