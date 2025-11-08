--
-- PostgreSQL database dump
--


-- Dumped from database version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.19 (Ubuntu 14.19-0ubuntu0.22.04.1)

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: tipo_contador; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tipo_contador AS ENUM (
    'atitudinal',
    'participacao',
    'experimental',
    'social',
    'vocacional'
);


ALTER TYPE public.tipo_contador OWNER TO postgres;

--
-- Name: tipo_elemento_avaliacao; Type: TYPE; Schema: public; Owner: jorgem
--

CREATE TYPE public.tipo_elemento_avaliacao AS ENUM (
    'teste',
    'trabalho',
    'projeto',
    'apresentacao',
    'ficha',
    'relatorio',
    'participacao',
    'outro'
);


ALTER TYPE public.tipo_elemento_avaliacao OWNER TO jorgem;

--
-- Name: TYPE tipo_elemento_avaliacao; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TYPE public.tipo_elemento_avaliacao IS 'Tipos disponíveis:
- teste: Provas escritas ou digitais
- trabalho: Trabalhos individuais ou em grupo
- projeto: Projetos de longa duração
- apresentacao: Apresentações orais
- ficha: Fichas de trabalho ou exercícios
- relatorio: Relatórios escritos
- participacao: Avaliação de participação
- outro: Outros tipos não classificados';


--
-- Name: calcular_nota_criterio(uuid, uuid); Type: FUNCTION; Schema: public; Owner: jorgem
--

CREATE FUNCTION public.calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nota_criterio NUMERIC := 0;
    v_soma_ponderacoes NUMERIC := 0;
    v_elemento RECORD;
BEGIN
    -- Buscar todos os elementos do critério com notas do aluno
    FOR v_elemento IN 
        SELECT 
            ea.ponderacao,
            COALESCE(ne.nota, 0) as nota
        FROM public.elemento_avaliacao ea
        LEFT JOIN public.nota_elemento ne 
            ON ne.elemento_avaliacao_id = ea.id 
            AND ne.aluno_id = p_aluno_id
        WHERE ea.criterio_id = p_criterio_id 
            AND ea.ativo = true
    LOOP
        v_soma_ponderacoes := v_soma_ponderacoes + v_elemento.ponderacao;
        
        IF v_soma_ponderacoes > 0 THEN
            v_nota_criterio := v_nota_criterio + 
                (v_elemento.nota * (v_elemento.ponderacao / v_soma_ponderacoes));
        END IF;
    END LOOP;
    
    RETURN ROUND(v_nota_criterio, 2);
END;
$$;


ALTER FUNCTION public.calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid) OWNER TO jorgem;

--
-- Name: FUNCTION calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid); Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON FUNCTION public.calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid) IS 'Calcula a nota de um aluno num critério específico';


--
-- Name: calcular_nota_dossie(uuid, uuid); Type: FUNCTION; Schema: public; Owner: jorgem
--

CREATE FUNCTION public.calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nota_final NUMERIC := 0;
    v_criterio RECORD;
    v_nota_criterio NUMERIC;
BEGIN
    -- Para cada critério do dossiê
    FOR v_criterio IN 
        SELECT id, ponderacao
        FROM public.criterio
        WHERE dossie_id = p_dossie_id 
            AND ativo = true
    LOOP
        -- Calcular nota do critério
        v_nota_criterio := calcular_nota_criterio(v_criterio.id, p_aluno_id);
        
        -- Aplicar ponderação do critério
        v_nota_final := v_nota_final + (v_nota_criterio * (v_criterio.ponderacao / 100));
    END LOOP;
    
    RETURN ROUND(v_nota_final, 2);
END;
$$;


ALTER FUNCTION public.calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid) OWNER TO jorgem;

--
-- Name: FUNCTION calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid); Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON FUNCTION public.calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid) IS 'Calcula a nota final de um aluno num dossiê';


