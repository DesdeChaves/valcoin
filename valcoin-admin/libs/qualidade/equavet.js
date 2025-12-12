// ./libs/qualidade/equavet.js
// MÓDULO EQAVET COMPLETO — Versão Final 2025
// Alinhado com ANQEP, PO CH, SIGO, Auditorias

const express = require('express');
const db = require('../db');
const { withTransaction } = require('../db');
const { redisClient, connect } = require('../redis'); // Add this line
const { refreshDashboardCache, DASHBOARD_CACHE_KEY, refreshInstrumentoAnaliseCache, INSTRUMENTO_ANALISE_CACHE_KEY } = require('./equavet_helpers'); // Modify this line

module.exports = (authenticateJWT, authenticateAdminOrProfessor) => {
    const router = express.Router();


    // ============================================================================
    // FUNÇÃO AUXILIAR: Recalcular indicadores automaticamente a partir do tracking
    // ============================================================================
    const recalcularIndicadores = async (client, cicloId, anoRecolha = null) => {
        const ano = anoRecolha || new Date().getFullYear() + 1;

        // INDICADOR 1 – Colocação no mercado de trabalho / prosseguimento de estudos
        await client.query(`
            INSERT INTO eqavet_indicador_1_colocacao 
                (ciclo_formativo_id, ano_recolha, meses_apos_conclusao,
                 total_diplomados, empregados, conta_propria, estagios_profissionais,
                 procura_emprego, prosseguimento_estudos, outra_situacao, situacao_desconhecida,
                 taxa_colocacao_global)
            SELECT 
                $1, $2, 12,
                COUNT(*)::integer,
                COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA','ESTAGIO'))::integer,
                COUNT(*) FILTER (WHERE situacao_atual = 'CONTA_PROPRIA')::integer,
                COUNT(*) FILTER (WHERE situacao_atual = 'ESTAGIO')::integer,
                COUNT(*) FILTER (WHERE situacao_atual = 'DESEMPREGADO')::integer,
                COUNT(*) FILTER (WHERE situacao_atual IN ('ENSINO_SUPERIOR','FORMACAO_POS'))::integer,
                COUNT(*) FILTER (WHERE situacao_atual = 'OUTRA')::integer,
                COUNT(*) FILTER (WHERE situacao_atual = 'DESCONHECIDA')::integer,
                ROUND(100.0 * COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA','ESTAGIO','ENSINO_SUPERIOR','FORMACAO_POS')) / NULLIF(COUNT(*),0), 2)
            FROM eqavet_tracking_diplomados 
            WHERE ciclo_formativo_id = $1
            ON CONFLICT (ciclo_formativo_id, ano_recolha) DO UPDATE SET
                total_diplomados = EXCLUDED.total_diplomados,
                taxa_colocacao_global = EXCLUDED.taxa_colocacao_global;
        `, [cicloId, ano]);

        // INDICADOR 4 – Utilização das competências adquiridas
        await client.query(`
            INSERT INTO eqavet_indicador_4_utilizacao 
                (ciclo_formativo_id, ano_recolha, total_trabalhadores, profissao_relacionada, taxa_utilizacao_global)
            SELECT 
                $1, $2,
                COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA'))::integer,
                COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA') AND profissao_relacionada = true)::integer,
                ROUND(100.0 * COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA') AND profissao_relacionada = true) / NULLIF(COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA')),0), 2)
            FROM eqavet_tracking_diplomados 
            WHERE ciclo_formativo_id = $1
            ON CONFLICT (ciclo_formativo_id, ano_recolha) DO UPDATE SET
                taxa_utilizacao_global = EXCLUDED.taxa_utilizacao_global;
        `, [cicloId, ano]);

        // INDICADOR 6a – Prosseguimento de estudos
        await client.query(`
            INSERT INTO eqavet_indicador_6a_prosseguimento 
                (ciclo_formativo_id, ano_recolha, total_diplomados, prosseguimento_estudos, taxa_prosseguimento_global)
            SELECT 
                $1, $2,
                COUNT(*)::integer,
                COUNT(*) FILTER (WHERE situacao_atual IN ('ENSINO_SUPERIOR','FORMACAO_POS'))::integer,
                ROUND(100.0 * COUNT(*) FILTER (WHERE situacao_atual IN ('ENSINO_SUPERIOR','FORMACAO_POS')) / NULLIF(COUNT(*),0), 2)
            FROM eqavet_tracking_diplomados 
            WHERE ciclo_formativo_id = $1
            ON CONFLICT (ciclo_formativo_id, ano_recolha) DO UPDATE SET
                taxa_prosseguimento_global = EXCLUDED.taxa_prosseguimento_global;
        `, [cicloId, ano]);
    };

    // ============================================================================
    // 1. CICLOS FORMATIVOS
    // ============================================================================
    router.get('/ciclos', authenticateJWT, async (req, res) => {
        try {
            const { ativo = true, ano_inicio, area_educacao_formacao } = req.query;
            let query = `
                SELECT cf.*, COUNT(tc.turma_id) as total_turmas, u.nome as responsavel_nome
                FROM eqavet_ciclos_formativos cf
                LEFT JOIN eqavet_turma_ciclo tc ON tc.ciclo_formativo_id = cf.id
                LEFT JOIN users u ON cf.responsavel_id = u.id
                WHERE cf.ativo = $1
            `;
            const params = [ativo]; // Changed from ativo === 'true' to ativo
            if (ano_inicio) { query += ` AND cf.ano_inicio = $${params.length + 1}`; params.push(ano_inicio); }
            if (area_educacao_formacao) { query += ` AND cf.area_educacao_formacao = $${params.length + 1}`; params.push(area_educacao_formacao); }
            query += ` GROUP BY cf.id, u.nome ORDER BY cf.ano_inicio DESC, cf.designacao`;
            const result = await db.query(query, params);
            res.json(result.rows);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar ciclos' }); }
    });

    router.post('/ciclos', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { designacao, codigo_curso, area_educacao_formacao, nivel_qnq, ano_inicio, ano_fim, observacoes, ativo, responsavel_id } = req.body; // Add responsavel_id, ativo
        if (!designacao || !ano_inicio || !ano_fim || !nivel_qnq) return res.status(400).json({ error: 'Campos obrigatórios em falta' });
        try {
            const newCiclo = await withTransaction(async (client) => {
                const result = await client.query(`
                    INSERT INTO eqavet_ciclos_formativos 
                    (designacao, codigo_curso, area_educacao_formacao, nivel_qnq, ano_inicio, ano_fim, observacoes, ativo, responsavel_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
                `, [designacao, codigo_curso || null, area_educacao_formacao || null, nivel_qnq, ano_inicio, ano_fim, observacoes || null, ativo ?? true, responsavel_id || null]);

                // If a responsavel was assigned, give them the role
                if (responsavel_id) {
                    const roleQuery = `
                        INSERT INTO user_roles (user_id, role_id)
                        VALUES ($1, (SELECT id FROM roles WHERE name = 'responsavel_ciclo'))
                        ON CONFLICT (user_id, role_id) DO NOTHING;
                    `;
                    await client.query(roleQuery, [responsavel_id]);
                }
                return result.rows[0];
            });
            res.status(201).json(newCiclo);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar ciclo' }); }
    });

    router.put('/ciclos/:id', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { id } = req.params;
        const { designacao, codigo_curso, area_educacao_formacao, nivel_qnq, ano_inicio, ano_fim, observacoes, ativo, responsavel_id } = req.body; // Destructure all fields

        try {
            const updatedCiclo = await withTransaction(async (client) => {
                // 1. Get the old responsavel_id before updating
                const oldCicloQuery = await client.query('SELECT responsavel_id FROM eqavet_ciclos_formativos WHERE id = $1', [id]);
                const oldResponsavelId = oldCicloQuery.rows[0]?.responsavel_id;

                // 2. Update the ciclo_formativo
                // Use explicit fields here instead of the generic approach, for clarity and control
                const { rows: updatedRows } = await client.query(
                    `UPDATE eqavet_ciclos_formativos 
                     SET designacao = $1, codigo_curso = $2, area_educacao_formacao = $3, nivel_qnq = $4,
                         ano_inicio = $5, ano_fim = $6, observacoes = $7, ativo = $8, responsavel_id = $9, updated_at = NOW()
                     WHERE id = $10 RETURNING *`,
                    [
                        designacao, codigo_curso || null, area_educacao_formacao || null, nivel_qnq,
                        ano_inicio, ano_fim, observacoes || null, ativo, responsavel_id || null, id
                    ]
                );

                if (updatedRows.length === 0) {
                    const notFoundError = new Error('Ciclo Formativo não encontrado.');
                    notFoundError.statusCode = 404;
                    throw notFoundError;
                }

                const newResponsavelId = responsavel_id;

                // Fetch the full updated record including responsavel_nome
                const { rows: finalUpdatedCicloRows } = await client.query(`
                    SELECT cf.*, u.nome as responsavel_nome
                    FROM eqavet_ciclos_formativos cf
                    LEFT JOIN users u ON cf.responsavel_id = u.id
                    WHERE cf.id = $1
                `, [id]);

                if (finalUpdatedCicloRows.length === 0) {
                     // Should not happen if previous update was successful, but good for robustness
                    const notFoundError = new Error('Erro ao obter ciclo formativo atualizado.');
                    notFoundError.statusCode = 500;
                    throw notFoundError;
                }

                // 3. Update roles if the responsavel has changed
                if (oldResponsavelId !== newResponsavelId) {
                    // 3a. Assign role to the new responsavel (if one exists)
                    if (newResponsavelId) {
                        const addRoleQuery = `
                            INSERT INTO user_roles (user_id, role_id)
                            VALUES ($1, (SELECT id FROM roles WHERE name = 'responsavel_ciclo'))
                            ON CONFLICT (user_id, role_id) DO NOTHING;
                        `;
                        await client.query(addRoleQuery, [newResponsavelId]);
                    }

                    // 3b. Remove role from the old responsavel if they no longer are responsible for any other ciclo
                    if (oldResponsavelId) {
                        const checkOtherCiclosQuery = await client.query(
                            'SELECT 1 FROM eqavet_ciclos_formativos WHERE responsavel_id = $1 LIMIT 1',
                            [oldResponsavelId]
                        );

                        if (checkOtherCiclosQuery.rows.length === 0) {
                            const removeRoleQuery = `
                                DELETE FROM user_roles
                                WHERE user_id = $1
                                  AND role_id = (SELECT id FROM roles WHERE name = 'responsavel_ciclo');
                            `;
                            await client.query(removeRoleQuery, [oldResponsavelId]);
                        }
                    }
                }
                return finalUpdatedCicloRows[0]; // Return the fully populated object
            });
            res.json(updatedCiclo);
        } catch (err) {
            console.error('Erro ao atualizar ciclo formativo:', err);
            if (err.statusCode === 404) {
                return res.status(404).json({ error: err.message });
            }
            if (err.code === '23505') { // unique_violation (e.g. duplicate code/designacao)
                return res.status(400).json({ error: 'Já existe um ciclo formativo com essa designação ou código.' });
            }
            res.status(500).json({ error: 'Erro interno do servidor ao atualizar ciclo formativo.' });
        }
    });

    // Rota para obter turmas de um ciclo
    router.get('/ciclos/:id/turmas', authenticateJWT, async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.query('SELECT turma_id FROM eqavet_turma_ciclo WHERE ciclo_formativo_id = $1', [id]);
            res.json(result.rows.map(r => r.turma_id));
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao obter turmas do ciclo' });
        }
    });

    // Rota para associar turmas a um ciclo
    router.put('/ciclos/:id/turmas', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { id } = req.params;
        const { turmas } = req.body; // array de turma_id

        try {
            await withTransaction(async (client) => {
                await client.query('DELETE FROM eqavet_turma_ciclo WHERE ciclo_formativo_id = $1', [id]);
                if (turmas && turmas.length > 0) {
                    const insertQuery = 'INSERT INTO eqavet_turma_ciclo (ciclo_formativo_id, turma_id) VALUES ' +
                        turmas.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(insertQuery, [id, ...turmas]);
                }
            });
            res.json({ success: true, message: 'Turmas associadas com sucesso' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao associar turmas' });
        }
    });

    router.delete('/ciclos/:id', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { id } = req.params;
        try {
            // A transaction is good practice here to also handle potential orphaned data if needed in the future
            await withTransaction(async (client) => {
                // Before deleting, we might need to remove the 'responsavel_ciclo' role from the assigned professor
                const oldCicloQuery = await client.query('SELECT responsavel_id FROM eqavet_ciclos_formativos WHERE id = $1', [id]);
                const oldResponsavelId = oldCicloQuery.rows[0]?.responsavel_id;

                const deleteResponse = await client.query('DELETE FROM eqavet_ciclos_formativos WHERE id = $1', [id]);

                if (deleteResponse.rowCount === 0) {
                    const notFoundError = new Error('Ciclo Formativo não encontrado.');
                    notFoundError.statusCode = 404;
                    throw notFoundError;
                }

                // If the deleted cycle had a responsible professor, check if they are still responsible for any other cycle
                if (oldResponsavelId) {
                    const checkOtherCiclosQuery = await client.query(
                        'SELECT 1 FROM eqavet_ciclos_formativos WHERE responsavel_id = $1 LIMIT 1',
                        [oldResponsavelId]
                    );

                    if (checkOtherCiclosQuery.rows.length === 0) {
                        const removeRoleQuery = `
                            DELETE FROM user_roles
                            WHERE user_id = $1
                              AND role_id = (SELECT id FROM roles WHERE name = 'responsavel_ciclo');
                        `;
                        await client.query(removeRoleQuery, [oldResponsavelId]);
                    }
                }
            });

            res.status(204).send(); // 204 No Content
        } catch (err) {
            console.error('Erro ao apagar ciclo formativo:', err);
            if (err.statusCode === 404) {
                return res.status(404).json({ error: err.message });
            }
            res.status(500).json({ error: 'Erro interno do servidor ao apagar ciclo formativo.' });
        }
    });

    // ============================================================================
    // 2. METAS INSTITUCIONAIS
    // ============================================================================
    router.get('/metas', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { ano_letivo } = req.query;
        let query = `SELECT * FROM eqavet_metas_institucionais`;
        const params = [];
        if (ano_letivo) { query += ` WHERE ano_letivo = $1`; params.push(ano_letivo); }
        query += ` ORDER BY ano_letivo DESC, indicador`;
        const result = await db.query(query, params);
        res.json(result.rows);
    });

    router.post('/metas', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { ano_letivo, indicador, meta_global, justificacao } = req.body;
        if (!ano_letivo || !indicador || meta_global === undefined) return res.status(400).json({ error: 'Campos obrigatórios' });
        try {
            const result = await db.query(`
                INSERT INTO eqavet_metas_institucionais (ano_letivo, indicador, meta_global, justificacao)
                VALUES ($1,$2,$3,$4)
                ON CONFLICT (ano_letivo, indicador) DO UPDATE SET meta_global=EXCLUDED.meta_global, justificacao=EXCLUDED.justificacao
                RETURNING *
            `, [ano_letivo, indicador, meta_global, justificacao || null]);
            
            // Refresh the dashboard cache after updating metas
            await refreshDashboardCache();

            res.json(result.rows[0]);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao gravar meta' }); }
    });

    // ============================================================================
    // 3. DASHBOARD (PROTECTED)
    // ============================================================================
    router.get('/dashboard', authenticateJWT, async (req, res) => {
        try {
            // This call ensures admins see the latest data and also refreshes the public cache.
            const data = await refreshDashboardCache();
            res.json(data || []);
        } catch (err) {
            console.error('Error fetching real-time EQAVET dashboard for admin:', err);
            res.status(500).json({ error: 'Could not retrieve dashboard data.' });
        }
    });

    // ============================================================================
    // 3. GESTÃO DO CACHE DO DASHBOARD
    // ============================================================================
    router.post('/refresh-dashboard-cache', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        try {
            await refreshDashboardCache();
            res.status(200).json({ success: true, message: 'O cache do dashboard EQAVET foi atualizado com sucesso.' });
        } catch (err) {
            console.error('Failed to manually refresh dashboard cache:', err);
            res.status(500).json({ error: 'Não foi possível atualizar o cache do dashboard.' });
        }
    });

