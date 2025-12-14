-- Extensão do schema para módulo memória (FSRS + basic/cloze/image_occlusion)

-- Tabela principal de flashcards
CREATE TABLE IF NOT EXISTS public.flashcards (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    discipline_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES users(id),
    type varchar(20) NOT NULL DEFAULT 'basic' CHECK (type IN ('basic', 'cloze', 'image_occlusion')),
    front text,
    back text,
    cloze_text text,                    -- usado em cloze
    image_url text,                     -- usado em image_occlusion
    occlusion_data jsonb,               -- array de masks para image_occlusion
    hints text[],
    scheduled_date date NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Estado de memória por aluno/card/sub-card (FSRS)
CREATE TABLE IF NOT EXISTS public.flashcard_memory_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    sub_id text,                        -- NULL para basic, 'c1'/'c2' para cloze, 'mask1' para IO
    difficulty numeric(8,4) DEFAULT 5.0,
    stability numeric(12,4) DEFAULT 0.0,
    last_review timestamp with time zone,
    reps integer DEFAULT 0,
    lapses integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(student_id, flashcard_id, sub_id)
);

-- Log de revisões (essencial para personalização futura)
CREATE TABLE IF NOT EXISTS public.flashcard_review_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id uuid NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    sub_id text,
    rating integer NOT NULL CHECK (rating IN (1,2,3,4)), -- 1=Again, 2=Hard, 3=Good, 4=Easy
    review_date timestamp with time zone DEFAULT now(),
    elapsed_days numeric(8,2)
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_flashcards_discipline_active ON flashcards(discipline_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_flashcards_scheduled ON flashcards(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_memory_state_student_due ON flashcard_memory_state(student_id) WHERE stability > 0;
CREATE INDEX IF NOT EXISTS idx_review_log_student_date ON flashcard_review_log(student_id, review_date DESC);

-- Trigger updated_at
CREATE TRIGGER update_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_state_updated_at
    BEFORE UPDATE ON flashcard_memory_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
