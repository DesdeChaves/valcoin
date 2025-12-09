// valcoin-admin/libs/qualidade/equavet_helpers.js
const db = require('../db');
const { redisClient, connect } = require('../redis');

const DASHBOARD_CACHE_KEY = 'dashboard:equavet';
const INSTRUMENTO_ANALISE_CACHE_KEY = 'dashboard:instrumento_analise';

/**
 * Fetches the latest EQAVET dashboard data from the database and stores it in the Redis cache.
 */
const refreshDashboardCache = async () => {
    console.log('Refreshing EQAVET dashboard cache...');
    try {
        const query = `
            SELECT * FROM vw_eqavet_resumo_anual 
            ORDER BY ano_letivo DESC;
        `;
        const { rows } = await db.query(query);
        console.log(`Database query for EQAVET dashboard returned ${rows.length} rows.`); // Added log

        const client = await connect();
        await client.set(DASHBOARD_CACHE_KEY, JSON.stringify(rows), { EX: 86400 });
        
        console.log(`EQAVET dashboard cache refreshed successfully. ${rows.length} items cached.`);
        return rows;
    } catch (err) {
        console.error('Failed to refresh EQAVET dashboard cache:', err);
    }
};

const refreshInstrumentoAnaliseCache = async () => {
    console.log('Refreshing Instrumento Analise cache...');
    try {
        const query = `
            WITH registos_expandidos AS (
              SELECT 
                cr.created_at::date AS dia,
                c.incremento AS valor_incremento_base,
                COUNT(*) AS quantidade
              FROM contador_registo cr
              JOIN contador c ON cr.contador_id = c.id
              WHERE c.ativo = true
                AND c.dossie_id = '003d696b-4df0-45ae-8d8f-eb6992614a7e'
              GROUP BY cr.created_at::date, c.incremento
            ),
            dias_ativos AS (
              SELECT 
                dia,
                SUM(CASE WHEN valor_incremento_base > 0 THEN valor_incremento_base * quantidade ELSE 0 END) AS pontos_positivos,
                SUM(CASE WHEN valor_incremento_base < 0 THEN ABS(valor_incremento_base * quantidade) ELSE 0 END) AS pontos_negativos
              FROM registos_expandidos
              GROUP BY dia
              ORDER BY dia
            ),
            dias_com_rank AS (
              SELECT 
                dia,
                pontos_positivos,
                pontos_negativos,
                (pontos_positivos - pontos_negativos) AS saldo_liquido,
                ROW_NUMBER() OVER (ORDER BY dia) AS dia_ativo_seq
              FROM dias_ativos
            )
            SELECT 
              CEIL(dia_ativo_seq::float / 10)::int AS periodo_numero,
              'Período ' || CEIL(dia_ativo_seq::float / 10) AS periodo,
              MIN(dia) AS data_inicio,
              MAX(dia) AS data_fim,
              COUNT(*) AS dias_ativos,
              SUM(pontos_positivos) AS positivos,
              SUM(pontos_negativos) AS negativos,
              SUM(pontos_positivos) - SUM(pontos_negativos) AS saldo,
              ROUND(100.0 * SUM(pontos_positivos) / NULLIF(SUM(pontos_positivos) + SUM(pontos_negativos), 0), 1) AS taxa_positividade_percent,
              ROUND((SUM(pontos_positivos) - SUM(pontos_negativos))::numeric / (MAX(dia) - MIN(dia) + 1), 2) AS media_saldo_diario,
              ROUND(SUM(pontos_positivos) - SUM(pontos_negativos)) AS saldo_liquido
            FROM dias_com_rank
            GROUP BY CEIL(dia_ativo_seq::float / 10)
            ORDER BY periodo_numero;
        `;
        const { rows } = await db.query(query);
        console.log(`Database query for Instrumento Analise returned ${rows.length} rows.`);

        const client = await connect();
        await client.set(INSTRUMENTO_ANALISE_CACHE_KEY, JSON.stringify(rows), { EX: 86400 });
        
        console.log(`Instrumento Analise cache refreshed successfully. ${rows.length} items cached.`);
        return rows;
    } catch (err) {
        console.error('Failed to refresh Instrumento Analise cache:', err);
    }
};

module.exports = {
    refreshDashboardCache,
    DASHBOARD_CACHE_KEY,
    refreshInstrumentoAnaliseCache,
    INSTRUMENTO_ANALISE_CACHE_KEY
};
