CREATE TABLE public.departamento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    descricao TEXT,
    coordenador_id UUID REFERENCES public.users(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.departamento IS 'Departamentos curriculares (ex: Ciências Experimentais, Matemática, Línguas)';

-- Exemplos de departamentos
INSERT INTO departamento (nome, codigo, descricao) VALUES
('Ciências Experimentais', 'CE', 'Ciências Naturais, Físico-Química, Biologia'),
('Matemática', 'MAT', 'Matemática e disciplinas relacionadas'),
('Línguas', 'LING', 'Português, Inglês, Francês, Espanhol'),
('Ciências Sociais e Humanas', 'CSH', 'História, Geografia, Filosofia');

-- Adicionar coluna departamento_id à tabela subjects
ALTER TABLE public.subjects 
ADD COLUMN departamento_id UUID REFERENCES public.departamento(id);

-- Criar índice
CREATE INDEX idx_subjects_departamento ON public.subjects(departamento_id);

-- Atualizar disciplinas existentes (exemplo)
UPDATE subjects SET departamento_id = (SELECT id FROM departamento WHERE codigo = 'CE') 
WHERE nome ILIKE '%ciências%' OR nome ILIKE '%físico%' OR nome ILIKE '%biologia%';

UPDATE subjects SET departamento_id = (SELECT id FROM departamento WHERE codigo = 'MAT') 
WHERE nome ILIKE '%matemática%';

-- MODIFICAR A TABELA criterio_sucesso
DROP TABLE IF EXISTS public.criterio_sucesso CASCADE;

CREATE TABLE public.criterio_sucesso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identificação
    codigo VARCHAR(50) NOT NULL UNIQUE, -- Ex: CE-6-01 (Ciências Experimentais, 6º ano, critério 01)
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    
    -- Vinculação ao Departamento (CHAVE!)
    departamento_id UUID NOT NULL REFERENCES public.departamento(id) ON DELETE CASCADE,
    
    -- Ano de escolaridade em que o critério é INTRODUZIDO
    ano_escolaridade_inicial INTEGER NOT NULL CHECK (ano_escolaridade_inicial BETWEEN 5 AND 12),
    
    -- Até que ano deve ser acompanhado (NULL = até conclusão)
    ano_escolaridade_limite INTEGER CHECK (ano_escolaridade_limite >= ano_escolaridade_inicial),
    
    -- Nível mínimo aceitável (escala 0-10)
    nivel_aceitavel NUMERIC(5,2) NOT NULL DEFAULT 7.0 CHECK (nivel_aceitavel BETWEEN 0 AND 10),
    
    -- Periodicidade recomendada de reavaliação
    periodicidade_avaliacao VARCHAR(20) DEFAULT 'semestral' 
        CHECK (periodicidade_avaliacao IN ('trimestral', 'semestral', 'anual')),
    
    -- Metadados
    aprovado_por VARCHAR(100), -- Ex: "Conselho Pedagógico - 15/09/2024"
    data_aprovacao DATE,
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.criterio_sucesso IS 'Critérios de sucesso definidos por departamento para acompanhamento longitudinal';
COMMENT ON COLUMN public.criterio_sucesso.departamento_id IS 'Departamento responsável pela definição e acompanhamento do critério';
COMMENT ON COLUMN public.criterio_sucesso.ano_escolaridade_inicial IS 'Ano em que o critério é introduzido';
COMMENT ON COLUMN public.criterio_sucesso.ano_escolaridade_limite IS 'Ano limite para acompanhamento (NULL = sem limite)';

-- Índices
CREATE INDEX idx_criterio_sucesso_departamento ON public.criterio_sucesso(departamento_id);
CREATE INDEX idx_criterio_sucesso_ano_inicial ON public.criterio_sucesso(ano_escolaridade_inicial);
CREATE INDEX idx_criterio_sucesso_ativo ON public.criterio_sucesso(ativo) WHERE ativo = true;

-- MODIFICAR: Agora vincula-se através do departamento
DROP TABLE IF EXISTS public.criterio_sucesso_professor CASCADE;

CREATE TABLE public.criterio_sucesso_professor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   
    criterio_sucesso_id UUID NOT NULL REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    disciplina_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
   
    data_declaracao DATE DEFAULT CURRENT_DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
   
    UNIQUE(criterio_sucesso_id, professor_id, disciplina_id)
);

-- Trigger function
CREATE OR REPLACE FUNCTION check_criterio_disciplina_departamento()
RETURNS TRIGGER AS $$
DECLARE
    dept_criterio UUID;
    dept_disciplina UUID;
