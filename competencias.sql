-- ============================================================================
-- COMPETÊNCIAS - Sistema de Avaliação por Competências
-- ============================================================================

-- 1. Tipos de Medidas Educativas (ENUM)
CREATE TYPE tipo_medida_educativa AS ENUM (
    'universal',
    'seletiva',
    'adicional',
    'nenhuma'
);

-- 2. Níveis de Proficiência (ENUM)
CREATE TYPE nivel_proficiencia AS ENUM (
    'fraco',
    'nao_satisfaz',
    'satisfaz',
    'satisfaz_bastante',
    'excelente'
);

-- 3. Tabela de Competências
CREATE TABLE competencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplina_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL, -- Ex: GEO8-C01
    nome VARCHAR(255) NOT NULL, -- Ex: "Interpretar mapas temáticos"
    descricao TEXT,
    
    -- Medidas Educativas aplicáveis
    medida_educativa tipo_medida_educativa DEFAULT 'nenhuma',
    descricao_adaptacao TEXT, -- Descrição de como a competência é adaptada
    
    -- Metadados
    criado_por_id UUID NOT NULL REFERENCES users(id),
    validado BOOLEAN DEFAULT false, -- Competência validada pela coordenação
    validado_por_id UUID REFERENCES users(id),
    data_validacao TIMESTAMP,
    
    -- Organização
    dominio VARCHAR(100), -- Ex: "Localização e compreensão espacial"
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(disciplina_id, codigo),
    CHECK (medida_educativa IN ('universal', 'seletiva', 'adicional', 'nenhuma'))
);

-- 4. Tabela de Associação Competência-Turma
-- Permite ativar/desativar competências específicas por turma
CREATE TABLE competencia_disciplina_turma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia_id UUID NOT NULL REFERENCES competencia(id) ON DELETE CASCADE,
    disciplina_turma_id UUID NOT NULL REFERENCES disciplina_turma(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(competencia_id, disciplina_turma_id)
);

-- 5. Tabela de Avaliações de Competências
CREATE TABLE avaliacao_competencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia_id UUID NOT NULL REFERENCES competencia(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disciplina_turma_id UUID NOT NULL REFERENCES disciplina_turma(id) ON DELETE CASCADE,
    
    -- Avaliação
    nivel nivel_proficiencia NOT NULL,
    observacoes TEXT,
    
    -- Contexto da avaliação
    momento_avaliacao VARCHAR(100), -- Ex: "1º Período", "Avaliação Diagnóstica"
    data_avaliacao DATE DEFAULT CURRENT_DATE,
    
    -- Evidências (opcional)
    evidencias JSONB, -- Array de referências a trabalhos, testes, etc.
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para queries rápidas
    CHECK (nivel IN ('fraco', 'nao_satisfaz', 'satisfaz', 'satisfaz_bastante', 'excelente'))
);

-- 6. Tabela de Medidas Educativas do Aluno
-- Regista as medidas educativas aplicadas a cada aluno
CREATE TABLE aluno_medida_educativa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo_medida tipo_medida_educativa NOT NULL,
    disciplina_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- NULL = aplica a todas
    
    descricao TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE, -- NULL = ainda ativa
    
    -- Metadados
    registado_por_id UUID NOT NULL REFERENCES users(id),
    documento_referencia VARCHAR(255), -- Ex: "RTP 2024/25"
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (tipo_medida IN ('universal', 'seletiva', 'adicional'))
);

-- 7. Tabela de Histórico de Alterações (Auditoria)
CREATE TABLE competencia_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competencia_id UUID NOT NULL REFERENCES competencia(id) ON DELETE CASCADE,
    alterado_por_id UUID NOT NULL REFERENCES users(id),
    tipo_alteracao VARCHAR(50) NOT NULL, -- 'criacao', 'edicao', 'validacao', 'desativacao'
    dados_anteriores JSONB,
    dados_novos JSONB,
    motivo TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (tipo_alteracao IN ('criacao', 'edicao', 'validacao', 'desativacao', 'ativacao'))
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Competências
CREATE INDEX idx_competencia_disciplina ON competencia(disciplina_id, ativo);
CREATE INDEX idx_competencia_medida ON competencia(medida_educativa);
CREATE INDEX idx_competencia_validado ON competencia(validado, ativo);
CREATE INDEX idx_competencia_dominio ON competencia(dominio);

