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

module.exports = router;