const getCachedOrFreshData = async () => {
  try {
    const client = await connect(); // Ensure Redis connection is established
    const cachedData = await client.get(DASHBOARD_CACHE_KEY);

    if (cachedData) {
      console.log('[EQAVET] Serving dashboard from Redis cache.');
      const parsedData = JSON.parse(cachedData);
      return parsedData;
    }
  } catch (redisErr) {
    console.error('[EQAVET] Error connecting to Redis or fetching from cache:', redisErr);
    // Continue to fetch from DB if Redis is down or errors
  }

  console.log('[EQAVET] Fetching dashboard from database...');
  const query = `
    SELECT * FROM vw_eqavet_resumo_anual 
    ORDER BY ano_letivo DESC
  `;
  console.log('[EQAVET] Executing DB query:', query);
  try {
    const { rows } = await db.query(query);
    console.log(`[EQAVET] DB query returned ${rows.length} rows.`);
    if (rows.length > 0) {
        console.log('[EQAVET] First row of data:', rows[0]);
    }
    
    try {
      const client = await connect(); // Ensure Redis connection is established
      await client.set(DASHBOARD_CACHE_KEY, JSON.stringify(rows), { EX: 86400 }); // Cache for 24 hours in Redis
      console.log(`[EQAVET] Dashboard cached in Redis. ${rows.length} items.`);
    } catch (redisErr) {
      console.error('[EQAVET] Error storing EQAVET dashboard in Redis cache:', redisErr);
    }
    
    return rows;
  } catch (dbError) {
      console.error('[EQAVET] Database query failed:', dbError);
      throw dbError; // Re-throw to be caught by the route handler
  }
}

