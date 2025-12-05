-- ============================================================================
-- 1. MODIFICAR criterio_sucesso - REMOVER departamento_id direto
-- ============================================================================

DROP TABLE IF EXISTS public.criterio_sucesso CASCADE;

CREATE TABLE public.criterio_sucesso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identificação
    codigo VARCHAR(50) NOT NULL UNIQUE, -- Ex: CE-MAT-6-01 (multi-departamento)
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    
    -- Ano de escolaridade em que o critério é INTRODUZIDO
    ano_escolaridade_inicial INTEGER NOT NULL CHECK (ano_escolaridade_inicial BETWEEN 5 AND 12),
    
    -- Até que ano deve ser acompanhado (NULL = até conclusão)
    ano_escolaridade_limite INTEGER CHECK (ano_escolaridade_limite >= ano_escolaridade_inicial),
    
    -- Nível mínimo aceitável (escala 0-10)
    nivel_aceitavel NUMERIC(5,2) NOT NULL DEFAULT 7.0 CHECK (nivel_aceitavel BETWEEN 0 AND 10),
    
    -- Periodicidade recomendada de reavaliação
    periodicidade_avaliacao VARCHAR(20) DEFAULT 'semestral' 
        CHECK (periodicidade_avaliacao IN ('trimestral', 'semestral', 'anual')),
    
    -- Tipo de critério (útil para análises)
    tipo_criterio VARCHAR(50) DEFAULT 'departamental',
    -- 'departamental', 'transversal', 'interdisciplinar', 'global'
    
    -- Metadados
    aprovado_por VARCHAR(100), -- Ex: "Conselho Pedagógico - 15/09/2024"
    data_aprovacao DATE,
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.criterio_sucesso IS 'Critérios de sucesso para acompanhamento longitudinal - podem ser multi-departamentais';
COMMENT ON COLUMN public.criterio_sucesso.tipo_criterio IS 'Classificação do critério: departamental (1 dept), transversal (2+ depts), interdisciplinar, global';

-- Índices
CREATE INDEX idx_criterio_sucesso_ano_inicial ON public.criterio_sucesso(ano_escolaridade_inicial);
CREATE INDEX idx_criterio_sucesso_ativo ON public.criterio_sucesso(ativo) WHERE ativo = true;
CREATE INDEX idx_criterio_sucesso_tipo ON public.criterio_sucesso(tipo_criterio);

-- ============================================================================
-- 2. NOVA TABELA: criterio_sucesso_departamento (MANY-TO-MANY)
-- ============================================================================

CREATE TABLE public.criterio_sucesso_departamento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    criterio_sucesso_id UUID NOT NULL REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE,
    departamento_id UUID NOT NULL REFERENCES public.departamento(id) ON DELETE CASCADE,
    
    -- Papel do departamento neste critério
    papel VARCHAR(50) DEFAULT 'responsavel',
    -- 'responsavel' (dept principal), 'colaborador', 'apoio'
    
    -- Ordem de prioridade (1 = principal, 2+ = secundários)
    prioridade INTEGER DEFAULT 1,
    
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(criterio_sucesso_id, departamento_id)
);

COMMENT ON TABLE public.criterio_sucesso_departamento IS 'Associação N-N entre critérios de sucesso e departamentos';
COMMENT ON COLUMN public.criterio_sucesso_departamento.papel IS 'Responsável = dept principal, Colaborador = dept secundário';
COMMENT ON COLUMN public.criterio_sucesso_departamento.prioridade IS '1 = departamento principal, 2+ = departamentos colaboradores';

-- Índices
CREATE INDEX idx_csd_criterio ON public.criterio_sucesso_departamento(criterio_sucesso_id);
CREATE INDEX idx_csd_departamento ON public.criterio_sucesso_departamento(departamento_id);
CREATE INDEX idx_csd_ativo ON public.criterio_sucesso_departamento(ativo) WHERE ativo = true;

-- ============================================================================
-- 3. ATUALIZAR criterio_sucesso_professor - VALIDAÇÃO MAIS FLEXÍVEL
-- ============================================================================

DROP TABLE IF EXISTS public.criterio_sucesso_professor CASCADE;

CREATE TABLE public.criterio_sucesso_professor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    criterio_sucesso_id UUID NOT NULL REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    
    -- Data em que o professor se declarou competente
    data_declaracao DATE DEFAULT CURRENT_DATE,
    
    -- Notas sobre a competência (opcional)
    observacoes TEXT,
    
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(criterio_sucesso_id, professor_id, disciplina_id)
);