--
-- Name: calcular_pontos_contadores(uuid, uuid, public.tipo_contador); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calcular_pontos_contadores(p_dossie_id uuid, p_aluno_id uuid, p_tipo_contador public.tipo_contador DEFAULT NULL::public.tipo_contador) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total INTEGER := 0;
BEGIN
    SELECT COALESCE(SUM(c.incremento), 0)
    INTO v_total
    FROM public.contador_registo cr
    JOIN public.contador c ON c.id = cr.contador_id
    WHERE c.dossie_id = p_dossie_id
        AND cr.aluno_id = p_aluno_id
        AND (p_tipo_contador IS NULL OR c.tipo = p_tipo_contador);
    
    RETURN v_total;
END;
$$;


ALTER FUNCTION public.calcular_pontos_contadores(p_dossie_id uuid, p_aluno_id uuid, p_tipo_contador public.tipo_contador) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: jorgem
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO jorgem;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: aluno_disciplina; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.aluno_disciplina (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    disciplina_turma_id uuid NOT NULL
);


ALTER TABLE public.aluno_disciplina OWNER TO jorgem;

--
-- Name: aluno_turma; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.aluno_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.aluno_turma OWNER TO jorgem;

--
-- Name: ciclos_ensino; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.ciclos_ensino (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.ciclos_ensino OWNER TO jorgem;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: jorgem
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


ALTER TABLE public.classes OWNER TO jorgem;

--
-- Name: contador; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.contador (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shortname character varying(50) NOT NULL,
    descritor character varying(255) NOT NULL,
    incremento smallint DEFAULT 1 NOT NULL,
    dossie_id uuid NOT NULL,
    cor character varying(7),
    icone character varying(50),
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    tipo public.tipo_contador DEFAULT 'atitudinal'::public.tipo_contador,
    periodo_inativacao_segundos integer DEFAULT 0,
    modelo_calibracao character varying(50) DEFAULT 'nenhum'::character varying,
    parametros_calibracao jsonb DEFAULT '{}'::jsonb,
    modelo_esquecimento character varying(50) DEFAULT 'nenhum'::character varying,
    parametros_esquecimento jsonb DEFAULT '{}'::jsonb,
    escala smallint DEFAULT 20 NOT NULL,
    CONSTRAINT contador_escala_check CHECK ((escala = ANY (ARRAY[5, 20, 100])))
);


ALTER TABLE public.contador OWNER TO jorgem;

--
-- Name: TABLE contador; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.contador IS 'Contadores de comportamento/atitude';


--
-- Name: COLUMN contador.shortname; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.contador.shortname IS 'Nome curto para exibição (ex: 👍, TPC, Participou)';


--
-- Name: COLUMN contador.incremento; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.contador.incremento IS 'Valor a somar (pode ser negativo)';


--
-- Name: COLUMN contador.cor; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.contador.cor IS 'Cor em hexadecimal para UI (ex: #4CAF50)';


--
-- Name: contador_registo; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.contador_registo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contador_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    observacao text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contador_registo OWNER TO jorgem;

--
-- Name: TABLE contador_registo; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.contador_registo IS 'Histórico de registos dos contadores';


--
-- Name: COLUMN contador_registo.professor_id; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.contador_registo.professor_id IS 'Professor que registou o tap';


--
-- Name: criterio; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.criterio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    ponderacao numeric(5,2) NOT NULL,
    dossie_id uuid NOT NULL,
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT criterio_ponderacao_check CHECK (((ponderacao >= (0)::numeric) AND (ponderacao <= (100)::numeric)))
);


ALTER TABLE public.criterio OWNER TO jorgem;

--
-- Name: TABLE criterio; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.criterio IS 'Critérios de avaliação de um dossiê';


--
-- Name: COLUMN criterio.ponderacao; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.criterio.ponderacao IS 'Peso do critério na nota final (0-100%)';


--
-- Name: COLUMN criterio.ordem; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.criterio.ordem IS 'Ordem de apresentação do critério';


--
-- Name: disciplina_turma; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.disciplina_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disciplina_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    ativo boolean DEFAULT true,
    professor_id uuid NOT NULL
);


ALTER TABLE public.disciplina_turma OWNER TO jorgem;

