-- Add "spelling" to the allowed flashcard types

-- Step 1: Drop the existing constraint
ALTER TABLE public.flashcards DROP CONSTRAINT flashcards_type_check;

-- Step 2: Add the new constraint with the "spelling" type
ALTER TABLE public.flashcards
ADD CONSTRAINT flashcards_type_check CHECK (((type)::text = ANY (ARRAY[
    ('basic'::character varying)::text,
    ('cloze'::character varying)::text,
    ('image_occlusion'::character varying)::text,
    ('phonetic'::character varying)::text,
    ('dictation'::character varying)::text,
    ('audio_question'::character varying)::text,
    ('reading'::character varying)::text,
    ('image_text'::character varying)::text,
    ('spelling'::character varying)::text
])));
