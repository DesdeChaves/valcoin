-- Iniciar transação
BEGIN;

-- 1. Remover as views dependentes
DROP VIEW IF EXISTS public.v_progresso_aluno_atual;
DROP VIEW IF EXISTS public.v_competencias_disciplina_resumo;
DROP VIEW IF EXISTS public.v_estatisticas_competencias_turma;

-- 2. Remover a coluna 'dominio' da tabela 'competencia' se existir
ALTER TABLE public.competencia DROP COLUMN IF EXISTS dominio;

-- 3. Criar a nova tabela de junção para a relação muitos-para-muitos
CREATE TABLE IF NOT EXISTS public.competencia_dominio (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    competencia_id UUID NOT NULL,
    dominio_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id),
    UNIQUE (competencia_id, dominio_id),
    FOREIGN KEY (competencia_id) REFERENCES public.competencia(id) ON DELETE CASCADE,
    FOREIGN KEY (dominio_id) REFERENCES public.dominios(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.competencia_dominio IS 'Tabela de junção para ligar competências e domínios numa relação muitos-para-muitos.';
COMMENT ON COLUMN public.competencia_dominio.competencia_id IS 'Chave estrangeira para a tabela competencia.';
COMMENT ON COLUMN public.competencia_dominio.dominio_id IS 'Chave estrangeira para a tabela dominios.';

-- 4. Migrar os dados existentes da antiga coluna 'dominio_id' para a nova tabela de junção
-- Esta query assume que 'dominio_id' existia na tabela 'competencia'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='competencia' AND column_name='dominio_id') THEN
        INSERT INTO public.competencia_dominio (competencia_id, dominio_id)
        SELECT id, dominio_id FROM public.competencia WHERE dominio_id IS NOT NULL
        ON CONFLICT (competencia_id, dominio_id) DO NOTHING;
    END IF;
END $$;


-- 5. Remover a antiga coluna de chave estrangeira 'dominio_id' da tabela 'competencia'
ALTER TABLE public.competencia DROP COLUMN IF EXISTS dominio_id;

-- 6. Recriar as views com a lógica atualizada

-- v_progresso_aluno_atual
CREATE VIEW public.v_progresso_aluno_atual AS
SELECT DISTINCT ON (ac.aluno_id, ac.competencia_id)
    ac.aluno_id,
    u.nome AS aluno_nome,
    u.numero_mecanografico,
    ac.competencia_id,
    c.codigo AS competencia_codigo,
    c.nome AS competencia_nome,
    (
        SELECT json_agg(d.nome)
        FROM public.competencia_dominio cd
        JOIN public.dominios d ON d.id = cd.dominio_id
        WHERE cd.competencia_id = c.id
    ) AS dominios,
    s.nome AS disciplina_nome,
    ac.disciplina_turma_id,
    ac.nivel AS nivel_atual,
    ac.data_avaliacao AS data_ultima_avaliacao,
    ac.momento_avaliacao,
    evo.nivel_inicial,
    evo.primeira_avaliacao AS data_primeira_avaliacao,
    evo.evolucao,
    evo.total_avaliacoes
FROM
    public.avaliacao_competencia ac
    JOIN public.users u ON u.id = ac.aluno_id
    JOIN public.competencia c ON c.id = ac.competencia_id
    JOIN public.disciplina_turma dt ON dt.id = ac.disciplina_turma_id
    JOIN public.subjects s ON s.id = dt.disciplina_id
    LEFT JOIN LATERAL public.calcular_evolucao_competencia(ac.aluno_id, c.id) evo(primeira_avaliacao, ultima_avaliacao, nivel_inicial, nivel_atual_evo, evolucao, total_avaliacoes) ON true
ORDER BY
    ac.aluno_id, ac.competencia_id, ac.data_avaliacao DESC, ac.momento_avaliacao DESC;

-- v_competencias_disciplina_resumo
CREATE VIEW public.v_competencias_disciplina_resumo AS
SELECT
    s.id AS disciplina_id,
    s.nome AS disciplina_nome,
    s.codigo AS disciplina_codigo,
    COUNT(DISTINCT c.id) AS total_competencias,
    COUNT(DISTINCT CASE WHEN c.medida_educativa <> 'nenhuma' THEN c.id END) AS competencias_com_medidas,
    COUNT(DISTINCT CASE WHEN c.validado = true THEN c.id END) AS competencias_validadas
FROM
    public.subjects s
    LEFT JOIN public.competencia c ON c.disciplina_id = s.id AND c.ativo = true
WHERE
    s.ativo = true
GROUP BY
    s.id
ORDER BY
    s.nome;

-- v_estatisticas_competencias_turma
CREATE VIEW public.v_estatisticas_competencias_turma AS
SELECT
    dt.id AS disciplina_turma_id,
    dt.turma_id,
    cl.nome AS turma_nome,
    dt.disciplina_id,
    s.nome AS disciplina_nome,
    c.id AS competencia_id,
    c.nome AS competencia_nome,
    (
        SELECT json_agg(d.nome)
        FROM public.competencia_dominio cd
        JOIN public.dominios d ON d.id = cd.dominio_id
        WHERE cd.competencia_id = c.id
    ) AS dominios,
    COUNT(DISTINCT ac.aluno_id) AS total_alunos_avaliados,
    COUNT(ac.id) AS total_avaliacoes,
    AVG(public.nivel_proficiencia_to_number(ac.nivel)) AS media_niveis,
    MIN(public.nivel_proficiencia_to_number(ac.nivel)) AS nivel_minimo,
    MAX(public.nivel_proficiencia_to_number(ac.nivel)) AS nivel_maximo
FROM
    public.disciplina_turma dt
    JOIN public.classes cl ON cl.id = dt.turma_id
    JOIN public.subjects s ON s.id = dt.disciplina_id
    JOIN public.competencia c ON c.disciplina_id = s.id
    LEFT JOIN public.avaliacao_competencia ac ON ac.competencia_id = c.id AND ac.disciplina_turma_id = dt.id
WHERE
    dt.ativo = true AND c.ativo = true
GROUP BY
    dt.id, cl.nome, s.nome, c.id
ORDER BY
    cl.nome, s.nome, c.nome;

-- Cometer a transação
COMMIT;
