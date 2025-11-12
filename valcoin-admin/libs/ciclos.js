const db = require('./db');

const getAllCiclos = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM ciclos_ensino ORDER BY nome');
        res.json(rows);
    } catch (err) {
        console.error('Error getting all ciclos:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCicloById = async (id) => {
    const { rows } = await db.query('SELECT * FROM ciclos_ensino WHERE id = $1', [id]);
    return rows[0];
};

const createCiclo = async (req, res) => {
    const { nome, ativo } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO ciclos_ensino (nome, ativo) VALUES ($1, $2) RETURNING *',
            [nome, ativo]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating ciclo:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateCiclo = async (req, res) => {
    const { id } = req.params;
    const { nome, ativo } = req.body;
    try {
        const { rows } = await db.query(
            'UPDATE ciclos_ensino SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *',
            [nome, ativo, id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating ciclo:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteCiclo = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('DELETE FROM ciclos_ensino WHERE id = $1 RETURNING *', [id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error deleting ciclo:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllCiclos,
    getCicloById,
    createCiclo,
    updateCiclo,
    deleteCiclo,
};
