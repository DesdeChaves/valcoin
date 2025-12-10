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

// GET competency evolution data for a specific discipline
router.get('/evolution-by-discipline/:disciplinaId', async (req, res) => {
    const { disciplinaId } = req.params;
    try {
        const query = `
            WITH momentos_ranking AS (
                -- Para cada competência e disciplina_turma, ordena os momentos do mais recente para o mais antigo
                SELECT
                    competencia_id,
                    disciplina_turma_id,
                    momento_avaliacao,
                    data_avaliacao,
                    ROW_NUMBER() OVER (PARTITION BY competencia_id, disciplina_turma_id
                                       ORDER BY data_avaliacao DESC,
                                                momento_avaliacao DESC) AS rank_momento
                FROM public.avaliacao_competencia
                GROUP BY competencia_id, disciplina_turma_id, momento_avaliacao, data_avaliacao
            ),
            dados_com_momento AS (
                SELECT
                    ac.*,
                    mr.rank_momento
                FROM public.avaliacao_competencia ac
                JOIN momentos_ranking mr
                  ON ac.competencia_id = mr.competencia_id
                 AND ac.disciplina_turma_id = mr.disciplina_turma_id
                 AND ac.momento_avaliacao = mr.momento_avaliacao
                 AND ac.data_avaliacao = mr.data_avaliacao
            ),
            competencia_stats_por_momento AS (
                SELECT
                    competencia_id,
                    disciplina_turma_id,
                    momento_avaliacao,
                    data_avaliacao, -- Preserve data_avaliacao from the moment
                    rank_momento,
                    CASE rank_momento
                        WHEN 1 THEN 'Último momento'
                        WHEN 2 THEN 'Penúltimo momento'
                    END AS descricao_momento,
                    COUNT(DISTINCT aluno_id) AS total_alunos_avaliados,
                    COUNT(*) FILTER (WHERE nivel = 'fraco') AS qtd_fraco,
                    COUNT(*) FILTER (WHERE nivel = 'nao_satisfaz') AS qtd_nao_satisfaz,
                    COUNT(*) FILTER (WHERE nivel = 'satisfaz') AS qtd_satisfaz,
                    COUNT(*) FILTER (WHERE nivel = 'satisfaz_bastante') AS qtd_satisfaz_bastante,
                    COUNT(*) FILTER (WHERE nivel = 'excelente') AS qtd_excelente,
                    -- Média numérica do nível de proficiência para o momento
                    ROUND(AVG(
                        CASE nivel
                            WHEN 'fraco' THEN 1
                            WHEN 'nao_satisfaz' THEN 2
                            WHEN 'satisfaz' THEN 3
                            WHEN 'satisfaz_bastante' THEN 4
                            WHEN 'excelente' THEN 5
                            ELSE 0 -- Default ou tratamento de erro
                        END
                    ), 2) AS media_nivel,
                    -- Percentil 25, 50 e 75 (usando os valores numéricos da função)
                    percentile_cont(0.25) WITHIN GROUP (ORDER BY
                        CASE nivel
                            WHEN 'fraco' THEN 1
                            WHEN 'nao_satisfaz' THEN 2
                            WHEN 'satisfaz' THEN 3
                            WHEN 'satisfaz_bastante' THEN 4
                            WHEN 'excelente' THEN 5
                            ELSE 0
                        END) AS p25,
                    percentile_cont(0.50) WITHIN GROUP (ORDER BY
                        CASE nivel
                            WHEN 'fraco' THEN 1
                            WHEN 'nao_satisfaz' THEN 2
                            WHEN 'satisfaz' THEN 3
                            WHEN 'satisfaz_bastante' THEN 4
                            WHEN 'excelente' THEN 5
                            ELSE 0
                        END) AS p50_mediana,
                    percentile_cont(0.75) WITHIN GROUP (ORDER BY
                        CASE nivel
                            WHEN 'fraco' THEN 1
                            WHEN 'nao_satisfaz' THEN 2
                            WHEN 'satisfaz' THEN 3
                            WHEN 'satisfaz_bastante' THEN 4
                            WHEN 'excelente' THEN 5
                            ELSE 0
                        END) AS p75
                FROM dados_com_momento
                WHERE rank_momento IN (1, 2)
                GROUP BY competencia_id, disciplina_turma_id, momento_avaliacao, data_avaliacao, rank_momento
            )
            SELECT
                c.id AS competencia_id,
                c.codigo AS competencia_codigo,
                c.nome AS competencia_nome,
                (
                    SELECT json_agg(d.nome)
                    FROM public.competencia_dominio cd
                    JOIN public.dominios d ON d.id = cd.dominio_id
                    WHERE cd.competencia_id = c.id
                ) AS dominios,
                s.id AS disciplina_id,
                s.nome AS disciplina_nome,
                s.codigo AS disciplina_codigo,
                pdt.id AS professor_disciplina_turma_id,
                dt.id AS disciplina_turma_id,
                cs.descricao_momento,
                cs.momento_avaliacao,
                cs.data_avaliacao,
                cs.total_alunos_avaliados,
                cs.qtd_fraco,
                cs.qtd_nao_satisfaz,
                cs.qtd_satisfaz,
                cs.qtd_satisfaz_bastante,
                cs.qtd_excelente,
                cs.media_nivel,
                ROUND(cs.p25::numeric, 2) AS p25,
                ROUND(cs.p50_mediana::numeric, 2) AS p50_mediana,
                ROUND(cs.p75::numeric, 2) AS p75,
                -- Conversão dos percentis de volta para texto (para facilitar leitura)
                CASE ROUND(cs.p25)
                    WHEN 1 THEN 'Fraco'
                    WHEN 2 THEN 'Não Satisfaz'
                    WHEN 3 THEN 'Satisfaz'
                    WHEN 4 THEN 'Satisfaz Bastante'
                    WHEN 5 THEN 'Excelente'
                    ELSE 'N/A'
                END AS p25_nivel,
                CASE ROUND(cs.p50_mediana)
                    WHEN 1 THEN 'Fraco'
                    WHEN 2 THEN 'Não Satisfaz'
                    WHEN 3 THEN 'Satisfaz'
                    WHEN 4 THEN 'Satisfaz Bastante'
                    WHEN 5 THEN 'Excelente'
                    ELSE 'N/A'
                END AS p50_nivel,
                CASE ROUND(cs.p75)
                    WHEN 1 THEN 'Fraco'
                    WHEN 2 THEN 'Não Satisfaz'
                    WHEN 3 THEN 'Satisfaz'
                    WHEN 4 THEN 'Satisfaz Bastante'
                    WHEN 5 THEN 'Excelente'
                    ELSE 'N/A'
                END AS p75_nivel
            FROM competencia_stats_por_momento cs
            JOIN public.competencia c ON c.id = cs.competencia_id
            JOIN public.disciplina_turma dt ON dt.id = cs.disciplina_turma_id
            JOIN public.subjects s ON s.id = dt.disciplina_id
            LEFT JOIN public.professor_disciplina_turma pdt ON pdt.disciplina_turma_id = dt.id
            WHERE dt.disciplina_id = $1 -- Filter by disciplinaId
            ORDER BY s.nome, c.nome, cs.rank_momento;
        `;
        const result = await db.query(query, [disciplinaId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching competency evolution by discipline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
