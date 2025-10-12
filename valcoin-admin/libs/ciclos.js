const db = require('./db');

const getAllCiclos = async () => {
    const { rows } = await db.query('SELECT * FROM ciclos_ensino ORDER BY nome');
    return rows;
};

const getCicloById = async (id) => {
    const { rows } = await db.query('SELECT * FROM ciclos_ensino WHERE id = $1', [id]);
    return rows[0];
};

const createCiclo = async ({ nome, ativo }) => {
    const { rows } = await db.query(
        'INSERT INTO ciclos_ensino (nome, ativo) VALUES ($1, $2) RETURNING *',
        [nome, ativo]
    );
    return rows[0];
};

const updateCiclo = async (id, { nome, ativo }) => {
    const { rows } = await db.query(
        'UPDATE ciclos_ensino SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *',
        [nome, ativo, id]
    );
    return rows[0];
};

const deleteCiclo = async (id) => {
    const { rows } = await db.query('DELETE FROM ciclos_ensino WHERE id = $1 RETURNING *', [id]);
    return rows[0];
};

module.exports = {
    getAllCiclos,
    getCicloById,
    createCiclo,
    updateCiclo,
    deleteCiclo,
};