BEGIN
    -- Departamento do critério de sucesso
    SELECT departamento_id INTO dept_criterio
    FROM public.criterio_sucesso
    WHERE id = NEW.criterio_sucesso_id;

    -- Departamento da disciplina escolhida
    SELECT departamento_id INTO dept_disciplina
    FROM public.subjects
    WHERE id = NEW.disciplina_id;

    IF dept_criterio IS DISTINCT FROM dept_disciplina THEN
        RAISE EXCEPTION 'A disciplina (%) não pertence ao mesmo departamento do critério de sucesso', NEW.disciplina_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER trg_check_criterio_disciplina_departamento
    BEFORE INSERT OR UPDATE ON public.criterio_sucesso_professor
    FOR EACH ROW
    EXECUTE FUNCTION check_criterio_disciplina_departamento();
    
  -- A tabela avaliacao_criterio_sucesso mantém-se similar, mas com melhorias
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
    ano_escolaridade_aluno INTEGER NOT NULL, -- Ano do aluno NESTA avaliação
    periodo VARCHAR(20), -- 'trimestre1', 'semestre1', 'anual'
    
    observacoes TEXT,
    evidencias JSONB, -- Links para trabalhos, testes, etc.
    
    -- Status de conclusão
    atingiu_sucesso BOOLEAN DEFAULT false, -- true se pontuacao >= nivel_aceitavel
    data_conclusao TIMESTAMP, -- Quando atingiu pela primeira vez
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.avaliacao_criterio_sucesso IS 'Histórico completo de avaliações de critérios ao longo dos anos';
COMMENT ON COLUMN public.avaliacao_criterio_sucesso.ano_escolaridade_aluno IS 'Ano escolar do aluno no momento desta avaliação';

-- Índices otimizados
CREATE INDEX idx_aval_criterio_aluno ON public.avaliacao_criterio_sucesso(aluno_id, criterio_sucesso_id);
CREATE INDEX idx_aval_criterio_ano_aluno ON public.avaliacao_criterio_sucesso(ano_escolaridade_aluno);
CREATE INDEX idx_aval_criterio_pendente ON public.avaliacao_criterio_sucesso(atingiu_sucesso) 
    WHERE atingiu_sucesso = false;
    
 -- View: Critérios ainda não atingidos por aluno
CREATE VIEW v_criterios_pendentes_aluno AS
SELECT 
    cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.ano_escolaridade_inicial,
    cs.nivel_aceitavel,
    d.nome AS departamento_nome,
    u.id AS aluno_id,
    u.nome AS aluno_nome,
    u.ano_escolar AS ano_atual_aluno,
    ultima_aval.pontuacao AS ultima_pontuacao,
    ultima_aval.ano_letivo AS ultima_avaliacao_ano,
    ultima_aval.created_at AS ultima_avaliacao_data,
    COUNT(todas_aval.id) AS total_avaliacoes,
    -- Quantos anos o aluno está "atrasado" neste critério
    (u.ano_escolar - cs.ano_escolaridade_inicial) AS anos_desde_introducao
FROM criterio_sucesso cs
JOIN departamento d ON d.id = cs.departamento_id
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
GROUP BY cs.id, cs.codigo, cs.nome, cs.ano_escolaridade_inicial, cs.nivel_aceitavel,
         d.nome, u.id, u.nome, u.ano_escolar, 
         ultima_aval.pontuacao, ultima_aval.ano_letivo, ultima_aval.created_at;

-- View: Dashboard para Coordenador de Departamento
CREATE VIEW v_dashboard_departamento AS
SELECT 
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    COUNT(DISTINCT cs.id) AS total_criterios,
    COUNT(DISTINCT s.id) AS total_disciplinas,
    COUNT(DISTINCT csp.professor_id) AS professores_envolvidos,
    COUNT(DISTINCT acs.aluno_id) AS alunos_avaliados,
    COUNT(DISTINCT CASE WHEN acs.atingiu_sucesso = true THEN acs.aluno_id END) AS alunos_com_sucesso,
    ROUND(AVG(acs.pontuacao), 2) AS media_pontuacoes
FROM departamento d
LEFT JOIN criterio_sucesso cs ON cs.departamento_id = d.id AND cs.ativo = true
LEFT JOIN subjects s ON s.departamento_id = d.id AND s.ativo = true
LEFT JOIN criterio_sucesso_professor csp ON csp.criterio_sucesso_id = cs.id AND csp.ativo = true
LEFT JOIN avaliacao_criterio_sucesso acs ON acs.criterio_sucesso_id = cs.id
WHERE d.ativo = true
GROUP BY d.id, d.nome;     

