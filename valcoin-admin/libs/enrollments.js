const db = require('./db');

// Get all active enrollments
const getEnrollments = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM aluno_disciplina WHERE ativo = true');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching enrollments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get enrollment by ID
const getEnrollmentById = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM aluno_disciplina WHERE id = $1', [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Enrollment not found' });
        }
    } catch (err) {
        console.error('Error fetching enrollment by ID:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create or reactivate an enrollment
const createEnrollment = async (req, res) => {
    const { aluno_id, disciplina_turma_id } = req.body;
    if (!aluno_id || !disciplina_turma_id) {
        return res.status(400).json({ error: 'aluno_id and disciplina_turma_id are required' });
    }

    try {
        // Check for existing enrollment (active or inactive)
        const { rows: existing } = await db.query(
            'SELECT * FROM aluno_disciplina WHERE aluno_id = $1 AND disciplina_turma_id = $2',
            [aluno_id, disciplina_turma_id]
        );

        if (existing.length > 0) {
            const enrollment = existing[0];
            if (enrollment.ativo) {
                return res.status(400).json({ error: 'Aluno já está inscrito nesta disciplina-turma' });
            }
            // Reactivate existing inactive enrollment
            const { rows: updated } = await db.query(
                'UPDATE aluno_disciplina SET ativo = true, data_atualizacao = now() WHERE id = $1 RETURNING *',
                [enrollment.id]
            );
            return res.status(200).json(updated[0]);
        }

        // Insert new enrollment if none exists
        const { rows } = await db.query(
            'INSERT INTO aluno_disciplina (aluno_id, disciplina_turma_id, ativo, data_criacao) VALUES ($1, $2, true, now()) RETURNING *',
            [aluno_id, disciplina_turma_id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating/reactivating enrollment:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Aluno já está inscrito nesta disciplina-turma' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an existing enrollment
const updateEnrollment = async (req, res) => {
    const { id } = req.params;
    const { aluno_id, disciplina_turma_id, ativo } = req.body;
    if (!aluno_id || !disciplina_turma_id) {
        return res.status(400).json({ error: 'aluno_id and disciplina_turma_id are required' });
    }

    try {
        // Check for duplicate if aluno_id or disciplina_turma_id is being changed
        const { rows: existing } = await db.query(
            'SELECT 1 FROM aluno_disciplina WHERE aluno_id = $1 AND disciplina_turma_id = $2 AND ativo = true AND id != $3',
            [aluno_id, disciplina_turma_id, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Aluno já está inscrito nesta disciplina-turma' });
        }

        const { rows } = await db.query(
            'UPDATE aluno_disciplina SET aluno_id = $1, disciplina_turma_id = $2, ativo = $3, data_atualizacao = now() WHERE id = $4 RETURNING *',
            [aluno_id, disciplina_turma_id, ativo !== undefined ? ativo : true, id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Enrollment not found' });
        }
    } catch (err) {
        console.error('Error updating enrollment:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Aluno já está inscrito nesta disciplina-turma' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Soft delete an enrollment
const deleteEnrollment = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query(
            'UPDATE aluno_disciplina SET ativo = false, data_atualizacao = now() WHERE id = $1 AND ativo = true',
            [id]
        );
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Enrollment not found or already inactive' });
        }
    } catch (err) {
        console.error('Error deleting enrollment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getEnrollments,
    getEnrollmentById,
    createEnrollment,
    updateEnrollment,
    deleteEnrollment
};
