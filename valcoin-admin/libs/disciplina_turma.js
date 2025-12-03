const db = require('./db');

const getDisciplinaTurma = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM disciplina_turma WHERE ativo = true');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching disciplina_turma:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getProfessorDisciplinaTurma = async (req, res) => {
    try {
        // O ID do professor vem dos parâmetros da rota
        const { professorId } = req.params;

        if (!professorId) {
            return res.status(400).json({ error: 'O ID do professor é obrigatório.' });
        }

        // Query para buscar as disciplinas do professor
        const query = `
            SELECT 
                dt.id, 
                d.nome AS disciplina_nome, 
                c.nome AS turma_nome,
                dt.ano_letivo,
                dt.turma_id,
                dt.disciplina_id
            FROM 
                disciplina_turma dt
            JOIN 
                subjects d ON dt.disciplina_id = d.id
            JOIN 
                classes c ON dt.turma_id = c.id
            WHERE 
                dt.professor_id = $1 AND dt.ativo = true
            ORDER BY
                d.nome, c.nome;
        `;

        const { rows } = await db.query(query, [professorId]);
        
        res.json(rows);

    } catch (err) {
        console.error('Erro ao buscar disciplinas do professor:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


const createDisciplinaTurma = async (req, res) => {
    const { disciplina_id, turma_id, professor_id } = req.body;
    if (!disciplina_id || !turma_id || !professor_id) {
        return res.status(400).json({ error: 'disciplina_id, turma_id, and professor_id are required' });
    }

    try {
        // Get ano_letivo from the class
        const { rows: classRows } = await db.query('SELECT ano_letivo FROM classes WHERE id = $1', [turma_id]);
        if (classRows.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }
        const ano_letivo = classRows[0].ano_letivo;

        // Check if professor exists
        const { rows: profRows } = await db.query('SELECT 1 FROM users WHERE id = $1 AND tipo_utilizador = $2', [professor_id, 'PROFESSOR']);
        if (profRows.length === 0) {
            return res.status(404).json({ error: 'Professor not found' });
        }

        const { rows } = await db.query(
            'INSERT INTO disciplina_turma (disciplina_id, turma_id, ano_letivo, professor_id) VALUES ($1, $2, $3, $4) ON CONFLICT (disciplina_id, turma_id, ano_letivo) DO NOTHING RETURNING *',
            [disciplina_id, turma_id, ano_letivo, professor_id]
        );

        if (rows.length > 0) {
            res.status(201).json(rows[0]);
        } else {
            // If it already existed, fetch it and return it
            const { rows: existingRows } = await db.query(
                'SELECT * FROM disciplina_turma WHERE disciplina_id = $1 AND turma_id = $2 AND ano_letivo = $3',
                [disciplina_id, turma_id, ano_letivo]
            );
            res.status(200).json(existingRows[0]);
        }
    } catch (err) {
        console.error('Error creating disciplina_turma:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Disciplina-turma already exists for this academic year' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateDisciplinaTurma = async (req, res) => {
    const { id } = req.params;
    const { professor_id, ativo } = req.body;

    try {
        // Check if professor exists
        if (professor_id) {
            const { rows: profRows } = await db.query('SELECT 1 FROM users WHERE id = $1 AND tipo_utilizador = $2', [professor_id, 'PROFESSOR']);
            if (profRows.length === 0) {
                return res.status(404).json({ error: 'Professor not found' });
            }
        }

        const { rows } = await db.query(
            'UPDATE disciplina_turma SET professor_id = $1, ativo = $2, data_atualizacao = now() WHERE id = $3 RETURNING *',
            [professor_id, ativo !== undefined ? ativo : true, id]
        );

        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Disciplina-turma not found' });
        }
    } catch (err) {
        console.error('Error updating disciplina_turma:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDisciplinaTurma,
    createDisciplinaTurma,
    updateDisciplinaTurma,
    getProfessorDisciplinaTurma,
};
