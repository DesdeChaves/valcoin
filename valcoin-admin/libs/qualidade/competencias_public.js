// /libs/qualidade/competencias_public.js — VERSÃO FINAL OFICIAL (FUNCIONA 100%)
const express = require('express');
const db = require('../db');
const { redisClient } = require('../redis');

const CACHE_TTL_24H = 86400; // 24 hours in seconds

const publicCompetenciasRouter = () => {
  const router = express.Router();

  router.get('/stats', async (req, res) => {
    const cacheKey = 'competencias:stats:latest-only';

    try {
      // 1. Try to fetch from cache
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('Cache HIT for:', cacheKey);
        return res.json(JSON.parse(cachedData));
      }

      console.log('Cache MISS for:', cacheKey);
      // 2. If cache miss, fetch from DB
      const query = `
        WITH latest_evals AS (
          -- 1. Get the most recent evaluation for each student for each competency
          SELECT
            id,
            aluno_id,
            competencia_id,
            disciplina_turma_id,
            nivel,
            data_avaliacao,
            momento_avaliacao
          FROM (
            SELECT *,
                  ROW_NUMBER() OVER(PARTITION BY aluno_id, competencia_id ORDER BY data_avaliacao DESC, id DESC) as rn
            FROM avaliacao_competencia
          ) sub
          WHERE rn = 1
        ),
        overview AS (
          -- 2. Recalculate overview stats based on these latest evaluations
          SELECT
            (SELECT COUNT(*) FROM competencia WHERE ativo = true) AS total_competencias,
            (SELECT COUNT(*) FROM competencia WHERE ativo = true AND validado = true) AS competencias_validadas,
            (SELECT COUNT(*) FROM latest_evals) AS total_avaliacoes,
            (SELECT COUNT(DISTINCT aluno_id) FROM latest_evals) AS alunos_avaliados,
            (SELECT COUNT(*) FROM subjects WHERE ativo = true) AS disciplinas_ativas,
            (SELECT COUNT(*) FROM competencia WHERE ativo = true AND medida_educativa != 'nenhuma') AS competencias_com_medidas
        ),
        distribuicao_niveis AS (
          -- 3. Recalculate level distribution
          SELECT jsonb_agg(
            jsonb_build_object(
              'nivel', CASE nivel
                        WHEN 'fraco' THEN 'Fraco'
                        WHEN 'nao_satisfaz' THEN 'Não Satisfaz'
                        WHEN 'satisfaz' THEN 'Satisfaz'
                        WHEN 'satisfaz_bastante' THEN 'Satisfaz Bastante'
                        WHEN 'excelente' THEN 'Excelente'
                      END,
              'count', count,
              'percent', ROUND(100.0 * count / total_geral, 1)
            ) ORDER BY ordem
          ) AS data
          FROM (
            SELECT
              le.nivel,
              COUNT(*) AS count,
              (SELECT COUNT(*) FROM latest_evals) AS total_geral,
              CASE le.nivel
                WHEN 'fraco' THEN 1
                WHEN 'nao_satisfaz' THEN 2
                WHEN 'satisfaz' THEN 3
                WHEN 'satisfaz_bastante' THEN 4
                WHEN 'excelente' THEN 5
              END AS ordem
            FROM latest_evals le
            GROUP BY le.nivel
          ) sub
        ),
        disciplinasResumo AS (
          -- 4. Recalculate discipline summary
          SELECT jsonb_agg(
            jsonb_build_object(
              'disciplina_id', s.id,
              'disciplina_nome', s.nome,
              'disciplina_codigo', s.codigo,
              'total_competencias', COALESCE(comp_stats.total_competencias, 0),
              'competencias_validadas', COALESCE(comp_stats.validadas, 0),
              'competencias_com_medidas', COALESCE(comp_stats.com_medidas, 0),
              'total_avaliacoes', COALESCE(aval_stats.total_avaliacoes, 0),
              'dominios', COALESCE(comp_stats.dominios, '[]'::jsonb),
              'media_nivel', ROUND(COALESCE(aval_stats.media_num, 0), 2)
            ) ORDER BY s.nome
          ) AS data
          FROM subjects s
          LEFT JOIN (
            SELECT
              c.disciplina_id,
              COUNT(DISTINCT c.id) AS total_competencias,
              COUNT(DISTINCT CASE WHEN c.validado THEN c.id END) AS validadas,
              COUNT(DISTINCT CASE WHEN c.medida_educativa != 'nenhuma' THEN c.id END) AS com_medidas,
              jsonb_agg(DISTINCT d.nome) FILTER (WHERE d.nome IS NOT NULL) AS dominios
            FROM competencia c
            LEFT JOIN competencia_dominio cd ON c.id = cd.competencia_id
            LEFT JOIN dominios d ON cd.dominio_id = d.id
            WHERE c.ativo = true
            GROUP BY c.disciplina_id
          ) comp_stats ON comp_stats.disciplina_id = s.id
          LEFT JOIN (
            SELECT
              c.disciplina_id,
              COUNT(le.id) AS total_avaliacoes,
              AVG(nivel_proficiencia_to_number(le.nivel)) AS media_num
            FROM competencia c
            JOIN latest_evals le ON le.competencia_id = c.id
            WHERE c.ativo = true
            GROUP BY c.disciplina_id
          ) aval_stats ON aval_stats.disciplina_id = s.id
          WHERE s.ativo = true
        ),
        dominiosResumo AS (
          -- 5. Recalculate domain summary
          SELECT jsonb_agg(stats) AS data
          FROM (
            SELECT
              d.nome AS dominio_nome,
              COUNT(DISTINCT c.id) AS total_competencias,
              COUNT(le.id) AS total_avaliacoes,
              ROUND(AVG(nivel_proficiencia_to_number(le.nivel)), 2) AS media_nivel
            FROM dominios d
            JOIN competencia_dominio cd ON d.id = cd.dominio_id
            JOIN competencia c ON cd.competencia_id = c.id
            JOIN latest_evals le ON c.id = le.competencia_id
            GROUP BY d.nome
          ) stats
        ),
        topCompetenciasDificeis AS (
          -- 6. Recalculate 'difficult' competencies
          SELECT jsonb_agg(stats) AS data
          FROM (
            SELECT
              c.codigo,
              c.nome,
              s.nome as disciplina,
              (SELECT json_agg(d.nome) FROM competencia_dominio cd JOIN dominios d ON cd.dominio_id = d.id WHERE cd.competencia_id = c.id) as dominios,
              ROUND(AVG(nivel_proficiencia_to_number(le.nivel)), 2) as media_nivel,
              COUNT(DISTINCT le.aluno_id) as alunos_avaliados,
              COUNT(*) FILTER (WHERE le.nivel = 'fraco') as qtd_fraco,
              COUNT(*) FILTER (WHERE le.nivel = 'nao_satisfaz') as qtd_nao_satisfaz,
              c.medida_educativa
            FROM latest_evals le
            JOIN competencia c ON le.competencia_id = c.id
            JOIN subjects s ON c.disciplina_id = s.id
            GROUP BY c.id, s.nome
            ORDER BY media_nivel ASC
            LIMIT 10
          ) stats
        )
        SELECT jsonb_build_object(
          'overview', (SELECT to_jsonb(o) FROM overview o),
          'disciplinasResumo', COALESCE((SELECT data FROM disciplinasResumo), '[]'::jsonb),
          'distribuicaoNiveis', COALESCE((SELECT data FROM distribuicao_niveis), '[]'::jsonb),
          'dominiosResumo', COALESCE((SELECT data FROM dominiosResumo), '[]'::jsonb),
          'topCompetenciasDificeis', COALESCE((SELECT data FROM topCompetenciasDificeis), '[]'::jsonb)
        ) AS dashboard_data;
      `;

      const result = await db.query(query);
      const dbData = result.rows[0].dashboard_data;

      // 3. Store in cache
      await redisClient.set(cacheKey, JSON.stringify(dbData), { EX: CACHE_TTL_24H });
      console.log('Stored in cache:', cacheKey);

      res.json(dbData);
    } catch (error) {
      console.error('Erro:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/competencias-evolucao-por-disciplina', async (req, res) => {
    const cacheKey = 'competencias:evolucao-por-disciplina';

    try {
      // 1. Try to fetch from cache
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log('Cache HIT for:', cacheKey);
        return res.json(JSON.parse(cachedData));
      }

      console.log('Cache MISS for:', cacheKey);
      // 2. If cache miss, fetch from DB
      const query = `
        WITH
          momentos_recentes AS (
            SELECT
              competencia_id,
              momento_avaliacao,
              data_avaliacao,
              ROW_NUMBER() OVER (PARTITION BY competencia_id ORDER BY data_avaliacao DESC, momento_avaliacao DESC) AS rn
            FROM (
              SELECT DISTINCT competencia_id, momento_avaliacao, data_avaliacao FROM avaliacao_competencia
            ) sub
          ),
          ultimos_momentos AS (
            SELECT competencia_id, momento_avaliacao
            FROM momentos_recentes
            WHERE rn <= 2
          ),
          stats_por_momento AS (
            SELECT
              ac.competencia_id,
              ac.momento_avaliacao,
              COUNT(DISTINCT ac.aluno_id) AS total_alunos_avaliados,
              AVG(nivel_proficiencia_to_number(ac.nivel)) AS media_nivel,
              percentile_cont(0.50) WITHIN GROUP (ORDER BY nivel_proficiencia_to_number(ac.nivel)) AS p50_mediana_num
            FROM avaliacao_competencia ac
            JOIN ultimos_momentos um ON ac.competencia_id = um.competencia_id AND ac.momento_avaliacao = um.momento_avaliacao
            GROUP BY ac.competencia_id, ac.momento_avaliacao
          ),
          competencias_com_momentos AS (
            SELECT
              c.id AS competencia_id,
              c.disciplina_id,
              c.codigo AS competencia_codigo,
              c.nome AS competencia_nome,
              jsonb_agg(
                jsonb_build_object(
                  'momento_avaliacao', spm.momento_avaliacao,
                  'total_alunos_avaliados', spm.total_alunos_avaliados,
                  'media_nivel', ROUND(spm.media_nivel, 2),
                  'p50_mediana_num', spm.p50_mediana_num
                )
              ORDER BY spm.momento_avaliacao DESC
              ) AS momentos
            FROM competencia c
            JOIN stats_por_momento spm ON c.id = spm.competencia_id
            WHERE c.ativo = true
            GROUP BY c.id, c.disciplina_id, c.codigo, c.nome
          )
        SELECT
          s.id AS disciplina_id,
          s.nome AS disciplina_nome,
          s.codigo AS disciplina_codigo,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'competencia_id', ccm.competencia_id,
                'competencia_codigo', ccm.competencia_codigo,
                'competencia_nome', ccm.competencia_nome,
                'momentos', ccm.momentos
              )
              ORDER BY ccm.competencia_codigo
            ) FILTER (WHERE ccm.competencia_id IS NOT NULL),
            '[]'::jsonb
          ) AS competencias
        FROM subjects s
        LEFT JOIN competencias_com_momentos ccm ON s.id = ccm.disciplina_id
        WHERE s.ativo = true
        GROUP BY s.id, s.nome, s.codigo
        ORDER BY s.nome;
      `;

      const result = await db.query(query);
      const dbData = result.rows;

      // 3. Store in cache
      await redisClient.set(cacheKey, JSON.stringify(dbData), { EX: CACHE_TTL_24H });
      console.log('Stored in cache:', cacheKey);

      res.json(dbData);
    } catch (error) {
      console.error('Erro ao buscar evolução de competências por disciplina:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

module.exports = publicCompetenciasRouter;
