const db = require('./db');
const connectRedisPromise = require('./redis');
const { clearAdminDashboardCache } = require('./dashboard');

const SUBJECTS_CACHE_KEY = 'subjects:all';

const clearSubjectsCache = async () => {
    try {
        const redis = await connectRedisPromise;
        await redis.del(SUBJECTS_CACHE_KEY);
        console.log(`[CACHE CLEARED] Key: ${SUBJECTS_CACHE_KEY}`);
    } catch (err) {
        console.error('Error clearing subjects cache:', err);
    }
};

const getSubjects = async (req, res) => {
    try {
        const redis = await connectRedisPromise;
        const cachedSubjects = await redis.get(SUBJECTS_CACHE_KEY);
        if (cachedSubjects) {
            console.log(`[CACHE HIT] Serving subjects from cache.`);
            return res.json(JSON.parse(cachedSubjects));
        }

        console.log(`[CACHE MISS] Fetching subjects from DB.`);
        const { rows } = await db.query('SELECT * FROM subjects WHERE ativo = true');
        
        await redis.set(SUBJECTS_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Subjects stored in cache.`);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching subjects:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createSubject = async (req, res) => {
    const { nome, codigo, ativo } = req.body;
    if (!nome || !codigo) {
        return res.status(400).json({ error: 'nome and codigo are required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO subjects (nome, codigo, ativo) VALUES ($1, $2, $3) RETURNING *',
            [nome, codigo, ativo ?? true]
        );
        await clearSubjectsCache();
        await clearAdminDashboardCache();
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating subject:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Nome ou código da disciplina já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSubject = async (req, res) => {
    const { id } = req.params;
    const { nome, codigo, ativo } = req.body;
    if (!nome || !codigo) {
        return res.status(400).json({ error: 'nome and codigo are required' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE subjects SET nome = $1, codigo = $2, ativo = $3 WHERE id = $4 RETURNING *',
            [nome, codigo, ativo, id]
        );
        if (rows.length > 0) {
            await clearSubjectsCache();
            await clearAdminDashboardCache();
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Subject not found' });
        }
    } catch (err) {
        console.error('Error updating subject:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Nome ou código da disciplina já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const softDeleteSubject = async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('BEGIN');

        // Soft delete the subject
        const { rows } = await db.query(
            'UPDATE subjects SET ativo = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (rows.length > 0) {
            // Soft delete related disciplina_turma records
            await db.query(
                'UPDATE disciplina_turma SET ativo = false WHERE disciplina_id = $1',
                [id]
            );
            // Soft delete related aluno_disciplina records
            await db.query(
                'UPDATE aluno_disciplina SET ativo = false WHERE disciplina_turma_id IN (SELECT id FROM disciplina_turma WHERE disciplina_id = $1)',
                [id]
            );

            await db.query('COMMIT');
            await clearSubjectsCache();
            await clearAdminDashboardCache();
            res.json({
                message: 'Disciplina desativada com sucesso',
                subject: rows[0]
            });
        } else {
            await db.query('ROLLBACK');
            res.status(404).json({ error: 'Subject not found' });
        }
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error soft deleting subject:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSubjects,
    createSubject,
    updateSubject,
    softDeleteSubject
};