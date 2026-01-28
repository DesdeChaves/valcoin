
CREATE TABLE public.pedidos_revisao_flashcard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flashcard_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    professor_id uuid,
    motivo text NOT NULL,
    data_pedido timestamp with time zone DEFAULT now(),
    data_atendimento timestamp with time zone,
    estado character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    observacoes_professor text,
    CONSTRAINT fk_flashcard FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id),
    CONSTRAINT fk_aluno FOREIGN KEY (aluno_id) REFERENCES public.users(id),
    CONSTRAINT fk_professor FOREIGN KEY (professor_id) REFERENCES public.users(id)
);