const getCachedOrFreshInstrumentoAnaliseData = async () => {
  try {
    const client = await connect();
    const cachedData = await client.get(INSTRUMENTO_ANALISE_CACHE_KEY);

    if (cachedData) {
      console.log('[EQAVET] Serving instrumento analise from Redis cache.');
      const parsedData = JSON.parse(cachedData);
      return parsedData;
    }
  } catch (redisErr) {
    console.error('[EQAVET] Error connecting to Redis or fetching from cache:', redisErr);
  }

  return await refreshInstrumentoAnaliseCache();
}


// ROTA PUBLICA (ou só para autenticados – tu decides)
router.get('/resumo-anual', async (req, res) => {
  console.log('[EQAVET] Received request for /resumo-anual');
  try {
    const data = await getCachedOrFreshData();
    res.json(data);
  } catch (err) {
    console.error('Erro ao obter resumo anual EQAVET:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/instrumento-analise', async (req, res) => {
  try {
    const data = await getCachedOrFreshInstrumentoAnaliseData();
    res.json(data);
  } catch (err) {
    console.error('Error fetching instrumento analise data:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTA PARA FORÇAR ATUALIZAÇÃO DO CACHE (só admins/professores)
router.post('/refresh-dashboard-cache', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
  try {
    await refreshDashboardCache();
    res.status(200).json({
      success: true,
      message: 'Cache do dashboard EQAVET atualizado com sucesso.',
      updated_at: new Date().toLocaleString('pt-PT')
    });
  } catch (err) {
    console.error('Failed to refresh EQAVET dashboard cache:', err);
    res.status(500).json({ error: 'Não foi possível atualizar o cache.' });
  }
});

    // ============================================================================
    // 4. CRUD COMPLETO DOS INDICADORES (GET + POST + PUT)
    // ============================================================================
    const indicadores = [
        { name: '1', table: 'eqavet_indicador_1_colocacao', anoOffset: 1 },
        { name: '2', table: 'eqavet_indicador_2_conclusao', anoOffset: 0 },
        { name: '3', table: 'eqavet_indicador_3_abandono', anoOffset: 0 },
        { name: '4', table: 'eqavet_indicador_4_utilizacao', anoOffset: 1 },
        { name: '5b', table: 'eqavet_indicador_5b_satisfacao_empregadores', anoOffset: 1 },
        { name: '6a', table: 'eqavet_indicador_6a_prosseguimento', anoOffset: 1 },
    ];

    indicadores.forEach(ind => {
        const table = ind.table;
        const defaultAno = () => new Date().getFullYear() + ind.anoOffset;

        // GET
        router.get(`/indicador${ind.name}`, authenticateJWT, async (req, res) => {
            const { cicloId, ano } = req.query;
            if (!cicloId) return res.status(400).json({ error: 'cicloId obrigatório' });
            const result = await db.query(`SELECT * FROM ${table} WHERE ciclo_formativo_id = $1 AND ano_recolha = $2`, [cicloId, ano || defaultAno()]);
            res.json(result.rows[0] || null);
        });

        // POST (upsert)
        router.post(`/indicador${ind.name}`, authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
            const { ciclo_formativo_id, ano_recolha = defaultAno(), ...dados } = req.body;
            const fields = Object.keys(dados);
            const values = fields.map((_, i) => `$${i + 3}`);
            const upsert = fields.map(f => `${f} = EXCLUDED.${f}`).join(', ');
            try {
                await db.query(`
                    INSERT INTO ${table} (ciclo_formativo_id, ano_recolha, ${fields.join(', ')})
                    VALUES ($1, $2, ${values.join(', ')})
                    ON CONFLICT (ciclo_formativo_id, ano_recolha) DO UPDATE SET ${upsert}
                `, [ciclo_formativo_id, ano_recolha, ...Object.values(dados)]);
                
                // Refresh cache after update
                await refreshDashboardCache();
                
                res.json({ success: true, message: `Indicador ${ind.name} gravado` });
            } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
        });

        // PUT (update completo)
        router.put(`/indicador${ind.name}`, authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
            const { ciclo_formativo_id, ano_recolha = defaultAno(), ...dados } = req.body;
            const set = Object.keys(dados).map((k, i) => `${k}=$${i + 3}`).join(', ');
            const values = [ciclo_formativo_id, ano_recolha, ...Object.values(dados)];
            try {
                const result = await db.query(`
                    UPDATE ${table} SET ${set} WHERE ciclo_formativo_id=$1 AND ano_recolha=$2 RETURNING *
                `, values);
                if (result.rowCount === 0) return res.status(404).json({ error: 'Indicador não encontrado' });
                
                // Refresh cache after update
                await refreshDashboardCache();
                
                res.json(result.rows[0]);
            } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
        });
    });

    // ============================================================================
    // 5. TRACKING DE DIPLOMADOS (fonte automática dos indicadores 1, 4, 6a)
    // ============================================================================
    router.get('/tracking', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { cicloId } = req.query;
        let query = `
            SELECT td.*, u.nome, u.numero_mecanografico 
            FROM eqavet_tracking_diplomados td
            JOIN users u ON td.aluno_id = u.id
            WHERE 1=1
        `;
        const params = [];
        if (cicloId) { query += ` AND td.ciclo_formativo_id = $${params.length + 1}`; params.push(cicloId); }
        query += ` ORDER BY u.nome`;
        const result = await db.query(query, params);
        res.json(result.rows);
    });

    router.post('/tracking', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { aluno_id, ciclo_formativo_id, situacao_atual, profissao_relacionada, empresa_id, observacoes } = req.body;
        if (!aluno_id || !ciclo_formativo_id || !situacao_atual) {
            return res.status(400).json({ error: 'Campos obrigatórios: aluno_id, ciclo_formativo_id, situacao_atual' });
        }
        try {
            await withTransaction(async (client) => {
                await client.query(`
                    INSERT INTO eqavet_tracking_diplomados 
                    (aluno_id, ciclo_formativo_id, situacao_atual, profissao_relacionada, empresa_id, observacoes, ultima_atualizacao)
                    VALUES ($1,$2,$3,$4,$5,$6,NOW())
                    ON CONFLICT (aluno_id, ciclo_formativo_id) DO UPDATE SET
                        situacao_atual = EXCLUDED.situacao_atual,
                        profissao_relacionada = EXCLUDED.profissao_relacionada,
                        empresa_id = EXCLUDED.empresa_id,
                        observacoes = EXCLUDED.observacoes,
                        ultima_atualizacao = NOW()
                `, [aluno_id, ciclo_formativo_id, situacao_atual, profissao_relacionada ?? null, empresa_id || null, observacoes || null]);

                await recalcularIndicadores(client, ciclo_formativo_id);
            });
            
            // Refresh cache after transaction succeeds
            await refreshDashboardCache();
            
            res.json({ success: true, message: 'Diplomado atualizado → Indicadores 1, 4 e 6a recalculados automaticamente' });
        } catch (err) {
            console.error('Erro no tracking:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
