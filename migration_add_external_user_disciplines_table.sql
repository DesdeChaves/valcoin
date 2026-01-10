CREATE TABLE public.external_user_disciplines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    discipline_id uuid NOT NULL,
    data_associacao timestamp with time zone DEFAULT now(),
    ativo boolean DEFAULT true,
    PRIMARY KEY (id),
    UNIQUE (user_id, discipline_id),
    CONSTRAINT fk_external_user_disciplines_user
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_external_user_disciplines_discipline
        FOREIGN KEY (discipline_id) REFERENCES public.subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_external_user_disciplines_user_id ON public.external_user_disciplines (user_id);
CREATE INDEX idx_external_user_disciplines_discipline_id ON public.external_user_disciplines (discipline_id);