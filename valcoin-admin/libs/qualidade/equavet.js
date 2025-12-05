// ./libs/qualidade/equavet.js
// MÓDULO EQAVET COMPLETO — Versão Final 2025
// Alinhado com ANQEP, PO CH, SIGO, Auditorias

const express = require('express');
const db = require('../db');
const { withTransaction } = require('../db');

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
                SELECT cf.*, COUNT(tc.turma_id) as total_turmas
                FROM eqavet_ciclos_formativos cf
                LEFT JOIN eqavet_turma_ciclo tc ON tc.ciclo_formativo_id = cf.id
                WHERE cf.ativo = $1
            `;
            const params = [ativo]; // Changed from ativo === 'true' to ativo
            if (ano_inicio) { query += ` AND cf.ano_inicio = $${params.length + 1}`; params.push(ano_inicio); }
            if (area_educacao_formacao) { query += ` AND cf.area_educacao_formacao = $${params.length + 1}`; params.push(area_educacao_formacao); }
            query += ` GROUP BY cf.id ORDER BY cf.ano_inicio DESC, cf.designacao`;
            const result = await db.query(query, params);
            res.json(result.rows);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao listar ciclos' }); }
    });

    router.post('/ciclos', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { designacao, codigo_curso, area_educacao_formacao, nivel_qnq, ano_inicio, ano_fim, observacoes } = req.body;
        if (!designacao || !ano_inicio || !ano_fim || !nivel_qnq) return res.status(400).json({ error: 'Campos obrigatórios em falta' });
        try {
            const result = await db.query(`
                INSERT INTO eqavet_ciclos_formativos 
                (designacao, codigo_curso, area_educacao_formacao, nivel_qnq, ano_inicio, ano_fim, observacoes)
                VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
            `, [designacao, codigo_curso || null, area_educacao_formacao || null, nivel_qnq, ano_inicio, ano_fim, observacoes || null]);
            res.status(201).json(result.rows[0]);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao criar ciclo' }); }
    });

    router.put('/ciclos/:id', authenticateJWT, authenticateAdminOrProfessor, async (req, res) => {
        const { id } = req.params;
        const fields = req.body;
        const allowed = ['designacao','codigo_curso','area_educacao_formacao','nivel_qnq','ano_inicio','ano_fim','observacoes','ativo'];
        const set = Object.keys(fields).filter(k => allowed.includes(k)).map((k,i) => `${k}=$${i+1}`).join(', ');
        const values = Object.values(fields).filter((_,i) => allowed.includes(Object.keys(fields)[i]));
        values.push(id);
        try {
            const result = await db.query(`UPDATE eqavet_ciclos_formativos SET ${set}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Ciclo não encontrado' });
            res.json(result.rows[0]);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao atualizar ciclo' }); }
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
            res.json(result.rows[0]);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro ao gravar meta' }); }
    });

    // ============================================================================
    // 3. DASHBOARD METAS vs RESULTADOS
    // ============================================================================
    router.get('/dashboard', authenticateJWT, async (req, res) => {
        try {
            const query = `
                SELECT
                    cf.id,
                    cf.designacao AS ciclo_formativo,
                    cf.area_educacao_formacao,
                    cf.nivel_qnq,
                    (cf.ano_inicio || '/' || right(cf.ano_fim::text,2)) AS ano_letivo,

                    COALESCE(i1.taxa_colocacao_global, 0) AS resultado_ind1,
                    COALESCE(m1.meta_global, 0) AS meta_ind1,
                    
                    COALESCE(i2.taxa_conclusao_global, 0) AS resultado_ind2,
                    COALESCE(m2.meta_global, 0) AS meta_ind2,
                    
                    COALESCE(i3.taxa_abandono_global, 0) AS resultado_ind3,
                    COALESCE(m3.meta_global, 0) AS meta_ind3,
                    
                    COALESCE(i4.taxa_utilizacao_global, 0) AS resultado_ind4,
                    COALESCE(m4.meta_global, 0) AS meta_ind4,

                    COALESCE(i5.media_satisfacao_global, 0) AS resultado_ind5,
                    COALESCE(m5.meta_global, 0) AS meta_ind5,

                    COALESCE(i6.taxa_prosseguimento_global, 0) AS resultado_ind6a,
                    COALESCE(m6.meta_global, 0) AS meta_ind6a

                FROM eqavet_ciclos_formativos cf

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_1_colocacao
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i1 ON i1.ciclo_formativo_id = cf.id

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_2_conclusao
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i2 ON i2.ciclo_formativo_id = cf.id

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_3_abandono
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i3 ON i3.ciclo_formativo_id = cf.id

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_4_utilizacao
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i4 ON i4.ciclo_formativo_id = cf.id

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_5b_satisfacao_empregadores
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i5 ON i5.ciclo_formativo_id = cf.id

                LEFT JOIN (
                    SELECT DISTINCT ON (ciclo_formativo_id) *
                    FROM eqavet_indicador_6a_prosseguimento
                    ORDER BY ciclo_formativo_id, ano_recolha DESC
                ) i6 ON i6.ciclo_formativo_id = cf.id

                LEFT JOIN eqavet_metas_institucionais m1 ON m1.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m1.indicador = '1'
                LEFT JOIN eqavet_metas_institucionais m2 ON m2.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m2.indicador = '2'
                LEFT JOIN eqavet_metas_institucionais m3 ON m3.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m3.indicador = '3'
                LEFT JOIN eqavet_metas_institucionais m4 ON m4.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m4.indicador = '4'
                LEFT JOIN eqavet_metas_institucionais m5 ON m5.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m5.indicador = '5b'
                LEFT JOIN eqavet_metas_institucionais m6 ON m6.ano_letivo = (cf.ano_inicio || '/' || cf.ano_fim) AND m6.indicador = '6a'

                WHERE cf.ativo = true
                ORDER BY cf.ano_inicio DESC, cf.designacao;
            `;
            const result = await db.query(query);
            res.json(result.rows);
        } catch (err) { console.error(err); res.status(500).json({ error: 'Erro no dashboard' }); }
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
            res.json({ success: true, message: 'Diplomado atualizado → Indicadores 1, 4 e 6a recalculados automaticamente' });
        } catch (err) {
            console.error('Erro no tracking:', err);
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
