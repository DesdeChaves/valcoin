--
-- PostgreSQL database dump
--

\restrict 72QiBXocSDeMrFqVWQaRruGenk42J1kgy0oQUDoUdFUh4OTKPCbwokn4RjK509G

-- Dumped from database version 13.22 (Debian 13.22-1.pgdg13+1)
-- Dumped by pg_dump version 13.22 (Debian 13.22-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cleanup_old_data(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.cleanup_old_data() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Remover transações muito antigas (mais de 2 anos)
    DELETE FROM transactions 
    WHERE data_transacao < now() - interval '2 years' 
    AND status IN ('APROVADA', 'REJEITADA');
    
    -- Log da limpeza
    INSERT INTO settings (key, value) VALUES 
    ('last_cleanup', to_jsonb(now()))
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb(now());
END;
$$;


ALTER FUNCTION public.cleanup_old_data() OWNER TO "user";

--
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO "user";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO "user";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_deductible boolean DEFAULT false NOT NULL,
    max_deduction_value numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO "user";

--
-- Name: products; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    description text,
    promotion integer DEFAULT 0,
    image text,
    seller_id uuid NOT NULL,
    taxa_iva_ref character varying(20) NOT NULL,
    is_ticket boolean DEFAULT false,
    sold_count integer DEFAULT 0,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    category_id integer NOT NULL,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_promotion_check CHECK (((promotion >= 0) AND (promotion <= 100))),
    CONSTRAINT products_quantity_check CHECK ((quantity >= 0)),
    CONSTRAINT products_sold_count_check CHECK ((sold_count >= 0)),
    CONSTRAINT products_taxa_iva_ref_check CHECK (((taxa_iva_ref)::text = ANY (ARRAY[('isento'::character varying)::text, ('tipo1'::character varying)::text, ('tipo2'::character varying)::text, ('tipo3'::character varying)::text])))
);


ALTER TABLE public.products OWNER TO "user";

--
-- Name: active_products_with_discount; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.active_products_with_discount AS
 SELECT p.id,
    p.name,
    p.description,
    p.price,
    p.quantity,
    p.promotion,
    p.image,
    p.seller_id,
    p.taxa_iva_ref,
    p.is_ticket,
    p.ativo,
    p.sold_count,
    p.data_criacao,
    p.data_atualizacao,
    c.name AS category_name,
    c.is_deductible,
    c.max_deduction_value,
    (p.price * ((1)::numeric - ((p.promotion)::numeric / 100.0))) AS final_price
   FROM (public.products p
     JOIN public.categories c ON ((p.category_id = c.id)))
  WHERE (p.ativo = true);


ALTER TABLE public.active_products_with_discount OWNER TO "user";

--
-- Name: aluno_disciplina; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.aluno_disciplina (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    disciplina_turma_id uuid NOT NULL
);


ALTER TABLE public.aluno_disciplina OWNER TO "user";

--
-- Name: aluno_turma; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.aluno_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.aluno_turma OWNER TO "user";

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO "user";

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: ciclos_ensino; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.ciclos_ensino (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.ciclos_ensino OWNER TO "user";

--
-- Name: classes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    nome character varying(100) NOT NULL,
    ciclo_id uuid,
    ano_letivo character varying(9) NOT NULL,
    diretor_turma_id uuid,
    ativo boolean DEFAULT true
);


ALTER TABLE public.classes OWNER TO "user";

--
-- Name: credit_products; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.credit_products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    max_amount numeric(10,2) NOT NULL,
    term_months integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    payment_period character varying(20) DEFAULT 'monthly'::character varying,
    data_atualizacao timestamp with time zone
);


ALTER TABLE public.credit_products OWNER TO "user";

--
-- Name: disciplina_turma; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.disciplina_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disciplina_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    ativo boolean DEFAULT true,
    professor_id uuid NOT NULL
);


ALTER TABLE public.disciplina_turma OWNER TO "user";

--
-- Name: house_members; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.house_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    house_id uuid NOT NULL,
    data_entrada date DEFAULT CURRENT_DATE,
    data_saida date,
    role character varying(20) DEFAULT 'aluno'::character varying,
    metodo_adesao character varying(20) DEFAULT 'atribuição'::character varying,
    CONSTRAINT house_members_metodo_adesao_check CHECK (((metodo_adesao)::text = ANY (ARRAY[('atribuição'::character varying)::text, ('voluntária'::character varying)::text, ('convite'::character varying)::text]))),
    CONSTRAINT house_members_role_check CHECK (((role)::text = ANY (ARRAY[('aluno'::character varying)::text, ('professor'::character varying)::text, ('lider'::character varying)::text])))
);