-- Avaliações
CREATE INDEX idx_avaliacao_competencia_aluno ON avaliacao_competencia(aluno_id, competencia_id);
CREATE INDEX idx_avaliacao_competencia_data ON avaliacao_competencia(data_avaliacao DESC);
CREATE INDEX idx_avaliacao_competencia_nivel ON avaliacao_competencia(nivel);
CREATE INDEX idx_avaliacao_competencia_momento ON avaliacao_competencia(momento_avaliacao);
CREATE INDEX idx_avaliacao_disciplina_turma ON avaliacao_competencia(disciplina_turma_id);

-- Medidas Educativas
CREATE INDEX idx_aluno_medida_ativo ON aluno_medida_educativa(aluno_id) 
    WHERE data_fim IS NULL;
CREATE INDEX idx_aluno_medida_disciplina ON aluno_medida_educativa(aluno_id, disciplina_id);

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Evolução do aluno por competência
CREATE OR REPLACE VIEW v_evolucao_competencia_aluno AS
SELECT
    ac.aluno_id,
    ac.competencia_id,
    c.nome AS competencia_nome,
    c.codigo AS competencia_codigo,
    s.nome AS disciplina_nome,
    ac.nivel,
    ac.momento_avaliacao,
    ac.data_avaliacao,
    ac.observacoes,
    u_prof.nome AS professor_nome,
    ROW_NUMBER() OVER (PARTITION BY ac.aluno_id, ac.competencia_id ORDER BY ac.data_avaliacao DESC) AS ordem_cronologica_inversa
FROM avaliacao_competencia ac
JOIN competencia c ON c.id = ac.competencia_id
JOIN subjects s ON s.id = c.disciplina_id
JOIN users u_prof ON u_prof.id = ac.professor_id
WHERE c.ativo = true;

-- View: Resumo de competências por disciplina
CREATE VIEW v_competencias_disciplina_resumo AS
SELECT 
    s.id AS disciplina_id,
    s.nome AS disciplina_nome,
    s.codigo AS disciplina_codigo,
    COUNT(DISTINCT c.id) AS total_competencias,
    COUNT(DISTINCT CASE WHEN c.medida_educativa != 'nenhuma' THEN c.id END) AS competencias_com_medidas,
    COUNT(DISTINCT CASE WHEN c.validado = true THEN c.id END) AS competencias_validadas,
    ARRAY_AGG(DISTINCT c.dominio) FILTER (WHERE c.dominio IS NOT NULL) AS dominios
FROM subjects s
LEFT JOIN competencia c ON c.disciplina_id = s.id AND c.ativo = true
WHERE s.ativo = true
GROUP BY s.id, s.nome, s.codigo;

-- View: Progresso do aluno (última avaliação de cada competência)
DROP VIEW IF EXISTS v_progresso_aluno_atual;
CREATE VIEW v_progresso_aluno_atual AS
SELECT DISTINCT ON (ac.aluno_id, ac.competencia_id)
    ac.aluno_id,
    u.nome AS aluno_nome,
    u.numero_mecanografico,
    ac.competencia_id,
    c.codigo AS competencia_codigo,
    c.nome AS competencia_nome,
    c.dominio,
    s.nome AS disciplina_nome,
    ac.disciplina_turma_id, -- Adicionado
    ac.nivel AS nivel_atual,
    ac.momento_avaliacao AS ultimo_momento,
    ac.data_avaliacao AS ultima_avaliacao,
    ac.observacoes,
    c.medida_educativa,
    CASE
        WHEN ame.id IS NOT NULL THEN true
        ELSE false
    END AS aluno_tem_medida_educativa
FROM avaliacao_competencia ac
JOIN users u ON u.id = ac.aluno_id
JOIN competencia c ON c.id = ac.competencia_id
JOIN subjects s ON s.id = c.disciplina_id
LEFT JOIN aluno_medida_educativa ame ON (
    ame.aluno_id = ac.aluno_id
    AND (ame.disciplina_id = c.disciplina_id OR ame.disciplina_id IS NULL)
    AND ame.data_fim IS NULL
)
WHERE c.ativo = true
ORDER BY ac.aluno_id, ac.competencia_id, ac.data_avaliacao DESC;