COMMENT ON TABLE public.criterio_sucesso_professor IS 'Professores que avaliam critérios - disciplina deve pertencer a um dos departamentos do critério';

-- Índices
CREATE INDEX idx_csp_criterio ON public.criterio_sucesso_professor(criterio_sucesso_id);
CREATE INDEX idx_csp_professor ON public.criterio_sucesso_professor(professor_id) WHERE ativo = true;
CREATE INDEX idx_csp_disciplina ON public.criterio_sucesso_professor(disciplina_id);

-- ============================================================================
-- 4. TRIGGER ATUALIZADO - Verificar se disciplina pertence a ALGUM departamento do critério
-- ============================================================================

DROP TRIGGER IF EXISTS trg_check_criterio_disciplina_departamento ON public.criterio_sucesso_professor;
DROP FUNCTION IF EXISTS check_criterio_disciplina_departamento();

CREATE OR REPLACE FUNCTION check_criterio_disciplina_departamento()
RETURNS TRIGGER AS $$
DECLARE
    dept_disciplina UUID;
    criterio_tem_departamento BOOLEAN;
BEGIN
    -- Departamento da disciplina escolhida
    SELECT departamento_id INTO dept_disciplina
    FROM public.subjects
    WHERE id = NEW.disciplina_id;
    
    -- Verificar se esse departamento está associado ao critério
    SELECT EXISTS (
        SELECT 1 
        FROM public.criterio_sucesso_departamento
        WHERE criterio_sucesso_id = NEW.criterio_sucesso_id
            AND departamento_id = dept_disciplina
            AND ativo = true
    ) INTO criterio_tem_departamento;
    
    IF NOT criterio_tem_departamento THEN
        RAISE EXCEPTION 'A disciplina (%) não pertence a nenhum dos departamentos associados ao critério de sucesso', NEW.disciplina_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_criterio_disciplina_departamento
    BEFORE INSERT OR UPDATE ON public.criterio_sucesso_professor
    FOR EACH ROW
    EXECUTE FUNCTION check_criterio_disciplina_departamento();

-- ============================================================================
-- 5. AVALIAÇÕES - Mantém-se igual
-- ============================================================================

DROP TABLE IF EXISTS public.avaliacao_criterio_sucesso CASCADE;

CREATE TABLE public.avaliacao_criterio_sucesso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    criterio_sucesso_id UUID NOT NULL REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id),
    disciplina_id UUID NOT NULL REFERENCES public.subjects(id),
    
    -- Avaliação (escala 0-10 para uniformizar)
    pontuacao NUMERIC(5,2) NOT NULL CHECK (pontuacao BETWEEN 0 AND 10),
    
    -- Contexto temporal
    ano_letivo VARCHAR(9) NOT NULL,
    ano_escolaridade_aluno INTEGER NOT NULL,
    periodo VARCHAR(20),
    
    observacoes TEXT,
    evidencias JSONB,
    
    -- Status de conclusão
    atingiu_sucesso BOOLEAN DEFAULT false,
    data_conclusao TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_aval_criterio_aluno ON public.avaliacao_criterio_sucesso(aluno_id, criterio_sucesso_id);
CREATE INDEX idx_aval_criterio_ano_aluno ON public.avaliacao_criterio_sucesso(ano_escolaridade_aluno);
CREATE INDEX idx_aval_criterio_pendente ON public.avaliacao_criterio_sucesso(atingiu_sucesso) 
    WHERE atingiu_sucesso = false;
CREATE INDEX idx_aval_criterio_disciplina ON public.avaliacao_criterio_sucesso(disciplina_id);

-- ============================================================================
-- 6. VIEWS ATUALIZADAS COM MULTI-DEPARTAMENTO
-- ============================================================================

-- View: Critérios com seus departamentos
CREATE OR REPLACE VIEW v_criterios_departamentos AS
SELECT 
    cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.descricao,
    cs.ano_escolaridade_inicial,
    cs.ano_escolaridade_limite,
    cs.nivel_aceitavel,
    cs.tipo_criterio,
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    d.codigo AS departamento_codigo,
    csd.papel AS papel_departamento,
    csd.prioridade AS prioridade_departamento,
    COUNT(*) OVER (PARTITION BY cs.id) AS total_departamentos
FROM criterio_sucesso cs
JOIN criterio_sucesso_departamento csd ON csd.criterio_sucesso_id = cs.id AND csd.ativo = true
JOIN departamento d ON d.id = csd.departamento_id AND d.ativo = true
WHERE cs.ativo = true
ORDER BY cs.codigo, csd.prioridade;