--
-- Name: dossie; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.dossie (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    professor_disciplina_turma_id uuid NOT NULL,
    data_inicio date,
    data_fim date,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    escala_avaliacao smallint DEFAULT 20 NOT NULL,
    CONSTRAINT dossie_escala_avaliacao_check CHECK ((escala_avaliacao = ANY (ARRAY[5, 20, 100])))
);


ALTER TABLE public.dossie OWNER TO jorgem;

--
-- Name: TABLE dossie; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.dossie IS 'Dossiês/períodos de avaliação por disciplina';


--
-- Name: COLUMN dossie.nome; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.dossie.nome IS 'Ex: 1º Período, 2º Período, Avaliação Final';


--
-- Name: elemento_avaliacao; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.elemento_avaliacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    tipo public.tipo_elemento_avaliacao DEFAULT 'outro'::public.tipo_elemento_avaliacao NOT NULL,
    ponderacao numeric(5,2) NOT NULL,
    criterio_id uuid NOT NULL,
    data_avaliacao date,
    cotacao_maxima numeric(5,2) DEFAULT 20.00,
    observacoes text,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT elemento_avaliacao_ponderacao_check CHECK (((ponderacao >= (0)::numeric) AND (ponderacao <= (100)::numeric)))
);


ALTER TABLE public.elemento_avaliacao OWNER TO jorgem;

--
-- Name: TABLE elemento_avaliacao; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.elemento_avaliacao IS 'Instrumentos de avaliação (testes, trabalhos, etc)';


--
-- Name: COLUMN elemento_avaliacao.ponderacao; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.elemento_avaliacao.ponderacao IS 'Peso do elemento dentro do critério (0-100%)';


--
-- Name: COLUMN elemento_avaliacao.cotacao_maxima; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.elemento_avaliacao.cotacao_maxima IS 'Nota máxima possível (geralmente 20)';


--
-- Name: momento_avaliacao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.momento_avaliacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    dossie_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.momento_avaliacao OWNER TO postgres;

--
-- Name: TABLE momento_avaliacao; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.momento_avaliacao IS 'Representa um momento específico para guardar notas finais (ex: Pauta Final)';


--
-- Name: COLUMN momento_avaliacao.nome; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.momento_avaliacao.nome IS 'Nome do momento de avaliação (ex: Pauta Final, Pauta 1º Período)';


--
-- Name: nota_elemento; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.nota_elemento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    elemento_avaliacao_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    nota numeric(5,2) DEFAULT 0.00,
    observacoes text,
    falta boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT nota_elemento_nota_check CHECK ((nota >= (0)::numeric))
);


ALTER TABLE public.nota_elemento OWNER TO jorgem;

--
-- Name: TABLE nota_elemento; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON TABLE public.nota_elemento IS 'Notas dos alunos em cada elemento de avaliação';


--
-- Name: COLUMN nota_elemento.falta; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON COLUMN public.nota_elemento.falta IS 'Indica se o aluno faltou à avaliação';


--
-- Name: nota_final_momento; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nota_final_momento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    momento_avaliacao_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    nota numeric(5,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.nota_final_momento OWNER TO postgres;

--
-- Name: TABLE nota_final_momento; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.nota_final_momento IS 'Notas finais de alunos para um momento de avaliação específico';


--
-- Name: COLUMN nota_final_momento.nota; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.nota_final_momento.nota IS 'Nota final do aluno para este momento de avaliação';


--
-- Name: professor_disciplina_turma; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.professor_disciplina_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    professor_id uuid NOT NULL,
    disciplina_turma_id uuid NOT NULL,
    ativo boolean DEFAULT true
);


ALTER TABLE public.professor_disciplina_turma OWNER TO jorgem;

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: jorgem
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    codigo character varying(20) NOT NULL,
    ativo boolean DEFAULT true,
    ano_letivo character varying(9) DEFAULT '2025/26'::character varying NOT NULL
);


ALTER TABLE public.subjects OWNER TO jorgem;

