const express = require('express');
const router = express.Router();
const db = require('../db.js');

// GET all disciplines for a student
router.get('/:studentId/disciplines', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                s.id, 
                s.nome, 
                c.nome AS turma_nome
            FROM users u
            JOIN aluno_disciplina ad ON u.id = ad.aluno_id
            JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
            JOIN subjects s ON dt.disciplina_id = s.id
            JOIN classes c ON dt.turma_id = c.id
            WHERE u.id = $1 AND u.tipo_utilizador = 'ALUNO' AND u.ativo = true
            ORDER BY s.nome;
        `, [studentId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching student disciplines:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all counters for a student's disciplines
router.get('/:studentId/counters/all', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await db.query(`
            SELECT DISTINCT c.id, c.shortname, c.descritor
            FROM contador c
            JOIN dossie d ON c.dossie_id = d.id
            JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
            JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
            JOIN aluno_disciplina ad ON dt.id = ad.disciplina_turma_id
            WHERE ad.aluno_id = $1 AND c.ativo = true
            ORDER BY c.shortname;
        `, [studentId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching student counters list:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all taps for a student with filters
router.get('/:studentId/counters', async (req, res) => {
    const { studentId } = req.params;
    const { disciplineId, counterId, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    // Whitelist for sortBy to prevent SQL injection
    const allowedSortBy = ['created_at', 'discipline_name', 'shortname', 'incremento'];
    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    try {
        let tapsQuery = `
            SELECT 
                t.id, 
                t.created_at, 
                s.nome AS discipline_name, 
                c.shortname, 
                c.descritor, 
                c.incremento
            FROM contador_registo t
            JOIN contador c ON t.contador_id = c.id
            JOIN dossie d ON c.dossie_id = d.id
            JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
            JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
            JOIN subjects s ON dt.disciplina_id = s.id
            WHERE t.aluno_id = $1
        `;
        
        const params = [studentId];
        let paramIndex = 2;

        if (disciplineId) {
            tapsQuery += ` AND s.id = $${paramIndex++}`;
            params.push(disciplineId);
        }
        if (counterId) {
            tapsQuery += ` AND c.id = $${paramIndex++}`;
            params.push(counterId);
        }

        tapsQuery += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

        const tapsResult = await db.query(tapsQuery, params);

        // Also fetch statistics
        const statsQuery = `
            SELECT 
                c.id as counter_id,
                c.shortname,
                COUNT(t.id)::int as total_taps,
                SUM(c.incremento) as total_increment,
                MAX(t.created_at) as last_tap_at
            FROM contador_registo t
            JOIN contador c ON t.contador_id = c.id
            WHERE t.aluno_id = $1
            GROUP BY c.id, c.shortname
            ORDER BY c.shortname;
        `;
        const statsResult = await db.query(statsQuery, [studentId]);

        res.status(200).json({
            taps: tapsResult.rows,
            statistics: statsResult.rows
        });

    } catch (error) {
        console.error('Error fetching student counters data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all dossiers for a student in a discipline
router.get('/:studentId/disciplines/:disciplineId/dossiers', async (req, res) => {
    const { studentId, disciplineId } = req.params;
    try {
        const result = await db.query(`
            SELECT 
                d.id,
                d.nome,
                d.ativo
            FROM dossie d
            JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
            JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
            JOIN aluno_disciplina ad ON dt.id = ad.disciplina_turma_id
            WHERE ad.aluno_id = $1 AND dt.disciplina_id = $2 AND d.ativo = true
            ORDER BY d.nome;
        `, [studentId, disciplineId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching student dossiers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET students by disciplina_turma_id
router.get('/disciplina/:id/alunos', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `
            SELECT u.id, u.nome, u.numero_mecanografico
            FROM users u
            JOIN aluno_disciplina ad ON u.id = ad.aluno_id
            WHERE ad.disciplina_turma_id = $1
              AND u.tipo_utilizador = 'ALUNO'
              AND u.ativo = true
            ORDER BY u.nome;
        `, [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching students by discipline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all grades for a student in a dossier
router.get('/:studentId/dossier/:dossierId/grades', async (req, res) => {
    const { studentId, dossierId } = req.params;
    try {
        // 1. Get Dossier and Discipline Info
        const dossierInfoQuery = await db.query(`
            SELECT d.nome as dossier_name, s.nome as discipline_name
            FROM dossie d
            JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
            JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
            JOIN subjects s ON dt.disciplina_id = s.id
            WHERE d.id = $1
        `, [dossierId]);

        if (dossierInfoQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Dossier not found' });
        }
        const { dossier_name, discipline_name } = dossierInfoQuery.rows[0];

        // 2. Get Criteria for the Dossier
        const criteriaQuery = await db.query(`
            SELECT id, nome, ponderacao 
            FROM criterio 
            WHERE dossie_id = $1 AND ativo = true
        `, [dossierId]);
        const criteria = criteriaQuery.rows;

        // 3. For each criterion, get instruments and student's grades
        const criteriaWithInstruments = await Promise.all(criteria.map(async (criterion) => {
            const instrumentsQuery = await db.query(`
                SELECT 
                    ea.id, 
                    ea.nome, 
                    ea.ponderacao as peso,
                    COALESCE(n.nota, 0) as classificacao
                FROM elemento_avaliacao ea
                LEFT JOIN nota_elemento n ON n.elemento_avaliacao_id = ea.id AND n.aluno_id = $1
                WHERE ea.criterio_id = $2 AND ea.ativo = true
            `, [studentId, criterion.id]);
            
            return {
                ...criterion,
                instrumentos: instrumentsQuery.rows
            };
        }));

        res.status(200).json({
            disciplineName: discipline_name,
            dossierName: dossier_name,
            criteria: criteriaWithInstruments
        });

    } catch (error) {
        console.error('Error fetching student grades by dossier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all grades for a student across all dossiers
router.get('/:studentId/all-grades', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await db.query(`
            SELECT
                d.id as dossier_id,
                d.nome as dossier_nome,
                s.nome as disciplina_nome,
                ma.id as momento_id,
                ma.nome as momento_nome,
                nfm.nota,
                ma.created_at as data_avaliacao
            FROM
                nota_final_momento nfm
            JOIN
                momento_avaliacao ma ON nfm.momento_avaliacao_id = ma.id
            JOIN
                dossie d ON ma.dossie_id = d.id
            JOIN
                professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
            JOIN
                disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
            JOIN
                subjects s ON dt.disciplina_id = s.id
            WHERE
                nfm.aluno_id = $1
            ORDER BY
                s.nome, d.nome, ma.created_at DESC;
        `, [studentId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all student grades:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET all competency evaluations for a student
router.get('/:studentId/competencies/evaluations', async (req, res) => {
    const { studentId } = req.params;
    try {
        const result = await db.query(`
            SELECT
                vpa.aluno_id,
                vpa.aluno_nome,
                vpa.competencia_id,
                vpa.competencia_codigo,
                vpa.competencia_nome,
                vpa.dominio,
                vpa.disciplina_turma_id,
                vpa.disciplina_nome,
                vpa.nivel_atual,
                vpa.ultima_avaliacao,
                vpa.observacoes,
                vpa.medida_educativa,
                vpa.aluno_tem_medida_educativa
            FROM
                v_progresso_aluno_atual vpa
            WHERE
                vpa.aluno_id = $1
            ORDER BY
                nivel_proficiencia_to_number(vpa.nivel_atual) ASC, vpa.disciplina_nome, vpa.competencia_nome;
        `, [studentId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching student competency evaluations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET historical proficiency levels for a specific student, competency, and discipline
router.get('/:studentId/disciplines/:disciplinaTurmaId/competencies/:competencyId/history', async (req, res) => {
    const { studentId, disciplinaTurmaId, competencyId } = req.params;
    try {
        const result = await db.query(`
            SELECT
                ac.nivel,
                ac.momento_avaliacao,
                ac.data_avaliacao,
                ac.observacoes,
                u_prof.nome AS professor_nome
            FROM
                avaliacao_competencia ac
            JOIN
                users u_prof ON ac.professor_id = u_prof.id
            WHERE
                ac.aluno_id = $1 AND ac.competencia_id = $2 AND ac.disciplina_turma_id = $3
            ORDER BY
                ac.data_avaliacao DESC;
        `, [studentId, competencyId, disciplinaTurmaId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching competency history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET all success criteria feedback for the logged-in student
router.get('/crisucessofeedback', async (req, res) => {
    // A student can only see their own feedback
    const studentId = req.user.id;
    try {
        // 1. Get the student's current school year
        const studentQuery = await db.query('SELECT ano_escolar FROM users WHERE id = $1', [studentId]);
        if (studentQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }
        const studentAnoEscolar = studentQuery.rows[0].ano_escolar;

        // 2. Get all criteria applicable to the student's grade level
        const criteriaQuery = await db.query(
            `SELECT
                cs.id,
                cs.codigo,
                cs.nome,
                cs.descricao,
                cs.tipo_criterio,
                cs.ano_escolaridade_inicial,
                cs.nivel_aceitavel,
                (SELECT STRING_AGG(d.nome, ', ') FROM departamento d JOIN criterio_sucesso_departamento csd ON csd.departamento_id = d.id WHERE csd.criterio_sucesso_id = cs.id) as departamentos,
                (SELECT COUNT(d.id) FROM departamento d JOIN criterio_sucesso_departamento csd ON csd.departamento_id = d.id WHERE csd.criterio_sucesso_id = cs.id) as total_departamentos
             FROM criterio_sucesso cs
             WHERE cs.ativo = true
               AND cs.ano_escolaridade_inicial <= $1
               AND (cs.ano_escolaridade_limite IS NULL OR cs.ano_escolaridade_limite >= $1)
            `,
            [studentAnoEscolar]
        );

        const applicableCriteria = criteriaQuery.rows;
        const criteriaMap = new Map(applicableCriteria.map(c => [c.id, { ...c, historico: [], anos_desde_introducao: studentAnoEscolar - c.ano_escolaridade_inicial }]));

        // 3. Get all historical evaluations for this student
        const historyQuery = await db.query(
            `SELECT
                aval.criterio_sucesso_id,
                aval.created_at as data,
                aval.pontuacao,
                aval.periodo,
                s.nome as disciplina,
                p.nome as professor
             FROM avaliacao_criterio_sucesso aval
             JOIN users p ON p.id = aval.professor_id
             JOIN subjects s ON s.id = aval.disciplina_id
             WHERE aval.aluno_id = $1
             ORDER BY aval.criterio_sucesso_id, aval.created_at ASC`,
            [studentId]
        );

        // 4. Populate history for each criterion
        for (const evaluation of historyQuery.rows) {
            if (criteriaMap.has(evaluation.criterio_sucesso_id)) {
                criteriaMap.get(evaluation.criterio_sucesso_id).historico.push(evaluation);
            }
        }

        // 5. Calculate summary fields from history
        const finalResults = Array.from(criteriaMap.values()).map(criterio => {
            const total_avaliacoes = criterio.historico.length;
            let ultima_pontuacao = 0;
            let data_conclusao = null;

            if (total_avaliacoes > 0) {
                // history is already sorted by date ASC
                const lastEval = criterio.historico[total_avaliacoes - 1];
                ultima_pontuacao = parseFloat(lastEval.pontuacao);
            }
            
            const atingiu_sucesso = ultima_pontuacao >= parseFloat(criterio.nivel_aceitavel);
            if(atingiu_sucesso) {
                 const firstSuccess = criterio.historico.find(h => parseFloat(h.pontuacao) >= parseFloat(criterio.nivel_aceitavel));
                 if(firstSuccess) {
                     data_conclusao = firstSuccess.data;
                 }
            }


            return {
                ...criterio,
                total_avaliacoes,
                ultima_pontuacao,
                atingiu_sucesso,
                data_conclusao,
            };
        });

        res.json(finalResults);

    } catch (error) {
        console.error('Error fetching student crisucesso feedback:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
