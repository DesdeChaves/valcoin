-- ============================================
-- EXTENSÃO DO SCHEMA PARA FLASHCARDS COM ÁUDIO
-- ============================================

-- 1. ATUALIZAR tipos de flashcards
ALTER TABLE public.flashcards 
DROP CONSTRAINT IF EXISTS flashcards_type_check;

ALTER TABLE public.flashcards 
ADD CONSTRAINT flashcards_type_check 
CHECK (type IN (
    'basic',              -- flashcard básico (frente/verso)
    'cloze',              -- lacunas
    'image_occlusion',    -- oclusão de imagem
    'phonetic',           -- prática de fonemas (animado)
    'dictation',          -- ditado (áudio → texto escrito)
    'audio_question',     -- pergunta em áudio (ex: tabuada)
    'reading'             -- leitura em voz alta
));

-- 2. ADICIONAR colunas para tipos com áudio
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS phonemes jsonb;
-- Estrutura: [{"text": "pa", "order": 1}, {"text": "to", "order": 2}]
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS word text, ADD COLUMN IF NOT EXISTS audio_text text, ADD COLUMN IF NOT EXISTS expected_answer text;
-- Palavra/texto completo para ditado ou leitura

ADD COLUMN IF NOT EXISTS audio_text text,
-- Texto que será convertido em áudio (para dictation e audio_question)

ADD COLUMN IF NOT EXISTS expected_answer text,
-- Resposta esperada (para audio_question e reading)
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS answer_type varchar(20) CHECK (answer_type IN ('text', 'audio', 'number')),
ADD COLUMN IF NOT EXISTS difficulty_level integer DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5);
-- Tipo de resposta esperada: 'text' para ditado, 'audio' para reading/phonetic, 'number' para tabuada

ADD COLUMN IF NOT EXISTS difficulty_level integer DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5);
-- Nível de dificuldade do exercício

-- 3. CRIAR tabela para cache de áudio TTS (evitar regenerar)
CREATE TABLE IF NOT EXISTS public.tts_audio_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    text_hash varchar(64) NOT NULL UNIQUE, -- hash MD5 do texto
    text_content text NOT NULL,
    audio_url text NOT NULL, -- URL do ficheiro de áudio gerado
    language varchar(10) DEFAULT 'pt-PT',
    voice_type varchar(50), -- tipo de voz usada
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tts_cache_hash ON tts_audio_cache(text_hash);

