// libs/memoria/memoria.scheduler.js
// Versão compatível com CommonJS (require) e Node.js

const { FSRS, Rating, State, createEmptyCard, generatorParameters } = require('ts-fsrs');

/**
 * Parâmetros FSRS recomendados (2025)
 */
const DEFAULT_PARAMS = {
  request_retention: 0.9,        // 90% de retenção desejada
  maximum_interval: 36500,
  w: [
    0.4197, 1.1869, 4.1905, 10.1484, 5.0371,
    1.2948, 0.8013, 0.0464, 1.6276, 0.1552,
    1.0546, 0.1402, 1.0417, 0.0382, 1.6093,
    0.1468, 2.9669, 0.5319, 0.6965, 0.4324
  ],
  enable_fuzz: true,
  enable_short_term: false
};

class MemoriaScheduler {
  constructor(customParams = {}) {
    this.params = generatorParameters({ ...DEFAULT_PARAMS, ...customParams });
    this.fsrs = new FSRS(this.params);
  }

  /**
   * Calcula o próximo estado do card
   * @param {Object|null} currentState - Estado atual (difficulty, stability, etc.) ou null para novo
   * @param {Date} now - Data da revisão (default: agora)
   * @param {number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
   * @returns {Object}
   */
  next(currentState = null, now = new Date(), rating) {
    // Validar rating
    if (![1, 2, 3, 4].includes(rating)) {
      throw new Error(`Rating inválido: ${rating}. Deve ser 1-4.`);
    }

    // Mapear rating para enum do ts-fsrs (valores do enum são 1,2,3,4)
    const fsrsRating = rating;

    // Criar ou adaptar card para o formato ts-fsrs
    let card;
    if (currentState && currentState.last_review) {
      // Card existente - converter do nosso formato para ts-fsrs
      const lastReviewDate = new Date(currentState.last_review);
      const elapsed_days = Math.max(0, Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      card = {
        due: lastReviewDate,
        stability: currentState.stability || 0,
        difficulty: currentState.difficulty || 5.0,
        elapsed_days: elapsed_days,
        scheduled_days: Math.round(currentState.stability || 0),
        reps: currentState.reps || 0,
        lapses: currentState.lapses || 0,
        state: currentState.reps === 0 ? State.New : (currentState.lapses > 0 ? State.Relearning : State.Review),
        last_review: lastReviewDate
      };
    } else {
      // Card novo
      card = createEmptyCard(now);
    }

    // Aplicar FSRS - retorna um objeto RecordLog
    const schedulingCards = this.fsrs.repeat(card, new Date(now));
    
    // Obter o card correspondente ao rating (os valores do enum são 1,2,3,4)
    const recordLog = schedulingCards[fsrsRating];

    const nextCard = recordLog.card;
    const reviewLog = recordLog.log;

    // Calcular próxima data de revisão
    const nextDue = new Date(nextCard.due);

    // Calcular intervalo em dias
    const intervalDays = Math.max(1, Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    console.log('Value of now before toISOString:', now);

    return {
      card: {
        difficulty: parseFloat(nextCard.difficulty.toFixed(4)),
        stability: parseFloat(nextCard.stability.toFixed(4)),
        reps: nextCard.reps,
        lapses: nextCard.lapses,
        last_review: now.toISOString(),
        state: nextCard.state
      },
      next_due_date: nextDue.toISOString(),
      next_interval_days: intervalDays,
      review_log: {
        rating: reviewLog.rating,
        state: reviewLog.state,
        due: reviewLog.due,
        stability: reviewLog.stability,
        difficulty: reviewLog.difficulty,
        elapsed_days: reviewLog.elapsed_days,
        last_elapsed_days: reviewLog.last_elapsed_days,
        scheduled_days: reviewLog.scheduled_days,
        review: reviewLog.review
      }
    };
  }

  /**
   * Verifica se o card está devido hoje
   */
  isDue(stability, last_review, today = new Date()) {
    if (!last_review || stability <= 0) return true;
    const last = new Date(last_review);
    const due = new Date(last);
    due.setDate(last.getDate() + Math.round(stability));
    return today >= due;
  }

  /**
   * Obtém preview dos 4 possíveis resultados (Again, Hard, Good, Easy)
   * Útil para mostrar ao utilizador quanto tempo até próxima revisão
   */
  getSchedulingCards(currentState, now = new Date()) {
    let card;
    if (currentState && currentState.last_review) {
      const lastReviewDate = new Date(currentState.last_review);
      const elapsed_days = Math.max(0, Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      card = {
        due: lastReviewDate,
        stability: currentState.stability || 0,
        difficulty: currentState.difficulty || 5.0,
        elapsed_days: elapsed_days,
        scheduled_days: Math.round(currentState.stability || 0),
        reps: currentState.reps || 0,
        lapses: currentState.lapses || 0,
        state: currentState.reps === 0 ? State.New : (currentState.lapses > 0 ? State.Relearning : State.Review),
        last_review: lastReviewDate
      };
    } else {
      card = createEmptyCard(now);
    }

    const schedulingCards = this.fsrs.repeat(card, now);

    return {
      again: this.formatSchedulingCard(schedulingCards[1], now),
      hard: this.formatSchedulingCard(schedulingCards[2], now),
      good: this.formatSchedulingCard(schedulingCards[3], now),
      easy: this.formatSchedulingCard(schedulingCards[4], now)
    };
  }

  formatSchedulingCard(recordLog, now) {
    const nextDue = new Date(recordLog.card.due);
    const intervalDays = Math.max(1, Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      interval_days: intervalDays,
      due: nextDue.toISOString(),
      stability: parseFloat(recordLog.card.stability.toFixed(4)),
      difficulty: parseFloat(recordLog.card.difficulty.toFixed(4))
    };
  }
}

module.exports = {
  MemoriaScheduler,
  DEFAULT_PARAMS
};
