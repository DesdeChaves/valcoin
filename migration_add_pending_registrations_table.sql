-- Adiciona o tipo 'EXTERNO' ao CONSTRAINT de tipo_utilizador na tabela users
DO $$
BEGIN
    -- Remove the old constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_tipo_utilizador_check'
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_tipo_utilizador_check;
    END IF;

    -- Add the new constraint with 'EXTERNO'
    ALTER TABLE public.users
    ADD CONSTRAINT users_tipo_utilizador_check CHECK (((tipo_utilizador)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('PROFESSOR'::character varying)::text, ('ALUNO'::character varying)::text, ('EXTERNO'::character varying)::text])));
END
$$;

-- Cria a tabela pending_registrations
CREATE TABLE public.pending_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    data_pedido timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (email),
    CONSTRAINT pending_registrations_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
);

-- Adiciona índice para pesquisa rápida de emails pendentes
CREATE INDEX idx_pending_registrations_email ON public.pending_registrations USING btree (email);