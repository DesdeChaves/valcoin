-- Migration to add 'assunto' (subject) to flashcards

-- 1. Create the 'assuntos' table
CREATE TABLE IF NOT EXISTS public.assuntos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    discipline_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(discipline_id, name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assuntos_discipline ON public.assuntos(discipline_id);

-- Trigger for updated_at
CREATE TRIGGER update_assuntos_updated_at
    BEFORE UPDATE ON public.assuntos
    FOR EACH ROW EXECUTE PROCEDURE public.update_generic_updated_at_column();

-- 2. Add 'assunto_id' to the 'flashcards' table
ALTER TABLE public.flashcards
ADD COLUMN IF NOT EXISTS assunto_id uuid REFERENCES public.assuntos(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_flashcards_assunto ON public.flashcards(assunto_id);
