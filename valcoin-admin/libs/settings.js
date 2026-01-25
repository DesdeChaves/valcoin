const db = require('./db');
const { redisClient } = require('./redis');
const { SENDGRID_API_KEY_CACHE_KEY, ENVIAR_EMAILS_REAIS_CACHE_KEY } = require('./email');

const QUIZ_QUESTION_TIME_CACHE_KEY = 'quiz_question_time_seconds';

const getSettings = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSettings = async (req, res) => {
    const settings = req.body;
    console.log('Updating settings:', settings);
    try {
        await db.query('BEGIN');
        for (const key in settings) {
            await db.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, JSON.stringify(settings[key])]);
        }
        await db.query('COMMIT');
        
        // Invalidate Redis cache for settings
        try {
            await redisClient.del(SENDGRID_API_KEY_CACHE_KEY);
            await redisClient.del(ENVIAR_EMAILS_REAIS_CACHE_KEY);
            await redisClient.del(QUIZ_QUESTION_TIME_CACHE_KEY);
            console.log('Redis cache for settings invalidated.');
        } catch (redisErr) {
            console.error('Error invalidating Redis cache for settings:', redisErr);
        }

        res.json(settings);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAllowExternalRegistrationSettingPublic = async (req, res) => {
    try {
        const { rows } = await db.query("SELECT value FROM settings WHERE key = 'allow_external_registration'");
        const isAllowed = rows.length > 0 ? (rows[0].value === true || rows[0].value === 'true') : false;
        res.json({ allow_external_registration: isAllowed });
    } catch (err) {
        console.error('Error fetching public external registration setting:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getQuizQuestionTimePublic = async (req, res) => {
    try {
        // Try to get from cache first
        const cachedTime = await redisClient.get(QUIZ_QUESTION_TIME_CACHE_KEY);
        if (cachedTime) {
            return res.json({ time: parseInt(cachedTime, 10) });
        }

        // If not in cache, get from DB
        const { rows } = await db.query("SELECT value FROM settings WHERE key = 'quiz_question_time_seconds'");
        
        // Default to 5 seconds if not set
        const time = rows.length > 0 ? parseInt(JSON.parse(rows[0].value), 10) : 5;

        // Store in cache for next time (e.g., for 1 hour)
        await redisClient.set(QUIZ_QUESTION_TIME_CACHE_KEY, time, 'EX', 3600);

        res.json({ time });
    } catch (err) {
        console.error('Error fetching quiz question time setting:', err);
        // Fallback to default value in case of error
        res.status(500).json({ time: 5 });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    getAllowExternalRegistrationSettingPublic,
    getQuizQuestionTimePublic,
};