// temp_clear_cache.js
const { connect, redisClient } = require('./valcoin-admin/libs/redis.js');
const { DASHBOARD_CACHE_KEY } = require('./valcoin-admin/libs/qualidade/equavet_helpers.js');

async function clearCache() {
  try {
    console.log('Connecting to Redis...');
    await connect();
    console.log(`Attempting to delete cache key: ${DASHBOARD_CACHE_KEY}`);
    const result = await redisClient.del(DASHBOARD_CACHE_KEY);
    if (result > 0) {
      console.log(`Successfully deleted cache key: ${DASHBOARD_CACHE_KEY}`);
    } else {
      console.log(`Cache key ${DASHBOARD_CACHE_KEY} not found. No action needed.`);
    }
  } catch (err) {
    console.error('An error occurred while clearing the cache:', err);
  } finally {
    if (redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis connection closed.');
    }
  }
}

clearCache();
