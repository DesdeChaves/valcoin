const db = require('./db');
const { clearAdminDashboardCache } = require('./dashboard');

const getSchoolRevenues = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM school_revenues');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createSchoolRevenue = async (req, res) => {
    const { origem, montante, data } = req.body;
    if (!origem || !montante || !data) {
        return res.status(400).json({ error: 'origem, montante, and data are required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO school_revenues (origem, montante, data) VALUES ($1, $2, $3) RETURNING *',
            [origem, montante, data]
        );
        await clearAdminDashboardCache();
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSchoolRevenue = async (req, res) => {
    const { id } = req.params;
    const { origem, montante, data } = req.body;
    if (!origem || !montante || !data) {
        return res.status(400).json({ error: 'origem, montante, and data are required' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE school_revenues SET origem = $1, montante = $2, data = $3 WHERE id = $4 RETURNING *',
            [origem, montante, data, id]
        );
        if (rows.length > 0) {
            await clearAdminDashboardCache();
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Revenue not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteSchoolRevenue = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM school_revenues WHERE id = $1', [id]);
        if (rowCount > 0) {
            await clearAdminDashboardCache();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Revenue not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSchoolRevenues,
    createSchoolRevenue,
    updateSchoolRevenue,
    deleteSchoolRevenue
};