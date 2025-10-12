const db = require('./db');

// Get all active professor assignments
const getProfessorDisciplinaTurma = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM professor_disciplina_turma WHERE ativo = true');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching professor assignments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Create or reactivate a professor assignment
const createProfessorDisciplinaTurma = async (req, res) => {
    const { professor_id, disciplina_id, turma_id } = req.body;
    if (!professor_id || !disciplina_id || !turma_id) {
        return res.status(400).json({ error: 'professor_id, disciplina_id, and turma_id are required' });
    }

    try {
        // Get ano_letivo from the class
        const { rows: classRows } = await db.query('SELECT ano_letivo FROM classes WHERE id = $1', [turma_id]);
        if (classRows.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }
        const ano_letivo = classRows[0].ano_letivo;

        // Find or create disciplina_turma_id
        const { rows: dtRows } = await db.query(
            'SELECT id FROM disciplina_turma WHERE disciplina_id = $1 AND turma_id = $2 AND ano_letivo = $3',
            [disciplina_id, turma_id, ano_letivo]
        );
        
        let disciplina_turma_id;
        if (dtRows.length > 0) {
            disciplina_turma_id = dtRows[0].id;
        } else {
            const { rows: newDtRows } = await db.query(
                'INSERT INTO disciplina_turma (disciplina_id, turma_id, ano_letivo) VALUES ($1, $2, $3) RETURNING id',
                [disciplina_id, turma_id, ano_letivo]
            );
            disciplina_turma_id = newDtRows[0].id;
        }

        // Check for existing assignment (active or inactive)
        const { rows: existing } = await db.query(
            'SELECT * FROM professor_disciplina_turma WHERE professor_id = $1 AND disciplina_turma_id = $2',
            [professor_id, disciplina_turma_id]
        );

        if (existing.length > 0) {
            const assignment = existing[0];
            if (assignment.ativo) {
                return res.status(400).json({ error: 'Professor já está atribuído a esta disciplina e turma' });
            }
            // Reactivate existing inactive assignment
            const { rows: updated } = await db.query(
                'UPDATE professor_disciplina_turma SET ativo = true, data_atualizacao = now() WHERE id = $1 RETURNING *',
                [assignment.id]
            );
            return res.status(200).json(updated[0]);
        }

        // Insert new assignment if none exists
        const { rows } = await db.query(
            'INSERT INTO professor_disciplina_turma (professor_id, disciplina_turma_id, ativo, data_criacao) VALUES ($1, $2, true, now()) RETURNING *',
            [professor_id, disciplina_turma_id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating/reactivating professor assignment:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Professor já está atribuído a esta disciplina e turma' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Soft delete a professor assignment
const deleteProfessorDisciplinaTurma = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query(
            'UPDATE professor_disciplina_turma SET ativo = false, data_atualizacao = now() WHERE id = $1 AND ativo = true',
            [id]
        );
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Assignment not found or already inactive' });
        }
    } catch (err) {
        console.error('Error deleting professor assignment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getProfessorDisciplinaTurma,
    createProfessorDisciplinaTurma,
    deleteProfessorDisciplinaTurma
};
