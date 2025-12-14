// libs/memoria/memoria.scheduler.js
/// npm install @open-spaced-repetition/fsrs-browser

const { Scheduler, Rating, Card, RecordLogItem } = require('@open-spaced-repetition/fsrs-browser');

/**
 * Parâmetros FSRS default (os mais recentes e otimizados de 2025)
 * Baseados em estudos com milhões de revisões reais do Anki
 */
const DEFAULT_PARAMS = {
  // Retention desejada (90% é o padrão recomendado)
  request_retention: 0.9,

  // Tamanho máximo do intervalo (em dias)
  maximum_interval: 36500,

  // Pesos do modelo (otimizados em 2024/2025)
  w: [
    0.4197, 1.1869, 4.1905, 1.0841, 3.167, 
    0.0835, 1.6244, 0.1358, 1.0328, 2.0058, 
    0.0831, 0.3559, 1.0185, 0.1069, 1.1981, 
    0.1342, 2.3059, 0.0, 0.0
  ],

  // Decaimento e fator de dificuldade
  decay: -0.5,
  factor: 0.9
};

/**
 * Cria um scheduler FSRS com parâmetros personalizados ou default
 */
class MemoriaScheduler {
  constructor(customParams = {}) {
    this.params = { ...DEFAULT_PARAMS, ...customParams };
    this.scheduler = new Scheduler();
    this.scheduler.setParams(this.params);
  }

  /**
   * Calcula o próximo estado de um card com base na revisão atual
   * @param {Object} currentCard - Estado atual do card (pode ser null para novo)
   * @param {Date} now - Data atual da revisão
   * @param {number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
   * @returns {Object} Novo estado + data de próxima revisão
   */
  next(currentCard, now = new Date(), rating) {
    const fsrsRating = this._mapRating(rating);

    // Criar objeto Card do FSRS
    const card = new Card();
    if (currentCard) {
      card.difficulty = currentCard.difficulty || undefined;
      card.stability = currentCard.stability || undefined;
      card.reps = currentCard.reps || 0;
      card.lapses = currentCard.lapses || 0;
      card.last_review = currentCard.last_review ? new Date(currentCard.last_review) : undefined;
    }

    // Calcular próximo estado
    const schedulingCards = this.scheduler.next(card, now, fsrsRating);

    // Escolher o card correspondente ao rating dado
    const nextCard = schedulingCards.get(fsrsRating);

    // Calcular data de próxima revisão
    const nextDueDate = new Date(now);
    nextDueDate.setDate(now.getDate() + Math.round(nextCard.card.stability));

    return {
      card: {
        difficulty: parseFloat(nextCard.card.difficulty.toFixed(4)),
        stability: parseFloat(nextCard.card.stability.toFixed(4)),
        reps: nextCard.card.reps,
        lapses: nextCard.card.lapses,
        last_review: now.toISOString()
      },
      review_log: {
        rating: rating,
        elapsed_days: nextCard.log.elapsed_days,
        scheduled_days: nextCard.log.scheduled_days
      },
      next_due_date: nextDueDate.toISOString(),
      next_interval_days: Math.round(nextCard.card.stability)
    };
  }

  /**
   * Calcula se um card está devido para revisão hoje
   * @param {number} stability - Estabilidade atual (dias)
   * @param {Date|string} last_review - Última revisão
   * @param {Date} today - Data de referência (default: hoje)
   * @returns {boolean}
   */
  isDue(stability, last_review, today = new Date()) {
    if (!last_review || !stability) return true; // novo card = sempre devido

    const last = new Date(last_review);
    const due = new Date(last);
    due.setDate(last.getDate() + Math.round(stability));

    return today >= due;
  }

  /**
   * Mapeia rating do teu sistema (1-4) para Rating do FSRS
   */
  _mapRating(rating) {
    const map = {
      1: Rating.Again,
      2: Rating.Hard,
      3: Rating.Good,
      4: Rating.Easy
    };
    return map[rating] || Rating.Good;
  }
}

module.exports = {
  MemoriaScheduler,
  DEFAULT_PARAMS,
  Rating // export para uso externo se necessário
};