COMMENT ON VIEW v_criterios_departamentos IS 'Lista todos os critérios com seus departamentos associados';

-- View: Critérios pendentes por aluno (ATUALIZADA)
DROP VIEW IF EXISTS v_criterios_pendentes_aluno;

CREATE VIEW v_criterios_pendentes_aluno AS
SELECT 
    cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.tipo_criterio,
    cs.ano_escolaridade_inicial,
    cs.nivel_aceitavel,
    -- Lista de departamentos (agregada)
    STRING_AGG(DISTINCT d.nome, ', ' ORDER BY d.nome) AS departamentos,
    COUNT(DISTINCT csd.departamento_id) AS total_departamentos,
    u.id AS aluno_id,
    u.nome AS aluno_nome,
    u.ano_escolar AS ano_atual_aluno,
    ultima_aval.pontuacao AS ultima_pontuacao,
    ultima_aval.ano_letivo AS ultima_avaliacao_ano,
    ultima_aval.created_at AS ultima_avaliacao_data,
    COUNT(todas_aval.id) AS total_avaliacoes,
    -- Quantos departamentos JÁ avaliaram
    COUNT(DISTINCT todas_aval.disciplina_id) FILTER (WHERE todas_aval.id IS NOT NULL) AS disciplinas_que_avaliaram,
    (u.ano_escolar - cs.ano_escolaridade_inicial) AS anos_desde_introducao
FROM criterio_sucesso cs
JOIN criterio_sucesso_departamento csd ON csd.criterio_sucesso_id = cs.id AND csd.ativo = true
JOIN departamento d ON d.id = csd.departamento_id AND d.ativo = true
CROSS JOIN users u
LEFT JOIN LATERAL (
    SELECT *
    FROM avaliacao_criterio_sucesso
    WHERE criterio_sucesso_id = cs.id AND aluno_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) ultima_aval ON true
LEFT JOIN avaliacao_criterio_sucesso todas_aval ON (
    todas_aval.criterio_sucesso_id = cs.id AND todas_aval.aluno_id = u.id
)
WHERE u.tipo_utilizador = 'ALUNO'
    AND u.ativo = true
    AND cs.ativo = true
    AND u.ano_escolar >= cs.ano_escolaridade_inicial
    AND (cs.ano_escolaridade_limite IS NULL OR u.ano_escolar <= cs.ano_escolaridade_limite)
    AND (ultima_aval.atingiu_sucesso IS NULL OR ultima_aval.atingiu_sucesso = false)
GROUP BY cs.id, cs.codigo, cs.nome, cs.tipo_criterio, cs.ano_escolaridade_inicial, cs.nivel_aceitavel,
         u.id, u.nome, u.ano_escolar, 
         ultima_aval.pontuacao, ultima_aval.ano_letivo, ultima_aval.created_at;

-- View: Dashboard departamento (ATUALIZADO)
DROP VIEW IF EXISTS v_dashboard_departamento;

CREATE VIEW v_dashboard_departamento AS
SELECT 
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    d.codigo AS departamento_codigo,
    -- Critérios onde é responsável principal
    COUNT(DISTINCT CASE WHEN csd.prioridade = 1 THEN cs.id END) AS criterios_principais,
    -- Critérios onde é colaborador
    COUNT(DISTINCT CASE WHEN csd.prioridade > 1 THEN cs.id END) AS criterios_colaborador,
    COUNT(DISTINCT cs.id) AS total_criterios,
    COUNT(DISTINCT s.id) AS total_disciplinas,
    COUNT(DISTINCT csp.professor_id) AS professores_envolvidos,
    COUNT(DISTINCT acs.aluno_id) AS alunos_avaliados,
    COUNT(DISTINCT CASE WHEN acs.atingiu_sucesso = true THEN acs.aluno_id END) AS alunos_com_sucesso,
    ROUND(AVG(acs.pontuacao), 2) AS media_pontuacoes
FROM departamento d
LEFT JOIN criterio_sucesso_departamento csd ON csd.departamento_id = d.id AND csd.ativo = true
LEFT JOIN criterio_sucesso cs ON cs.id = csd.criterio_sucesso_id AND cs.ativo = true
LEFT JOIN subjects s ON s.departamento_id = d.id AND s.ativo = true
LEFT JOIN criterio_sucesso_professor csp ON csp.criterio_sucesso_id = cs.id AND csp.ativo = true
LEFT JOIN avaliacao_criterio_sucesso acs ON acs.criterio_sucesso_id = cs.id
WHERE d.ativo = true
GROUP BY d.id, d.nome, d.codigo;

