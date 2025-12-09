// /libs/qualidade/competencias_public.js — VERSÃO FINAL OFICIAL (FUNCIONA 100%)
const express = require('express');
const db = require('../db');

const publicCompetenciasRouter = () => {
  const router = express.Router();


router.get('/stats', async (req, res) => {
  const query = `
    WITH overview AS (
      SELECT
        (SELECT COUNT(*) FROM competencia WHERE ativo = true)                                      AS total_competencias,
        (SELECT COUNT(*) FROM competencia WHERE ativo = true AND validado = true)                  AS competencias_validadas,
        (SELECT COUNT(*) FROM avaliacao_competencia)                                               AS total_avaliacoes,
        (SELECT COUNT(DISTINCT aluno_id) FROM avaliacao_competencia)                               AS alunos_avaliados,
        (SELECT COUNT(*) FROM subjects WHERE ativo = true)                                         AS disciplinas_ativas,
        (SELECT COUNT(*) FROM competencia WHERE ativo = true AND medida_educativa != 'nenhuma')   AS competencias_com_medidas
    ),
    distribuicao_niveis AS (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nivel', CASE nivel
                     WHEN 'fraco'            THEN 'Fraco'
                     WHEN 'nao_satisfaz'     THEN 'Não Satisfaz'
                     WHEN 'satisfaz'         THEN 'Satisfaz'
                     WHEN 'satisfaz_bastante' THEN 'Satisfaz Bastante'
                     WHEN 'excelente'        THEN 'Excelente'
                   END,
          'count', count,
          'percent', ROUND(100.0 * count / total_geral, 1)
        )
        ORDER BY ordem
      ) AS data
      FROM (
        SELECT
          ac.nivel,
          COUNT(*) AS count,
          (SELECT COUNT(*) FROM avaliacao_competencia) AS total_geral,
          CASE ac.nivel
            WHEN 'fraco'            THEN 1
            WHEN 'nao_satisfaz'     THEN 2
            WHEN 'satisfaz'         THEN 3
            WHEN 'satisfaz_bastante' THEN 4
            WHEN 'excelente'        THEN 5
          END AS ordem
        FROM avaliacao_competencia ac
        GROUP BY ac.nivel
      ) sub
    ),
    disciplinasResumo AS (
      SELECT jsonb_agg(
        jsonb_build_object(
          'disciplina_id',               s.id,
          'disciplina_nome',             s.nome,
          'disciplina_codigo',           s.codigo,
          'total_competencias',          COALESCE(comp_stats.total_competencias, 0),
          'competencias_validadas',      COALESCE(comp_stats.validadas, 0),
          'competencias_com_medidas',    COALESCE(comp_stats.com_medidas, 0),
          'total_avaliacoes',            COALESCE(aval_stats.total_avaliacoes, 0),
          'dominios',                    COALESCE(comp_stats.dominios, '[]'::jsonb),
          'media_nivel',                 ROUND(COALESCE(aval_stats.media_num, 0), 2)
        )
        ORDER BY s.nome
      ) AS data
      FROM subjects s
      -- Contar COMPETÊNCIAS (não avaliações)
      LEFT JOIN (
        SELECT
          c.disciplina_id,
          COUNT(DISTINCT c.id) AS total_competencias, 
          COUNT(DISTINCT CASE WHEN c.validado THEN c.id END) AS validadas,
          COUNT(DISTINCT CASE WHEN c.medida_educativa != 'nenhuma' THEN c.id END) AS com_medidas,
          jsonb_agg(DISTINCT NULLIF(TRIM(c.dominio), '')) FILTER (WHERE TRIM(c.dominio) != '') AS dominios
        FROM competencia c
        WHERE c.ativo = true
        GROUP BY c.disciplina_id
      ) comp_stats ON comp_stats.disciplina_id = s.id
      -- Contar AVALIAÇÕES e calcular média
      LEFT JOIN (
        SELECT
          c.disciplina_id,
          COUNT(ac.id) AS total_avaliacoes,
          AVG(
            CASE ac.nivel
              WHEN 'fraco'            THEN 1
              WHEN 'nao_satisfaz'     THEN 2
              WHEN 'satisfaz'         THEN 3
              WHEN 'satisfaz_bastante' THEN 4
              WHEN 'excelente'        THEN 5
              ELSE NULL
            END
          ) AS media_num
        FROM competencia c
        LEFT JOIN avaliacao_competencia ac ON ac.competencia_id = c.id
        WHERE c.ativo = true
        GROUP BY c.disciplina_id
      ) aval_stats ON aval_stats.disciplina_id = s.id
      WHERE s.ativo = true
    )
    SELECT jsonb_build_object(
      'overview',             (SELECT to_jsonb(o) FROM overview o),
      'disciplinasResumo',    COALESCE((SELECT data FROM disciplinasResumo), '[]'::jsonb),
      'distribuicaoNiveis',   COALESCE((SELECT data FROM distribuicao_niveis), '[]'::jsonb)
    ) AS dashboard_data;
  `;

  try {
    const result = await db.query(query);
    res.json(result.rows[0].dashboard_data);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

  return router;
};

module.exports = publicCompetenciasRouter;
