const db = require('./db');

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
        res.json(settings);
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSettings,
    updateSettings
};