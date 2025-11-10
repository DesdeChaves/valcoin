const connectRedisPromise = require('./redis'); // Changed import

const USERS_CACHE_KEY = 'users:all';
const ADMIN_DASHBOARD_CACHE_KEY = 'dashboard:admin';

const clearCache = async (key) => {
    try {
        const redis = await connectRedisPromise; // Await the promise
        await redis.del(key);
        console.log(`[CACHE CLEARED] Key: ${key}`);
    } catch (err) {
        console.error(`[CACHE DEL ERROR] Key: ${key}`, err);
    }
};

const invalidateCachesForTransaction = async (senderId, receiverId) => {
    console.log(`Invalidating caches for transaction between sender ${senderId} and receiver ${receiverId}`);

    const keysToClear = [
        USERS_CACHE_KEY,
        ADMIN_DASHBOARD_CACHE_KEY,
    ];

    if (senderId) {
        keysToClear.push(`professor-dashboard:${senderId}`);
        keysToClear.push(`student-dashboard:${senderId}`);
    }

    if (receiverId) {
        keysToClear.push(`professor-dashboard:${receiverId}`);
        keysToClear.push(`student-dashboard:${receiverId}`);
    }

    for (const key of keysToClear) {
        await clearCache(key);
    }
};

module.exports = {
    invalidateCachesForTransaction,
    clearCache,
};