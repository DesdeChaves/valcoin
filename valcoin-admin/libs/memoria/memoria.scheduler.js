// libs/memoria/memoria.scheduler.js
// Versão compatível com CommonJS (require) e Node.js
const { FSRS, Rating, State, createEmptyCard, generatorParameters } = require('ts-fsrs');
/**
 * Parâmetros FSRS recomendados (2025)
 */
const DEFAULT_PARAMS = {
  request_retention: 0.85, // 85% de retenção desejada
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
   * @param {Object|null} currentState - Estado atual ou null para novo
   * @param {Date} now - Data da revisão
   * @param {number} rating - 1=Again, 2=Hard, 3=Good, 4=Easy
   * @returns {Object}
   */
  next(currentState = null, now = new Date(), rating) {
    if (![1, 2, 3, 4].includes(rating)) {
      throw new Error(`Rating inválido: ${rating}. Deve ser 1-4.`);
    }
    let card;
    if (currentState && currentState.last_review && currentState.reps > 0) {
      // Card já revisado anteriormente
      const lastReviewDate = new Date(currentState.last_review);
     
      // Validar data
      if (isNaN(lastReviewDate.getTime())) {
        throw new Error(`Data de revisão inválida: ${currentState.last_review}`);
      }
      const elapsed_days = Math.max(0, Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const stability = parseFloat(currentState.stability);
      const difficulty = parseFloat(currentState.difficulty);

      card = {
        due: lastReviewDate,
        stability: !isNaN(stability) && stability >= 0 ? stability : 0,
        difficulty: !isNaN(difficulty) && difficulty > 0 && difficulty <= 10 ? difficulty : 5.0,
        elapsed_days,
        scheduled_days: Math.round(!isNaN(stability) && stability >= 0 ? stability : 0),
        reps: currentState.reps || 0,
        lapses: currentState.lapses || 0,
        state: currentState.lapses > 0 ? State.Relearning : State.Review,
        last_review: lastReviewDate
      };
    } else {
      // Card novo (primeira revisão)
      card = createEmptyCard(now);
    }
    // Validar card antes do FSRS
    if (!card.due || isNaN(new Date(card.due).getTime())) {
      throw new Error(`Card com data 'due' inválida: ${JSON.stringify(card)}`);
    }
    // Aplicar FSRS - funciona para novos e antigos
    const schedulingCards = this.fsrs.repeat(card, now);
    // FSRS pode retornar objeto com chaves "0","1","2","3" (strings) ou {1,2,3,4}
    // Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
    // Precisamos mapear para índice base-0
    const ratingIndex = rating - 1; // Converte 1-4 para 0-3
   
    // Tentar acessar por índice numérico (0-3) e por string
    let recordLog = schedulingCards[ratingIndex]
                 || schedulingCards[ratingIndex.toString()];
    if (!recordLog) {
      const keys = Object.keys(schedulingCards);
      throw new Error(
        `Estado para rating ${rating} (índice ${ratingIndex}) não encontrado. ` +
        `SchedulingCards keys: ${JSON.stringify(keys)}. ` +
        `Tentei acessar: [${ratingIndex}], ["${ratingIndex}"]`
      );
    }
    const nextCard = recordLog.card;
    const reviewLog = recordLog.log;
    // Validações defensivas dos resultados do FSRS
    if (!nextCard) {
      throw new Error(`FSRS retornou card undefined para rating ${rating}`);
    }
    if (!nextCard.due) {
      throw new Error(`FSRS retornou card.due undefined. Card: ${JSON.stringify(nextCard)}`);
    }
    if (!reviewLog) {
      throw new Error(`FSRS retornou reviewLog undefined para rating ${rating}`);
    }
    const nextDue = new Date(nextCard.due);
   
    // Validar data resultante
    if (isNaN(nextDue.getTime())) {
      throw new Error(`Data 'due' inválida retornada pelo FSRS: ${nextCard.due}`);
    }
    const intervalDays = Math.max(1, Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const nextDifficulty = Number(nextCard.difficulty || 5.0);
    const nextStability = Number(nextCard.stability || 0);
    const finalDifficulty = isNaN(nextDifficulty) ? 5.0 : nextDifficulty;
    const finalStability = isNaN(nextStability) ? 0 : nextStability;
    const finalReviewLogStability = Number(reviewLog.stability || 0);
    const finalReviewLogDifficulty = Number(reviewLog.difficulty || 5.0);
    const finalReviewLogStabilityFixed = isNaN(finalReviewLogStability) ? 0 : finalReviewLogStability;
    const finalReviewLogDifficultyFixed = isNaN(finalReviewLogDifficulty) ? 5.0 : finalReviewLogDifficulty;
    return {
      card: {
        difficulty: finalDifficulty,
        stability: finalStability,
        reps: nextCard.reps || 0,
        lapses: nextCard.lapses || 0,
        last_review: now.toISOString(),
        state: nextCard.state ?? State.New
      },
      next_due_date: nextDue.toISOString(),
      next_interval_days: intervalDays,
      review_log: {
        rating: reviewLog.rating,
        state: reviewLog.state,
        due: reviewLog.due ? new Date(reviewLog.due).toISOString() : now.toISOString(),
        stability: finalReviewLogStabilityFixed,
        difficulty: finalReviewLogDifficultyFixed,
        elapsed_days: reviewLog.elapsed_days || 0,
        last_elapsed_days: reviewLog.last_elapsed_days || 0,
        scheduled_days: reviewLog.scheduled_days || 0,
        review: reviewLog.review ? new Date(reviewLog.review).toISOString() : now.toISOString()
      }
    };
  }
  /**
   * Verifica se o card está devido hoje
   */
  isDue(stability, last_review, today = new Date()) {
    if (!last_review || stability <= 0) return true;
    const last = new Date(last_review);
    if (isNaN(last.getTime())) return true;
   
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
     
      if (isNaN(lastReviewDate.getTime())) {
        throw new Error(`Data de revisão inválida em getSchedulingCards: ${currentState.last_review}`);
      }
      const elapsed_days = Math.max(0, Math.floor((now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)));
     
      const stability = parseFloat(currentState.stability);
      const difficulty = parseFloat(currentState.difficulty);

      card = {
        due: lastReviewDate,
        stability: !isNaN(stability) && stability >= 0 ? stability : 0,
        difficulty: !isNaN(difficulty) && difficulty > 0 && difficulty <= 10 ? difficulty : 5.0,
        elapsed_days: elapsed_days,
        scheduled_days: Math.round(!isNaN(stability) && stability >= 0 ? stability : 0),
        reps: currentState.reps || 0,
        lapses: currentState.lapses || 0,
        state: currentState.reps === 0 ? State.New : (currentState.lapses > 0 ? State.Relearning : State.Review),
        last_review: lastReviewDate
      };
    } else {
      card = createEmptyCard(now);
    }
    const schedulingCards = this.fsrs.repeat(card, now);
    // Função auxiliar para acessar scheduling cards (base-0 a 3 para ratings 1-4)
    const getSchedulingCard = (rating) => {
      const idx = rating - 1;
      return schedulingCards[idx]
          || schedulingCards[idx.toString()];
    };
    return {
      again: this.formatSchedulingCard(getSchedulingCard(1), now),
      hard: this.formatSchedulingCard(getSchedulingCard(2), now),
      good: this.formatSchedulingCard(getSchedulingCard(3), now),
      easy: this.formatSchedulingCard(getSchedulingCard(4), now)
    };
  }
  formatSchedulingCard(recordLog, now) {
    if (!recordLog || !recordLog.card) {
      throw new Error('RecordLog ou card inválido em formatSchedulingCard');
    }
    const nextDue = recordLog.card.due ? new Date(recordLog.card.due) : new Date(now.getTime() + 86400000);
   
    if (isNaN(nextDue.getTime())) {
      throw new Error(`Data 'due' inválida em formatSchedulingCard: ${recordLog.card.due}`);
    }
    const intervalDays = Math.max(1, Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
   
    const nextStability = Number(recordLog.card.stability || 0);
    const nextDifficulty = Number(recordLog.card.difficulty || 5.0);
    return {
      interval_days: intervalDays,
      due: nextDue.toISOString(),
      stability: isNaN(nextStability) ? 0 : nextStability,
      difficulty: isNaN(nextDifficulty) ? 5.0 : nextDifficulty
    };
  }
}
module.exports = {
  MemoriaScheduler,
  DEFAULT_PARAMS
};
