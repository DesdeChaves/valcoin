const express = require('express');
const router = express.Router();
const { redisClient } = require('./redis.js');

router.post('/cache/clear', async (req, res) => {
    const { key } = req.body;
    if (!key) {
        return res.status(400).json({ error: 'Key is required' });
    }
    try {
        await redisClient.del(key);
        res.json({ message: `Cache cleared for key: ${key}` });
    } catch (err) {
        console.error(`[CACHE DEL ERROR] Key: ${key}` , err);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

module.exports = router;