ALTER TABLE public.house_members OWNER TO "user";

--
-- Name: houses; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.houses (
    house_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome character varying(100) NOT NULL,
    cor character varying(50),
    valor_associado character varying(100),
    descricao text,
    logo_url text
);


ALTER TABLE public.houses OWNER TO "user";

--
-- Name: student_loans; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.student_loans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    credit_product_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    start_date date NOT NULL,
    maturity_date date NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao timestamp with time zone,
    paid_amount numeric(10,2) DEFAULT 0,
    CONSTRAINT student_loans_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('ACTIVE'::character varying)::text, ('PAID'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE public.student_loans OWNER TO "user";

--
-- Name: student_savings_accounts; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.student_savings_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    product_id uuid NOT NULL,
    balance numeric(10,2) DEFAULT 0.00 NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    maturity_date timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_interest_payment_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_savings_accounts_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('matured'::character varying)::text, ('closed'::character varying)::text])))
);


ALTER TABLE public.student_savings_accounts OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero_mecanografico character varying(50) NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    tipo_utilizador character varying(20) NOT NULL,
    ano_escolar integer,
    password_hash character varying(255) NOT NULL,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    ultimo_login timestamp with time zone,
    consentimento_rgpd boolean DEFAULT false,
    data_consentimento_rgpd timestamp with time zone,
    saldo numeric(10,2) DEFAULT 0,
    last_activity_date timestamp with time zone DEFAULT now(),
    CONSTRAINT users_tipo_utilizador_check CHECK (((tipo_utilizador)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('PROFESSOR'::character varying)::text, ('ALUNO'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: houses_overview; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.houses_overview AS
 SELECT json_agg(subquery.house_obj) AS houses_array
   FROM ( SELECT json_build_object('house_id', (h.house_id)::text, 'nome', h.nome, 'cor', h.cor, 'valor_associado', h.valor_associado, 'descricao', h.descricao, 'logo_url', COALESCE(h.logo_url, '/api/placeholder/100/100'::text), 'total_balance', COALESCE(balance_data.total_balance, (0)::numeric), 'member_count', COALESCE(m.member_count, (0)::bigint), 'savings_percentage', COALESCE(round(
                CASE
                    WHEN (m.member_count > 0) THEN (((balance_data.members_with_savings)::numeric / (m.member_count)::numeric) * (100)::numeric)
                    ELSE (0)::numeric
                END), (0)::numeric), 'total_debt', COALESCE(d.total_debt, (0)::numeric), 'created_at', COALESCE(to_char((c.created_at)::timestamp with time zone, 'YYYY-MM-DD'::text), '2024-01-01'::text), 'professor', COALESCE(p.professor, json_build_object('nome', NULL::text)), 'leader', COALESCE(l.leader, json_build_object('nome', NULL::text))) AS house_obj
           FROM ((((((public.houses h
             LEFT JOIN ( SELECT house_members.house_id,
                    count(*) AS member_count
                   FROM public.house_members
                  WHERE (house_members.data_saida IS NULL)
                  GROUP BY house_members.house_id) m ON ((m.house_id = h.house_id)))
             LEFT JOIN ( SELECT hm.house_id,
                    sum((COALESCE(u.saldo, (0)::numeric) + COALESCE(ssa.balance, (0)::numeric))) AS total_balance,
                    count(DISTINCT
                        CASE
                            WHEN ((ssa.id IS NOT NULL) AND (ssa.balance > (0)::numeric)) THEN hm.user_id
                            ELSE NULL::uuid
                        END) AS members_with_savings
                   FROM ((public.house_members hm
                     JOIN public.users u ON ((hm.user_id = u.id)))
                     LEFT JOIN public.student_savings_accounts ssa ON (((ssa.student_id = hm.user_id) AND ((ssa.status)::text = 'active'::text))))
                  WHERE (hm.data_saida IS NULL)
                  GROUP BY hm.house_id) balance_data ON ((balance_data.house_id = h.house_id)))
             LEFT JOIN ( SELECT hm.house_id,
                    sum((sl.amount - COALESCE(sl.paid_amount, (0)::numeric))) AS total_debt
                   FROM (public.house_members hm
                     JOIN public.student_loans sl ON ((sl.student_id = hm.user_id)))
                  WHERE ((hm.data_saida IS NULL) AND ((sl.status)::text = 'ACTIVE'::text))
                  GROUP BY hm.house_id) d ON ((d.house_id = h.house_id)))
             LEFT JOIN ( SELECT house_members.house_id,
                    min(house_members.data_entrada) AS created_at
                   FROM public.house_members
                  GROUP BY house_members.house_id) c ON ((c.house_id = h.house_id)))
             LEFT JOIN LATERAL ( SELECT json_build_object('nome', u.nome) AS professor
                   FROM (public.house_members hm
                     JOIN public.users u ON ((hm.user_id = u.id)))
                  WHERE ((hm.house_id = h.house_id) AND ((hm.role)::text = 'professor'::text) AND (hm.data_saida IS NULL))
                 LIMIT 1) p ON (true))
             LEFT JOIN LATERAL ( SELECT json_build_object('nome', u.nome) AS leader
                   FROM (public.house_members hm
                     JOIN public.users u ON ((hm.user_id = u.id)))
                  WHERE ((hm.house_id = h.house_id) AND ((hm.role)::text = 'lider'::text) AND (hm.data_saida IS NULL))
                 LIMIT 1) l ON (true))) subquery;


ALTER TABLE public.houses_overview OWNER TO "user";

--
-- Name: legados; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.legados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    atribuidor_id uuid NOT NULL,
    regra_id uuid NOT NULL,
    descricao text,
    data_atribuicao timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.legados OWNER TO "user";

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO "user";

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: professor_disciplina_turma; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.professor_disciplina_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    professor_id uuid NOT NULL,
    disciplina_turma_id uuid NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.professor_disciplina_turma OWNER TO "user";

--
-- Name: purchases; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id integer NOT NULL,
    buyer_id uuid NOT NULL,
    feedback text,
    data_compra timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchases OWNER TO "user";

--
-- Name: savings_products; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.savings_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    interest_rate numeric(5,2) NOT NULL,
    term_months integer NOT NULL,
    payment_frequency character varying(20) NOT NULL,
    min_deposit numeric(10,2) DEFAULT 0.00,
    max_deposit numeric(10,2),
    early_withdrawal_penalty numeric(5,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_period character varying(20) DEFAULT 'monthly'::character varying,
    CONSTRAINT savings_products_payment_frequency_check CHECK (((payment_frequency)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text, ('quarterly'::character varying)::text, ('at_maturity'::character varying)::text])))
);


ALTER TABLE public.savings_products OWNER TO "user";

--
-- Name: school_revenues; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.school_revenues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    origem text,
    montante numeric(10,2) NOT NULL,
    data date NOT NULL
);


