const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { validateCompetencia } = require('./helpers.js');

// GET all competencies for a discipline
router.get('/disciplina/:disciplinaId', async (req, res) => {
    const { disciplinaId } = req.params;
    try {
        const query = `
            SELECT 
                c.*, 
                COALESCE(
                    (SELECT json_agg(json_build_object('id', d.id, 'nome', d.nome))
                     FROM competencia_dominio cd
                     JOIN dominios d ON cd.dominio_id = d.id
                     WHERE cd.competencia_id = c.id),
                    '[]'::json
                ) as dominios
            FROM competencia c
            WHERE c.disciplina_id = $1 AND c.ativo = true
            ORDER BY c.ordem;
        `;
        const result = await db.query(query, [disciplinaId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching competencies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET a single competency by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                c.*, 
                COALESCE(
                    (SELECT json_agg(json_build_object('id', d.id, 'nome', d.nome))
                     FROM competencia_dominio cd
                     JOIN dominios d ON cd.dominio_id = d.id
                     WHERE cd.competencia_id = c.id),
                    '[]'::json
                ) as dominios
            FROM competencia c
            WHERE c.id = $1;
        `;
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Competency not found' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching competency:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST a new competency
router.post('/', async (req, res) => {
    const { error, value } = validateCompetencia(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { disciplina_id, codigo, nome, descricao, medida_educativa, descricao_adaptacao, criado_por_id, dominio_ids, ordem } = value;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const competenciaResult = await client.query(
            `INSERT INTO competencia (disciplina_id, codigo, nome, descricao, medida_educativa, descricao_adaptacao, criado_por_id, ordem)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [disciplina_id, codigo, nome, descricao, medida_educativa, descricao_adaptacao, criado_por_id, ordem]
        );
        const newCompetencia = competenciaResult.rows[0];

        if (dominio_ids && dominio_ids.length > 0) {
            const domainInsertPromises = dominio_ids.map(dominio_id => {
                return client.query(
                    'INSERT INTO competencia_dominio (competencia_id, dominio_id) VALUES ($1, $2)',
                    [newCompetencia.id, dominio_id]
                );
            });
            await Promise.all(domainInsertPromises);
        }

        await client.query('COMMIT');
        
        // Fetch the full competency with domains to return
        const finalResult = await db.query(
            `SELECT 
                c.*, 
                COALESCE(
                    (SELECT json_agg(json_build_object('id', d.id, 'nome', d.nome))
                     FROM competencia_dominio cd
                     JOIN dominios d ON cd.dominio_id = d.id
                     WHERE cd.competencia_id = c.id),
                    '[]'::json
                ) as dominios
            FROM competencia c
            WHERE c.id = $1;`,
            [newCompetencia.id]
        );

        res.status(201).json(finalResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating competency:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT to update a competency
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { error, value } = validateCompetencia(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { disciplina_id, codigo, nome, descricao, medida_educativa, descricao_adaptacao, criado_por_id, dominio_ids, ordem, validado, validado_por_id, ativo } = value;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const competenciaResult = await client.query(
            `UPDATE competencia
             SET disciplina_id = $1, codigo = $2, nome = $3, descricao = $4, medida_educativa = $5, descricao_adaptacao = $6, criado_por_id = $7, ordem = $8, validado = $9, validado_por_id = $10, ativo = $11, updated_at = NOW()
             WHERE id = $12
             RETURNING *`,
            [disciplina_id, codigo, nome, descricao, medida_educativa, descricao_adaptacao, criado_por_id, ordem, validado, validado_por_id, ativo, id]
        );

        if (competenciaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Competency not found' });
        }

        // Update domains
        await client.query('DELETE FROM competencia_dominio WHERE competencia_id = $1', [id]);
        if (dominio_ids && dominio_ids.length > 0) {
            const domainInsertPromises = dominio_ids.map(dominio_id => {
                return client.query(
                    'INSERT INTO competencia_dominio (competencia_id, dominio_id) VALUES ($1, $2)',
                    [id, dominio_id]
                );
            });
            await Promise.all(domainInsertPromises);
        }

        await client.query('COMMIT');

        // Fetch the full competency with domains to return
        const finalResult = await db.query(
            `SELECT 
                c.*, 
                COALESCE(
                    (SELECT json_agg(json_build_object('id', d.id, 'nome', d.nome))
                     FROM competencia_dominio cd
                     JOIN dominios d ON cd.dominio_id = d.id
                     WHERE cd.competencia_id = c.id),
                    '[]'::json
                ) as dominios
            FROM competencia c
            WHERE c.id = $1;`,
            [id]
        );
        
        res.status(200).json(finalResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating competency:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});


// DELETE a competency (soft delete)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE competencia SET ativo = false, updated_at = NOW() WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Competency not found' });
        }
        res.status(200).json({ message: 'Competency deactivated successfully' });
    } catch (error) {
        console.error('Error deactivating competency:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET students for a disciplina_turma
router.get('/disciplina_turma/:id/students', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT u.id, u.nome
             FROM users u
             JOIN aluno_disciplina ad ON u.id = ad.aluno_id
             WHERE ad.disciplina_turma_id = $1 AND u.ativo = true
             ORDER BY u.nome`,
            [id]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching students for discipline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET eligible students for a competency evaluation
router.get('/:competenciaId/eligible-students', async (req, res) => {
    const { competenciaId } = req.params;
    const { disciplina_turma_id } = req.query;

    if (!disciplina_turma_id) {
        return res.status(400).json({ error: 'disciplina_turma_id query parameter is required.' });
    }

    try {
        const { rows } = await db.query(
            `SELECT
                aluno_id as id,
                aluno_nome as nome,
                numero_mecanografico
             FROM obter_alunos_elegiveis_competencia($1, $2)`,
            [competenciaId, disciplina_turma_id]
        );
        res.status(200).json({
            competenciaId: competenciaId,
            disciplinaTurmaId: disciplina_turma_id,
            students: rows
        });
    } catch (error) {
        console.error('Error calling obter_alunos_elegiveis_competencia:', error);
        if (error.code === '42883') { // undefined_function
            return res.status(500).json({ error: 'Database function obter_alunos_elegiveis_competencia not found. Please ensure it has been created.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST to save competency assessments
router.post('/:id/avaliacoes', async (req, res) => {
    const { id } = req.params; // competency id
    const { evaluations, professor_id, disciplina_turma_id, momento_avaliacao } = req.body;

    if (!evaluations || !Array.isArray(evaluations) || evaluations.length === 0) {
        return res.status(400).json({ error: 'Evaluations data is required' });
    }

    if (!momento_avaliacao) {
        return res.status(400).json({ error: 'Evaluation moment is required' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Check if the evaluation moment already exists for this competency and discipline_turma
        const existingMoment = await client.query(
            `SELECT id FROM avaliacao_competencia WHERE competencia_id = $1 AND disciplina_turma_id = $2 AND momento_avaliacao = $3 LIMIT 1`,
            [id, disciplina_turma_id, momento_avaliacao]
        );

        if (existingMoment.rows.length > 0) {
            // Update existing evaluations
            for (const evaluation of evaluations) {
                const { aluno_id, nivel, observacoes } = evaluation;
                await client.query(
                    `UPDATE avaliacao_competencia
                     SET nivel = $1, observacoes = $2, professor_id = $3, updated_at = NOW()
                     WHERE competencia_id = $4 AND aluno_id = $5 AND momento_avaliacao = $6`,
                    [nivel, observacoes, professor_id, id, aluno_id, momento_avaliacao]
                );
            }
        } else {
            // Insert new evaluations
            for (const evaluation of evaluations) {
                const { aluno_id, nivel, observacoes } = evaluation;
                await client.query(
                    `INSERT INTO avaliacao_competencia (competencia_id, aluno_id, professor_id, disciplina_turma_id, nivel, observacoes, momento_avaliacao)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [id, aluno_id, professor_id, disciplina_turma_id, nivel, observacoes, momento_avaliacao]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Assessments saved successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving competency assessments:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// GET evaluation moments for a competency
router.get('/:id/avaliacoes/momentos', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT DISTINCT momento_avaliacao FROM avaliacao_competencia WHERE competencia_id = $1 ORDER BY momento_avaliacao`,
            [id]
        );
        res.status(200).json(result.rows.map(r => r.momento_avaliacao));
    } catch (error) {
        console.error('Error fetching evaluation moments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET evaluations for a competency and moment
router.get('/:id/avaliacoes', async (req, res) => {
    const { id } = req.params;
    const { momento } = req.query;
    try {
        const result = await db.query(
            `SELECT aluno_id, nivel, observacoes FROM avaliacao_competencia WHERE competencia_id = $1 AND momento_avaliacao = $2`,
            [id, momento]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching evaluations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET most recent evaluations for a competency
router.get('/:id/avaliacoes/recent', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT DISTINCT ON (aluno_id) aluno_id, nivel, observacoes
             FROM avaliacao_competencia
             WHERE competencia_id = $1
             ORDER BY aluno_id, data_avaliacao DESC`,
            [id]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching recent evaluations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
