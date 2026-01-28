CREATE TABLE public.flashcard_disciplinas (
    flashcard_id UUID NOT NULL,
    disciplina_id UUID NOT NULL,
    PRIMARY KEY (flashcard_id, disciplina_id),
    FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id) ON DELETE CASCADE 
);

COMMENT ON TABLE public.flashcard_disciplinas IS 'Tabela de associação para partilhar um flashcard com múltiplas disciplinas.';
