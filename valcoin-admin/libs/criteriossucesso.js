const { query, withTransaction } = require('./db');
const { redisClient } = require('./redis');

const CRITERIOS_CACHE_KEY = 'criterios:all';

const clearCriteriosCache = async () => {
    try {
        await redisClient.del(CRITERIOS_CACHE_KEY);
        console.log(`[CACHE CLEARED] Key: ${CRITERIOS_CACHE_KEY}`);
    } catch (err) {
        console.error('Error clearing criterios cache:', err);
    }
};

const getCriterios = async (req, res) => {
    try {
        const cachedCriterios = await redisClient.get(CRITERIOS_CACHE_KEY);
        if (cachedCriterios) {
            console.log(`[CACHE HIT] Serving criterios from cache.`);
            return res.json(JSON.parse(cachedCriterios));
        }

        console.log(`[CACHE MISS] Fetching criterios from DB.`);
        const { rows } = await query(`
            SELECT 
                cs.*,
                STRING_AGG(d.nome, ', ' ORDER BY csd.prioridade) as departamentos_nomes,
                JSON_AGG(json_build_object('id', d.id, 'nome', d.nome, 'prioridade', csd.prioridade) ORDER BY csd.prioridade) as departamentos
            FROM 
                criterio_sucesso cs
            LEFT JOIN
                criterio_sucesso_departamento csd ON cs.id = csd.criterio_sucesso_id AND csd.ativo = true
            LEFT JOIN
                departamento d ON csd.departamento_id = d.id AND d.ativo = true
            WHERE
                cs.ativo = true
            GROUP BY
                cs.id
            ORDER BY 
                cs.codigo, cs.ano_escolaridade_inicial
        `);
        
        await redisClient.set(CRITERIOS_CACHE_KEY, JSON.stringify(rows), { EX: 3600 });
        console.log(`[CACHE SET] Criterios stored in cache.`);

        res.json(rows);
    } catch (err) {
        console.error('Error fetching criterios:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCriterio = async (req, res) => {
    const {
        codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio,
        ano_escolaridade_limite, nivel_aceitavel, periodicidade_avaliacao,
        aprovado_por, data_aprovacao, departamentos, ativo
    } = req.body;

    if (!codigo || !nome || !descricao || !ano_escolaridade_inicial) {
        return res.status(400).json({ error: 'Código, nome, descrição e ano de escolaridade inicial são obrigatórios.' });
    }

    if (!departamentos || !Array.isArray(departamentos) || departamentos.length === 0) {
        return res.status(400).json({ error: 'É obrigatório associar pelo menos um departamento.' });
    }

    try {
        const newCriterio = await withTransaction(async (client) => {
            const criterioRes = await client.query(
                `INSERT INTO criterio_sucesso (
                    codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio, 
                    ano_escolaridade_limite, nivel_aceitavel, periodicidade_avaliacao, 
                    aprovado_por, data_aprovacao, ativo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [
                    codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio,
                    ano_escolaridade_limite, nivel_aceitavel, periodicidade_avaliacao,
                    aprovado_por, data_aprovacao, ativo ?? true
                ]
            );
            const criterio = criterioRes.rows[0];

            const deptoInsertPromises = departamentos.map((deptId, index) => {
                return client.query(
                    `INSERT INTO criterio_sucesso_departamento (criterio_sucesso_id, departamento_id, prioridade, papel)
                     VALUES ($1, $2, $3, $4)`,
                    [criterio.id, deptId, index + 1, index === 0 ? 'responsavel' : 'colaborador']
                );
            });

            await Promise.all(deptoInsertPromises);
            
            return criterio;
        });

        await clearCriteriosCache();
        res.status(201).json(newCriterio);
    } catch (err) {
        console.error('Error creating criterio:', err);
        if (err.code === '23505') { // unique_violation
            return res.status(400).json({ error: 'Já existe um critério com esse código.' });
        }
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

const updateCriterio = async (req, res) => {
    const { id } = req.params;
    const {
        codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio,
        ano_escolaridade_limite, nivel_aceitavel, periodicidade_avaliacao,
        aprovado_por, data_aprovacao, departamentos, ativo
    } = req.body;

    if (!codigo || !nome || !descricao || !ano_escolaridade_inicial) {
        return res.status(400).json({ error: 'Código, nome, descrição e ano de escolaridade inicial são obrigatórios.' });
    }
    
    if (!departamentos || !Array.isArray(departamentos) || departamentos.length === 0) {
        return res.status(400).json({ error: 'É obrigatório associar pelo menos um departamento.' });
    }

    try {
        const updatedCriterio = await withTransaction(async (client) => {
            const criterioRes = await client.query(
                `UPDATE criterio_sucesso SET 
                    codigo = $1, nome = $2, descricao = $3, ano_escolaridade_inicial = $4, tipo_criterio = $5,
                    ano_escolaridade_limite = $6, nivel_aceitavel = $7, periodicidade_avaliacao = $8,
                    aprovado_por = $9, data_aprovacao = $10, ativo = $11, updated_at = NOW()
                WHERE id = $12 RETURNING *`,
                [
                    codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio,
                    ano_escolaridade_limite, nivel_aceitavel, periodicidade_avaliacao,
                    aprovado_por, data_aprovacao, ativo, id
                ]
            );

            if (criterioRes.rows.length === 0) {
                // Lança um erro para ser capturado pelo catch e acionar o rollback
                throw new Error('Critério não encontrado.'); 
            }
            const criterio = criterioRes.rows[0];

            await client.query('DELETE FROM criterio_sucesso_departamento WHERE criterio_sucesso_id = $1', [id]);

            const deptoInsertPromises = departamentos.map((deptId, index) => {
                return client.query(
                    `INSERT INTO criterio_sucesso_departamento (criterio_sucesso_id, departamento_id, prioridade, papel)
                     VALUES ($1, $2, $3, $4)`,
                    [id, deptId, index + 1, index === 0 ? 'responsavel' : 'colaborador']
                );
            });

            await Promise.all(deptoInsertPromises);

            return criterio;
        });

        await clearCriteriosCache();
        res.json(updatedCriterio);

    } catch (err) {
        console.error('Error updating criterio:', err);
        if (err.message === 'Critério não encontrado.') {
             return res.status(404).json({ error: err.message });
        }
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Já existe um critério com esse código.' });
        }
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

const softDeleteCriterio = async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await query(
            'UPDATE criterio_sucesso SET ativo = false, updated_at = NOW() WHERE id = $1 RETURNING *',
            [id]
        );

        if (rows.length > 0) {
            // Também desativa as associações
            await query('UPDATE criterio_sucesso_departamento SET ativo = false WHERE criterio_sucesso_id = $1', [id]);

            await clearCriteriosCache();
            res.json({
                message: 'Critério desativado com sucesso.',
                criterio: rows[0]
            });
        } else {
            res.status(404).json({ error: 'Critério não encontrado.' });
        }
    } catch (err) {
        console.error('Error soft deleting criterio:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCriterios,
    createCriterio,
    updateCriterio,
    softDeleteCriterio,
    clearCriteriosCache
};
