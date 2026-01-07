const db = require('./db');
const { clearCache } = require('./cache'); // Import clearCache

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
        const newAssignment = await db.withTransaction(async (client) => {
            // Get ano_letivo from the class
            const { rows: classRows } = await client.query('SELECT ano_letivo FROM classes WHERE id = $1', [turma_id]);
            if (classRows.length === 0) {
                throw new Error('Class not found');
            }
            const ano_letivo = classRows[0].ano_letivo;

            // Check if professor exists
            const { rows: profRows } = await client.query('SELECT 1 FROM users WHERE id = $1 AND tipo_utilizador = $2', [professor_id, 'PROFESSOR']);
            if (profRows.length === 0) {
                throw new Error('Professor not found');
            }

            // 1. Insert or update the disciplina_turma record.
            // Using ON CONFLICT ensures we get an ID even if it exists.
            // We update the professor_id to ensure it's current.
            const { rows: dtRows } = await client.query(
                `INSERT INTO disciplina_turma (disciplina_id, turma_id, ano_letivo, professor_id) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (disciplina_id, turma_id, ano_letivo) 
                 DO UPDATE SET professor_id = EXCLUDED.professor_id, ativo = true
                 RETURNING *`,
                [disciplina_id, turma_id, ano_letivo, professor_id]
            );
            const disciplinaTurma = dtRows[0];

            // 2. Create or reactivate the corresponding professor_disciplina_turma record
            if (disciplinaTurma) {
                await client.query(
                    `INSERT INTO professor_disciplina_turma (professor_id, disciplina_turma_id, ativo)
                     VALUES ($1, $2, true)
                     ON CONFLICT (professor_id, disciplina_turma_id) 
                     DO UPDATE SET ativo = true`,
                    [professor_id, disciplinaTurma.id]
                );
            } else {
                 throw new Error('Failed to create or find disciplina_turma record.');
            }
            
            return disciplinaTurma;
        });
        
        // Clear caches after successful transaction
        await clearCache('subjects:all');
        await clearCache(`professor-dashboard:${professor_id}`);
        
        res.status(201).json(newAssignment);

    } catch (err) {
        console.error('Error creating disciplina_turma:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

const updateDisciplinaTurma = async (req, res) => {
    const { id: disciplinaTurmaId } = req.params;
    const { professor_id: newProfessorId, ativo } = req.body;

    try {
        let oldProfessorIdForCache = null;

        const updatedDisciplinaTurma = await db.withTransaction(async (client) => {
            // Lock the row to prevent race conditions
            const oldDataResult = await client.query('SELECT professor_id, ativo FROM disciplina_turma WHERE id = $1 FOR UPDATE', [disciplinaTurmaId]);
            
            if (oldDataResult.rows.length === 0) {
                throw new Error('Disciplina-turma not found'); 
            }
            
            const oldProfessorId = oldDataResult.rows[0].professor_id;
            const wasPreviouslyActive = oldDataResult.rows[0].ativo;
            oldProfessorIdForCache = oldProfessorId;

            // Update the main disciplina_turma table (without data_atualizacao)
            const { rows: updatedDtRows } = await client.query(
                'UPDATE disciplina_turma SET professor_id = $1, ativo = $2 WHERE id = $3 RETURNING *',
                [newProfessorId, ativo, disciplinaTurmaId]
            );

            const professorHasChanged = newProfessorId && newProfessorId !== oldProfessorId;
            const isBeingDeactivated = ativo === false && wasPreviouslyActive === true;

            if (professorHasChanged) {
                // Deactivate the old assignment if it exists (without data_atualizacao)
                if (oldProfessorId) {
                    await client.query('UPDATE professor_disciplina_turma SET ativo = false WHERE disciplina_turma_id = $1 AND professor_id = $2', [disciplinaTurmaId, oldProfessorId]);
                }
                
                // Find if an assignment for the new professor already exists
                const { rows: existingAssignment } = await client.query('SELECT id FROM professor_disciplina_turma WHERE disciplina_turma_id = $1 AND professor_id = $2', [disciplinaTurmaId, newProfessorId]);
                
                if (existingAssignment.length > 0) {
                    // If it exists, update its status based on the new 'ativo' flag (without data_atualizacao)
                    await client.query('UPDATE professor_disciplina_turma SET ativo = $1 WHERE id = $2', [ativo, existingAssignment[0].id]);
                } else {
                    // If it doesn't exist, create a new one only if the assignment is active
                    if (ativo) {
                        await client.query('INSERT INTO professor_disciplina_turma (professor_id, disciplina_turma_id, ativo) VALUES ($1, $2, true)', [newProfessorId, disciplinaTurmaId]);
                    }
                }
            } else if (isBeingDeactivated) {
                // If professor is the same but the assignment is being deactivated (without data_atualizacao)
                if (oldProfessorId) {
                    await client.query('UPDATE professor_disciplina_turma SET ativo = false WHERE disciplina_turma_id = $1 AND professor_id = $2', [disciplinaTurmaId, oldProfessorId]);
                }
            }
            
            return updatedDtRows[0];
        });

        // Clear caches after a successful transaction
        if (oldProfessorIdForCache) {
            await clearCache(`professor-dashboard:${oldProfessorIdForCache}`);
        }
        if (newProfessorId && newProfessorId !== oldProfessorIdForCache) {
            await clearCache(`professor-dashboard:${newProfessorId}`);
        }
        await clearCache('subjects:all');
            
        res.json(updatedDisciplinaTurma);

    } catch (err) {
        console.error('Error updating disciplina_turma:', err);
        if (err.message === 'Disciplina-turma not found') {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDisciplinaTurma,
    createDisciplinaTurma,
    updateDisciplinaTurma,
    getProfessorDisciplinaTurma,
};

