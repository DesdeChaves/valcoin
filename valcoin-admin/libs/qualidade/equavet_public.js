// valcoin-admin/libs/qualidade/equavet_public.js
const express = require('express');
const { redisClient, connect } = require('../redis');
const { refreshDashboardCache, DASHBOARD_CACHE_KEY } = require('./equavet_helpers');

module.exports = () => {
    const router = express.Router();

    /**
     * Serves the public EQAVET dashboard data from cache.
     * If the cache is empty, it triggers a refresh.
     */
    router.get('/dashboard', async (req, res) => {
        try {
            const client = await connect();
            let cachedData = await client.get(DASHBOARD_CACHE_KEY);

            if (cachedData) {
                console.log('Serving EQAVET dashboard from cache.');
                res.setHeader('Content-Type', 'application/json');
                res.send(cachedData); // Send raw string to avoid re-parsing
            } else {
                console.log('EQAVET dashboard cache empty. Triggering refresh.');
                const freshData = await refreshDashboardCache();
                res.json(freshData || []);
            }
        } catch (err) {
            console.error('Error serving public EQAVET dashboard:', err);
            res.status(500).json({ error: 'Could not retrieve dashboard data.' });
        }
    });

    return router;
};