ALTER TABLE public.school_revenues OWNER TO "user";

--
-- Name: settings; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.settings (
    key character varying(100) NOT NULL,
    value jsonb
);


ALTER TABLE public.settings OWNER TO "user";

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    codigo character varying(20) NOT NULL,
    ativo boolean DEFAULT true,
    ano_letivo character varying(9) DEFAULT '2025/26'::character varying NOT NULL
);


ALTER TABLE public.subjects OWNER TO "user";

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_id uuid NOT NULL,
    is_valid boolean DEFAULT true,
    used_at timestamp with time zone,
    validation_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tickets OWNER TO "user";

--
-- Name: transaction_rules; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.transaction_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    montante numeric(10,2) NOT NULL,
    tipo_transacao character varying(20) NOT NULL,
    origem_permitida character varying(20),
    destino_permitido character varying(20),
    limite_valor numeric(10,2),
    limite_periodo character varying(20),
    limite_por_disciplina boolean,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    categoria character varying(100),
    taxa_iva_ref character varying(20),
    icon text,
    ano_min integer DEFAULT 0,
    ano_max integer DEFAULT 12,
    data_atualizacao timestamp with time zone,
    CONSTRAINT transaction_rules_tipo_transacao_check CHECK (((tipo_transacao)::text = ANY (ARRAY[('DEBITO'::character varying)::text, ('CREDITO'::character varying)::text])))
);


ALTER TABLE public.transaction_rules OWNER TO "user";

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_group_id uuid,
    utilizador_origem_id uuid,
    utilizador_destino_id uuid,
    montante numeric(10,2) NOT NULL,
    tipo character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    data_transacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    descricao text,
    taxa_iva_ref character varying(20),
    motivo_rejeicao text,
    icon text,
    transaction_rule_id uuid,
    disciplina_id uuid,
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY (ARRAY[('PENDENTE'::character varying)::text, ('APROVADA'::character varying)::text, ('REJEITADA'::character varying)::text]))),
    CONSTRAINT transactions_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('CREDITO'::character varying)::text, ('DEBITO'::character varying)::text])))
);