-- View: Quais professores PODEM avaliar cada critério
CREATE VIEW v_professores_elegiveis_criterio AS
SELECT 
    cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    u.id AS professor_id,
    u.nome AS professor_nome,
    s.id AS disciplina_id,
    s.nome AS disciplina_nome,
    d.nome AS departamento_nome,
    csp.id IS NOT NULL AS ja_declarou_competencia,
    csp.ativo AS competencia_ativa
FROM criterio_sucesso cs
JOIN criterio_sucesso_departamento csd ON csd.criterio_sucesso_id = cs.id AND csd.ativo = true
JOIN subjects s ON s.departamento_id = csd.departamento_id AND s.ativo = true
JOIN disciplina_turma dt ON dt.disciplina_id = s.id AND dt.ativo = true
JOIN users u ON u.id = dt.professor_id AND u.tipo_utilizador = 'PROFESSOR' AND u.ativo = true
JOIN departamento d ON d.id = csd.departamento_id
LEFT JOIN criterio_sucesso_professor csp ON (
    csp.criterio_sucesso_id = cs.id 
    AND csp.professor_id = u.id 
    AND csp.disciplina_id = s.id
)
WHERE cs.ativo = true
GROUP BY cs.id, cs.codigo, cs.nome, u.id, u.nome, s.id, s.nome, d.nome, csp.id, csp.ativo
ORDER BY cs.codigo, u.nome;

-- ============================================================================
-- 7. FUNÇÕES ÚTEIS
-- ============================================================================

-- Obter departamentos de um critério
CREATE OR REPLACE FUNCTION get_departamentos_criterio(p_criterio_id UUID)
RETURNS TABLE (
    departamento_id UUID,
    departamento_nome VARCHAR,
    papel VARCHAR,
    prioridade INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.nome,
        csd.papel,
        csd.prioridade
    FROM criterio_sucesso_departamento csd
    JOIN departamento d ON d.id = csd.departamento_id
    WHERE csd.criterio_sucesso_id = p_criterio_id
        AND csd.ativo = true
        AND d.ativo = true
    ORDER BY csd.prioridade;
END;
$$ LANGUAGE plpgsql;

-- Verificar se professor pode avaliar critério
CREATE OR REPLACE FUNCTION professor_pode_avaliar_criterio(
    p_professor_id UUID,
    p_criterio_id UUID,
    p_disciplina_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    dept_disciplina UUID;
    pode_avaliar BOOLEAN;
BEGIN
    -- Departamento da disciplina
    SELECT departamento_id INTO dept_disciplina
    FROM subjects
    WHERE id = p_disciplina_id;
    
    -- Verificar se departamento está no critério
    SELECT EXISTS (
        SELECT 1
        FROM criterio_sucesso_departamento
        WHERE criterio_sucesso_id = p_criterio_id
            AND departamento_id = dept_disciplina
            AND ativo = true
    ) INTO pode_avaliar;
    
    RETURN pode_avaliar;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. EXEMPLOS DE USO
-- ============================================================================

-- Exemplo 1: Criar critério multi-departamental
/*
-- Passo 1: Criar o critério
INSERT INTO criterio_sucesso (codigo, nome, descricao, ano_escolaridade_inicial, tipo_criterio)
VALUES (
    'CE-MAT-6-01',
    'Planear experiências simples com aplicação matemática',
    'Capacidade de planear experiências científicas simples aplicando conceitos matemáticos',
    6,
    'transversal'
);

-- Passo 2: Associar departamentos
INSERT INTO criterio_sucesso_departamento (criterio_sucesso_id, departamento_id, papel, prioridade)
VALUES 
    ((SELECT id FROM criterio_sucesso WHERE codigo = 'CE-MAT-6-01'),
     (SELECT id FROM departamento WHERE codigo = 'CE'),
     'responsavel',
     1),
    ((SELECT id FROM criterio_sucesso WHERE codigo = 'CE-MAT-6-01'),
     (SELECT id FROM departamento WHERE codigo = 'MAT'),
     'colaborador',
     2);
*/

-- Exemplo 2: Ver critérios de um departamento
/*
SELECT * FROM v_criterios_departamentos 
WHERE departamento_codigo = 'CE'
ORDER BY criterio_codigo;
*/

-- Exemplo 3: Professores que podem avaliar um critério
/*
SELECT * FROM v_professores_elegiveis_criterio
WHERE criterio_codigo = 'CE-MAT-6-01';
*/