-- View: Estatísticas de competências por turma
CREATE VIEW v_estatisticas_competencias_turma AS
SELECT 
    dt.id AS disciplina_turma_id,
    dt.turma_id,
    cl.nome AS turma_nome,
    dt.disciplina_id,
    s.nome AS disciplina_nome,
    c.id AS competencia_id,
    c.nome AS competencia_nome,
    c.dominio,
    COUNT(DISTINCT ac.aluno_id) AS total_alunos_avaliados,
    COUNT(ac.id) AS total_avaliacoes,
    ROUND(AVG(
        CASE ac.nivel
            WHEN 'fraco' THEN 1
            WHEN 'nao_satisfaz' THEN 2
            WHEN 'satisfaz' THEN 3
            WHEN 'satisfaz_bastante' THEN 4
            WHEN 'excelente' THEN 5
        END
    ), 2) AS media_nivel,
    COUNT(CASE WHEN ac.nivel = 'fraco' THEN 1 END) AS qtd_fraco,
    COUNT(CASE WHEN ac.nivel = 'nao_satisfaz' THEN 1 END) AS qtd_nao_satisfaz,
    COUNT(CASE WHEN ac.nivel = 'satisfaz' THEN 1 END) AS qtd_satisfaz,
    COUNT(CASE WHEN ac.nivel = 'satisfaz_bastante' THEN 1 END) AS qtd_satisfaz_bastante,
    COUNT(CASE WHEN ac.nivel = 'excelente' THEN 1 END) AS qtd_excelente
FROM disciplina_turma dt
JOIN classes cl ON cl.id = dt.turma_id
JOIN subjects s ON s.id = dt.disciplina_id
JOIN competencia c ON c.disciplina_id = s.id
LEFT JOIN avaliacao_competencia ac ON (
    ac.competencia_id = c.id 
    AND ac.disciplina_turma_id = dt.id
)
WHERE c.ativo = true AND dt.ativo = true
GROUP BY dt.id, dt.turma_id, cl.nome, dt.disciplina_id, s.nome, c.id, c.nome, c.dominio;

-- ============================================================================
-- FUNÇÕES ÚTEIS
-- ============================================================================

-- Função: Obter nível numérico da proficiência
CREATE OR REPLACE FUNCTION nivel_proficiencia_to_number(nivel nivel_proficiencia)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE nivel
        WHEN 'fraco' THEN 1
        WHEN 'nao_satisfaz' THEN 2
        WHEN 'satisfaz' THEN 3
        WHEN 'satisfaz_bastante' THEN 4
        WHEN 'excelente' THEN 5
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função: Verificar se aluno tem medida educativa ativa    ac.disciplina_id, 
    s.nome AS disciplina_nome,
    c.id AS competencia_id, 
    c.codigo, 
    c.nome,
    ac.nivel AS nivel_atual,
    COALESCE(evo.evolucao, 0) AS evolucao_pontos,  -- Default 0 se sem evolução (ex: 1ª avaliação)
    aluno_tem_medida_educativa(ac.aluno_id, ac.disciplina_id) AS tem_medida,
    ac.data_avaliacao AS ultima_avaliacao
