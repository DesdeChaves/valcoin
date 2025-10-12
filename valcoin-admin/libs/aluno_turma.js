const db = require('./db');

const getAlunoTurma = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM aluno_turma WHERE ativo = true');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAlunoTurmaById = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM aluno_turma WHERE id = $1', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Enrollment not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createAlunoTurma = async (req, res) => {
    const { aluno_id, turma_id, ano_letivo } = req.body;
    if (!aluno_id || !turma_id || !ano_letivo) {
        return res.status(400).json({ error: 'aluno_id, turma_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo) VALUES ($1, $2, $3) RETURNING *',
            [aluno_id, turma_id, ano_letivo]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Aluno já está inscrito nesta turma' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateAlunoTurma = async (req, res) => {
    const { id } = req.params;
    const { aluno_id, turma_id, ano_letivo, ativo } = req.body;
    if (!aluno_id || !turma_id || !ano_letivo) {
        return res.status(400).json({ error: 'aluno_id, turma_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE aluno_turma SET aluno_id = $1, turma_id = $2, ano_letivo = $3, ativo = $4 WHERE id = $5 RETURNING *',
            [aluno_id, turma_id, ano_letivo, ativo, id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Enrollment not found' });
        }
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Aluno já está inscrito nesta turma' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteAlunoTurma = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('UPDATE aluno_turma SET ativo = false WHERE id = $1', [id]);
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Enrollment not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAlunoTurma,
    getAlunoTurmaById,
    createAlunoTurma,
    updateAlunoTurma,
    deleteAlunoTurma
};