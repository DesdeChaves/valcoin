ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS roda_pergunta TEXT,
ADD COLUMN IF NOT EXISTS roda_resposta TEXT,
ADD COLUMN IF NOT EXISTS roda_resposta_opcional TEXT;

-- Update the existing CONSTRAINT to include 'roda' type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'flashcards_type_check') THEN
        ALTER TABLE public.flashcards
        DROP CONSTRAINT flashcards_type_check;
    END IF;
END
$$;

ALTER TABLE public.flashcards
ADD CONSTRAINT flashcards_type_check CHECK (
    (type)::text = ANY (ARRAY[
        ('basic'::character varying)::text,
        ('cloze'::character varying)::text,
        ('image_occlusion'::character varying)::text,
        ('phonetic'::character varying)::text,
        ('dictation'::character varying)::text,
        ('audio_question'::character varying)::text,
        ('reading'::character varying)::text,
        ('image_text'::character varying)::text,
        ('spelling'::character varying)::text,
        ('roda'::character varying)::text
    ])
);