ALTER TABLE public.transactions OWNER TO "user";

--
-- Name: user_houses_overview; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.user_houses_overview AS
 SELECT hm.user_id,
    json_build_object('house_id', (h.house_id)::text, 'nome', h.nome, 'cor', h.cor, 'valor_associado', h.valor_associado, 'descricao', h.descricao, 'logo_url', h.logo_url, 'total_balance', COALESCE(balance_data.total_balance, (0)::numeric), 'member_count', COALESCE(m.member_count, (0)::bigint), 'savings_percentage', COALESCE(round(
        CASE
            WHEN (m.member_count > 0) THEN (((balance_data.members_with_savings)::numeric / (m.member_count)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END), (0)::numeric), 'total_debt', COALESCE(d.total_debt, (0)::numeric), 'created_at', COALESCE(to_char((c.created_at)::timestamp with time zone, 'YYYY-MM-DD'::text), '2024-01-01'::text), 'professor', COALESCE(p.professor, json_build_object('nome', NULL::text)), 'leader', COALESCE(l.leader, json_build_object('nome', NULL::text)), 'user_is_leader',
        CASE
            WHEN ((hm.role)::text = 'lider'::text) THEN true
            ELSE false
        END) AS house_info
   FROM (((((((public.house_members hm
     JOIN public.houses h ON ((h.house_id = hm.house_id)))
     LEFT JOIN ( SELECT house_members.house_id,
            count(*) AS member_count
           FROM public.house_members
          WHERE (house_members.data_saida IS NULL)
          GROUP BY house_members.house_id) m ON ((m.house_id = h.house_id)))
     LEFT JOIN ( SELECT hm_calc.house_id,
            sum((COALESCE(u_calc.saldo, (0)::numeric) + COALESCE(ssa_calc.balance, (0)::numeric))) AS total_balance,
            count(DISTINCT
                CASE
                    WHEN ((ssa_calc.id IS NOT NULL) AND (ssa_calc.balance > (0)::numeric)) THEN hm_calc.user_id
                    ELSE NULL::uuid
                END) AS members_with_savings
           FROM ((public.house_members hm_calc
             JOIN public.users u_calc ON ((hm_calc.user_id = u_calc.id)))
             LEFT JOIN public.student_savings_accounts ssa_calc ON (((ssa_calc.student_id = hm_calc.user_id) AND ((ssa_calc.status)::text = 'active'::text))))
          WHERE (hm_calc.data_saida IS NULL)
          GROUP BY hm_calc.house_id) balance_data ON ((balance_data.house_id = h.house_id)))
     LEFT JOIN ( SELECT hm_debt.house_id,
            sum((sl.amount - COALESCE(sl.paid_amount, (0)::numeric))) AS total_debt
           FROM (public.house_members hm_debt
             JOIN public.student_loans sl ON ((sl.student_id = hm_debt.user_id)))
          WHERE ((hm_debt.data_saida IS NULL) AND ((sl.status)::text = 'ACTIVE'::text))
          GROUP BY hm_debt.house_id) d ON ((d.house_id = h.house_id)))
     LEFT JOIN ( SELECT house_members.house_id,
            min(house_members.data_entrada) AS created_at
           FROM public.house_members
          GROUP BY house_members.house_id) c ON ((c.house_id = h.house_id)))
     LEFT JOIN LATERAL ( SELECT json_build_object('nome', u.nome) AS professor
           FROM (public.house_members hm2
             JOIN public.users u ON ((hm2.user_id = u.id)))
          WHERE ((hm2.house_id = h.house_id) AND ((hm2.role)::text = 'professor'::text) AND (hm2.data_saida IS NULL))
         LIMIT 1) p ON (true))
     LEFT JOIN LATERAL ( SELECT json_build_object('nome', u.nome) AS leader
           FROM (public.house_members hm2
             JOIN public.users u ON ((hm2.user_id = u.id)))
          WHERE ((hm2.house_id = h.house_id) AND ((hm2.role)::text = 'lider'::text) AND (hm2.data_saida IS NULL))
         LIMIT 1) l ON (true))
  WHERE (hm.data_saida IS NULL);


ALTER TABLE public.user_houses_overview OWNER TO "user";

--
-- Name: valid_tickets_info; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.valid_tickets_info AS
 SELECT t.id AS ticket_id,
    t.is_valid AS isvalid,
    t.used_at AS usedat,
    pu.data_compra AS issuedat,
    prod.name AS productname,
    u.nome AS buyername,
    prod.seller_id
   FROM (((public.tickets t
     JOIN public.purchases pu ON ((t.purchase_id = pu.id)))
     JOIN public.products prod ON ((pu.product_id = prod.id)))
     JOIN public.users u ON ((pu.buyer_id = u.id)));


ALTER TABLE public.valid_tickets_info OWNER TO "user";

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: aluno_disciplina aluno_disciplina_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_pkey PRIMARY KEY (id);


--
-- Name: aluno_turma aluno_turma_aluno_id_turma_id_ano_letivo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_aluno_id_turma_id_ano_letivo_key UNIQUE (aluno_id, turma_id, ano_letivo);


--
-- Name: aluno_turma aluno_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: ciclos_ensino ciclos_ensino_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ciclos_ensino
    ADD CONSTRAINT ciclos_ensino_pkey PRIMARY KEY (id);


--
-- Name: classes classes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_codigo_key UNIQUE (codigo);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: credit_products credit_products_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.credit_products
    ADD CONSTRAINT credit_products_pkey PRIMARY KEY (id);


--
-- Name: disciplina_turma disciplina_turma_disciplina_id_turma_id_ano_letivo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_disciplina_id_turma_id_ano_letivo_key UNIQUE (disciplina_id, turma_id, ano_letivo);


--
-- Name: disciplina_turma disciplina_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_pkey PRIMARY KEY (id);


--
-- Name: house_members house_members_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_pkey PRIMARY KEY (id);


--
-- Name: houses houses_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (house_id);


--
-- Name: legados legados_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.legados
    ADD CONSTRAINT legados_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_pkey PRIMARY KEY (id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_professor_id_disciplina_turma_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_professor_id_disciplina_turma_id_key UNIQUE (professor_id, disciplina_turma_id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: savings_products savings_products_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.savings_products
    ADD CONSTRAINT savings_products_pkey PRIMARY KEY (id);


--
-- Name: school_revenues school_revenues_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.school_revenues
    ADD CONSTRAINT school_revenues_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: student_loans student_loans_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_loans
    ADD CONSTRAINT student_loans_pkey PRIMARY KEY (id);


--
-- Name: student_savings_accounts student_savings_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_savings_accounts
    ADD CONSTRAINT student_savings_accounts_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_codigo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_codigo_key UNIQUE (codigo);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: transaction_rules transaction_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_numero_mecanografico_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_numero_mecanografico_key UNIQUE (numero_mecanografico);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_aluno_disciplina_aluno_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_disciplina_aluno_id ON public.aluno_disciplina USING btree (aluno_id);


--
-- Name: idx_aluno_disciplina_disciplina_turma_id_aluno_id_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_disciplina_disciplina_turma_id_aluno_id_ativo ON public.aluno_disciplina USING btree (disciplina_turma_id, aluno_id, ativo);


--
-- Name: idx_aluno_turma_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_turma_aluno ON public.aluno_turma USING btree (aluno_id);


--
-- Name: idx_aluno_turma_turma; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_turma_turma ON public.aluno_turma USING btree (turma_id);


--
-- Name: idx_aluno_turma_turma_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_turma_turma_id ON public.aluno_turma USING btree (turma_id) WHERE (ativo = true);


--
-- Name: idx_disciplina_turma_id_professor_id_ativo_ano_letivo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_disciplina_turma_id_professor_id_ativo_ano_letivo ON public.disciplina_turma USING btree (id, professor_id, ativo, ano_letivo);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_products_active ON public.products USING btree (ativo);


--
-- Name: idx_products_is_ticket; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_products_is_ticket ON public.products USING btree (is_ticket);


--
-- Name: idx_products_seller_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id);


--
-- Name: idx_products_sold_count; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_products_sold_count ON public.products USING btree (sold_count DESC);


--
-- Name: idx_professor_disciplina_professor; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_professor_disciplina_professor ON public.professor_disciplina_turma USING btree (professor_id);


--
-- Name: idx_purchases_buyer_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_purchases_buyer_id ON public.purchases USING btree (buyer_id);


--
-- Name: idx_purchases_buyer_product; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_purchases_buyer_product ON public.purchases USING btree (buyer_id, product_id);


--
-- Name: idx_purchases_data_compra; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_purchases_data_compra ON public.purchases USING btree (data_compra);


--
-- Name: idx_purchases_product_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_purchases_product_id ON public.purchases USING btree (product_id);


--
-- Name: idx_tickets_purchase_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tickets_purchase_id ON public.tickets USING btree (purchase_id);


--
-- Name: idx_tickets_valid_only; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tickets_valid_only ON public.tickets USING btree (is_valid) WHERE (is_valid = true);


--
-- Name: idx_tickets_validation; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tickets_validation ON public.tickets USING btree (id, is_valid);


--
-- Name: idx_transactions_data; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_transactions_data ON public.transactions USING btree (data_transacao);


--
-- Name: idx_transactions_destino; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_transactions_destino ON public.transactions USING btree (utilizador_destino_id);


--
-- Name: idx_transactions_origem; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_transactions_origem ON public.transactions USING btree (utilizador_origem_id);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_users_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_aluno ON public.users USING btree (tipo_utilizador, ativo) WHERE (((tipo_utilizador)::text = 'ALUNO'::text) AND (ativo = true));


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_id_tipo_utilizador_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_id_tipo_utilizador_ativo ON public.users USING btree (id, tipo_utilizador, ativo);


--
-- Name: idx_users_numero_mecanografico; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_numero_mecanografico ON public.users USING btree (numero_mecanografico);


--
-- Name: idx_users_tipo_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_tipo_ativo ON public.users USING btree (tipo_utilizador, ativo);


--
-- Name: unique_active_house_member; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX unique_active_house_member ON public.house_members USING btree (user_id) WHERE (data_saida IS NULL);


--
-- Name: categories set_timestamp; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: credit_products update_credit_products_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_credit_products_updated_at BEFORE UPDATE ON public.credit_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_loans update_student_loans_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_student_loans_updated_at BEFORE UPDATE ON public.student_loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: aluno_disciplina aluno_disciplina_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: aluno_disciplina aluno_disciplina_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: aluno_turma aluno_turma_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: aluno_turma aluno_turma_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: classes classes_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_ensino(id);


--
-- Name: classes classes_diretor_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_diretor_turma_id_fkey FOREIGN KEY (diretor_turma_id) REFERENCES public.users(id);


--
-- Name: disciplina_turma disciplina_turma_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id);


--
-- Name: disciplina_turma disciplina_turma_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


--
-- Name: disciplina_turma disciplina_turma_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: products fk_category; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: house_members house_members_house_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(house_id);


--
-- Name: house_members house_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.house_members
    ADD CONSTRAINT house_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: legados legados_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.legados
    ADD CONSTRAINT legados_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: legados legados_atribuidor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.legados
    ADD CONSTRAINT legados_atribuidor_id_fkey FOREIGN KEY (atribuidor_id) REFERENCES public.users(id);


--
-- Name: legados legados_regra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.legados
    ADD CONSTRAINT legados_regra_id_fkey FOREIGN KEY (regra_id) REFERENCES public.transaction_rules(id);


--
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


--
-- Name: purchases purchases_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id);


--
-- Name: purchases purchases_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: student_loans student_loans_credit_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_loans
    ADD CONSTRAINT student_loans_credit_product_id_fkey FOREIGN KEY (credit_product_id) REFERENCES public.credit_products(id);


--
-- Name: student_loans student_loans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_loans
    ADD CONSTRAINT student_loans_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: student_savings_accounts student_savings_accounts_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_savings_accounts
    ADD CONSTRAINT student_savings_accounts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.savings_products(id);


--
-- Name: student_savings_accounts student_savings_accounts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_savings_accounts
    ADD CONSTRAINT student_savings_accounts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: tickets tickets_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id);


--
-- Name: transactions transactions_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id);


--
-- Name: transactions transactions_transaction_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_rule_id_fkey FOREIGN KEY (transaction_rule_id) REFERENCES public.transaction_rules(id);


--
-- Name: transactions transactions_utilizador_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_utilizador_destino_id_fkey FOREIGN KEY (utilizador_destino_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_utilizador_origem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_utilizador_origem_id_fkey FOREIGN KEY (utilizador_origem_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 72QiBXocSDeMrFqVWQaRruGenk42J1kgy0oQUDoUdFUh4OTKPCbwokn4RjK509G

