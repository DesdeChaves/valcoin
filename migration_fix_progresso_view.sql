-- This script updates the v_progresso_aluno_atual view to include missing columns.
-- It is safe to run this multiple times.

CREATE OR REPLACE VIEW public.v_progresso_aluno_atual AS
 SELECT DISTINCT ON (ac.aluno_id, ac.competencia_id) ac.aluno_id,
    u.nome AS aluno_nome,
    u.numero_mecanografico,
    ac.competencia_id,
    c.codigo AS competencia_codigo,
    c.nome AS competencia_nome,
    ( SELECT json_agg(d.nome) AS json_agg
           FROM (public.competencia_dominio cd
             JOIN public.dominios d ON ((d.id = cd.dominio_id)))
          WHERE (cd.competencia_id = c.id)) AS dominios,
    s.nome AS disciplina_nome,
    ac.disciplina_turma_id,
    ac.nivel AS nivel_atual,
    ac.data_avaliacao AS data_ultima_avaliacao,
    ac.momento_avaliacao,
    ac.observacoes,
    c.medida_educativa,
    public.aluno_tem_medida_educativa(ac.aluno_id, c.disciplina_id) AS aluno_tem_medida_educativa,
    evo.nivel_inicial,
    evo.primeira_avaliacao AS data_primeira_avaliacao,
    evo.evolucao,
    evo.total_avaliacoes
   FROM (((((public.avaliacao_competencia ac
     JOIN public.users u ON ((u.id = ac.aluno_id)))
     JOIN public.competencia c ON ((c.id = ac.competencia_id)))
     JOIN public.disciplina_turma dt ON ((dt.id = ac.disciplina_turma_id)))
     JOIN public.subjects s ON ((s.id = dt.disciplina_id)))
     LEFT JOIN LATERAL public.calcular_evolucao_competencia(ac.aluno_id, c.id) evo(primeira_avaliacao, ultima_avaliacao, nivel_inicial, nivel_atual_evo, evolucao, total_avaliacoes) ON (true))
  ORDER BY ac.aluno_id, ac.competencia_id, ac.data_avaliacao DESC, ac.momento_avaliacao DESC;

COMMENT ON VIEW public.v_progresso_aluno_atual IS 'Visão atualizada do progresso do aluno em cada competência, incluindo a última avaliação, observações e medidas educativas.';