-- 4. CRIAR tabela para análise de performance (sem guardar áudio)
CREATE TABLE IF NOT EXISTS public.audio_flashcard_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    
    -- Dados da tentativa
    attempt_type varchar(20) NOT NULL, -- 'phonetic', 'dictation', 'audio_question', 'reading'
    phoneme_index integer, -- para flashcards fonéticos
    
    -- Input do aluno
    student_text_input text, -- texto digitado (para dictation)
    student_audio_transcription text, -- transcrição do áudio (para phonetic, reading, audio_question)
    
    -- Validação
    expected_text text NOT NULL,
    is_correct boolean NOT NULL,
    similarity_score numeric(5,2), -- score de similaridade 0-100
    confidence_score numeric(3,2), -- confiança do STT 0-1
    
    -- Metadados
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_attempts_student ON audio_flashcard_attempts(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_attempts_flashcard ON audio_flashcard_attempts(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_audio_attempts_type ON audio_flashcard_attempts(attempt_type);

-- 5. COMENTÁRIOS para documentação
COMMENT ON COLUMN flashcards.phonemes IS 
'Array JSON de fonemas para tipo phonetic. Ex: [{"text": "pa", "order": 1}]';

COMMENT ON COLUMN flashcards.word IS 
'Palavra/texto para ditado ou leitura';

COMMENT ON COLUMN flashcards.audio_text IS 
'Texto que será convertido em áudio pelo TTS (para dictation e audio_question)';

COMMENT ON COLUMN flashcards.expected_answer IS 
'Resposta esperada do aluno';

COMMENT ON COLUMN flashcards.answer_type IS 
'Tipo de resposta: text (ditado), audio (leitura/fonética), number (cálculos)';

COMMENT ON TABLE tts_audio_cache IS 
'Cache de áudios gerados pelo TTS para evitar regeneração';

COMMENT ON TABLE audio_flashcard_attempts IS 
'Registo de tentativas em flashcards de áudio (sem guardar ficheiros de áudio)';

-- ============================================
-- EXEMPLOS DE DADOS PARA CADA TIPO
-- ============================================

-- TIPO 1: PHONETIC (fonemas animados)
/*
INSERT INTO flashcards (
    discipline_id, creator_id, type, word, phonemes, 
    expected_answer, answer_type, scheduled_date
) VALUES (
    'uuid-disciplina',
    'uuid-professor',
    'phonetic',
    'pato',
    '[
        {"text": "pa", "order": 1},
        {"text": "to", "order": 2}
    ]'::jsonb,
    'pato',
    'audio',
    CURRENT_DATE
);
*/

-- TIPO 2: DICTATION (ditado - áudio para texto)
/*
INSERT INTO flashcards (
    discipline_id, creator_id, type, audio_text, 
    expected_answer, answer_type, scheduled_date
) VALUES (
    'uuid-disciplina',
    'uuid-professor',
    'dictation',
    'O gato está no telhado',  -- será convertido em áudio
    'O gato está no telhado',  -- resposta esperada
    'text',
    CURRENT_DATE
);
*/

-- TIPO 3: AUDIO_QUESTION (pergunta em áudio - ex: tabuada)
/*
INSERT INTO flashcards (
    discipline_id, creator_id, type, audio_text, 
    expected_answer, answer_type, scheduled_date
) VALUES (
    'uuid-disciplina',
    'uuid-professor',
    'audio_question',
    'Quanto é cinco vezes quatro?',  -- será convertido em áudio
    '20',  -- resposta esperada (pode ser número ou texto)
    'audio',  -- aluno responde em áudio
    CURRENT_DATE
);
*/

-- TIPO 4: READING (leitura em voz alta)
/*
INSERT INTO flashcards (
    discipline_id, creator_id, type, word, 
    expected_answer, answer_type, scheduled_date
) VALUES (
    'uuid-disciplina',
    'uuid-professor',
    'reading',
    'O rato roeu a rolha da garrafa do rei da Rússia',  -- texto para ler
    'O rato roeu a rolha da garrafa do rei da Rússia',  -- resposta esperada
    'audio',
    CURRENT_DATE
);
*/

-- ============================================
-- QUERIES ÚTEIS PARA ANÁLISE
-- ============================================

-- Análise de performance por tipo de flashcard
/*
SELECT 
    u.nome AS aluno,
    afa.attempt_type AS tipo,
    COUNT(*) AS total_tentativas,
    SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) AS acertos,
    ROUND(AVG(afa.similarity_score), 2) AS media_similaridade,
    ROUND(AVG(afa.confidence_score) * 100, 2) AS media_confianca
FROM audio_flashcard_attempts afa
JOIN users u ON u.id = afa.student_id
GROUP BY u.nome, afa.attempt_type
ORDER BY u.nome, afa.attempt_type;
*/

-- Fonemas mais difíceis para um aluno
/*
SELECT 
    f.word AS palavra,
    afa.phoneme_index,
    afa.expected_text AS fonema,
    COUNT(*) AS tentativas,
    SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) AS acertos,
    ROUND(100.0 * SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) AS taxa_acerto
FROM audio_flashcard_attempts afa
JOIN flashcards f ON f.id = afa.flashcard_id
WHERE afa.student_id = 'uuid-do-aluno'
    AND afa.attempt_type = 'phonetic'
GROUP BY f.word, afa.phoneme_index, afa.expected_text
HAVING COUNT(*) >= 2
ORDER BY taxa_acerto ASC, tentativas DESC
LIMIT 10;
*/

-- Palavras mais difíceis em ditado
/*
SELECT 
    f.audio_text AS texto_ditado,
    COUNT(*) AS tentativas,
    SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) AS acertos,
    ROUND(AVG(afa.similarity_score), 2) AS similaridade_media
FROM audio_flashcard_attempts afa
JOIN flashcards f ON f.id = afa.flashcard_id
WHERE afa.attempt_type = 'dictation'
GROUP BY f.audio_text
ORDER BY similaridade_media ASC
LIMIT 10;
*/

-- Progresso temporal de um aluno
/*
SELECT 
    DATE(afa.created_at) AS data,
    afa.attempt_type AS tipo,
    COUNT(*) AS tentativas,
    ROUND(100.0 * SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1) AS taxa_acerto
FROM audio_flashcard_attempts afa
WHERE afa.student_id = 'uuid-do-aluno'
    AND afa.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(afa.created_at), afa.attempt_type
ORDER BY data DESC, tipo;
*/
