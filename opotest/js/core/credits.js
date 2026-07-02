/**
 * credits.js — Planes de suscripción y créditos: el mecanismo que mantiene
 * el coste de IA por debajo de la cuota (PLAN.md §3.4).
 * Módulo puro: estado serializable, reloj inyectable.
 */
(function () {
  'use strict';

  const PLANS = {
    free: { name: 'Gratis', pricePerMonth: 0, monthlyCredits: 10 },
    basic: { name: 'Básico', pricePerMonth: 9.99, monthlyCredits: 100 },
    pro: { name: 'Pro', pricePerMonth: 19.99, monthlyCredits: 300 },
  };

  const COST_PER_QUESTION = 1; // 1 crédito = 1 pregunta generada y aceptada

  function monthKey(ts) {
    const d = new Date(ts);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }

  class CreditManager {
    /**
     * @param {object} [state] estado serializado previo
     * @param {Function} [now]  reloj inyectable (ms epoch)
     */
    constructor(state, now) {
      this.now = now || (() => Date.now());
      const s = state || {};
      this.plan = PLANS[s.plan] ? s.plan : 'free';
      this.credits = typeof s.credits === 'number' ? s.credits : PLANS[this.plan].monthlyCredits;
      this.cycle = s.cycle || monthKey(this.now());
      this.log = Array.isArray(s.log) ? s.log : [];
      this.renewIfNeeded();
    }

    serialize() {
      return { plan: this.plan, credits: this.credits, cycle: this.cycle, log: this.log };
    }

    /** Al cambiar de mes natural, los créditos se restablecen a los del plan. */
    renewIfNeeded() {
      const current = monthKey(this.now());
      if (current !== this.cycle) {
        this.cycle = current;
        this.credits = PLANS[this.plan].monthlyCredits;
        this._logEntry('renovación', PLANS[this.plan].monthlyCredits);
      }
    }

    setPlan(plan) {
      if (!PLANS[plan]) throw new Error('Plan desconocido: ' + plan);
      if (plan === this.plan) return;
      const upgrade = PLANS[plan].monthlyCredits > PLANS[this.plan].monthlyCredits;
      this.plan = plan;
      if (upgrade) {
        // Al subir de plan se recibe la asignación completa del nuevo plan.
        this.credits = Math.max(this.credits, PLANS[plan].monthlyCredits);
        this._logEntry('cambio a plan ' + plan, this.credits);
      } else {
        this._logEntry('cambio a plan ' + plan, 0);
      }
    }

    canSpend(amount) {
      this.renewIfNeeded();
      return this.credits >= amount;
    }

    /** @returns {boolean} false si no hay crédito suficiente (no gasta nada). */
    spend(amount, reason) {
      if (amount < 0) throw new Error('Importe negativo');
      this.renewIfNeeded();
      if (this.credits < amount) return false;
      this.credits = round2(this.credits - amount);
      this._logEntry(reason || 'gasto', -amount);
      return true;
    }

    earn(amount, reason) {
      if (amount < 0) throw new Error('Importe negativo');
      this.renewIfNeeded();
      this.credits = round2(this.credits + amount);
      this._logEntry(reason || 'recompensa', amount);
    }

    /** Cuántas preguntas puede generar ahora mismo. */
    questionsAvailable() {
      this.renewIfNeeded();
      return Math.floor(this.credits / COST_PER_QUESTION);
    }

    _logEntry(reason, delta) {
      this.log.push({ at: this.now(), reason, delta, balance: this.credits });
      if (this.log.length > 200) this.log.splice(0, this.log.length - 200);
    }
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  const api = { CreditManager, PLANS, COST_PER_QUESTION };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.OpoCore = Object.assign(window.OpoCore || {}, api);
  }
})();
