const db = require('./db');

const getClasses = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM classes WHERE ativo = true');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createClass = async (req, res) => {
    const { codigo, nome, ciclo_id, ano_letivo, diretor_turma_id } = req.body;
    if (!codigo || !nome || !ciclo_id || !ano_letivo) {
        return res.status(400).json({ error: 'codigo, nome, ciclo_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO classes (codigo, nome, ciclo_id, ano_letivo, diretor_turma_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [codigo, nome, ciclo_id, ano_letivo, diretor_turma_id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Código ou nome da turma já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateClass = async (req, res) => {
    const { id } = req.params;
    const { codigo, nome, ciclo_id, ano_letivo, diretor_turma_id, ativo } = req.body;
    if (!codigo || !nome || !ciclo_id || !ano_letivo) {
        return res.status(400).json({ error: 'codigo, nome, ciclo_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE classes SET codigo = $1, nome = $2, ciclo_id = $3, ano_letivo = $4, diretor_turma_id = $5, ativo = $6 WHERE id = $7 RETURNING *',
            [codigo, nome, ciclo_id, ano_letivo, diretor_turma_id, ativo, id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Class not found' });
        }
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Código ou nome da turma já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteClass = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM classes WHERE id = $1', [id]);
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Class not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStudentsByClass = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query(
            `SELECT u.id, u.nome, u.tipo_utilizador
             FROM users u
             JOIN aluno_turma at ON u.id = at.aluno_id
             WHERE at.turma_id = $1 AND u.ativo = true AND at.ativo = true AND u.tipo_utilizador = 'ALUNO'
             ORDER BY u.nome`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching students for class:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getClasses,
    createClass,
    updateClass,
    deleteClass,
    getStudentsByClass,
};