--
-- Name: users; Type: TABLE; Schema: public; Owner: jorgem
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
    CONSTRAINT users_tipo_utilizador_check CHECK (((tipo_utilizador)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('PROFESSOR'::character varying)::text, ('ALUNO'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO jorgem;

--
-- Name: v_contador_estatisticas_aluno; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_contador_estatisticas_aluno AS
 SELECT cr.aluno_id,
    cr.contador_id,
    c.shortname,
    c.descritor,
    c.tipo,
    c.incremento,
    c.dossie_id,
    count(cr.id) AS total_registos,
    sum(c.incremento) AS total_pontos,
    max(cr.created_at) AS ultimo_registo,
    min(cr.created_at) AS primeiro_registo
   FROM (public.contador_registo cr
     JOIN public.contador c ON ((c.id = cr.contador_id)))
  GROUP BY cr.aluno_id, cr.contador_id, c.shortname, c.descritor, c.tipo, c.incremento, c.dossie_id;


ALTER TABLE public.v_contador_estatisticas_aluno OWNER TO postgres;

--
-- Name: v_dossie_resumo; Type: VIEW; Schema: public; Owner: jorgem
--

CREATE VIEW public.v_dossie_resumo AS
 SELECT d.id,
    d.nome,
    d.descricao,
    d.professor_disciplina_turma_id,
    d.data_inicio,
    d.data_fim,
    d.ativo,
    count(DISTINCT c.id) AS total_criterios,
    count(DISTINCT ea.id) AS total_elementos,
    count(DISTINCT cnt.id) AS total_contadores,
    sum(c.ponderacao) AS soma_ponderacoes_criterios,
        CASE
            WHEN (sum(c.ponderacao) = (100)::numeric) THEN true
            ELSE false
        END AS ponderacoes_validas
   FROM (((public.dossie d
     LEFT JOIN public.criterio c ON (((c.dossie_id = d.id) AND (c.ativo = true))))
     LEFT JOIN public.elemento_avaliacao ea ON (((ea.criterio_id = c.id) AND (ea.ativo = true))))
     LEFT JOIN public.contador cnt ON (((cnt.dossie_id = d.id) AND (cnt.ativo = true))))
  GROUP BY d.id, d.nome, d.descricao, d.professor_disciplina_turma_id, d.data_inicio, d.data_fim, d.ativo;


ALTER TABLE public.v_dossie_resumo OWNER TO jorgem;

--
-- Name: VIEW v_dossie_resumo; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON VIEW public.v_dossie_resumo IS 'Resumo dos dossiês com contagens e validação';


--
-- Name: v_elemento_progresso; Type: VIEW; Schema: public; Owner: jorgem
--

CREATE VIEW public.v_elemento_progresso AS
 SELECT ea.id AS elemento_id,
    ea.nome AS elemento_nome,
    ea.tipo,
    ea.criterio_id,
    c.nome AS criterio_nome,
    c.dossie_id,
    count(ne.id) AS total_notas,
    count(
        CASE
            WHEN (ne.nota > (0)::numeric) THEN 1
            ELSE NULL::integer
        END) AS notas_atribuidas,
    count(
        CASE
            WHEN (ne.falta = true) THEN 1
            ELSE NULL::integer
        END) AS faltas,
    round(avg(
        CASE
            WHEN (ne.nota > (0)::numeric) THEN ne.nota
            ELSE NULL::numeric
        END), 2) AS media,
    round(min(
        CASE
            WHEN (ne.nota > (0)::numeric) THEN ne.nota
            ELSE NULL::numeric
        END), 2) AS minimo,
    round(max(ne.nota), 2) AS maximo
   FROM ((public.elemento_avaliacao ea
     JOIN public.criterio c ON ((c.id = ea.criterio_id)))
     LEFT JOIN public.nota_elemento ne ON ((ne.elemento_avaliacao_id = ea.id)))
  GROUP BY ea.id, ea.nome, ea.tipo, ea.criterio_id, c.nome, c.dossie_id;


ALTER TABLE public.v_elemento_progresso OWNER TO jorgem;

--
-- Name: VIEW v_elemento_progresso; Type: COMMENT; Schema: public; Owner: jorgem
--

COMMENT ON VIEW public.v_elemento_progresso IS 'Progresso e estatísticas de cada elemento de avaliação';


--
-- Name: aluno_disciplina aluno_disciplina_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_pkey PRIMARY KEY (id);


--
-- Name: aluno_turma aluno_turma_aluno_id_turma_id_ano_letivo_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_aluno_id_turma_id_ano_letivo_key UNIQUE (aluno_id, turma_id, ano_letivo);


--
-- Name: aluno_turma aluno_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_pkey PRIMARY KEY (id);


--
-- Name: ciclos_ensino ciclos_ensino_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.ciclos_ensino
    ADD CONSTRAINT ciclos_ensino_pkey PRIMARY KEY (id);


--
-- Name: classes classes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_codigo_key UNIQUE (codigo);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: contador contador_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.contador
    ADD CONSTRAINT contador_pkey PRIMARY KEY (id);


--
-- Name: contador_registo contador_registo_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.contador_registo
    ADD CONSTRAINT contador_registo_pkey PRIMARY KEY (id);


--
-- Name: criterio criterio_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.criterio
    ADD CONSTRAINT criterio_pkey PRIMARY KEY (id);


--
-- Name: disciplina_turma disciplina_turma_disciplina_id_turma_id_ano_letivo_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_disciplina_id_turma_id_ano_letivo_key UNIQUE (disciplina_id, turma_id, ano_letivo);


--
-- Name: disciplina_turma disciplina_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_pkey PRIMARY KEY (id);


--
-- Name: dossie dossie_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.dossie
    ADD CONSTRAINT dossie_pkey PRIMARY KEY (id);


--
-- Name: elemento_avaliacao elemento_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.elemento_avaliacao
    ADD CONSTRAINT elemento_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: momento_avaliacao momento_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.momento_avaliacao
    ADD CONSTRAINT momento_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: nota_elemento nota_elemento_elemento_avaliacao_id_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_elemento_avaliacao_id_aluno_id_key UNIQUE (elemento_avaliacao_id, aluno_id);


--
-- Name: nota_elemento nota_elemento_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_pkey PRIMARY KEY (id);


--
-- Name: nota_final_momento nota_final_momento_momento_avaliacao_id_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_momento_avaliacao_id_aluno_id_key UNIQUE (momento_avaliacao_id, aluno_id);


--
-- Name: nota_final_momento nota_final_momento_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_pkey PRIMARY KEY (id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_pkey PRIMARY KEY (id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_professor_id_disciplina_turma_id_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_professor_id_disciplina_turma_id_key UNIQUE (professor_id, disciplina_turma_id);


--
-- Name: subjects subjects_codigo_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_codigo_key UNIQUE (codigo);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_numero_mecanografico_key; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_numero_mecanografico_key UNIQUE (numero_mecanografico);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_aluno_disciplina_aluno_id; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_aluno_disciplina_aluno_id ON public.aluno_disciplina USING btree (aluno_id);


--
-- Name: idx_aluno_disciplina_disciplina_turma_id_aluno_id_ativo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_aluno_disciplina_disciplina_turma_id_aluno_id_ativo ON public.aluno_disciplina USING btree (disciplina_turma_id, aluno_id, ativo);


--
-- Name: idx_aluno_turma_aluno; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_aluno_turma_aluno ON public.aluno_turma USING btree (aluno_id);


--
-- Name: idx_aluno_turma_turma; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_aluno_turma_turma ON public.aluno_turma USING btree (turma_id);


--
-- Name: idx_aluno_turma_turma_id; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_aluno_turma_turma_id ON public.aluno_turma USING btree (turma_id) WHERE (ativo = true);


--
-- Name: idx_contador_dossie; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_dossie ON public.contador USING btree (dossie_id);


--
-- Name: idx_contador_registo_aluno; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_registo_aluno ON public.contador_registo USING btree (aluno_id);


--
-- Name: idx_contador_registo_aluno_data; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_registo_aluno_data ON public.contador_registo USING btree (aluno_id, created_at DESC);


--
-- Name: idx_contador_registo_contador; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_registo_contador ON public.contador_registo USING btree (contador_id);


--
-- Name: idx_contador_registo_data; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_registo_data ON public.contador_registo USING btree (created_at DESC);


--
-- Name: idx_contador_registo_recent; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_contador_registo_recent ON public.contador_registo USING btree (contador_id, created_at DESC);


--
-- Name: idx_criterio_dossie; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_criterio_dossie ON public.criterio USING btree (dossie_id);


--
-- Name: idx_criterio_ordem; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_criterio_ordem ON public.criterio USING btree (ordem);


--
-- Name: idx_disciplina_turma_id_professor_id_ativo_ano_letivo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_disciplina_turma_id_professor_id_ativo_ano_letivo ON public.disciplina_turma USING btree (id, professor_id, ativo, ano_letivo);


--
-- Name: idx_dossie_ativo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_dossie_ativo ON public.dossie USING btree (ativo);


--
-- Name: idx_dossie_professor_disciplina; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_dossie_professor_disciplina ON public.dossie USING btree (professor_disciplina_turma_id);


--
-- Name: idx_elemento_criterio; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_elemento_criterio ON public.elemento_avaliacao USING btree (criterio_id);


--
-- Name: idx_elemento_criterio_ativo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_elemento_criterio_ativo ON public.elemento_avaliacao USING btree (criterio_id, ativo);


--
-- Name: idx_elemento_data; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_elemento_data ON public.elemento_avaliacao USING btree (data_avaliacao);


--
-- Name: idx_elemento_tipo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_elemento_tipo ON public.elemento_avaliacao USING btree (tipo);


--
-- Name: idx_momento_avaliacao_dossie; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_momento_avaliacao_dossie ON public.momento_avaliacao USING btree (dossie_id);


--
-- Name: idx_nota_aluno; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_nota_aluno ON public.nota_elemento USING btree (aluno_id);


--
-- Name: idx_nota_elemento; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_nota_elemento ON public.nota_elemento USING btree (elemento_avaliacao_id);


--
-- Name: idx_nota_elemento_aluno; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_nota_elemento_aluno ON public.nota_elemento USING btree (elemento_avaliacao_id, aluno_id);


--
-- Name: idx_nota_elemento_elemento_nota; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_nota_elemento_elemento_nota ON public.nota_elemento USING btree (elemento_avaliacao_id, nota) WHERE (nota > (0)::numeric);


--
-- Name: idx_nota_final_momento_aluno; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nota_final_momento_aluno ON public.nota_final_momento USING btree (aluno_id);


--
-- Name: idx_nota_final_momento_momento; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nota_final_momento_momento ON public.nota_final_momento USING btree (momento_avaliacao_id);


--
-- Name: idx_professor_disciplina_professor; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_professor_disciplina_professor ON public.professor_disciplina_turma USING btree (professor_id);


--
-- Name: idx_users_aluno; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_users_aluno ON public.users USING btree (tipo_utilizador, ativo) WHERE (((tipo_utilizador)::text = 'ALUNO'::text) AND (ativo = true));


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_id_tipo_utilizador_ativo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_users_id_tipo_utilizador_ativo ON public.users USING btree (id, tipo_utilizador, ativo);


--
-- Name: idx_users_numero_mecanografico; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_users_numero_mecanografico ON public.users USING btree (numero_mecanografico);


--
-- Name: idx_users_tipo_ativo; Type: INDEX; Schema: public; Owner: jorgem
--

CREATE INDEX idx_users_tipo_ativo ON public.users USING btree (tipo_utilizador, ativo);


--
-- Name: contador update_contador_updated_at; Type: TRIGGER; Schema: public; Owner: jorgem
--

CREATE TRIGGER update_contador_updated_at BEFORE UPDATE ON public.contador FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: criterio update_criterio_updated_at; Type: TRIGGER; Schema: public; Owner: jorgem
--

CREATE TRIGGER update_criterio_updated_at BEFORE UPDATE ON public.criterio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dossie update_dossie_updated_at; Type: TRIGGER; Schema: public; Owner: jorgem
--

CREATE TRIGGER update_dossie_updated_at BEFORE UPDATE ON public.dossie FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: elemento_avaliacao update_elemento_avaliacao_updated_at; Type: TRIGGER; Schema: public; Owner: jorgem
--

CREATE TRIGGER update_elemento_avaliacao_updated_at BEFORE UPDATE ON public.elemento_avaliacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nota_elemento update_nota_elemento_updated_at; Type: TRIGGER; Schema: public; Owner: jorgem
--

CREATE TRIGGER update_nota_elemento_updated_at BEFORE UPDATE ON public.nota_elemento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: aluno_disciplina aluno_disciplina_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: aluno_disciplina aluno_disciplina_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: aluno_turma aluno_turma_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: aluno_turma aluno_turma_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.aluno_turma
    ADD CONSTRAINT aluno_turma_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: classes classes_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_ensino(id);


--
-- Name: classes classes_diretor_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_diretor_turma_id_fkey FOREIGN KEY (diretor_turma_id) REFERENCES public.users(id);


--
-- Name: contador contador_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.contador
    ADD CONSTRAINT contador_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: contador_registo contador_registo_contador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.contador_registo
    ADD CONSTRAINT contador_registo_contador_id_fkey FOREIGN KEY (contador_id) REFERENCES public.contador(id) ON DELETE CASCADE;


--
-- Name: criterio criterio_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.criterio
    ADD CONSTRAINT criterio_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: disciplina_turma disciplina_turma_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id);


--
-- Name: disciplina_turma disciplina_turma_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


--
-- Name: disciplina_turma disciplina_turma_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.disciplina_turma
    ADD CONSTRAINT disciplina_turma_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: dossie dossie_professor_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.dossie
    ADD CONSTRAINT dossie_professor_disciplina_turma_id_fkey FOREIGN KEY (professor_disciplina_turma_id) REFERENCES public.professor_disciplina_turma(id) ON DELETE CASCADE;


--
-- Name: elemento_avaliacao elemento_avaliacao_criterio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.elemento_avaliacao
    ADD CONSTRAINT elemento_avaliacao_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES public.criterio(id) ON DELETE CASCADE;


--
-- Name: momento_avaliacao momento_avaliacao_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.momento_avaliacao
    ADD CONSTRAINT momento_avaliacao_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: nota_elemento nota_elemento_elemento_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_elemento_avaliacao_id_fkey FOREIGN KEY (elemento_avaliacao_id) REFERENCES public.elemento_avaliacao(id) ON DELETE CASCADE;


--
-- Name: nota_final_momento nota_final_momento_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nota_final_momento nota_final_momento_momento_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_momento_avaliacao_id_fkey FOREIGN KEY (momento_avaliacao_id) REFERENCES public.momento_avaliacao(id) ON DELETE CASCADE;


--
-- Name: professor_disciplina_turma professor_disciplina_turma_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: professor_disciplina_turma professor_disciplina_turma_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jorgem
--

ALTER TABLE ONLY public.professor_disciplina_turma
    ADD CONSTRAINT professor_disciplina_turma_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


--
-- Name: TABLE aluno_disciplina; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.aluno_disciplina TO feedback_user;


--
-- Name: TABLE aluno_turma; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.aluno_turma TO feedback_user;


--
-- Name: TABLE classes; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.classes TO feedback_user;


--
-- Name: TABLE contador; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.contador TO feedback_user;


--
-- Name: TABLE contador_registo; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.contador_registo TO feedback_user;


--
-- Name: TABLE criterio; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.criterio TO feedback_user;


--
-- Name: TABLE disciplina_turma; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.disciplina_turma TO feedback_user;


--
-- Name: TABLE dossie; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.dossie TO feedback_user;


--
-- Name: TABLE elemento_avaliacao; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.elemento_avaliacao TO feedback_user;


--
-- Name: TABLE momento_avaliacao; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.momento_avaliacao TO feedback_user;


--
-- Name: TABLE nota_elemento; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.nota_elemento TO feedback_user;


--
-- Name: TABLE nota_final_momento; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.nota_final_momento TO feedback_user;


--
-- Name: TABLE professor_disciplina_turma; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.professor_disciplina_turma TO feedback_user;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.subjects TO feedback_user;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: jorgem
--

GRANT ALL ON TABLE public.users TO feedback_user;


--
-- PostgreSQL database dump complete
--