FROM avaliacao_competencia ac
JOIN users u ON u.id = ac.aluno_id
JOIN competencia c ON c.id = ac.competencia_id
JOIN subjects s ON s.id = c.disciplina_id
LEFT JOIN LATERAL calcular_evolucao_competencia(ac.aluno_id, c.id) AS evo ON true  -- LATERAL para função por linha
WHERE c.ativo = true
ORDER BY ac.aluno_id, s.nome, c.ordem;
CREATE OR REPLACE FUNCTION aluno_tem_medida_educativa(
    p_aluno_id UUID,
    p_disciplina_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM aluno_medida_educativa
    WHERE aluno_id = p_aluno_id
        AND data_fim IS NULL
        AND (disciplina_id = p_disciplina_id OR disciplina_id IS NULL OR p_disciplina_id IS NULL);
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Função: Calcular evolução da competência
CREATE OR REPLACE FUNCTION calcular_evolucao_competencia(
    p_aluno_id UUID,
    p_competencia_id UUID
)
RETURNS TABLE (
    primeira_avaliacao DATE,
    ultima_avaliacao DATE,
    nivel_inicial nivel_proficiencia,
    nivel_atual nivel_proficiencia,
    evolucao INTEGER, -- Diferença numérica
    total_avaliacoes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH avaliacoes_ordenadas AS (
        SELECT 
            data_avaliacao,
            nivel,
            ROW_NUMBER() OVER (ORDER BY data_avaliacao ASC) as ordem
        FROM avaliacao_competencia
        WHERE aluno_id = p_aluno_id
            AND competencia_id = p_competencia_id
        ORDER BY data_avaliacao
    ),
    primeira AS (
        SELECT data_avaliacao, nivel
        FROM avaliacoes_ordenadas
        WHERE ordem = 1
    ),
    ultima AS (
        SELECT data_avaliacao, nivel
        FROM avaliacoes_ordenadas
        ORDER BY ordem DESC
        LIMIT 1
    )
    SELECT 
        primeira.data_avaliacao,
        ultima.data_avaliacao,
        primeira.nivel,
        ultima.nivel,
        (nivel_proficiencia_to_number(ultima.nivel) - nivel_proficiencia_to_number(primeira.nivel))::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM avaliacoes_ordenadas)    ac.disciplina_id, 
    s.nome AS disciplina_nome,
    c.id AS competencia_id, 
    c.codigo, 
    c.nome,
    ac.nivel AS nivel_atual,
    COALESCE(evo.evolucao, 0) AS evolucao_pontos,  -- Default 0 se sem evolução (ex: 1ª avaliação)
    aluno_tem_medida_educativa(ac.aluno_id, ac.disciplina_id) AS tem_medida,
    ac.data_avaliacao AS ultima_avaliacao
FROM avaliacao_competencia ac
JOIN users u ON u.id = ac.aluno_id
JOIN competencia c ON c.id = ac.competencia_id
JOIN subjects s ON s.id = c.disciplina_id
LEFT JOIN LATERAL calcular_evolucao_competencia(ac.aluno_id, c.id) AS evo ON true  -- LATERAL para função por linha
WHERE c.ativo = true
ORDER BY ac.aluno_id, s.nome, c.ordem;
    FROM primeira, ultima;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_competencia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_competencia_updated_at
    BEFORE UPDATE ON competencia
    FOR EACH ROW
    EXECUTE FUNCTION update_competencia_updated_at();

CREATE TRIGGER trigger_avaliacao_competencia_updated_at
    BEFORE UPDATE ON avaliacao_competencia
    FOR EACH ROW
    EXECUTE FUNCTION update_competencia_updated_at();

CREATE TRIGGER trigger_aluno_medida_updated_at
    BEFORE UPDATE ON aluno_medida_educativa
    FOR EACH ROW
    EXECUTE FUNCTION update_competencia_updated_at();

-- Trigger: Registar histórico de alterações
CREATE OR REPLACE FUNCTION registar_alteracao_competencia()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO competencia_historico (
            competencia_id,
            alterado_por_id,
            tipo_alteracao,
            dados_novos
        ) VALUES (
            NEW.id,
            NEW.criado_por_id,
            'criacao',
            row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO competencia_historico (
            competencia_id,
            alterado_por_id,
            tipo_alteracao,
            dados_anteriores,
            dados_novos
        ) VALUES (
            NEW.id,
            NEW.criado_por_id,
            CASE 
                WHEN OLD.validado = false AND NEW.validado = true THEN 'validacao'
                WHEN OLD.ativo = true AND NEW.ativo = false THEN 'desativacao'
                WHEN OLD.ativo = false AND NEW.ativo = true THEN 'ativacao'
                ELSE 'edicao'
            END,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_historico_competencia
    AFTER INSERT OR UPDATE ON competencia
    FOR EACH ROW
    EXECUTE FUNCTION registar_alteracao_competencia();

-- ============================================================================
-- DADOS INICIAIS (OPCIONAL)
-- ============================================================================

-- Exemplo de competências para Geografia 8º ano
INSERT INTO competencia (disciplina_id, codigo, nome, descricao, dominio, criado_por_id, ordem) 
SELECT 
    s.id,
    'GEO8-C01',
    'Interpretar mapas temáticos',
    'Capacidade de ler e interpretar diferentes tipos de mapas temáticos',
    'Localização e compreensão espacial',
    (SELECT id FROM users WHERE tipo_utilizador = 'ADMIN' LIMIT 1),
    1
FROM subjects s 
WHERE s.codigo LIKE '%GEO%' AND s.ativo = true
LIMIT 1;
