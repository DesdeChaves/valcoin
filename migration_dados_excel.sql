CREATE TABLE avaliacoes_alunos (
    id SERIAL PRIMARY KEY,
   
    -- Ano letivo (ex: '2023/2024', '2024/2025')
    ano_letivo TEXT NOT NULL,
   
    -- Período de avaliação (1.º, 2.º ou 3.º)
    periodo TEXT NOT NULL CHECK (periodo IN ('1', '2', '3')),
   
    -- Ano escolar (o que já existia no Excel: '1.º', '2.º', '3.º', '4.º', '5.º', etc.)
    ano TEXT NOT NULL,
   
    turma TEXT NOT NULL,
    disciplina TEXT NOT NULL,
   
    -- Campos comuns a todos os ciclos
    total_alunos INTEGER,
    total_positivos INTEGER,
    percent_positivos NUMERIC(5,2),
    total_negativos INTEGER,
    percent_negativos NUMERIC(5,2),
   
    -- Ciclo (para facilitar filtros e validações)
    ciclo TEXT NOT NULL CHECK (ciclo IN ('1_ciclo', '2_ciclo', '3_ciclo', 'secundario')),
   
    -- Classificações variáveis (níveis/notas específicas de cada escala)
    classificacoes JSONB NOT NULL,
   
    -- NOVA COLUNA: Média calculada (ponderada para básicos; direta ou aproximada para secundário)
    media_calculada NUMERIC(4,2),  -- ex: 15.75 (notas 0-20)
   
    -- Opcional: nome da sheet no Excel (útil para debug ou auditoria)
    sheet_name TEXT,
   
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices essenciais para performance
CREATE INDEX idx_avaliacoes_ano_letivo ON avaliacoes_alunos(ano_letivo);
CREATE INDEX idx_avaliacoes_periodo ON avaliacoes_alunos(periodo);
CREATE INDEX idx_avaliacoes_ciclo ON avaliacoes_alunos(ciclo);
CREATE INDEX idx_avaliacoes_ano_turma ON avaliacoes_alunos(ano, turma);
CREATE INDEX idx_avaliacoes_disciplina ON avaliacoes_alunos(disciplina);
CREATE INDEX idx_avaliacoes_classificacoes ON avaliacoes_alunos USING GIN (classificacoes);

-- NOVO ÍNDICE para consultas por média (muito útil para análises)
CREATE INDEX idx_avaliacoes_media_calculada ON avaliacoes_alunos(media_calculada);

ALTER TABLE avaliacoes_alunos DROP COLUMN IF EXISTS media_calculada;
-- Garante que 'media' existe
ALTER TABLE avaliacoes_alunos ADD COLUMN IF NOT EXISTS media NUMERIC(4,2);
-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_media ON avaliacoes_alunos(media);
