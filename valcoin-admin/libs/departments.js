const db = require('./db');
const { redisClient } = require('./redis');
const { clearAdminDashboardCache } = require('./dashboard');

const DEPARTMENTS_CACHE_KEY = 'departments:all';

const clearDepartmentsCache = async () => {
    try {
        await redisClient.del(DEPARTMENTS_CACHE_KEY);
        console.log(`[CACHE CLEARED] Key: ${DEPARTMENTS_CACHE_KEY}`);
    } catch (err) {
        console.error('Error clearing departments cache:', err);
    }
};

const getDepartments = async (req, res) => {
    try {
        const cachedDepartments = await redisClient.get(DEPARTMENTS_CACHE_KEY);
        if (cachedDepartments) {
            console.log(`[CACHE HIT] Serving departments from cache.`);
            return res.json(JSON.parse(cachedDepartments));
        }

        console.log(`[CACHE MISS] Fetching departments from DB.`);
        const { rows } = await db.query(`
            SELECT 
                d.*,
                u.nome as coordenador_nome
            FROM 
                departamento d
            LEFT JOIN 
                users u ON d.coordenador_id = u.id
            ORDER BY 
                d.ativo DESC, d.nome, d.codigo
        `);
        
        await redisClient.set(DEPARTMENTS_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Departments stored in cache.`);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createDepartment = async (req, res) => {
    const { nome, codigo, descricao, coordenador_id } = req.body;
    if (!nome || !codigo) {
        return res.status(400).json({ error: 'O nome e o código do departamento são obrigatórios.' });
    }

    try {
        const { rows } = await db.query(
            'INSERT INTO departamento (nome, codigo, descricao, coordenador_id, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome, codigo, descricao || null, coordenador_id || null, true]
        );
        await clearDepartmentsCache();
        await clearAdminDashboardCache();
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating department:', err);
        if (err.code === '23505') { // unique_violation
            return res.status(400).json({ error: 'Já existe um departamento com esse nome ou código.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { nome, codigo, ativo, descricao, coordenador_id } = req.body;
    if (!nome || !codigo) {
        return res.status(400).json({ error: 'O nome e o código do departamento são obrigatórios.' });
    }

    try {
        const { rows } = await db.query(
            'UPDATE departamento SET nome = $1, codigo = $2, ativo = $3, descricao = $4, coordenador_id = $5 WHERE id = $6 RETURNING *',
            [nome, codigo, ativo, descricao || null, coordenador_id || null, id]
        );
        if (rows.length > 0) {
            await clearDepartmentsCache();
            await clearAdminDashboardCache();
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Departamento não encontrado.' });
        }
    } catch (err) {
        console.error('Error updating department:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Já existe um departamento com esse nome ou código.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const softDeleteDepartment = async (req, res) => {
    const { id } = req.params;

    try {
        // Check if any subjects are associated with this department
        const subjectsCheck = await db.query('SELECT id FROM subjects WHERE departamento_id = $1 AND ativo = true', [id]);
        if (subjectsCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Não é possível desativar o departamento. Existem disciplinas ativas associadas a ele.' });
        }

        const { rows } = await db.query(
            'UPDATE departamento SET ativo = false WHERE id = $1 RETURNING *',
            [id]
        );

        if (rows.length > 0) {
            await clearDepartmentsCache();
            await clearAdminDashboardCache();
            res.json({
                message: 'Departamento desativado com sucesso.',
                department: rows[0]
            });
        } else {
            res.status(404).json({ error: 'Departamento não encontrado.' });
        }
    } catch (err) {
        console.error('Error soft deleting department:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    softDeleteDepartment,
    clearDepartmentsCache
};
