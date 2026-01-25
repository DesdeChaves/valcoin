const db = require('./db');
const { redisClient } = require('./redis');
const { clearAdminDashboardCache } = require('./dashboard');

const CLASSES_CACHE_KEY = 'classes:all';

const clearClassesCache = async () => {
    try {
        await redisClient.del(CLASSES_CACHE_KEY);
        console.log(`[CACHE CLEARED] Key: ${CLASSES_CACHE_KEY}`);
    } catch (err) {
        console.error('Error clearing classes cache:', err);
    }
};

const getClasses = async (req, res) => {
    try {
        const cachedClasses = await redisClient.get(CLASSES_CACHE_KEY);
        if (cachedClasses) {
            console.log(`[CACHE HIT] Serving classes from cache.`);
            return res.json(JSON.parse(cachedClasses));
        }

        console.log(`[CACHE MISS] Fetching classes from DB.`);
        const { rows } = await db.query('SELECT * FROM classes WHERE ativo = true');
        
        await redisClient.set(CLASSES_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Classes stored in cache.`);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createClass = async (req, res) => {
    const { codigo, nome, ciclo_id, ano_letivo, diretor_turma_id } = req.body;
    if (!codigo || !nome || !ciclo_id || !ano_letivo) {
        return res.status(400).json({ error: 'codigo, nome, ciclo_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO classes (codigo, nome, ciclo_id, ano_letivo, diretor_turma_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [codigo, nome, ciclo_id, ano_letivo, diretor_turma_id]
        );
        await clearClassesCache();
        await clearAdminDashboardCache();
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Código ou nome da turma já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateClass = async (req, res) => {
    const { id } = req.params;
    const { codigo, nome, ciclo_id, ano_letivo, diretor_turma_id, ativo } = req.body;
    if (!codigo || !nome || !ciclo_id || !ano_letivo) {
        return res.status(400).json({ error: 'codigo, nome, ciclo_id, and ano_letivo are required' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE classes SET codigo = $1, nome = $2, ciclo_id = $3, ano_letivo = $4, diretor_turma_id = $5, ativo = $6 WHERE id = $7 RETURNING *',
            [codigo, nome, ciclo_id, ano_letivo, diretor_turma_id, ativo, id]
        );
        if (rows.length > 0) {
            await clearClassesCache();
            await clearAdminDashboardCache();
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Class not found' });
        }
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Código ou nome da turma já está em uso' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteClass = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM classes WHERE id = $1', [id]);
        if (rowCount > 0) {
            await clearClassesCache();
            await clearAdminDashboardCache();
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Class not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStudentsByClassId = async (classId, disciplineId) => {
    try {
        let query = `
            SELECT u.id, u.nome, u.email, u.tipo_utilizador
            FROM users u
            JOIN aluno_turma at ON u.id = at.aluno_id
        `;
        const params = [classId];

        if (disciplineId) {
            query += ` JOIN aluno_disciplina ad ON u.id = ad.aluno_id`;
        }
        
        query += ` WHERE at.turma_id = $1 AND u.ativo = true AND at.ativo = true AND u.tipo_utilizador = 'ALUNO'`;

        if (disciplineId) {
            query += ` AND ad.disciplina_turma_id IN (SELECT id FROM disciplina_turma WHERE disciplina_id = $2 AND turma_id = $1)`;
            params.push(disciplineId);
        }
        
        query += ` GROUP BY u.id ORDER BY u.nome`;

        const { rows } = await db.query(query, params);
        return rows;
    } catch (err) {
        console.error('Error fetching students for class:', err);
        throw err;
    }
};

const getStudentsByClass = async (req, res) => {
    const { id } = req.params;
    try {
        const students = await getStudentsByClassId(id);
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getClasses,
    createClass,
    updateClass,
    deleteClass,
    getStudentsByClass,
    getStudentsByClassId,
};
