const { redisClient } = require('../redis');

const REDIS_KEY_PREFIX = 'flashcard_stats';

async function setFlashcardStats(userId, periodId, stats) {
    const key = `${REDIS_KEY_PREFIX}:${userId}:${periodId}`;
    await redisClient.set(key, JSON.stringify(stats));
    console.log(`[Redis] Stored flashcard stats for user ${userId}, period ${periodId}`);
}

async function getFlashcardStats(userId, periodId) {
    const key = `${REDIS_KEY_PREFIX}:${userId}:${periodId}`;
    const data = await redisClient.get(key);
    if (data) {
        console.log(`[Redis] Retrieved flashcard stats for user ${userId}, period ${periodId}`);
        return JSON.parse(data);
    }
    console.log(`[Redis] No flashcard stats found for user ${userId}, period ${periodId}`);
    return null;
}

module.exports = {
    setFlashcardStats,
    getFlashcardStats,
};
