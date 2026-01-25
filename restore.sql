--
-- NOTE:
--
-- File paths need to be edited. Search for $$PATH$$ and
-- replace it with the path to the directory containing
-- the extracted data files.
--
--
-- PostgreSQL database dump
--

-- Dumped from database version 14.20 (Debian 14.20-1.pgdg13+1)
-- Dumped by pg_dump version 14.20 (Debian 14.20-1.pgdg13+1)

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

DROP DATABASE valcoin;
--
-- Name: valcoin; Type: DATABASE; Schema: -; Owner: user
--

CREATE DATABASE valcoin WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.utf8';


ALTER DATABASE valcoin OWNER TO "user";

\unrestrict (null)
\connect valcoin
\restrict (null)

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
-- Name: nivel_proficiencia; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.nivel_proficiencia AS ENUM (
    'fraco',
    'nao_satisfaz',
    'satisfaz',
    'satisfaz_bastante',
    'excelente'
);


ALTER TYPE public.nivel_proficiencia OWNER TO "user";

--
-- Name: tipo_contador; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.tipo_contador AS ENUM (
    'atitudinal',
    'participacao',
    'experimental',
    'social',
    'vocacional'
);


ALTER TYPE public.tipo_contador OWNER TO "user";

--
-- Name: tipo_elemento_avaliacao; Type: TYPE; Schema: public; Owner: user
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


ALTER TYPE public.tipo_elemento_avaliacao OWNER TO "user";

--
-- Name: tipo_medida_educativa; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.tipo_medida_educativa AS ENUM (
    'universal',
    'seletiva',
    'adicional',
    'nenhuma'
);


ALTER TYPE public.tipo_medida_educativa OWNER TO "user";

--
-- Name: aluno_tem_medida_educativa(uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.aluno_tem_medida_educativa(p_aluno_id uuid, p_disciplina_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM aluno_medida_educativa
    WHERE aluno_id = p_aluno_id
        AND data_fim IS NULL
        AND (disciplina_id = p_disciplina_id OR disciplina_id IS NULL OR p_disciplina_id IS NULL);
    
    RETURN v_count > 0;
END;
$$;


ALTER FUNCTION public.aluno_tem_medida_educativa(p_aluno_id uuid, p_disciplina_id uuid) OWNER TO "user";

--
-- Name: arquivar_aplicacoes_antigas(integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.arquivar_aplicacoes_antigas(anos_atras integer DEFAULT 2) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_arquivado integer := 0;
BEGIN
    -- Arquiva aplicações fechadas há mais de X anos
    WITH arquivadas AS (
        INSERT INTO public.aplicacoes_arquivo
        SELECT a.*, NOW(), NULL
        FROM public.aplicacoes_questionario a
        WHERE a.data_fecho IS NOT NULL
          AND a.data_fecho < NOW() - (anos_atras || ' years')::interval
        RETURNING id
    )
    SELECT COUNT(*) INTO total_arquivado FROM arquivadas;

    -- Arquiva as respostas dessas aplicações
    INSERT INTO public.respostas_arquivo
    SELECT r.*, NOW()
    FROM public.respostas_questionario r
    JOIN aplicacoes_arquivo aa ON aa.id = r.aplicacao_id;

    -- Apaga as aplicações originais (CASCADE limpa tudo)
    DELETE FROM public.aplicacoes_questionario
    WHERE data_fecho IS NOT NULL
      AND data_fecho < NOW() - (anos_atras || ' years')::interval;

    RETURN total_arquivado;
END;
$$;


ALTER FUNCTION public.arquivar_aplicacoes_antigas(anos_atras integer) OWNER TO "user";

--
-- Name: atualizar_contadores_resposta(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.atualizar_contadores_resposta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Atualiza a data de resposta no destinatário (se existir)
    IF NEW.destinatario_id IS NOT NULL THEN
        UPDATE public.destinatarios_aplicacao
        SET respondido_em = NEW.submetido_em
        WHERE id = NEW.destinatario_id;
    END IF;

    -- Incrementa o contador de respostas na aplicação
    UPDATE public.aplicacoes_questionario
    SET total_respostas = total_respostas + 1
    WHERE id = NEW.aplicacao_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.atualizar_contadores_resposta() OWNER TO "user";

--
-- Name: atualizar_data_atualizacao(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.atualizar_data_atualizacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.atualizar_data_atualizacao() OWNER TO "user";

--
-- Name: atualizar_indicadores_tracking(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.atualizar_indicadores_tracking() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    ano_ref INTEGER;
BEGIN
    ano_ref := NEW.ano_conclusao + 1;

    -- Atualiza indicador 1, 4, 6a etc. (podes expandir)
    -- Aqui só um exemplo simplificado para indicador 1
    DELETE FROM eqavet_indicador_1_colocacao
    WHERE ciclo_formativo_id = NEW.ciclo_formativo_id AND ano_recolha = ano_ref;

    INSERT INTO eqavet_indicador_1_colocacao (
        ciclo_formativo_id, ano_recolha, total_diplomados, prosseguimento_estudos,
        empregados, taxa_colocacao_global
    )
    SELECT
        NEW.ciclo_formativo_id,
        ano_ref,
        COUNT(*),
        COUNT(*) FILTER (WHERE situacao_atual IN ('ENSINO_SUPERIOR','FORMACAO_POS')),
        COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA','ESTAGIO')),
        ROUND(100.0 * COUNT(*) FILTER (WHERE situacao_atual IN ('EMPREGADO','CONTA_PROPRIA','ESTAGIO','ENSINO_SUPERIOR','FORMACAO_POS')) / COUNT(*), 2)
    FROM eqavet_tracking_diplomados
    WHERE ciclo_formativo_id = NEW.ciclo_formativo_id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.atualizar_indicadores_tracking() OWNER TO "user";

--
-- Name: calcular_evolucao_competencia(uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.calcular_evolucao_competencia(p_aluno_id uuid, p_competencia_id uuid) RETURNS TABLE(primeira_avaliacao date, ultima_avaliacao date, nivel_inicial public.nivel_proficiencia, nivel_atual public.nivel_proficiencia, evolucao integer, total_avaliacoes integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH avaliacoes_ordenadas AS (
        SELECT 
            data_avaliacao,
            nivel,
            ROW_NUMBER() OVER (ORDER BY data_avaliacao ASC) as ordem
        FROM avaliacao_competencia
        WHERE aluno_id = p_aluno_id
            AND competencia_id = p_competencia_id
        ORDER BY data_avaliacao
    ),
    primeira AS (
        SELECT data_avaliacao, nivel
        FROM avaliacoes_ordenadas
        WHERE ordem = 1
    ),
    ultima AS (
        SELECT data_avaliacao, nivel
        FROM avaliacoes_ordenadas
        ORDER BY ordem DESC
        LIMIT 1
    )
    SELECT 
        primeira.data_avaliacao,
        ultima.data_avaliacao,
        primeira.nivel,
        ultima.nivel,
        (nivel_proficiencia_to_number(ultima.nivel) - nivel_proficiencia_to_number(primeira.nivel))::INTEGER,
        (SELECT COUNT(*)::INTEGER FROM avaliacoes_ordenadas)
    FROM primeira, ultima;
END;
$$;


ALTER FUNCTION public.calcular_evolucao_competencia(p_aluno_id uuid, p_competencia_id uuid) OWNER TO "user";

--
-- Name: calcular_nota_criterio(uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nota_criterio NUMERIC := 0;
    v_soma_ponderacoes NUMERIC := 0;
    v_elemento RECORD;
BEGIN
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


ALTER FUNCTION public.calcular_nota_criterio(p_criterio_id uuid, p_aluno_id uuid) OWNER TO "user";

--
-- Name: calcular_nota_dossie(uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_nota_final NUMERIC := 0;
    v_criterio RECORD;
    v_nota_criterio NUMERIC;
BEGIN
    FOR v_criterio IN 
        SELECT id, ponderacao
        FROM public.criterio
        WHERE dossie_id = p_dossie_id 
            AND ativo = true
    LOOP
        v_nota_criterio := calcular_nota_criterio(v_criterio.id, p_aluno_id);
        v_nota_final := v_nota_final + (v_nota_criterio * (v_criterio.ponderacao / 100));
    END LOOP;
    
    RETURN ROUND(v_nota_final, 2);
END;
$$;


ALTER FUNCTION public.calcular_nota_dossie(p_dossie_id uuid, p_aluno_id uuid) OWNER TO "user";

--
-- Name: calcular_pontos_contadores(uuid, uuid, public.tipo_contador); Type: FUNCTION; Schema: public; Owner: user
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


ALTER FUNCTION public.calcular_pontos_contadores(p_dossie_id uuid, p_aluno_id uuid, p_tipo_contador public.tipo_contador) OWNER TO "user";

--
-- Name: check_criterio_disciplina_departamento(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.check_criterio_disciplina_departamento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    dept_disciplina UUID;
    criterio_tem_departamento BOOLEAN;
BEGIN
    -- Departamento da disciplina escolhida
    SELECT departamento_id INTO dept_disciplina
    FROM public.subjects
    WHERE id = NEW.disciplina_id;
    
    -- Verificar se esse departamento está associado ao critério
    SELECT EXISTS (
        SELECT 1 
        FROM public.criterio_sucesso_departamento
        WHERE criterio_sucesso_id = NEW.criterio_sucesso_id
            AND departamento_id = dept_disciplina
            AND ativo = true
    ) INTO criterio_tem_departamento;
    
    IF NOT criterio_tem_departamento THEN
        RAISE EXCEPTION 'A disciplina (%) não pertence a nenhum dos departamentos associados ao critério de sucesso', NEW.disciplina_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_criterio_disciplina_departamento() OWNER TO "user";

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
-- Name: criar_destinatarios_aplicacao(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.criar_destinatarios_aplicacao() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_token text;
BEGIN
    -- Sempre gera um token único para aplicações do tipo link_aberto
    IF NEW.tipo_aplicacao = 'link_aberto' THEN
        UPDATE public.aplicacoes_questionario
        SET token_acesso = encode(gen_random_bytes(32), 'hex')
        WHERE id = NEW.id;
    END IF;

    -- ==============================================================
    -- 1. ALUNOS - TURMA INTEIRA
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'turma' 
       AND NEW.turma_id IS NOT NULL 
       AND NEW.publico_alvo = 'alunos' THEN

        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, user_id, tipo_destinatario, nome_destinatario
        )
        SELECT 
            NEW.id,
            u.id,
            'aluno',
            u.nome
        FROM public.users u
        JOIN public.matriculas_turma mt ON mt.aluno_id = u.id
        WHERE mt.turma_id = NEW.turma_id
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 2. ALUNOS - DISCIPLINA/TURMA
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'disciplina_turma' AND NEW.disciplina_turma_id IS NOT NULL AND NEW.publico_alvo = 'alunos' THEN
        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, user_id, tipo_destinatario, nome_destinatario
        )
        SELECT 
            NEW.id,
            u.id,
            'aluno',
            u.nome
        FROM public.users u
        JOIN public.aluno_disciplina ma ON ma.aluno_id = u.id
        WHERE ma.disciplina_turma_id = NEW.disciplina_turma_id
          AND ma.ativo = true
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 3. TODOS OS PROFESSORES
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'todos_professores' AND NEW.publico_alvo = 'professores' THEN
        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, user_id, tipo_destinatario, nome_destinatario
        )
        SELECT NEW.id, u.id, 'professor', u.nome
        FROM public.users u
        WHERE u.tipo_utilizador = 'PROFESSOR'
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 4. TODOS OS FUNCIONÁRIOS
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'todos_funcionarios' AND NEW.publico_alvo = 'funcionarios' THEN
        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, user_id, tipo_destinatario, nome_destinatario
        )
        SELECT NEW.id, u.id, 'funcionario', u.nome
        FROM public.users u
        WHERE u.tipo_utilizador = 'FUNCIONARIO'
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 5. ENCARREGADOS - TURMA
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'encarregados_turma' 
       AND NEW.turma_id IS NOT NULL 
       AND NEW.publico_alvo = 'encarregados' THEN

        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, encarregado_id, tipo_destinatario, nome_destinatario, token_acesso
        )
        SELECT DISTINCT
            NEW.id,
            ee.id,
            'encarregado',
            ee.nome,
            encode(gen_random_bytes(32), 'hex')
        FROM public.encarregados_educacao ee
        JOIN public.alunos_encarregados ae ON ae.encarregado_id = ee.id
        JOIN public.matriculas_turma mt ON mt.aluno_id = ae.aluno_id
        WHERE mt.turma_id = NEW.turma_id
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND ee.ativo = true
        ON CONFLICT (aplicacao_id, encarregado_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 6. ENCARREGADOS - ANO ESCOLAR
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'encarregados_ano' 
       AND NEW.ano_escolar IS NOT NULL 
       AND NEW.publico_alvo = 'encarregados' THEN

        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, encarregado_id, tipo_destinatario, nome_destinatario, token_acesso
        )
        SELECT DISTINCT
            NEW.id,
            ee.id,
            'encarregado',
            ee.nome,
            encode(gen_random_bytes(32), 'hex')
        FROM public.encarregados_educacao ee
        JOIN public.alunos_encarregados ae ON ae.encarregado_id = ee.id
        JOIN public.matriculas_turma mt ON mt.aluno_id = ae.aluno_id
        JOIN public.classes c ON c.id = mt.turma_id
        WHERE c.ano = NEW.ano_escolar
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND ee.ativo = true
        ON CONFLICT (aplicacao_id, encarregado_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 7. EMPRESAS PARCEIRAS
    -- ==============================================================
    IF NEW.tipo_aplicacao = 'empresas_parceiras' AND NEW.publico_alvo = 'empresas' THEN
        INSERT INTO public.destinatarios_aplicacao (
            aplicacao_id, empresa_id, tipo_destinatario, nome_destinatario, token_acesso
        )
        SELECT
            NEW.id,
            e.id,
            'empresa',
            e.nome,
            encode(gen_random_bytes(32), 'hex')
        FROM public.empresas e
        WHERE e.ativo = true
          AND e.tipo_parceria IS NOT NULL
        ON CONFLICT (aplicacao_id, empresa_id) DO NOTHING;
    END IF;

    -- ==============================================================
    -- 8. ATUALIZA CONTADOR DE DESTINATÁRIOS
    -- ==============================================================
    UPDATE public.aplicacoes_questionario
    SET total_destinatarios = (
        SELECT COUNT(*) 
        FROM public.destinatarios_aplicacao 
        WHERE aplicacao_id = NEW.id
    )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.criar_destinatarios_aplicacao() OWNER TO "user";

--
-- Name: feedback_update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.feedback_update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.feedback_update_updated_at_column() OWNER TO "user";

--
-- Name: get_departamentos_criterio(uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.get_departamentos_criterio(p_criterio_id uuid) RETURNS TABLE(departamento_id uuid, departamento_nome character varying, papel character varying, prioridade integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.nome,
        csd.papel,
        csd.prioridade
    FROM criterio_sucesso_departamento csd
    JOIN departamento d ON d.id = csd.departamento_id
    WHERE csd.criterio_sucesso_id = p_criterio_id
        AND csd.ativo = true
        AND d.ativo = true
    ORDER BY csd.prioridade;
END;
$$;


ALTER FUNCTION public.get_departamentos_criterio(p_criterio_id uuid) OWNER TO "user";

--
-- Name: nivel_para_numero(text); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.nivel_para_numero(n text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE n
    WHEN 'não satisfaz'     THEN 1
    WHEN 'insuficiente'     THEN 1
    WHEN 'satisfaz'         THEN 2
    WHEN 'bom'              THEN 3
    WHEN 'muito bom'        THEN 4
    WHEN 'excelente'        THEN 5
    ELSE 1  -- caso venha algo inesperado
END;
$$;


ALTER FUNCTION public.nivel_para_numero(n text) OWNER TO "user";

--
-- Name: nivel_proficiencia_to_number(public.nivel_proficiencia); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.nivel_proficiencia_to_number(nivel public.nivel_proficiencia) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN CASE nivel
        WHEN 'fraco' THEN 1
        WHEN 'nao_satisfaz' THEN 2
        WHEN 'satisfaz' THEN 3
        WHEN 'satisfaz_bastante' THEN 4
        WHEN 'excelente' THEN 5
    END;
END;
$$;


ALTER FUNCTION public.nivel_proficiencia_to_number(nivel public.nivel_proficiencia) OWNER TO "user";

--
-- Name: obter_alunos_elegiveis_competencia(uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.obter_alunos_elegiveis_competencia(p_competencia_id uuid, p_disciplina_turma_id uuid) RETURNS TABLE(aluno_id uuid, aluno_nome character varying, numero_mecanografico character varying, tem_medida_educativa boolean, tipo_medida_aplicada public.tipo_medida_educativa, descricao_medida text, elegivel_por character varying)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    WITH competencia_info AS (
        SELECT 
            c.id,
            c.disciplina_id,
            c.medida_educativa AS medida_educativa,
            dt.turma_id
        FROM competencia c
        JOIN disciplina_turma dt ON dt.id = p_disciplina_turma_id
        WHERE c.id = p_competencia_id
          AND c.ativo = true
          AND dt.ativo = true
          AND c.disciplina_id = dt.disciplina_id
    ),
    alunos_turma AS (
        SELECT DISTINCT
            u.id AS aluno_id,
            u.nome AS aluno_nome,
            u.numero_mecanografico
        FROM users u
        JOIN aluno_turma atu ON atu.aluno_id = u.id AND atu.ativo = true
        JOIN competencia_info ci ON ci.turma_id = atu.turma_id
        WHERE u.tipo_utilizador = 'ALUNO' AND u.ativo = true
    ),
    medidas_ativas AS (
        SELECT DISTINCT
            ame.aluno_id,
            ame.tipo_medida,
            ame.descricao
        FROM aluno_medida_educativa ame
        JOIN alunos_turma al ON al.aluno_id = ame.aluno_id
        JOIN competencia_info ci ON (
            ame.disciplina_id = ci.disciplina_id 
            OR ame.disciplina_id IS NULL
        )
        WHERE ame.data_inicio <= CURRENT_DATE
          AND (ame.data_fim IS NULL OR ame.data_fim >= CURRENT_DATE)
    )
    SELECT
        at.aluno_id,
        at.aluno_nome,
        at.numero_mecanografico,
        (ma.aluno_id IS NOT NULL)                              AS tem_medida_educativa,
        ma.tipo_medida                                         AS tipo_medida_aplicada,
        ma.descricao                                           AS descricao_medida,
        CASE
            WHEN ci.medida_educativa IN ('universal', 'nenhuma')
                THEN 'universal'::varchar
            WHEN ci.medida_educativa = 'seletiva'  AND ma.tipo_medida = 'seletiva'
                THEN 'medida_seletiva'::varchar
            WHEN ci.medida_educativa = 'adicional' AND ma.tipo_medida = 'adicional'
                THEN 'medida_adicional'::varchar
            ELSE NULL
        END                                                    AS elegivel_por
    FROM alunos_turma at
    CROSS JOIN competencia_info ci
    LEFT JOIN medidas_ativas ma ON ma.aluno_id = at.aluno_id
    WHERE
        ci.medida_educativa IN ('universal', 'nenhuma')
        OR (ci.medida_educativa = 'seletiva'  AND ma.tipo_medida = 'seletiva')
        OR (ci.medida_educativa = 'adicional' AND ma.tipo_medida = 'adicional')
    ORDER BY at.aluno_nome;
END;
$$;


ALTER FUNCTION public.obter_alunos_elegiveis_competencia(p_competencia_id uuid, p_disciplina_turma_id uuid) OWNER TO "user";

--
-- Name: professor_pode_avaliar_criterio(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.professor_pode_avaliar_criterio(p_professor_id uuid, p_criterio_id uuid, p_disciplina_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    dept_disciplina UUID;
    pode_avaliar BOOLEAN;
BEGIN
    -- Departamento da disciplina
    SELECT departamento_id INTO dept_disciplina
    FROM subjects
    WHERE id = p_disciplina_id;
    
    -- Verificar se departamento está no critério
    SELECT EXISTS (
        SELECT 1
        FROM criterio_sucesso_departamento
        WHERE criterio_sucesso_id = p_criterio_id
            AND departamento_id = dept_disciplina
            AND ativo = true
    ) INTO pode_avaliar;
    
    RETURN pode_avaliar;
END;
$$;


ALTER FUNCTION public.professor_pode_avaliar_criterio(p_professor_id uuid, p_criterio_id uuid, p_disciplina_id uuid) OWNER TO "user";

--
-- Name: registar_alteracao_competencia(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.registar_alteracao_competencia() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO competencia_historico (
            competencia_id,
            alterado_por_id,
            tipo_alteracao,
            dados_novos
        ) VALUES (
            NEW.id,
            NEW.criado_por_id,
            'criacao',
            row_to_json(NEW)::jsonb
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO competencia_historico (
            competencia_id,
            alterado_por_id,
            tipo_alteracao,
            dados_anteriores,
            dados_novos
        ) VALUES (
            NEW.id,
            NEW.criado_por_id,
            CASE 
                WHEN OLD.validado = false AND NEW.validado = true THEN 'validacao'
                WHEN OLD.ativo = true AND NEW.ativo = false THEN 'desativacao'
                WHEN OLD.ativo = false AND NEW.ativo = true THEN 'ativacao'
                ELSE 'edicao'
            END,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.registar_alteracao_competencia() OWNER TO "user";

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
-- Name: update_competencia_updated_at(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_competencia_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_competencia_updated_at() OWNER TO "user";

--
-- Name: update_generic_updated_at_column(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_generic_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_generic_updated_at_column() OWNER TO "user";

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

--
-- Name: update_updated_at_column_roles(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_updated_at_column_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column_roles() OWNER TO "user";

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
-- Name: aluno_medida_educativa; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.aluno_medida_educativa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    tipo_medida public.tipo_medida_educativa NOT NULL,
    disciplina_id uuid,
    descricao text NOT NULL,
    data_inicio date NOT NULL,
    data_fim date,
    registado_por_id uuid NOT NULL,
    documento_referencia character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT aluno_medida_educativa_tipo_medida_check CHECK ((tipo_medida = ANY (ARRAY['universal'::public.tipo_medida_educativa, 'seletiva'::public.tipo_medida_educativa, 'adicional'::public.tipo_medida_educativa])))
);


ALTER TABLE public.aluno_medida_educativa OWNER TO "user";

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
-- Name: alunos_encarregados; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.alunos_encarregados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    encarregado_id uuid NOT NULL,
    principal boolean DEFAULT false,
    data_vinculo timestamp with time zone DEFAULT now()
);


ALTER TABLE public.alunos_encarregados OWNER TO "user";

--
-- Name: aplicacoes_questionario; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.aplicacoes_questionario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    questionario_id uuid NOT NULL,
    aplicador_id uuid NOT NULL,
    tipo_aplicacao character varying(30) NOT NULL,
    publico_alvo character varying(30) NOT NULL,
    turma_id uuid,
    disciplina_turma_id uuid,
    ano_escolar integer,
    ano_letivo character varying(9) DEFAULT '2025/26'::character varying NOT NULL,
    data_abertura timestamp with time zone NOT NULL,
    data_fecho timestamp with time zone,
    titulo_customizado character varying(255),
    mensagem_introducao text,
    mensagem_conclusao text,
    notificar_destinatarios boolean DEFAULT true,
    lembrar_nao_respondidos boolean DEFAULT false,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    total_destinatarios integer,
    total_respostas integer DEFAULT 0,
    periodo character varying(20),
    token_acesso character varying(64),
    CONSTRAINT aplicacoes_questionario_publico_alvo_check CHECK (((publico_alvo)::text = ANY ((ARRAY['alunos'::character varying, 'professores'::character varying, 'funcionarios'::character varying, 'encarregados'::character varying, 'empresas'::character varying, 'externos'::character varying, 'misto'::character varying])::text[]))),
    CONSTRAINT aplicacoes_questionario_tipo_aplicacao_check CHECK (((tipo_aplicacao)::text = ANY ((ARRAY['turma'::character varying, 'disciplina_turma'::character varying, 'todos_professores'::character varying, 'todos_funcionarios'::character varying, 'encarregados_turma'::character varying, 'encarregados_ano'::character varying, 'empresas_parceiras'::character varying, 'link_aberto'::character varying])::text[])))
);


ALTER TABLE public.aplicacoes_questionario OWNER TO "user";

--
-- Name: assuntos; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.assuntos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discipline_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.assuntos OWNER TO "user";

--
-- Name: audio_flashcard_attempts; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.audio_flashcard_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    flashcard_id uuid NOT NULL,
    attempt_type character varying(20) NOT NULL,
    phoneme_index integer,
    student_text_input text,
    student_audio_transcription text,
    expected_text text NOT NULL,
    is_correct boolean NOT NULL,
    similarity_score numeric(5,2),
    confidence_score numeric(3,2),
    time_spent_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audio_flashcard_attempts OWNER TO "user";

--
-- Name: TABLE audio_flashcard_attempts; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.audio_flashcard_attempts IS 'Registo de tentativas em flashcards de áudio (sem guardar ficheiros de áudio)';


--
-- Name: avaliacao_competencia; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.avaliacao_competencia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competencia_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    disciplina_turma_id uuid NOT NULL,
    nivel public.nivel_proficiencia NOT NULL,
    observacoes text,
    momento_avaliacao character varying(100),
    data_avaliacao date DEFAULT CURRENT_DATE,
    evidencias jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT avaliacao_competencia_nivel_check CHECK ((nivel = ANY (ARRAY['fraco'::public.nivel_proficiencia, 'nao_satisfaz'::public.nivel_proficiencia, 'satisfaz'::public.nivel_proficiencia, 'satisfaz_bastante'::public.nivel_proficiencia, 'excelente'::public.nivel_proficiencia])))
);


ALTER TABLE public.avaliacao_competencia OWNER TO "user";

--
-- Name: avaliacao_criterio_sucesso; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.avaliacao_criterio_sucesso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    criterio_sucesso_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    pontuacao numeric(5,2) NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    ano_escolaridade_aluno integer NOT NULL,
    periodo character varying(20),
    observacoes text,
    evidencias jsonb,
    atingiu_sucesso boolean DEFAULT false,
    data_conclusao timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT avaliacao_criterio_sucesso_pontuacao_check CHECK (((pontuacao >= (0)::numeric) AND (pontuacao <= (10)::numeric)))
);


ALTER TABLE public.avaliacao_criterio_sucesso OWNER TO "user";

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
-- Name: competencia; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.competencia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disciplina_id uuid NOT NULL,
    codigo character varying(50) NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    medida_educativa public.tipo_medida_educativa DEFAULT 'nenhuma'::public.tipo_medida_educativa,
    descricao_adaptacao text,
    criado_por_id uuid NOT NULL,
    validado boolean DEFAULT false,
    validado_por_id uuid,
    data_validacao timestamp without time zone,
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT competencia_medida_educativa_check CHECK ((medida_educativa = ANY (ARRAY['universal'::public.tipo_medida_educativa, 'seletiva'::public.tipo_medida_educativa, 'adicional'::public.tipo_medida_educativa, 'nenhuma'::public.tipo_medida_educativa])))
);


ALTER TABLE public.competencia OWNER TO "user";

--
-- Name: competencia_disciplina_turma; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.competencia_disciplina_turma (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competencia_id uuid NOT NULL,
    disciplina_turma_id uuid NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.competencia_disciplina_turma OWNER TO "user";

--
-- Name: competencia_dominio; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.competencia_dominio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competencia_id uuid NOT NULL,
    dominio_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.competencia_dominio OWNER TO "user";

--
-- Name: TABLE competencia_dominio; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.competencia_dominio IS 'Junction table to link competencias and dominios in a many-to-many relationship.';


--
-- Name: COLUMN competencia_dominio.competencia_id; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.competencia_dominio.competencia_id IS 'Foreign key to the competencia table.';


--
-- Name: COLUMN competencia_dominio.dominio_id; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.competencia_dominio.dominio_id IS 'Foreign key to the dominios table.';


--
-- Name: competencia_historico; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.competencia_historico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competencia_id uuid NOT NULL,
    alterado_por_id uuid NOT NULL,
    tipo_alteracao character varying(50) NOT NULL,
    dados_anteriores jsonb,
    dados_novos jsonb,
    motivo text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT competencia_historico_tipo_alteracao_check CHECK (((tipo_alteracao)::text = ANY ((ARRAY['criacao'::character varying, 'edicao'::character varying, 'validacao'::character varying, 'desativacao'::character varying, 'ativacao'::character varying])::text[])))
);


ALTER TABLE public.competencia_historico OWNER TO "user";

--
-- Name: contador; Type: TABLE; Schema: public; Owner: user
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


ALTER TABLE public.contador OWNER TO "user";

--
-- Name: contador_registo; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.contador_registo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contador_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    observacao text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contador_registo OWNER TO "user";

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
-- Name: criterio; Type: TABLE; Schema: public; Owner: user
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


ALTER TABLE public.criterio OWNER TO "user";

--
-- Name: criterio_sucesso; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.criterio_sucesso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(50) NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text NOT NULL,
    ano_escolaridade_inicial integer NOT NULL,
    ano_escolaridade_limite integer,
    nivel_aceitavel numeric(5,2) DEFAULT 7.0 NOT NULL,
    periodicidade_avaliacao character varying(20) DEFAULT 'semestral'::character varying,
    tipo_criterio character varying(50) DEFAULT 'departamental'::character varying,
    aprovado_por character varying(100),
    data_aprovacao date,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT criterio_sucesso_ano_escolaridade_inicial_check CHECK (((ano_escolaridade_inicial >= 5) AND (ano_escolaridade_inicial <= 12))),
    CONSTRAINT criterio_sucesso_check CHECK ((ano_escolaridade_limite >= ano_escolaridade_inicial)),
    CONSTRAINT criterio_sucesso_nivel_aceitavel_check CHECK (((nivel_aceitavel >= (0)::numeric) AND (nivel_aceitavel <= (10)::numeric))),
    CONSTRAINT criterio_sucesso_periodicidade_avaliacao_check CHECK (((periodicidade_avaliacao)::text = ANY ((ARRAY['trimestral'::character varying, 'semestral'::character varying, 'anual'::character varying])::text[])))
);


ALTER TABLE public.criterio_sucesso OWNER TO "user";

--
-- Name: TABLE criterio_sucesso; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.criterio_sucesso IS 'Critérios de sucesso para acompanhamento longitudinal - podem ser multi-departamentais';


--
-- Name: COLUMN criterio_sucesso.tipo_criterio; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.criterio_sucesso.tipo_criterio IS 'Classificação do critério: departamental (1 dept), transversal (2+ depts), interdisciplinar, global';


--
-- Name: criterio_sucesso_departamento; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.criterio_sucesso_departamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    criterio_sucesso_id uuid NOT NULL,
    departamento_id uuid NOT NULL,
    papel character varying(50) DEFAULT 'responsavel'::character varying,
    prioridade integer DEFAULT 1,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.criterio_sucesso_departamento OWNER TO "user";

--
-- Name: TABLE criterio_sucesso_departamento; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.criterio_sucesso_departamento IS 'Associação N-N entre critérios de sucesso e departamentos';


--
-- Name: COLUMN criterio_sucesso_departamento.papel; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.criterio_sucesso_departamento.papel IS 'Responsável = dept principal, Colaborador = dept secundário';


--
-- Name: COLUMN criterio_sucesso_departamento.prioridade; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.criterio_sucesso_departamento.prioridade IS '1 = departamento principal, 2+ = departamentos colaboradores';


--
-- Name: criterio_sucesso_professor; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.criterio_sucesso_professor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    criterio_sucesso_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    disciplina_id uuid NOT NULL,
    data_declaracao date DEFAULT CURRENT_DATE,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.criterio_sucesso_professor OWNER TO "user";

--
-- Name: departamento; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.departamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    codigo character varying(20) NOT NULL,
    descricao text,
    coordenador_id uuid,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.departamento OWNER TO "user";

--
-- Name: destinatarios_aplicacao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.destinatarios_aplicacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aplicacao_id uuid NOT NULL,
    user_id uuid,
    encarregado_id uuid,
    empresa_id uuid,
    email_externo character varying(255),
    nome_destinatario character varying(255),
    tipo_destinatario character varying(30) NOT NULL,
    enviado_em timestamp with time zone DEFAULT now(),
    respondido_em timestamp with time zone,
    token_acesso character varying(64),
    visualizado_em timestamp with time zone,
    ultimo_lembrete_em timestamp with time zone,
    numero_lembretes integer DEFAULT 0,
    CONSTRAINT destinatarios_aplicacao_tipo_destinatario_check CHECK (((tipo_destinatario)::text = ANY ((ARRAY['aluno'::character varying, 'professor'::character varying, 'funcionario'::character varying, 'encarregado'::character varying, 'empresa'::character varying, 'externo'::character varying])::text[])))
);


ALTER TABLE public.destinatarios_aplicacao OWNER TO "user";

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
-- Name: dominios; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.dominios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    criado_por_id uuid,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.dominios OWNER TO "user";

--
-- Name: TABLE dominios; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.dominios IS 'Tabela para armazenar os domínios de competências (ex: Cognitivo, Socio-emocional).';


--
-- Name: dossie; Type: TABLE; Schema: public; Owner: user
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


ALTER TABLE public.dossie OWNER TO "user";

--
-- Name: elemento_avaliacao; Type: TABLE; Schema: public; Owner: user
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


ALTER TABLE public.elemento_avaliacao OWNER TO "user";

--
-- Name: empresas; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    nome_curto character varying(100),
    nif character varying(20),
    email_contacto character varying(255),
    telefone character varying(50),
    pessoa_contacto character varying(255),
    tipo_parceria character varying(50),
    ativo boolean DEFAULT true,
    data_inicio_parceria date,
    data_fim_parceria date,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    criador_id uuid NOT NULL,
    website character varying(255),
    setor_atividade character varying(100),
    numero_colaboradores integer,
    observacoes text,
    logo_url character varying(500),
    data_inativacao timestamp with time zone
);


ALTER TABLE public.empresas OWNER TO "user";

--
-- Name: TABLE empresas; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.empresas IS 'Tabela principal de empresas parceiras';


--
-- Name: COLUMN empresas.logo_url; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas.logo_url IS 'URL do logo armazenado em cloud storage (não guardar binário na BD)';


--
-- Name: COLUMN empresas.data_inativacao; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas.data_inativacao IS 'Data em que a empresa foi inativada';


--
-- Name: empresas_contactos; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.empresas_contactos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id uuid NOT NULL,
    nome_pessoa character varying(255) NOT NULL,
    cargo character varying(100),
    email character varying(255),
    telefone character varying(50),
    telemovel character varying(50),
    principal boolean DEFAULT false,
    ativo boolean DEFAULT true,
    observacoes text,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.empresas_contactos OWNER TO "user";

--
-- Name: TABLE empresas_contactos; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.empresas_contactos IS 'Contactos das empresas (permite múltiplos contactos por empresa)';


--
-- Name: COLUMN empresas_contactos.principal; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas_contactos.principal IS 'Indica se este é o contacto principal da empresa';


--
-- Name: empresas_enderecos; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.empresas_enderecos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_id uuid NOT NULL,
    morada text NOT NULL,
    codigo_postal character varying(20),
    localidade character varying(100),
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.empresas_enderecos OWNER TO "user";

--
-- Name: TABLE empresas_enderecos; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.empresas_enderecos IS 'Endereços múltiplos para as empresas';


--
-- Name: COLUMN empresas_enderecos.morada; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas_enderecos.morada IS 'Morada da empresa';


--
-- Name: COLUMN empresas_enderecos.codigo_postal; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas_enderecos.codigo_postal IS 'Código postal da morada da empresa';


--
-- Name: COLUMN empresas_enderecos.localidade; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.empresas_enderecos.localidade IS 'Localidade da morada da empresa';


--
-- Name: empresas_tipos_parceria; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.empresas_tipos_parceria (
    empresa_id uuid NOT NULL,
    tipo_parceria_id uuid NOT NULL,
    data_inicio date,
    data_fim date,
    observacoes text,
    data_criacao timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_datas_tipo_parceria CHECK (((data_fim IS NULL) OR (data_fim >= data_inicio)))
);


ALTER TABLE public.empresas_tipos_parceria OWNER TO "user";

--
-- Name: TABLE empresas_tipos_parceria; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.empresas_tipos_parceria IS 'Relação muitos-para-muitos entre empresas e tipos de parceria';


--
-- Name: encarregados_educacao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.encarregados_educacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(50),
    relacao_aluno character varying(50),
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.encarregados_educacao OWNER TO "user";

--
-- Name: eqavet_ciclos_formativos; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_ciclos_formativos (
    id integer NOT NULL,
    designacao character varying(255) NOT NULL,
    codigo_curso character varying(50),
    area_educacao_formacao character varying(10),
    nivel_qnq integer,
    ano_inicio integer NOT NULL,
    ano_fim integer NOT NULL,
    ativo boolean DEFAULT true,
    observacoes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    responsavel_id uuid,
    CONSTRAINT eqavet_ciclos_formativos_nivel_qnq_check CHECK ((nivel_qnq = ANY (ARRAY[2, 4, 5])))
);


ALTER TABLE public.eqavet_ciclos_formativos OWNER TO "user";

--
-- Name: eqavet_ciclos_formativos_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_ciclos_formativos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_ciclos_formativos_id_seq OWNER TO "user";

--
-- Name: eqavet_ciclos_formativos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_ciclos_formativos_id_seq OWNED BY public.eqavet_ciclos_formativos.id;


--
-- Name: eqavet_indicador_1_colocacao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_1_colocacao (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    turma997_id uuid,
    ano_recolha integer NOT NULL,
    meses_apos_conclusao integer DEFAULT 12 NOT NULL,
    total_diplomados integer DEFAULT 0,
    total_diplomados_m integer DEFAULT 0,
    total_diplomados_f integer DEFAULT 0,
    empregados integer DEFAULT 0,
    conta_propria integer DEFAULT 0,
    estagios_profissionais integer DEFAULT 0,
    procura_emprego integer DEFAULT 0,
    prosseguimento_estudos integer DEFAULT 0,
    outra_situacao integer DEFAULT 0,
    situacao_desconhecida integer DEFAULT 0,
    taxa_colocacao_global numeric(5,2),
    taxa_colocacao_m numeric(5,2),
    taxa_colocacao_f numeric(5,2),
    observacoes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_1_colocacao OWNER TO "user";

--
-- Name: eqavet_indicador_1_colocacao_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_1_colocacao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_1_colocacao_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_1_colocacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_1_colocacao_id_seq OWNED BY public.eqavet_indicador_1_colocacao.id;


--
-- Name: eqavet_indicador_2_conclusao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_2_conclusao (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    turma_id uuid,
    ano_recolha integer NOT NULL,
    ingressos integer DEFAULT 0,
    ingressos_m integer DEFAULT 0,
    ingressos_f integer DEFAULT 0,
    conclusoes_prazo integer DEFAULT 0,
    conclusoes_apos_prazo integer DEFAULT 0,
    conclusoes_global integer DEFAULT 0,
    taxa_conclusao_global numeric(5,2),
    taxa_conclusao_m numeric(5,2),
    taxa_conclusao_f numeric(5,2),
    observacoes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_2_conclusao OWNER TO "user";

--
-- Name: eqavet_indicador_2_conclusao_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_2_conclusao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_2_conclusao_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_2_conclusao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_2_conclusao_id_seq OWNED BY public.eqavet_indicador_2_conclusao.id;


--
-- Name: eqavet_indicador_3_abandono; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_3_abandono (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    ano_recolha integer NOT NULL,
    desistencias integer DEFAULT 0,
    taxa_abandono_global numeric(5,2),
    taxa_abandono_m numeric(5,2),
    taxa_abandono_f numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_3_abandono OWNER TO "user";

--
-- Name: eqavet_indicador_3_abandono_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_3_abandono_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_3_abandono_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_3_abandono_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_3_abandono_id_seq OWNED BY public.eqavet_indicador_3_abandono.id;


--
-- Name: eqavet_indicador_4_utilizacao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_4_utilizacao (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    ano_recolha integer NOT NULL,
    total_trabalhadores integer DEFAULT 0,
    profissao_relacionada integer DEFAULT 0,
    taxa_utilizacao_global numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_4_utilizacao OWNER TO "user";

--
-- Name: eqavet_indicador_4_utilizacao_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_4_utilizacao_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_4_utilizacao_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_4_utilizacao_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_4_utilizacao_id_seq OWNED BY public.eqavet_indicador_4_utilizacao.id;


--
-- Name: eqavet_indicador_5b_satisfacao_empregadores; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_5b_satisfacao_empregadores (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    ano_recolha integer NOT NULL,
    diplomados_avaliados integer DEFAULT 0,
    media_satisfacao_global numeric(3,2),
    taxa_satisfacao_global numeric(5,2),
    observacoes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_5b_satisfacao_empregadores OWNER TO "user";

--
-- Name: eqavet_indicador_5b_satisfacao_empregadores_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_5b_satisfacao_empregadores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_5b_satisfacao_empregadores_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_5b_satisfacao_empregadores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_5b_satisfacao_empregadores_id_seq OWNED BY public.eqavet_indicador_5b_satisfacao_empregadores.id;


--
-- Name: eqavet_indicador_6a_prosseguimento; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_indicador_6a_prosseguimento (
    id integer NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    ano_recolha integer NOT NULL,
    total_diplomados integer DEFAULT 0,
    prosseguimento_estudos integer DEFAULT 0,
    taxa_prosseguimento_global numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_indicador_6a_prosseguimento OWNER TO "user";

--
-- Name: eqavet_indicador_6a_prosseguimento_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_indicador_6a_prosseguimento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_indicador_6a_prosseguimento_id_seq OWNER TO "user";

--
-- Name: eqavet_indicador_6a_prosseguimento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_indicador_6a_prosseguimento_id_seq OWNED BY public.eqavet_indicador_6a_prosseguimento.id;


--
-- Name: eqavet_metas_institucionais; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_metas_institucionais (
    id integer NOT NULL,
    ano_letivo character varying(9) NOT NULL,
    indicador character varying(10) NOT NULL,
    meta_global numeric(5,2) NOT NULL,
    justificacao text,
    CONSTRAINT eqavet_metas_institucionais_indicador_check CHECK (((indicador)::text = ANY ((ARRAY['1'::character varying, '2'::character varying, '3'::character varying, '4'::character varying, '5b'::character varying, '6a'::character varying])::text[])))
);


ALTER TABLE public.eqavet_metas_institucionais OWNER TO "user";

--
-- Name: eqavet_metas_institucionais_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_metas_institucionais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_metas_institucionais_id_seq OWNER TO "user";

--
-- Name: eqavet_metas_institucionais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_metas_institucionais_id_seq OWNED BY public.eqavet_metas_institucionais.id;


--
-- Name: eqavet_tracking_diplomados; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_tracking_diplomados (
    id integer NOT NULL,
    aluno_id uuid NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    ano_conclusao integer,
    situacao_atual character varying(50),
    profissao_relacionada boolean,
    empresa_id uuid,
    data_inicio date,
    fonte character varying(50),
    observacoes text,
    ultima_atualizacao timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT eqavet_tracking_diplomados_situacao_atual_check CHECK (((situacao_atual)::text = ANY ((ARRAY['EMPREGADO'::character varying, 'CONTA_PROPRIA'::character varying, 'ESTAGIO'::character varying, 'DESEMPREGADO'::character varying, 'ENSINO_SUPERIOR'::character varying, 'FORMACAO_POS'::character varying, 'OUTRA'::character varying, 'DESCONHECIDA'::character varying])::text[])))
);


ALTER TABLE public.eqavet_tracking_diplomados OWNER TO "user";

--
-- Name: eqavet_tracking_diplomados_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_tracking_diplomados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_tracking_diplomados_id_seq OWNER TO "user";

--
-- Name: eqavet_tracking_diplomados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_tracking_diplomados_id_seq OWNED BY public.eqavet_tracking_diplomados.id;


--
-- Name: eqavet_turma_ciclo; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.eqavet_turma_ciclo (
    id integer NOT NULL,
    turma_id uuid NOT NULL,
    ciclo_formativo_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.eqavet_turma_ciclo OWNER TO "user";

--
-- Name: eqavet_turma_ciclo_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.eqavet_turma_ciclo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.eqavet_turma_ciclo_id_seq OWNER TO "user";

--
-- Name: eqavet_turma_ciclo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.eqavet_turma_ciclo_id_seq OWNED BY public.eqavet_turma_ciclo.id;


--
-- Name: external_user_disciplines; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.external_user_disciplines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    discipline_id uuid NOT NULL,
    data_associacao timestamp with time zone DEFAULT now(),
    ativo boolean DEFAULT true
);


ALTER TABLE public.external_user_disciplines OWNER TO "user";

--
-- Name: flashcard_memory_state; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.flashcard_memory_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    flashcard_id uuid NOT NULL,
    sub_id text,
    difficulty numeric(8,4) DEFAULT 5.0,
    stability numeric(12,4) DEFAULT 0.0,
    last_review timestamp with time zone,
    reps integer DEFAULT 0,
    lapses integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.flashcard_memory_state OWNER TO "user";

--
-- Name: flashcard_review_log; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.flashcard_review_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    flashcard_id uuid NOT NULL,
    sub_id text,
    rating integer NOT NULL,
    review_date timestamp with time zone DEFAULT now(),
    elapsed_days numeric(8,2),
    time_spent integer,
    CONSTRAINT flashcard_review_log_rating_check CHECK ((rating = ANY (ARRAY[1, 2, 3, 4])))
);


ALTER TABLE public.flashcard_review_log OWNER TO "user";

--
-- Name: flashcards; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.flashcards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discipline_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    type character varying(20) DEFAULT 'basic'::character varying NOT NULL,
    front text,
    back text,
    cloze_text text,
    image_url text,
    occlusion_data jsonb,
    hints text[],
    scheduled_date date NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    assunto_id uuid,
    phonemes jsonb,
    word text,
    audio_text text,
    expected_answer text,
    answer_type character varying(20),
    difficulty_level integer DEFAULT 1,
    idioma character varying(10) DEFAULT 'pt'::character varying,
    back_image_url text,
    CONSTRAINT flashcards_answer_type_check CHECK (((answer_type)::text = ANY ((ARRAY['text'::character varying, 'audio'::character varying, 'number'::character varying])::text[]))),
    CONSTRAINT flashcards_difficulty_level_check CHECK (((difficulty_level >= 1) AND (difficulty_level <= 5))),
    CONSTRAINT flashcards_type_check CHECK (((type)::text = ANY (ARRAY[('basic'::character varying)::text, ('cloze'::character varying)::text, ('image_occlusion'::character varying)::text, ('phonetic'::character varying)::text, ('dictation'::character varying)::text, ('audio_question'::character varying)::text, ('reading'::character varying)::text, ('image_text'::character varying)::text, ('spelling'::character varying)::text])))
);


ALTER TABLE public.flashcards OWNER TO "user";

--
-- Name: COLUMN flashcards.phonemes; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.flashcards.phonemes IS 'Array JSON de fonemas para tipo phonetic. Ex: [{"text": "pa", "order": 1}]';


--
-- Name: COLUMN flashcards.word; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.flashcards.word IS 'Palavra/texto para ditado ou leitura';


--
-- Name: COLUMN flashcards.audio_text; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.flashcards.audio_text IS 'Texto que será convertido em áudio pelo TTS (para dictation e audio_question)';


--
-- Name: COLUMN flashcards.expected_answer; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.flashcards.expected_answer IS 'Resposta esperada do aluno';


--
-- Name: COLUMN flashcards.answer_type; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.flashcards.answer_type IS 'Tipo de resposta: text (ditado), audio (leitura/fonética), number (cálculos)';


--
-- Name: form_answers; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.form_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    response_id uuid NOT NULL,
    question_id uuid NOT NULL,
    texto_resposta text,
    opcoes_selecionadas uuid[],
    valor_numerico numeric,
    data_resposta date,
    ficheiros_url text[],
    data_criacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.form_answers OWNER TO "user";

--
-- Name: form_responses; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.form_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    aluno_id uuid,
    submetido_em timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);


ALTER TABLE public.form_responses OWNER TO "user";

--
-- Name: forms; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    criador_id uuid NOT NULL,
    disciplina_turma_id uuid,
    turma_id uuid,
    ano_letivo character varying(9) DEFAULT '2025/26'::character varying NOT NULL,
    data_abertura timestamp with time zone,
    data_fecho timestamp with time zone,
    permite_anonimo boolean DEFAULT false,
    requer_autenticacao boolean DEFAULT true,
    permite_multiplas_respostas boolean DEFAULT false,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    is_template boolean DEFAULT false,
    template_id uuid
);


ALTER TABLE public.forms OWNER TO "user";

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
    CONSTRAINT users_tipo_utilizador_check CHECK (((tipo_utilizador)::text = ANY (ARRAY[('ADMIN'::character varying)::text, ('PROFESSOR'::character varying)::text, ('ALUNO'::character varying)::text, ('EXTERNO'::character varying)::text])))
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
-- Name: itens_resposta; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.itens_resposta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resposta_id uuid NOT NULL,
    pergunta_id uuid NOT NULL,
    texto text,
    opcoes_selecionadas uuid[],
    valor_numerico numeric,
    valor_data date,
    valor_hora time without time zone,
    ficheiros_url text[],
    pontos_obtidos numeric(5,2),
    correta boolean,
    tempo_resposta_segundos integer,
    data_criacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.itens_resposta OWNER TO "user";

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
-- Name: momento_avaliacao; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.momento_avaliacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    dossie_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.momento_avaliacao OWNER TO "user";

--
-- Name: nota_elemento; Type: TABLE; Schema: public; Owner: user
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


ALTER TABLE public.nota_elemento OWNER TO "user";

--
-- Name: nota_final_momento; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.nota_final_momento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    momento_avaliacao_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    nota numeric(5,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    nota_calculada numeric(5,2),
    observacoes text
);


ALTER TABLE public.nota_final_momento OWNER TO "user";

--
-- Name: opcoes_resposta; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.opcoes_resposta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pergunta_id uuid NOT NULL,
    texto text NOT NULL,
    ordem integer NOT NULL,
    e_correta boolean DEFAULT false,
    pontos numeric(5,2)
);


ALTER TABLE public.opcoes_resposta OWNER TO "user";

--
-- Name: pending_registrations; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.pending_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    data_pedido timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    CONSTRAINT pending_registrations_status_check CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text])))
);


ALTER TABLE public.pending_registrations OWNER TO "user";

--
-- Name: perguntas; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.perguntas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    questionario_id uuid NOT NULL,
    pagina integer DEFAULT 1,
    ordem integer NOT NULL,
    tipo character varying(30) NOT NULL,
    enunciado text NOT NULL,
    descricao text,
    obrigatoria boolean DEFAULT false,
    config jsonb,
    pontos numeric(5,2),
    resposta_correta jsonb,
    CONSTRAINT perguntas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['texto_curto'::character varying, 'texto_longo'::character varying, 'escolha_unica'::character varying, 'escolha_multipla'::character varying, 'lista_suspensa'::character varying, 'escala_linear'::character varying, 'escala_likert'::character varying, 'data'::character varying, 'hora'::character varying, 'email'::character varying, 'numero'::character varying, 'upload_ficheiro'::character varying, 'secao'::character varying])::text[])))
);


ALTER TABLE public.perguntas OWNER TO "user";

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
-- Name: question_options; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    texto text NOT NULL,
    ordem integer NOT NULL
);


ALTER TABLE public.question_options OWNER TO "user";

--
-- Name: questionarios; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.questionarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    descricao text,
    criador_id uuid NOT NULL,
    visibilidade character varying(20) DEFAULT 'privado'::character varying NOT NULL,
    categoria character varying(50),
    tags text[],
    permite_anonimo boolean DEFAULT false,
    permite_multiplas_respostas boolean DEFAULT false,
    embaralhar_perguntas boolean DEFAULT false,
    mostrar_resultados_apos_submissao boolean DEFAULT false,
    versao integer DEFAULT 1,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    CONSTRAINT questionarios_visibilidade_check CHECK (((visibilidade)::text = ANY ((ARRAY['privado'::character varying, 'escola'::character varying, 'publico'::character varying])::text[])))
);


ALTER TABLE public.questionarios OWNER TO "user";

--
-- Name: questions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    pagina integer DEFAULT 1,
    ordem integer NOT NULL,
    tipo_pergunta character varying(30) NOT NULL,
    enunciado text NOT NULL,
    descricao text,
    obrigatoria boolean DEFAULT false,
    escala_min integer,
    escala_max integer,
    escala_label_min text,
    escala_label_max text,
    CONSTRAINT questions_tipo_pergunta_check CHECK (((tipo_pergunta)::text = ANY ((ARRAY['texto_curto'::character varying, 'texto_longo'::character varying, 'escolha_multipla'::character varying, 'caixas_selecao'::character varying, 'lista_suspensa'::character varying, 'escala_linear'::character varying, 'data'::character varying, 'hora'::character varying, 'upload_ficheiro'::character varying, 'grelha'::character varying])::text[])))
);


ALTER TABLE public.questions OWNER TO "user";

--
-- Name: quiz_applications; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.quiz_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    turma_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    application_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quiz_applications OWNER TO "user";

--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    flashcard_id uuid,
    question_text text NOT NULL,
    question_type character varying(50) DEFAULT 'multiple_choice'::character varying,
    options jsonb NOT NULL,
    correct_answer_id character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quiz_questions OWNER TO "user";

--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discipline_id uuid NOT NULL,
    professor_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.quizzes OWNER TO "user";

--
-- Name: respostas_questionario; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.respostas_questionario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aplicacao_id uuid NOT NULL,
    destinatario_id uuid,
    user_id uuid,
    encarregado_id uuid,
    empresa_id uuid,
    email_respondente character varying(255),
    anonimo boolean DEFAULT false,
    submetido_em timestamp with time zone DEFAULT now(),
    tempo_decorrido_segundos integer,
    pontuacao_obtida numeric(5,2),
    pontuacao_maxima numeric(5,2),
    ip_address inet,
    user_agent text,
    completado boolean DEFAULT true
);


ALTER TABLE public.respostas_questionario OWNER TO "user";

--
-- Name: roles; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO "user";

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.roles_id_seq OWNER TO "user";

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


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
-- Name: student_quiz_answers; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.student_quiz_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    question_id uuid NOT NULL,
    chosen_option_id character varying(10),
    is_correct boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.student_quiz_answers OWNER TO "user";

--
-- Name: student_quiz_attempts; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.student_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    student_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    start_time timestamp with time zone NOT NULL,
    submit_time timestamp with time zone,
    score numeric(5,2),
    passed boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.student_quiz_attempts OWNER TO "user";

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(100) NOT NULL,
    codigo character varying(20) NOT NULL,
    ativo boolean DEFAULT true,
    ano_letivo character varying(9) DEFAULT '2025/26'::character varying NOT NULL,
    departamento_id uuid
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
-- Name: tipos_parceria; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.tipos_parceria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(50) NOT NULL,
    descricao text,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tipos_parceria OWNER TO "user";

--
-- Name: TABLE tipos_parceria; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.tipos_parceria IS 'Tipos de parceria disponíveis (estágios, protocolos, etc)';


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
-- Name: tts_audio_cache; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.tts_audio_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    text_hash character varying(64) NOT NULL,
    text_content text NOT NULL,
    audio_url text NOT NULL,
    language character varying(10) DEFAULT 'pt-PT'::character varying,
    voice_type character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tts_audio_cache OWNER TO "user";

--
-- Name: TABLE tts_audio_cache; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.tts_audio_cache IS 'Cache de áudios gerados pelo TTS para evitar regeneração';


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
-- Name: user_roles; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO "user";

--
-- Name: v_aluno_competencia_resumo; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_aluno_competencia_resumo AS
 SELECT ac.aluno_id,
    u.nome AS aluno_nome,
    c.disciplina_id,
    s.nome AS disciplina_nome,
    c.id AS competencia_id,
    c.codigo,
    c.nome,
    ac.nivel AS nivel_atual,
    COALESCE(evo.evolucao, 0) AS evolucao_pontos,
    public.aluno_tem_medida_educativa(ac.aluno_id, c.disciplina_id) AS tem_medida,
    ac.data_avaliacao AS ultima_avaliacao
   FROM ((((public.avaliacao_competencia ac
     JOIN public.users u ON ((u.id = ac.aluno_id)))
     JOIN public.competencia c ON ((c.id = ac.competencia_id)))
     JOIN public.subjects s ON ((s.id = c.disciplina_id)))
     LEFT JOIN LATERAL public.calcular_evolucao_competencia(ac.aluno_id, c.id) evo(primeira_avaliacao, ultima_avaliacao, nivel_inicial, nivel_atual, evolucao, total_avaliacoes) ON (true))
  WHERE (c.ativo = true)
  ORDER BY ac.aluno_id, s.nome, c.ordem;


ALTER TABLE public.v_aluno_competencia_resumo OWNER TO "user";

--
-- Name: v_alunos_elegiveis_por_competencia; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_alunos_elegiveis_por_competencia AS
 WITH competencias_ativas AS (
         SELECT c.id AS competencia_id,
            c.codigo AS competencia_codigo,
            c.nome AS competencia_nome,
            c.medida_educativa,
            c.disciplina_id,
            s.nome AS disciplina_nome,
            dt.id AS disciplina_turma_id,
            dt.turma_id,
            cl.nome AS turma_nome,
            cl.codigo AS turma_codigo
           FROM (((public.competencia c
             JOIN public.subjects s ON ((s.id = c.disciplina_id)))
             JOIN public.disciplina_turma dt ON (((dt.disciplina_id = s.id) AND (dt.ativo = true))))
             JOIN public.classes cl ON (((cl.id = dt.turma_id) AND (cl.ativo = true))))
          WHERE (c.ativo = true)
        ), alunos_turmas AS (
         SELECT u.id AS aluno_id,
            u.nome AS aluno_nome,
            u.numero_mecanografico,
            at_1.turma_id
           FROM (public.users u
             JOIN public.aluno_turma at_1 ON (((at_1.aluno_id = u.id) AND (at_1.ativo = true))))
          WHERE (((u.tipo_utilizador)::text = 'ALUNO'::text) AND (u.ativo = true))
        ), medidas_alunos AS (
         SELECT ame.aluno_id,
            ame.disciplina_id,
            ame.tipo_medida,
            ame.descricao,
            ame.data_inicio,
            ame.documento_referencia
           FROM public.aluno_medida_educativa ame
          WHERE (ame.data_fim IS NULL)
        )
 SELECT ca.competencia_id,
    ca.competencia_codigo,
    ca.competencia_nome,
    ca.medida_educativa AS medida_competencia,
    ca.disciplina_id,
    ca.disciplina_nome,
    ca.disciplina_turma_id,
    ca.turma_id,
    ca.turma_nome,
    ca.turma_codigo,
    at.aluno_id,
    at.aluno_nome,
    at.numero_mecanografico,
    ma.tipo_medida AS medida_aluno,
    ma.descricao AS descricao_medida,
    ma.documento_referencia,
        CASE
            WHEN (ma.aluno_id IS NOT NULL) THEN true
            ELSE false
        END AS tem_medida_educativa,
        CASE
            WHEN (ca.medida_educativa = ANY (ARRAY['universal'::public.tipo_medida_educativa, 'nenhuma'::public.tipo_medida_educativa])) THEN 'universal'::text
            WHEN ((ca.medida_educativa = 'seletiva'::public.tipo_medida_educativa) AND (ma.tipo_medida = 'seletiva'::public.tipo_medida_educativa)) THEN 'medida_seletiva'::text
            WHEN ((ca.medida_educativa = 'adicional'::public.tipo_medida_educativa) AND (ma.tipo_medida = 'adicional'::public.tipo_medida_educativa)) THEN 'medida_adicional'::text
            ELSE NULL::text
        END AS elegivel_por
   FROM ((competencias_ativas ca
     JOIN alunos_turmas at ON ((at.turma_id = ca.turma_id)))
     LEFT JOIN medidas_alunos ma ON (((ma.aluno_id = at.aluno_id) AND ((ma.disciplina_id = ca.disciplina_id) OR (ma.disciplina_id IS NULL)))))
  WHERE
        CASE ca.medida_educativa
            WHEN 'universal'::public.tipo_medida_educativa THEN true
            WHEN 'nenhuma'::public.tipo_medida_educativa THEN true
            WHEN 'seletiva'::public.tipo_medida_educativa THEN (ma.tipo_medida = 'seletiva'::public.tipo_medida_educativa)
            WHEN 'adicional'::public.tipo_medida_educativa THEN (ma.tipo_medida = 'adicional'::public.tipo_medida_educativa)
            ELSE false
        END;


ALTER TABLE public.v_alunos_elegiveis_por_competencia OWNER TO "user";

--
-- Name: v_competencias_disciplina_resumo; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_competencias_disciplina_resumo AS
SELECT
    NULL::uuid AS disciplina_id,
    NULL::character varying(100) AS disciplina_nome,
    NULL::character varying(20) AS disciplina_codigo,
    NULL::bigint AS total_competencias,
    NULL::bigint AS competencias_com_medidas,
    NULL::bigint AS competencias_validadas;


ALTER TABLE public.v_competencias_disciplina_resumo OWNER TO "user";

--
-- Name: v_contador_estatisticas_aluno; Type: VIEW; Schema: public; Owner: user
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


ALTER TABLE public.v_contador_estatisticas_aluno OWNER TO "user";

--
-- Name: v_criterios_departamentos; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_criterios_departamentos AS
 SELECT cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.descricao,
    cs.ano_escolaridade_inicial,
    cs.ano_escolaridade_limite,
    cs.nivel_aceitavel,
    cs.tipo_criterio,
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    d.codigo AS departamento_codigo,
    csd.papel AS papel_departamento,
    csd.prioridade AS prioridade_departamento,
    count(*) OVER (PARTITION BY cs.id) AS total_departamentos
   FROM ((public.criterio_sucesso cs
     JOIN public.criterio_sucesso_departamento csd ON (((csd.criterio_sucesso_id = cs.id) AND (csd.ativo = true))))
     JOIN public.departamento d ON (((d.id = csd.departamento_id) AND (d.ativo = true))))
  WHERE (cs.ativo = true)
  ORDER BY cs.codigo, csd.prioridade;


ALTER TABLE public.v_criterios_departamentos OWNER TO "user";

--
-- Name: VIEW v_criterios_departamentos; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON VIEW public.v_criterios_departamentos IS 'Lista todos os critérios com seus departamentos associados';


--
-- Name: v_criterios_pendentes_aluno; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_criterios_pendentes_aluno AS
 SELECT cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.tipo_criterio,
    cs.ano_escolaridade_inicial,
    cs.nivel_aceitavel,
    string_agg(DISTINCT (d.nome)::text, ', '::text ORDER BY (d.nome)::text) AS departamentos,
    count(DISTINCT csd.departamento_id) AS total_departamentos,
    u.id AS aluno_id,
    u.nome AS aluno_nome,
    u.ano_escolar AS ano_atual_aluno,
    ultima_aval.pontuacao AS ultima_pontuacao,
    ultima_aval.ano_letivo AS ultima_avaliacao_ano,
    ultima_aval.created_at AS ultima_avaliacao_data,
    count(todas_aval.id) AS total_avaliacoes,
    count(DISTINCT todas_aval.disciplina_id) FILTER (WHERE (todas_aval.id IS NOT NULL)) AS disciplinas_que_avaliaram,
    (u.ano_escolar - cs.ano_escolaridade_inicial) AS anos_desde_introducao
   FROM (((((public.criterio_sucesso cs
     JOIN public.criterio_sucesso_departamento csd ON (((csd.criterio_sucesso_id = cs.id) AND (csd.ativo = true))))
     JOIN public.departamento d ON (((d.id = csd.departamento_id) AND (d.ativo = true))))
     CROSS JOIN public.users u)
     LEFT JOIN LATERAL ( SELECT avaliacao_criterio_sucesso.id,
            avaliacao_criterio_sucesso.criterio_sucesso_id,
            avaliacao_criterio_sucesso.aluno_id,
            avaliacao_criterio_sucesso.professor_id,
            avaliacao_criterio_sucesso.disciplina_id,
            avaliacao_criterio_sucesso.pontuacao,
            avaliacao_criterio_sucesso.ano_letivo,
            avaliacao_criterio_sucesso.ano_escolaridade_aluno,
            avaliacao_criterio_sucesso.periodo,
            avaliacao_criterio_sucesso.observacoes,
            avaliacao_criterio_sucesso.evidencias,
            avaliacao_criterio_sucesso.atingiu_sucesso,
            avaliacao_criterio_sucesso.data_conclusao,
            avaliacao_criterio_sucesso.created_at,
            avaliacao_criterio_sucesso.updated_at
           FROM public.avaliacao_criterio_sucesso
          WHERE ((avaliacao_criterio_sucesso.criterio_sucesso_id = cs.id) AND (avaliacao_criterio_sucesso.aluno_id = u.id))
          ORDER BY avaliacao_criterio_sucesso.created_at DESC
         LIMIT 1) ultima_aval ON (true))
     LEFT JOIN public.avaliacao_criterio_sucesso todas_aval ON (((todas_aval.criterio_sucesso_id = cs.id) AND (todas_aval.aluno_id = u.id))))
  WHERE (((u.tipo_utilizador)::text = 'ALUNO'::text) AND (u.ativo = true) AND (cs.ativo = true) AND (u.ano_escolar >= cs.ano_escolaridade_inicial) AND ((cs.ano_escolaridade_limite IS NULL) OR (u.ano_escolar <= cs.ano_escolaridade_limite)) AND ((ultima_aval.atingiu_sucesso IS NULL) OR (ultima_aval.atingiu_sucesso = false)))
  GROUP BY cs.id, cs.codigo, cs.nome, cs.tipo_criterio, cs.ano_escolaridade_inicial, cs.nivel_aceitavel, u.id, u.nome, u.ano_escolar, ultima_aval.pontuacao, ultima_aval.ano_letivo, ultima_aval.created_at;


ALTER TABLE public.v_criterios_pendentes_aluno OWNER TO "user";

--
-- Name: v_dashboard_departamento; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_dashboard_departamento AS
 SELECT d.id AS departamento_id,
    d.nome AS departamento_nome,
    d.codigo AS departamento_codigo,
    count(DISTINCT
        CASE
            WHEN (csd.prioridade = 1) THEN cs.id
            ELSE NULL::uuid
        END) AS criterios_principais,
    count(DISTINCT
        CASE
            WHEN (csd.prioridade > 1) THEN cs.id
            ELSE NULL::uuid
        END) AS criterios_colaborador,
    count(DISTINCT cs.id) AS total_criterios,
    count(DISTINCT s.id) AS total_disciplinas,
    count(DISTINCT csp.professor_id) AS professores_envolvidos,
    count(DISTINCT acs.aluno_id) AS alunos_avaliados,
    count(DISTINCT
        CASE
            WHEN (acs.atingiu_sucesso = true) THEN acs.aluno_id
            ELSE NULL::uuid
        END) AS alunos_com_sucesso,
    round(avg(acs.pontuacao), 2) AS media_pontuacoes
   FROM (((((public.departamento d
     LEFT JOIN public.criterio_sucesso_departamento csd ON (((csd.departamento_id = d.id) AND (csd.ativo = true))))
     LEFT JOIN public.criterio_sucesso cs ON (((cs.id = csd.criterio_sucesso_id) AND (cs.ativo = true))))
     LEFT JOIN public.subjects s ON (((s.departamento_id = d.id) AND (s.ativo = true))))
     LEFT JOIN public.criterio_sucesso_professor csp ON (((csp.criterio_sucesso_id = cs.id) AND (csp.ativo = true))))
     LEFT JOIN public.avaliacao_criterio_sucesso acs ON ((acs.criterio_sucesso_id = cs.id)))
  WHERE (d.ativo = true)
  GROUP BY d.id, d.nome, d.codigo;


ALTER TABLE public.v_dashboard_departamento OWNER TO "user";

--
-- Name: v_dossie_resumo; Type: VIEW; Schema: public; Owner: user
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


ALTER TABLE public.v_dossie_resumo OWNER TO "user";

--
-- Name: v_elemento_progresso; Type: VIEW; Schema: public; Owner: user
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


ALTER TABLE public.v_elemento_progresso OWNER TO "user";

--
-- Name: v_empresas_contacto_principal; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_empresas_contacto_principal AS
 SELECT e.id AS empresa_id,
    e.nome AS empresa_nome,
    ec.nome_pessoa,
    ec.cargo,
    ec.email,
    ec.telefone,
    ec.telemovel
   FROM (public.empresas e
     LEFT JOIN public.empresas_contactos ec ON (((e.id = ec.empresa_id) AND (ec.principal = true) AND (ec.ativo = true))));


ALTER TABLE public.v_empresas_contacto_principal OWNER TO "user";

--
-- Name: v_estatisticas_competencias_turma; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_estatisticas_competencias_turma AS
SELECT
    NULL::uuid AS disciplina_turma_id,
    NULL::uuid AS turma_id,
    NULL::character varying(100) AS turma_nome,
    NULL::uuid AS disciplina_id,
    NULL::character varying(100) AS disciplina_nome,
    NULL::uuid AS competencia_id,
    NULL::character varying(255) AS competencia_nome,
    NULL::json AS dominios,
    NULL::bigint AS total_alunos_avaliados,
    NULL::bigint AS total_avaliacoes,
    NULL::numeric AS media_niveis,
    NULL::integer AS nivel_minimo,
    NULL::integer AS nivel_maximo;


ALTER TABLE public.v_estatisticas_competencias_turma OWNER TO "user";

--
-- Name: v_evolucao_competencia_aluno; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_evolucao_competencia_aluno AS
 SELECT ac.aluno_id,
    ac.competencia_id,
    c.nome AS competencia_nome,
    c.codigo AS competencia_codigo,
    s.nome AS disciplina_nome,
    ac.nivel,
    ac.momento_avaliacao,
    ac.data_avaliacao,
    ac.observacoes,
    u_prof.nome AS professor_nome,
    row_number() OVER (PARTITION BY ac.aluno_id, ac.competencia_id ORDER BY ac.data_avaliacao DESC) AS ordem_cronologica_inversa
   FROM (((public.avaliacao_competencia ac
     JOIN public.competencia c ON ((c.id = ac.competencia_id)))
     JOIN public.subjects s ON ((s.id = c.disciplina_id)))
     JOIN public.users u_prof ON ((u_prof.id = ac.professor_id)))
  WHERE (c.ativo = true);


ALTER TABLE public.v_evolucao_competencia_aluno OWNER TO "user";

--
-- Name: v_form_instances; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_form_instances AS
 SELECT fi.id,
    fi.titulo,
    fi.descricao,
    fi.criador_id,
    fi.disciplina_turma_id,
    fi.turma_id,
    fi.ano_letivo,
    fi.data_abertura,
    fi.data_fecho,
    fi.permite_anonimo,
    fi.requer_autenticacao,
    fi.permite_multiplas_respostas,
    fi.ativo,
    fi.data_criacao,
    fi.data_atualizacao,
    fi.is_template,
    fi.template_id,
    ft.titulo AS titulo_modelo,
    ft.criador_id AS modelo_criador_id,
    u.nome AS criador_instancia_nome
   FROM ((public.forms fi
     LEFT JOIN public.forms ft ON ((ft.id = fi.template_id)))
     LEFT JOIN public.users u ON ((u.id = fi.criador_id)))
  WHERE ((fi.is_template = false) OR (fi.is_template IS NULL));


ALTER TABLE public.v_form_instances OWNER TO "user";

--
-- Name: v_form_templates; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_form_templates AS
SELECT
    NULL::uuid AS id,
    NULL::character varying(255) AS titulo,
    NULL::text AS descricao,
    NULL::uuid AS criador_id,
    NULL::uuid AS disciplina_turma_id,
    NULL::uuid AS turma_id,
    NULL::character varying(9) AS ano_letivo,
    NULL::timestamp with time zone AS data_abertura,
    NULL::timestamp with time zone AS data_fecho,
    NULL::boolean AS permite_anonimo,
    NULL::boolean AS requer_autenticacao,
    NULL::boolean AS permite_multiplas_respostas,
    NULL::boolean AS ativo,
    NULL::timestamp with time zone AS data_criacao,
    NULL::timestamp with time zone AS data_atualizacao,
    NULL::boolean AS is_template,
    NULL::uuid AS template_id,
    NULL::character varying(255) AS criador_nome,
    NULL::bigint AS total_instancias,
    NULL::bigint AS total_respostas;


ALTER TABLE public.v_form_templates OWNER TO "user";

--
-- Name: v_professores_elegiveis_criterio; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_professores_elegiveis_criterio AS
 SELECT cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    u.id AS professor_id,
    u.nome AS professor_nome,
    s.id AS disciplina_id,
    s.nome AS disciplina_nome,
    d.nome AS departamento_nome,
    (csp.id IS NOT NULL) AS ja_declarou_competencia,
    csp.ativo AS competencia_ativa
   FROM ((((((public.criterio_sucesso cs
     JOIN public.criterio_sucesso_departamento csd ON (((csd.criterio_sucesso_id = cs.id) AND (csd.ativo = true))))
     JOIN public.subjects s ON (((s.departamento_id = csd.departamento_id) AND (s.ativo = true))))
     JOIN public.disciplina_turma dt ON (((dt.disciplina_id = s.id) AND (dt.ativo = true))))
     JOIN public.users u ON (((u.id = dt.professor_id) AND ((u.tipo_utilizador)::text = 'PROFESSOR'::text) AND (u.ativo = true))))
     JOIN public.departamento d ON ((d.id = csd.departamento_id)))
     LEFT JOIN public.criterio_sucesso_professor csp ON (((csp.criterio_sucesso_id = cs.id) AND (csp.professor_id = u.id) AND (csp.disciplina_id = s.id))))
  WHERE (cs.ativo = true)
  GROUP BY cs.id, cs.codigo, cs.nome, u.id, u.nome, s.id, s.nome, d.nome, csp.id, csp.ativo
  ORDER BY cs.codigo, u.nome;


ALTER TABLE public.v_professores_elegiveis_criterio OWNER TO "user";

--
-- Name: v_progresso_aluno_atual; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.v_progresso_aluno_atual AS
 SELECT DISTINCT ON (ac.aluno_id, ac.competencia_id) ac.aluno_id,
    u.nome AS aluno_nome,
    u.numero_mecanografico,
    ac.competencia_id,
    c.codigo AS competencia_codigo,
    c.nome AS competencia_nome,
    ( SELECT json_agg(d.nome) AS json_agg
           FROM (public.competencia_dominio cd
             JOIN public.dominios d ON ((d.id = cd.dominio_id)))
          WHERE (cd.competencia_id = c.id)) AS dominios,
    s.nome AS disciplina_nome,
    ac.disciplina_turma_id,
    ac.nivel AS nivel_atual,
    ac.data_avaliacao AS data_ultima_avaliacao,
    ac.momento_avaliacao,
    evo.nivel_inicial,
    evo.primeira_avaliacao AS data_primeira_avaliacao,
    evo.evolucao,
    evo.total_avaliacoes,
    ac.observacoes,
    c.medida_educativa,
    public.aluno_tem_medida_educativa(ac.aluno_id, c.disciplina_id) AS aluno_tem_medida_educativa
   FROM (((((public.avaliacao_competencia ac
     JOIN public.users u ON ((u.id = ac.aluno_id)))
     JOIN public.competencia c ON ((c.id = ac.competencia_id)))
     JOIN public.disciplina_turma dt ON ((dt.id = ac.disciplina_turma_id)))
     JOIN public.subjects s ON ((s.id = dt.disciplina_id)))
     LEFT JOIN LATERAL public.calcular_evolucao_competencia(ac.aluno_id, c.id) evo(primeira_avaliacao, ultima_avaliacao, nivel_inicial, nivel_atual_evo, evolucao, total_avaliacoes) ON (true))
  ORDER BY ac.aluno_id, ac.competencia_id, ac.data_avaliacao DESC, ac.momento_avaliacao DESC;


ALTER TABLE public.v_progresso_aluno_atual OWNER TO "user";

--
-- Name: VIEW v_progresso_aluno_atual; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON VIEW public.v_progresso_aluno_atual IS 'Visão atualizada do progresso do aluno em cada competência, incluindo a última avaliação, observações e medidas educativas.';


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
-- Name: vw_eqavet_dashboard_completo; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.vw_eqavet_dashboard_completo AS
 SELECT cf.id,
    cf.designacao,
    cf.area_educacao_formacao,
    cf.nivel_qnq,
    ((cf.ano_inicio || '/'::text) || cf.ano_fim) AS ano_letivo,
    COALESCE(i1.taxa_colocacao_global, (0)::numeric) AS ind1_colocacao,
    COALESCE(i2.taxa_conclusao_global, (0)::numeric) AS ind2_conclusao,
    COALESCE(i3.taxa_abandono_global, (0)::numeric) AS ind3_abandono,
    COALESCE(i4.taxa_utilizacao_global, (0)::numeric) AS ind4_utilizacao_competencias,
    COALESCE(i5.media_satisfacao_global, (0)::numeric) AS ind5_satisfacao_empregadores,
    COALESCE(i6.taxa_prosseguimento_global, (0)::numeric) AS ind6_prosseguimento_estudos,
    m1.meta_global AS meta_ind1,
    m2.meta_global AS meta_ind2
   FROM ((((((((public.eqavet_ciclos_formativos cf
     LEFT JOIN public.eqavet_indicador_1_colocacao i1 ON (((i1.ciclo_formativo_id = cf.id) AND (i1.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_2_conclusao i2 ON (((i2.ciclo_formativo_id = cf.id) AND (i2.ano_recolha = cf.ano_fim))))
     LEFT JOIN public.eqavet_indicador_3_abandono i3 ON (((i3.ciclo_formativo_id = cf.id) AND (i3.ano_recolha = cf.ano_fim))))
     LEFT JOIN public.eqavet_indicador_4_utilizacao i4 ON (((i4.ciclo_formativo_id = cf.id) AND (i4.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_5b_satisfacao_empregadores i5 ON (((i5.ciclo_formativo_id = cf.id) AND (i5.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_6a_prosseguimento i6 ON (((i6.ciclo_formativo_id = cf.id) AND (i6.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_metas_institucionais m1 ON ((((m1.ano_letivo)::text = ((cf.ano_inicio || '/'::text) || cf.ano_fim)) AND ((m1.indicador)::text = '1'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m2 ON ((((m2.ano_letivo)::text = ((cf.ano_inicio || '/'::text) || cf.ano_fim)) AND ((m2.indicador)::text = '2'::text))))
  WHERE (cf.ativo = true)
  ORDER BY cf.ano_inicio DESC, cf.designacao;


ALTER TABLE public.vw_eqavet_dashboard_completo OWNER TO "user";

--
-- Name: vw_eqavet_metas_vs_resultados; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.vw_eqavet_metas_vs_resultados AS
 WITH ciclos_relevantes AS (
         SELECT cf_1.id,
            cf_1.designacao,
            cf_1.codigo_curso,
            cf_1.area_educacao_formacao,
            cf_1.nivel_qnq,
            cf_1.ano_inicio,
            cf_1.ano_fim,
            cf_1.ativo,
            cf_1.observacoes,
            cf_1.created_at,
            cf_1.updated_at
           FROM public.eqavet_ciclos_formativos cf_1
          WHERE ((cf_1.ativo = true) AND (((cf_1.ano_fim)::numeric < EXTRACT(year FROM CURRENT_DATE)) OR (EXISTS ( SELECT 1
                   FROM public.eqavet_indicador_1_colocacao
                  WHERE (eqavet_indicador_1_colocacao.ciclo_formativo_id = cf_1.id)))))
        )
 SELECT cf.id AS ciclo_id,
    cf.designacao AS ciclo_formativo,
    cf.area_educacao_formacao AS area_formacao,
    cf.nivel_qnq,
    ((cf.ano_inicio || '–'::text) || cf.ano_fim) AS periodo_ciclo,
    ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1)) AS ano_letivo_conclusao,
    (cf.ano_fim + 1) AS ano_recolha_indicadores,
    i1.taxa_colocacao_global AS ind1_colocacao,
    i2.taxa_conclusao_global AS ind2_conclusao,
    i3.taxa_abandono_global AS ind3_abandono,
    i4.taxa_utilizacao_global AS ind4_utilizacao_competencias,
    i5.media_satisfacao_global AS ind5b_media_satisfacao,
    i5.taxa_satisfacao_global AS ind5b_taxa_satisfacao,
    i6.taxa_prosseguimento_global AS ind6a_prosseguimento_estudos,
    COALESCE(m1.meta_global, (0)::numeric) AS meta_ind1,
    COALESCE(m2.meta_global, (0)::numeric) AS meta_ind2,
    COALESCE(m3.meta_global, (0)::numeric) AS meta_ind3,
    COALESCE(m4.meta_global, (0)::numeric) AS meta_ind4,
    COALESCE(m5.meta_global, (0)::numeric) AS meta_ind5b,
    COALESCE(m6.meta_global, (0)::numeric) AS meta_ind6a,
        CASE
            WHEN (i1.taxa_colocacao_global IS NULL) THEN 'Pendente'::text
            WHEN (i1.taxa_colocacao_global >= COALESCE(m1.meta_global, (0)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind1,
        CASE
            WHEN (i2.taxa_conclusao_global IS NULL) THEN 'Pendente'::text
            WHEN (i2.taxa_conclusao_global >= COALESCE(m2.meta_global, (0)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind2,
        CASE
            WHEN (i3.taxa_abandono_global IS NULL) THEN 'Pendente'::text
            WHEN (i3.taxa_abandono_global <= COALESCE(m3.meta_global, (999)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind3,
        CASE
            WHEN (i4.taxa_utilizacao_global IS NULL) THEN 'Pendente'::text
            WHEN (i4.taxa_utilizacao_global >= COALESCE(m4.meta_global, (0)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind4,
        CASE
            WHEN (i5.media_satisfacao_global IS NULL) THEN 'Pendente'::text
            WHEN (i5.media_satisfacao_global >= COALESCE(m5.meta_global, (0)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind5b,
        CASE
            WHEN (i6.taxa_prosseguimento_global IS NULL) THEN 'Pendente'::text
            WHEN (i6.taxa_prosseguimento_global >= COALESCE(m6.meta_global, (0)::numeric)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS status_ind6a
   FROM ((((((((((((ciclos_relevantes cf
     LEFT JOIN public.eqavet_indicador_1_colocacao i1 ON (((i1.ciclo_formativo_id = cf.id) AND (i1.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_2_conclusao i2 ON (((i2.ciclo_formativo_id = cf.id) AND (i2.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_3_abandono i3 ON (((i3.ciclo_formativo_id = cf.id) AND (i3.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_4_utilizacao i4 ON (((i4.ciclo_formativo_id = cf.id) AND (i4.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_5b_satisfacao_empregadores i5 ON (((i5.ciclo_formativo_id = cf.id) AND (i5.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_indicador_6a_prosseguimento i6 ON (((i6.ciclo_formativo_id = cf.id) AND (i6.ano_recolha = (cf.ano_fim + 1)))))
     LEFT JOIN public.eqavet_metas_institucionais m1 ON ((((m1.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m1.indicador)::text = '1'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m2 ON ((((m2.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m2.indicador)::text = '2'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m3 ON ((((m3.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m3.indicador)::text = '3'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m4 ON ((((m4.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m4.indicador)::text = '4'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m5 ON ((((m5.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m5.indicador)::text = '5b'::text))))
     LEFT JOIN public.eqavet_metas_institucionais m6 ON ((((m6.ano_letivo)::text = ((cf.ano_fim || '/'::text) || (cf.ano_fim + 1))) AND ((m6.indicador)::text = '6a'::text))))
  ORDER BY cf.ano_fim DESC, cf.designacao;


ALTER TABLE public.vw_eqavet_metas_vs_resultados OWNER TO "user";

--
-- Name: vw_eqavet_resumo_anual; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.vw_eqavet_resumo_anual AS
 SELECT vw_eqavet_metas_vs_resultados.ano_letivo_conclusao AS ano_letivo,
    count(DISTINCT vw_eqavet_metas_vs_resultados.ciclo_id) AS ciclos_ativos,
    round(avg(vw_eqavet_metas_vs_resultados.ind1_colocacao), 2) AS media_ind1,
    round(avg(vw_eqavet_metas_vs_resultados.ind2_conclusao), 2) AS media_ind2,
    round(avg(vw_eqavet_metas_vs_resultados.ind3_abandono), 2) AS media_ind3,
    round(avg(vw_eqavet_metas_vs_resultados.ind4_utilizacao_competencias), 2) AS media_ind4,
    round(avg(vw_eqavet_metas_vs_resultados.ind5b_media_satisfacao), 2) AS media_ind5b_media,
    round(avg(vw_eqavet_metas_vs_resultados.ind5b_taxa_satisfacao), 2) AS media_ind5b_taxa,
    round(avg(vw_eqavet_metas_vs_resultados.ind6a_prosseguimento_estudos), 2) AS media_ind6a,
    max(vw_eqavet_metas_vs_resultados.meta_ind1) AS meta_ind1,
    max(vw_eqavet_metas_vs_resultados.meta_ind2) AS meta_ind2,
    max(vw_eqavet_metas_vs_resultados.meta_ind3) AS meta_ind3,
    max(vw_eqavet_metas_vs_resultados.meta_ind4) AS meta_ind4,
    max(vw_eqavet_metas_vs_resultados.meta_ind5b) AS meta_ind5b,
    max(vw_eqavet_metas_vs_resultados.meta_ind6a) AS meta_ind6a,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind1_colocacao) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind1_colocacao) >= max(vw_eqavet_metas_vs_resultados.meta_ind1)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind1,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind2_conclusao) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind2_conclusao) >= max(vw_eqavet_metas_vs_resultados.meta_ind2)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind2,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind3_abandono) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind3_abandono) <= max(vw_eqavet_metas_vs_resultados.meta_ind3)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind3,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind4_utilizacao_competencias) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind4_utilizacao_competencias) >= max(vw_eqavet_metas_vs_resultados.meta_ind4)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind4,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind5b_media_satisfacao) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind5b_media_satisfacao) >= max(vw_eqavet_metas_vs_resultados.meta_ind5b)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind5b,
        CASE
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind6a_prosseguimento_estudos) IS NULL) THEN 'Pendente'::text
            WHEN (avg(vw_eqavet_metas_vs_resultados.ind6a_prosseguimento_estudos) >= max(vw_eqavet_metas_vs_resultados.meta_ind6a)) THEN 'Cumprida'::text
            ELSE 'Não cumprida'::text
        END AS global_ind6a
   FROM public.vw_eqavet_metas_vs_resultados
  GROUP BY vw_eqavet_metas_vs_resultados.ano_letivo_conclusao
  ORDER BY vw_eqavet_metas_vs_resultados.ano_letivo_conclusao DESC;


ALTER TABLE public.vw_eqavet_resumo_anual OWNER TO "user";

--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: eqavet_ciclos_formativos id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_ciclos_formativos ALTER COLUMN id SET DEFAULT nextval('public.eqavet_ciclos_formativos_id_seq'::regclass);


--
-- Name: eqavet_indicador_1_colocacao id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_1_colocacao ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_1_colocacao_id_seq'::regclass);


--
-- Name: eqavet_indicador_2_conclusao id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_2_conclusao ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_2_conclusao_id_seq'::regclass);


--
-- Name: eqavet_indicador_3_abandono id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_3_abandono ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_3_abandono_id_seq'::regclass);


--
-- Name: eqavet_indicador_4_utilizacao id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_4_utilizacao ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_4_utilizacao_id_seq'::regclass);


--
-- Name: eqavet_indicador_5b_satisfacao_empregadores id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_5b_satisfacao_empregadores ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_5b_satisfacao_empregadores_id_seq'::regclass);


--
-- Name: eqavet_indicador_6a_prosseguimento id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_6a_prosseguimento ALTER COLUMN id SET DEFAULT nextval('public.eqavet_indicador_6a_prosseguimento_id_seq'::regclass);


--
-- Name: eqavet_metas_institucionais id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_metas_institucionais ALTER COLUMN id SET DEFAULT nextval('public.eqavet_metas_institucionais_id_seq'::regclass);


--
-- Name: eqavet_tracking_diplomados id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados ALTER COLUMN id SET DEFAULT nextval('public.eqavet_tracking_diplomados_id_seq'::regclass);


--
-- Name: eqavet_turma_ciclo id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_turma_ciclo ALTER COLUMN id SET DEFAULT nextval('public.eqavet_turma_ciclo_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: aluno_disciplina aluno_disciplina_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_disciplina
    ADD CONSTRAINT aluno_disciplina_pkey PRIMARY KEY (id);


--
-- Name: aluno_medida_educativa aluno_medida_educativa_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_medida_educativa
    ADD CONSTRAINT aluno_medida_educativa_pkey PRIMARY KEY (id);


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
-- Name: alunos_encarregados alunos_encarregados_aluno_id_encarregado_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.alunos_encarregados
    ADD CONSTRAINT alunos_encarregados_aluno_id_encarregado_id_key UNIQUE (aluno_id, encarregado_id);


--
-- Name: alunos_encarregados alunos_encarregados_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.alunos_encarregados
    ADD CONSTRAINT alunos_encarregados_pkey PRIMARY KEY (id);


--
-- Name: aplicacoes_questionario aplicacoes_questionario_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_pkey PRIMARY KEY (id);


--
-- Name: aplicacoes_questionario aplicacoes_questionario_token_acesso_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_token_acesso_key UNIQUE (token_acesso);


--
-- Name: assuntos assuntos_discipline_id_name_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.assuntos
    ADD CONSTRAINT assuntos_discipline_id_name_key UNIQUE (discipline_id, name);


--
-- Name: assuntos assuntos_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.assuntos
    ADD CONSTRAINT assuntos_pkey PRIMARY KEY (id);


--
-- Name: audio_flashcard_attempts audio_flashcard_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audio_flashcard_attempts
    ADD CONSTRAINT audio_flashcard_attempts_pkey PRIMARY KEY (id);


--
-- Name: avaliacao_competencia avaliacao_competencia_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_competencia
    ADD CONSTRAINT avaliacao_competencia_pkey PRIMARY KEY (id);


--
-- Name: avaliacao_criterio_sucesso avaliacao_criterio_sucesso_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_criterio_sucesso
    ADD CONSTRAINT avaliacao_criterio_sucesso_pkey PRIMARY KEY (id);


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
-- Name: competencia competencia_disciplina_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia
    ADD CONSTRAINT competencia_disciplina_id_codigo_key UNIQUE (disciplina_id, codigo);


--
-- Name: competencia_disciplina_turma competencia_disciplina_turma_competencia_id_disciplina_turm_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_disciplina_turma
    ADD CONSTRAINT competencia_disciplina_turma_competencia_id_disciplina_turm_key UNIQUE (competencia_id, disciplina_turma_id);


--
-- Name: competencia_disciplina_turma competencia_disciplina_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_disciplina_turma
    ADD CONSTRAINT competencia_disciplina_turma_pkey PRIMARY KEY (id);


--
-- Name: competencia_dominio competencia_dominio_competencia_id_dominio_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_dominio
    ADD CONSTRAINT competencia_dominio_competencia_id_dominio_id_key UNIQUE (competencia_id, dominio_id);


--
-- Name: competencia_dominio competencia_dominio_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_dominio
    ADD CONSTRAINT competencia_dominio_pkey PRIMARY KEY (id);


--
-- Name: competencia_historico competencia_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_historico
    ADD CONSTRAINT competencia_historico_pkey PRIMARY KEY (id);


--
-- Name: competencia competencia_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia
    ADD CONSTRAINT competencia_pkey PRIMARY KEY (id);


--
-- Name: contador contador_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.contador
    ADD CONSTRAINT contador_pkey PRIMARY KEY (id);


--
-- Name: contador_registo contador_registo_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.contador_registo
    ADD CONSTRAINT contador_registo_pkey PRIMARY KEY (id);


--
-- Name: credit_products credit_products_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.credit_products
    ADD CONSTRAINT credit_products_pkey PRIMARY KEY (id);


--
-- Name: criterio criterio_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio
    ADD CONSTRAINT criterio_pkey PRIMARY KEY (id);


--
-- Name: criterio_sucesso criterio_sucesso_codigo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso
    ADD CONSTRAINT criterio_sucesso_codigo_key UNIQUE (codigo);


--
-- Name: criterio_sucesso_departamento criterio_sucesso_departamento_criterio_sucesso_id_departame_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_departamento
    ADD CONSTRAINT criterio_sucesso_departamento_criterio_sucesso_id_departame_key UNIQUE (criterio_sucesso_id, departamento_id);


--
-- Name: criterio_sucesso_departamento criterio_sucesso_departamento_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_departamento
    ADD CONSTRAINT criterio_sucesso_departamento_pkey PRIMARY KEY (id);


--
-- Name: criterio_sucesso criterio_sucesso_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso
    ADD CONSTRAINT criterio_sucesso_pkey PRIMARY KEY (id);


--
-- Name: criterio_sucesso_professor criterio_sucesso_professor_criterio_sucesso_id_professor_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_professor
    ADD CONSTRAINT criterio_sucesso_professor_criterio_sucesso_id_professor_id_key UNIQUE (criterio_sucesso_id, professor_id, disciplina_id);


--
-- Name: criterio_sucesso_professor criterio_sucesso_professor_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_professor
    ADD CONSTRAINT criterio_sucesso_professor_pkey PRIMARY KEY (id);


--
-- Name: departamento departamento_codigo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_codigo_key UNIQUE (codigo);


--
-- Name: departamento departamento_nome_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_nome_key UNIQUE (nome);


--
-- Name: departamento departamento_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_pkey PRIMARY KEY (id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_aplicacao_id_email_externo_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_aplicacao_id_email_externo_key UNIQUE (aplicacao_id, email_externo);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_aplicacao_id_empresa_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_aplicacao_id_empresa_id_key UNIQUE (aplicacao_id, empresa_id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_aplicacao_id_encarregado_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_aplicacao_id_encarregado_id_key UNIQUE (aplicacao_id, encarregado_id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_aplicacao_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_aplicacao_id_user_id_key UNIQUE (aplicacao_id, user_id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_pkey PRIMARY KEY (id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_token_acesso_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_token_acesso_key UNIQUE (token_acesso);


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
-- Name: dominios dominios_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT dominios_pkey PRIMARY KEY (id);


--
-- Name: dossie dossie_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.dossie
    ADD CONSTRAINT dossie_pkey PRIMARY KEY (id);


--
-- Name: elemento_avaliacao elemento_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.elemento_avaliacao
    ADD CONSTRAINT elemento_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: empresas_contactos empresas_contactos_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_contactos
    ADD CONSTRAINT empresas_contactos_pkey PRIMARY KEY (id);


--
-- Name: empresas_enderecos empresas_enderecos_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_enderecos
    ADD CONSTRAINT empresas_enderecos_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: empresas_tipos_parceria empresas_tipos_parceria_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_tipos_parceria
    ADD CONSTRAINT empresas_tipos_parceria_pkey PRIMARY KEY (empresa_id, tipo_parceria_id);


--
-- Name: encarregados_educacao encarregados_educacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.encarregados_educacao
    ADD CONSTRAINT encarregados_educacao_pkey PRIMARY KEY (id);


--
-- Name: eqavet_ciclos_formativos eqavet_ciclos_formativos_designacao_ano_inicio_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_ciclos_formativos
    ADD CONSTRAINT eqavet_ciclos_formativos_designacao_ano_inicio_key UNIQUE (designacao, ano_inicio);


--
-- Name: eqavet_ciclos_formativos eqavet_ciclos_formativos_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_ciclos_formativos
    ADD CONSTRAINT eqavet_ciclos_formativos_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_1_colocacao eqavet_indicador_1_colocacao_ciclo_formativo_id_ano_recolha_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_1_colocacao
    ADD CONSTRAINT eqavet_indicador_1_colocacao_ciclo_formativo_id_ano_recolha_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_1_colocacao eqavet_indicador_1_colocacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_1_colocacao
    ADD CONSTRAINT eqavet_indicador_1_colocacao_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_2_conclusao eqavet_indicador_2_conclusao_ciclo_formativo_id_ano_recolha_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_2_conclusao
    ADD CONSTRAINT eqavet_indicador_2_conclusao_ciclo_formativo_id_ano_recolha_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_2_conclusao eqavet_indicador_2_conclusao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_2_conclusao
    ADD CONSTRAINT eqavet_indicador_2_conclusao_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_3_abandono eqavet_indicador_3_abandono_ciclo_formativo_id_ano_recolha_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_3_abandono
    ADD CONSTRAINT eqavet_indicador_3_abandono_ciclo_formativo_id_ano_recolha_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_3_abandono eqavet_indicador_3_abandono_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_3_abandono
    ADD CONSTRAINT eqavet_indicador_3_abandono_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_4_utilizacao eqavet_indicador_4_utilizacao_ciclo_formativo_id_ano_recolh_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_4_utilizacao
    ADD CONSTRAINT eqavet_indicador_4_utilizacao_ciclo_formativo_id_ano_recolh_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_4_utilizacao eqavet_indicador_4_utilizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_4_utilizacao
    ADD CONSTRAINT eqavet_indicador_4_utilizacao_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_5b_satisfacao_empregadores eqavet_indicador_5b_satisfaca_ciclo_formativo_id_ano_recolh_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_5b_satisfacao_empregadores
    ADD CONSTRAINT eqavet_indicador_5b_satisfaca_ciclo_formativo_id_ano_recolh_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_5b_satisfacao_empregadores eqavet_indicador_5b_satisfacao_empregadores_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_5b_satisfacao_empregadores
    ADD CONSTRAINT eqavet_indicador_5b_satisfacao_empregadores_pkey PRIMARY KEY (id);


--
-- Name: eqavet_indicador_6a_prosseguimento eqavet_indicador_6a_prossegui_ciclo_formativo_id_ano_recolh_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_6a_prosseguimento
    ADD CONSTRAINT eqavet_indicador_6a_prossegui_ciclo_formativo_id_ano_recolh_key UNIQUE (ciclo_formativo_id, ano_recolha);


--
-- Name: eqavet_indicador_6a_prosseguimento eqavet_indicador_6a_prosseguimento_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_6a_prosseguimento
    ADD CONSTRAINT eqavet_indicador_6a_prosseguimento_pkey PRIMARY KEY (id);


--
-- Name: eqavet_metas_institucionais eqavet_metas_institucionais_ano_letivo_indicador_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_metas_institucionais
    ADD CONSTRAINT eqavet_metas_institucionais_ano_letivo_indicador_key UNIQUE (ano_letivo, indicador);


--
-- Name: eqavet_metas_institucionais eqavet_metas_institucionais_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_metas_institucionais
    ADD CONSTRAINT eqavet_metas_institucionais_pkey PRIMARY KEY (id);


--
-- Name: eqavet_tracking_diplomados eqavet_tracking_diplomados_aluno_id_ciclo_formativo_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados
    ADD CONSTRAINT eqavet_tracking_diplomados_aluno_id_ciclo_formativo_id_key UNIQUE (aluno_id, ciclo_formativo_id);


--
-- Name: eqavet_tracking_diplomados eqavet_tracking_diplomados_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados
    ADD CONSTRAINT eqavet_tracking_diplomados_pkey PRIMARY KEY (id);


--
-- Name: eqavet_turma_ciclo eqavet_turma_ciclo_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_turma_ciclo
    ADD CONSTRAINT eqavet_turma_ciclo_pkey PRIMARY KEY (id);


--
-- Name: eqavet_turma_ciclo eqavet_turma_ciclo_turma_id_ciclo_formativo_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_turma_ciclo
    ADD CONSTRAINT eqavet_turma_ciclo_turma_id_ciclo_formativo_id_key UNIQUE (turma_id, ciclo_formativo_id);


--
-- Name: external_user_disciplines external_user_disciplines_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.external_user_disciplines
    ADD CONSTRAINT external_user_disciplines_pkey PRIMARY KEY (id);


--
-- Name: external_user_disciplines external_user_disciplines_user_id_discipline_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.external_user_disciplines
    ADD CONSTRAINT external_user_disciplines_user_id_discipline_id_key UNIQUE (user_id, discipline_id);


--
-- Name: flashcard_memory_state flashcard_memory_state_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_memory_state
    ADD CONSTRAINT flashcard_memory_state_pkey PRIMARY KEY (id);


--
-- Name: flashcard_memory_state flashcard_memory_state_student_id_flashcard_id_sub_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_memory_state
    ADD CONSTRAINT flashcard_memory_state_student_id_flashcard_id_sub_id_key UNIQUE (student_id, flashcard_id, sub_id);


--
-- Name: flashcard_review_log flashcard_review_log_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_review_log
    ADD CONSTRAINT flashcard_review_log_pkey PRIMARY KEY (id);


--
-- Name: flashcards flashcards_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_pkey PRIMARY KEY (id);


--
-- Name: form_answers form_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_answers
    ADD CONSTRAINT form_answers_pkey PRIMARY KEY (id);


--
-- Name: form_answers form_answers_response_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_answers
    ADD CONSTRAINT form_answers_response_id_question_id_key UNIQUE (response_id, question_id);


--
-- Name: form_responses form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


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
-- Name: itens_resposta itens_resposta_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.itens_resposta
    ADD CONSTRAINT itens_resposta_pkey PRIMARY KEY (id);


--
-- Name: itens_resposta itens_resposta_resposta_id_pergunta_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.itens_resposta
    ADD CONSTRAINT itens_resposta_resposta_id_pergunta_id_key UNIQUE (resposta_id, pergunta_id);


--
-- Name: legados legados_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.legados
    ADD CONSTRAINT legados_pkey PRIMARY KEY (id);


--
-- Name: momento_avaliacao momento_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.momento_avaliacao
    ADD CONSTRAINT momento_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: nota_elemento nota_elemento_elemento_avaliacao_id_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_elemento_avaliacao_id_aluno_id_key UNIQUE (elemento_avaliacao_id, aluno_id);


--
-- Name: nota_elemento nota_elemento_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_pkey PRIMARY KEY (id);


--
-- Name: nota_final_momento nota_final_momento_momento_avaliacao_id_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_momento_avaliacao_id_aluno_id_key UNIQUE (momento_avaliacao_id, aluno_id);


--
-- Name: nota_final_momento nota_final_momento_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_pkey PRIMARY KEY (id);


--
-- Name: opcoes_resposta opcoes_resposta_pergunta_id_ordem_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.opcoes_resposta
    ADD CONSTRAINT opcoes_resposta_pergunta_id_ordem_key UNIQUE (pergunta_id, ordem);


--
-- Name: opcoes_resposta opcoes_resposta_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.opcoes_resposta
    ADD CONSTRAINT opcoes_resposta_pkey PRIMARY KEY (id);


--
-- Name: pending_registrations pending_registrations_email_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_email_key UNIQUE (email);


--
-- Name: pending_registrations pending_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_pkey PRIMARY KEY (id);


--
-- Name: perguntas perguntas_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.perguntas
    ADD CONSTRAINT perguntas_pkey PRIMARY KEY (id);


--
-- Name: perguntas perguntas_questionario_id_pagina_ordem_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.perguntas
    ADD CONSTRAINT perguntas_questionario_id_pagina_ordem_key UNIQUE (questionario_id, pagina, ordem);


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
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: question_options question_options_question_id_ordem_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_ordem_key UNIQUE (question_id, ordem);


--
-- Name: questionarios questionarios_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questionarios
    ADD CONSTRAINT questionarios_pkey PRIMARY KEY (id);


--
-- Name: questions questions_form_id_pagina_ordem_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_form_id_pagina_ordem_key UNIQUE (form_id, pagina, ordem);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: quiz_applications quiz_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_applications
    ADD CONSTRAINT quiz_applications_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: respostas_questionario respostas_questionario_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


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
-- Name: student_quiz_answers student_quiz_answers_attempt_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_answers
    ADD CONSTRAINT student_quiz_answers_attempt_id_question_id_key UNIQUE (attempt_id, question_id);


--
-- Name: student_quiz_answers student_quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_answers
    ADD CONSTRAINT student_quiz_answers_pkey PRIMARY KEY (id);


--
-- Name: student_quiz_attempts student_quiz_attempts_application_id_student_id_attempt_num_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_attempts
    ADD CONSTRAINT student_quiz_attempts_application_id_student_id_attempt_num_key UNIQUE (application_id, student_id, attempt_number);


--
-- Name: student_quiz_attempts student_quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_attempts
    ADD CONSTRAINT student_quiz_attempts_pkey PRIMARY KEY (id);


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
-- Name: tipos_parceria tipos_parceria_nome_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tipos_parceria
    ADD CONSTRAINT tipos_parceria_nome_key UNIQUE (nome);


--
-- Name: tipos_parceria tipos_parceria_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tipos_parceria
    ADD CONSTRAINT tipos_parceria_pkey PRIMARY KEY (id);


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
-- Name: tts_audio_cache tts_audio_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tts_audio_cache
    ADD CONSTRAINT tts_audio_cache_pkey PRIMARY KEY (id);


--
-- Name: tts_audio_cache tts_audio_cache_text_hash_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tts_audio_cache
    ADD CONSTRAINT tts_audio_cache_text_hash_key UNIQUE (text_hash);


--
-- Name: dominios uq_dominios_nome; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT uq_dominios_nome UNIQUE (nome);


--
-- Name: empresas uq_empresas_email; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT uq_empresas_email UNIQUE (email_contacto);


--
-- Name: empresas uq_empresas_nif; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT uq_empresas_nif UNIQUE (nif);


--
-- Name: encarregados_educacao uq_encarregado_email; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.encarregados_educacao
    ADD CONSTRAINT uq_encarregado_email UNIQUE (email);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


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
-- Name: idx_aluno_medida_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_medida_ativo ON public.aluno_medida_educativa USING btree (aluno_id) WHERE (data_fim IS NULL);


--
-- Name: idx_aluno_medida_disciplina; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aluno_medida_disciplina ON public.aluno_medida_educativa USING btree (aluno_id, disciplina_id);


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
-- Name: idx_alunos_encarregados_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_alunos_encarregados_aluno ON public.alunos_encarregados USING btree (aluno_id);


--
-- Name: idx_alunos_encarregados_encarregado; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_alunos_encarregados_encarregado ON public.alunos_encarregados USING btree (encarregado_id);


--
-- Name: idx_assuntos_discipline; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_assuntos_discipline ON public.assuntos USING btree (discipline_id);


--
-- Name: idx_audio_attempts_flashcard; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audio_attempts_flashcard ON public.audio_flashcard_attempts USING btree (flashcard_id);


--
-- Name: idx_audio_attempts_student; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audio_attempts_student ON public.audio_flashcard_attempts USING btree (student_id, created_at DESC);


--
-- Name: idx_audio_attempts_type; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audio_attempts_type ON public.audio_flashcard_attempts USING btree (attempt_type);


--
-- Name: idx_aval_criterio_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aval_criterio_aluno ON public.avaliacao_criterio_sucesso USING btree (aluno_id, criterio_sucesso_id);


--
-- Name: idx_aval_criterio_ano_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aval_criterio_ano_aluno ON public.avaliacao_criterio_sucesso USING btree (ano_escolaridade_aluno);


--
-- Name: idx_aval_criterio_disciplina; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aval_criterio_disciplina ON public.avaliacao_criterio_sucesso USING btree (disciplina_id);


--
-- Name: idx_aval_criterio_pendente; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_aval_criterio_pendente ON public.avaliacao_criterio_sucesso USING btree (atingiu_sucesso) WHERE (atingiu_sucesso = false);


--
-- Name: idx_avaliacao_competencia_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_avaliacao_competencia_aluno ON public.avaliacao_competencia USING btree (aluno_id, competencia_id);


--
-- Name: idx_avaliacao_competencia_data; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_avaliacao_competencia_data ON public.avaliacao_competencia USING btree (data_avaliacao DESC);


--
-- Name: idx_avaliacao_competencia_momento; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_avaliacao_competencia_momento ON public.avaliacao_competencia USING btree (momento_avaliacao);


--
-- Name: idx_avaliacao_competencia_nivel; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_avaliacao_competencia_nivel ON public.avaliacao_competencia USING btree (nivel);


--
-- Name: idx_avaliacao_disciplina_turma; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_avaliacao_disciplina_turma ON public.avaliacao_competencia USING btree (disciplina_turma_id);


--
-- Name: idx_ciclos_responsavel_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ciclos_responsavel_id ON public.eqavet_ciclos_formativos USING btree (responsavel_id);


--
-- Name: idx_competencia_disciplina; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_competencia_disciplina ON public.competencia USING btree (disciplina_id, ativo);


--
-- Name: idx_competencia_medida; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_competencia_medida ON public.competencia USING btree (medida_educativa);


--
-- Name: idx_competencia_validado; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_competencia_validado ON public.competencia USING btree (validado, ativo);


--
-- Name: idx_contador_dossie; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_dossie ON public.contador USING btree (dossie_id);


--
-- Name: idx_contador_registo_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_registo_aluno ON public.contador_registo USING btree (aluno_id);


--
-- Name: idx_contador_registo_aluno_data; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_registo_aluno_data ON public.contador_registo USING btree (aluno_id, created_at DESC);


--
-- Name: idx_contador_registo_contador; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_registo_contador ON public.contador_registo USING btree (contador_id);


--
-- Name: idx_contador_registo_data; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_registo_data ON public.contador_registo USING btree (created_at DESC);


--
-- Name: idx_contador_registo_recent; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_contador_registo_recent ON public.contador_registo USING btree (contador_id, created_at DESC);


--
-- Name: idx_criterio_dossie; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_criterio_dossie ON public.criterio USING btree (dossie_id);


--
-- Name: idx_criterio_ordem; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_criterio_ordem ON public.criterio USING btree (ordem);


--
-- Name: idx_criterio_sucesso_ano_inicial; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_criterio_sucesso_ano_inicial ON public.criterio_sucesso USING btree (ano_escolaridade_inicial);


--
-- Name: idx_criterio_sucesso_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_criterio_sucesso_ativo ON public.criterio_sucesso USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_criterio_sucesso_tipo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_criterio_sucesso_tipo ON public.criterio_sucesso USING btree (tipo_criterio);


--
-- Name: idx_csd_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_csd_ativo ON public.criterio_sucesso_departamento USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_csd_criterio; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_csd_criterio ON public.criterio_sucesso_departamento USING btree (criterio_sucesso_id);


--
-- Name: idx_csd_departamento; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_csd_departamento ON public.criterio_sucesso_departamento USING btree (departamento_id);


--
-- Name: idx_csp_disciplina; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_csp_disciplina ON public.criterio_sucesso_professor USING btree (disciplina_id);


--
-- Name: idx_disciplina_turma_id_professor_id_ativo_ano_letivo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_disciplina_turma_id_professor_id_ativo_ano_letivo ON public.disciplina_turma USING btree (id, professor_id, ativo, ano_letivo);


--
-- Name: idx_dossie_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_dossie_ativo ON public.dossie USING btree (ativo);


--
-- Name: idx_dossie_professor_disciplina; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_dossie_professor_disciplina ON public.dossie USING btree (professor_disciplina_turma_id);


--
-- Name: idx_elemento_criterio; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_elemento_criterio ON public.elemento_avaliacao USING btree (criterio_id);


--
-- Name: idx_elemento_criterio_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_elemento_criterio_ativo ON public.elemento_avaliacao USING btree (criterio_id, ativo);


--
-- Name: idx_elemento_data; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_elemento_data ON public.elemento_avaliacao USING btree (data_avaliacao);


--
-- Name: idx_elemento_tipo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_elemento_tipo ON public.elemento_avaliacao USING btree (tipo);


--
-- Name: idx_empresas_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_ativo ON public.empresas USING btree (ativo);


--
-- Name: idx_empresas_contactos_empresa; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_contactos_empresa ON public.empresas_contactos USING btree (empresa_id);


--
-- Name: idx_empresas_contactos_principal; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_contactos_principal ON public.empresas_contactos USING btree (empresa_id, principal) WHERE (principal = true);


--
-- Name: idx_empresas_criador; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_criador ON public.empresas USING btree (criador_id);


--
-- Name: idx_empresas_enderecos_empresa_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_enderecos_empresa_id ON public.empresas_enderecos USING btree (empresa_id);


--
-- Name: idx_empresas_nif; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_nif ON public.empresas USING btree (nif);


--
-- Name: idx_empresas_nome; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_nome ON public.empresas USING btree (nome);


--
-- Name: idx_empresas_parceria_atual; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_parceria_atual ON public.empresas USING btree (ativo, data_fim_parceria);


--
-- Name: idx_empresas_setor; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_setor ON public.empresas USING btree (setor_atividade);


--
-- Name: idx_empresas_tipo_parceria; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_tipo_parceria ON public.empresas USING btree (tipo_parceria) WHERE (tipo_parceria IS NOT NULL);


--
-- Name: idx_empresas_tipos_empresa; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_tipos_empresa ON public.empresas_tipos_parceria USING btree (empresa_id);


--
-- Name: idx_empresas_tipos_parceria; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_empresas_tipos_parceria ON public.empresas_tipos_parceria USING btree (tipo_parceria_id);


--
-- Name: idx_encarregados_educacao_ativo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_encarregados_educacao_ativo ON public.encarregados_educacao USING btree (ativo);


--
-- Name: idx_encarregados_educacao_email; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_encarregados_educacao_email ON public.encarregados_educacao USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_external_user_disciplines_discipline_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_external_user_disciplines_discipline_id ON public.external_user_disciplines USING btree (discipline_id);


--
-- Name: idx_external_user_disciplines_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_external_user_disciplines_user_id ON public.external_user_disciplines USING btree (user_id);


--
-- Name: idx_flashcards_assunto; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_flashcards_assunto ON public.flashcards USING btree (assunto_id);


--
-- Name: idx_flashcards_discipline_active; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_flashcards_discipline_active ON public.flashcards USING btree (discipline_id) WHERE (active = true);


--
-- Name: idx_flashcards_scheduled; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_flashcards_scheduled ON public.flashcards USING btree (scheduled_date);


--
-- Name: idx_form_answers_question; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_form_answers_question ON public.form_answers USING btree (question_id);


--
-- Name: idx_form_responses_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_form_responses_aluno ON public.form_responses USING btree (aluno_id);


--
-- Name: idx_form_responses_form; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_form_responses_form ON public.form_responses USING btree (form_id);


--
-- Name: idx_form_responses_submetido; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_form_responses_submetido ON public.form_responses USING btree (submetido_em DESC);


--
-- Name: idx_forms_ano_letivo; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_ano_letivo ON public.forms USING btree (ano_letivo);


--
-- Name: idx_forms_criador; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_criador ON public.forms USING btree (criador_id);


--
-- Name: idx_forms_datas; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_datas ON public.forms USING btree (data_abertura, data_fecho);


--
-- Name: idx_forms_disciplina_turma; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_disciplina_turma ON public.forms USING btree (disciplina_turma_id);


--
-- Name: idx_forms_is_template; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_is_template ON public.forms USING btree (is_template) WHERE (is_template = true);


--
-- Name: idx_forms_template_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_template_id ON public.forms USING btree (template_id) WHERE (template_id IS NOT NULL);


--
-- Name: idx_forms_turma; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_forms_turma ON public.forms USING btree (turma_id);


--
-- Name: idx_memory_state_student_due; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_memory_state_student_due ON public.flashcard_memory_state USING btree (student_id) WHERE (stability > (0)::numeric);


--
-- Name: idx_momento_avaliacao_dossie; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_momento_avaliacao_dossie ON public.momento_avaliacao USING btree (dossie_id);


--
-- Name: idx_nota_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_aluno ON public.nota_elemento USING btree (aluno_id);


--
-- Name: idx_nota_elemento; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_elemento ON public.nota_elemento USING btree (elemento_avaliacao_id);


--
-- Name: idx_nota_elemento_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_elemento_aluno ON public.nota_elemento USING btree (elemento_avaliacao_id, aluno_id);


--
-- Name: idx_nota_elemento_elemento_nota; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_elemento_elemento_nota ON public.nota_elemento USING btree (elemento_avaliacao_id, nota) WHERE (nota > (0)::numeric);


--
-- Name: idx_nota_final_momento_aluno; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_final_momento_aluno ON public.nota_final_momento USING btree (aluno_id);


--
-- Name: idx_nota_final_momento_momento; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_nota_final_momento_momento ON public.nota_final_momento USING btree (momento_avaliacao_id);


--
-- Name: idx_pending_registrations_email; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_pending_registrations_email ON public.pending_registrations USING btree (email);


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
-- Name: idx_questionarios_categoria; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_questionarios_categoria ON public.questionarios USING btree (categoria) WHERE (ativo = true);


--
-- Name: idx_questionarios_criador; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_questionarios_criador ON public.questionarios USING btree (criador_id);


--
-- Name: idx_questionarios_tags; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_questionarios_tags ON public.questionarios USING gin (tags);


--
-- Name: idx_questionarios_visibilidade; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_questionarios_visibilidade ON public.questionarios USING btree (visibilidade) WHERE (ativo = true);


--
-- Name: idx_quiz_applications_quiz_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_quiz_applications_quiz_id ON public.quiz_applications USING btree (quiz_id);


--
-- Name: idx_quiz_applications_turma_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_quiz_applications_turma_id ON public.quiz_applications USING btree (turma_id);


--
-- Name: idx_review_log_student_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_review_log_student_date ON public.flashcard_review_log USING btree (student_id, review_date DESC);


--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_roles_name ON public.roles USING btree (name);


--
-- Name: idx_student_quiz_answers_attempt_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_student_quiz_answers_attempt_id ON public.student_quiz_answers USING btree (attempt_id);


--
-- Name: idx_student_quiz_answers_question_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_student_quiz_answers_question_id ON public.student_quiz_answers USING btree (question_id);


--
-- Name: idx_student_quiz_attempts_application_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_student_quiz_attempts_application_id ON public.student_quiz_attempts USING btree (application_id);


--
-- Name: idx_student_quiz_attempts_student_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_student_quiz_attempts_student_id ON public.student_quiz_attempts USING btree (student_id);


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
-- Name: idx_tts_cache_hash; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tts_cache_hash ON public.tts_audio_cache USING btree (text_hash);


--
-- Name: idx_unico_encarregado_principal; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX idx_unico_encarregado_principal ON public.alunos_encarregados USING btree (aluno_id) WHERE (principal = true);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


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
-- Name: v_competencias_disciplina_resumo _RETURN; Type: RULE; Schema: public; Owner: user
--

CREATE OR REPLACE VIEW public.v_competencias_disciplina_resumo AS
 SELECT s.id AS disciplina_id,
    s.nome AS disciplina_nome,
    s.codigo AS disciplina_codigo,
    count(DISTINCT c.id) AS total_competencias,
    count(DISTINCT
        CASE
            WHEN (c.medida_educativa <> 'nenhuma'::public.tipo_medida_educativa) THEN c.id
            ELSE NULL::uuid
        END) AS competencias_com_medidas,
    count(DISTINCT
        CASE
            WHEN (c.validado = true) THEN c.id
            ELSE NULL::uuid
        END) AS competencias_validadas
   FROM (public.subjects s
     LEFT JOIN public.competencia c ON (((c.disciplina_id = s.id) AND (c.ativo = true))))
  WHERE (s.ativo = true)
  GROUP BY s.id
  ORDER BY s.nome;


--
-- Name: v_estatisticas_competencias_turma _RETURN; Type: RULE; Schema: public; Owner: user
--

CREATE OR REPLACE VIEW public.v_estatisticas_competencias_turma AS
 SELECT dt.id AS disciplina_turma_id,
    dt.turma_id,
    cl.nome AS turma_nome,
    dt.disciplina_id,
    s.nome AS disciplina_nome,
    c.id AS competencia_id,
    c.nome AS competencia_nome,
    ( SELECT json_agg(d.nome) AS json_agg
           FROM (public.competencia_dominio cd
             JOIN public.dominios d ON ((d.id = cd.dominio_id)))
          WHERE (cd.competencia_id = c.id)) AS dominios,
    count(DISTINCT ac.aluno_id) AS total_alunos_avaliados,
    count(ac.id) AS total_avaliacoes,
    avg(public.nivel_proficiencia_to_number(ac.nivel)) AS media_niveis,
    min(public.nivel_proficiencia_to_number(ac.nivel)) AS nivel_minimo,
    max(public.nivel_proficiencia_to_number(ac.nivel)) AS nivel_maximo
   FROM ((((public.disciplina_turma dt
     JOIN public.classes cl ON ((cl.id = dt.turma_id)))
     JOIN public.subjects s ON ((s.id = dt.disciplina_id)))
     JOIN public.competencia c ON ((c.disciplina_id = s.id)))
     LEFT JOIN public.avaliacao_competencia ac ON (((ac.competencia_id = c.id) AND (ac.disciplina_turma_id = dt.id))))
  WHERE ((dt.ativo = true) AND (c.ativo = true))
  GROUP BY dt.id, cl.nome, s.nome, c.id
  ORDER BY cl.nome, s.nome, c.nome;


--
-- Name: v_form_templates _RETURN; Type: RULE; Schema: public; Owner: user
--

CREATE OR REPLACE VIEW public.v_form_templates AS
 SELECT f.id,
    f.titulo,
    f.descricao,
    f.criador_id,
    f.disciplina_turma_id,
    f.turma_id,
    f.ano_letivo,
    f.data_abertura,
    f.data_fecho,
    f.permite_anonimo,
    f.requer_autenticacao,
    f.permite_multiplas_respostas,
    f.ativo,
    f.data_criacao,
    f.data_atualizacao,
    f.is_template,
    f.template_id,
    u.nome AS criador_nome,
    count(DISTINCT fi.id) AS total_instancias,
    count(DISTINCT fr.id) AS total_respostas
   FROM (((public.forms f
     LEFT JOIN public.users u ON ((u.id = f.criador_id)))
     LEFT JOIN public.forms fi ON ((fi.template_id = f.id)))
     LEFT JOIN public.form_responses fr ON (((fr.form_id = f.id) OR (fr.form_id IN ( SELECT forms.id
           FROM public.forms
          WHERE (forms.template_id = f.id))))))
  WHERE ((f.is_template = true) AND (f.ativo = true))
  GROUP BY f.id, u.nome;


--
-- Name: categories set_timestamp; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- Name: criterio_sucesso_professor trg_check_criterio_disciplina_departamento; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_check_criterio_disciplina_departamento BEFORE INSERT OR UPDATE ON public.criterio_sucesso_professor FOR EACH ROW EXECUTE FUNCTION public.check_criterio_disciplina_departamento();


--
-- Name: aluno_medida_educativa trigger_aluno_medida_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_aluno_medida_updated_at BEFORE UPDATE ON public.aluno_medida_educativa FOR EACH ROW EXECUTE FUNCTION public.update_competencia_updated_at();


--
-- Name: empresas trigger_atualizar_empresas; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_atualizar_empresas BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.atualizar_data_atualizacao();


--
-- Name: empresas_contactos trigger_atualizar_empresas_contactos; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_atualizar_empresas_contactos BEFORE UPDATE ON public.empresas_contactos FOR EACH ROW EXECUTE FUNCTION public.atualizar_data_atualizacao();


--
-- Name: empresas_enderecos trigger_atualizar_empresas_enderecos; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_atualizar_empresas_enderecos BEFORE UPDATE ON public.empresas_enderecos FOR EACH ROW EXECUTE FUNCTION public.atualizar_data_atualizacao();


--
-- Name: avaliacao_competencia trigger_avaliacao_competencia_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_avaliacao_competencia_updated_at BEFORE UPDATE ON public.avaliacao_competencia FOR EACH ROW EXECUTE FUNCTION public.update_competencia_updated_at();


--
-- Name: competencia trigger_competencia_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_competencia_updated_at BEFORE UPDATE ON public.competencia FOR EACH ROW EXECUTE FUNCTION public.update_competencia_updated_at();


--
-- Name: aplicacoes_questionario trigger_criar_destinatarios; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_criar_destinatarios AFTER INSERT ON public.aplicacoes_questionario FOR EACH ROW EXECUTE FUNCTION public.criar_destinatarios_aplicacao();


--
-- Name: empresas trigger_empresas_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: encarregados_educacao trigger_encarregados_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_encarregados_updated_at BEFORE UPDATE ON public.encarregados_educacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competencia trigger_historico_competencia; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_historico_competencia AFTER INSERT OR UPDATE ON public.competencia FOR EACH ROW EXECUTE FUNCTION public.registar_alteracao_competencia();


--
-- Name: assuntos update_assuntos_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_assuntos_updated_at BEFORE UPDATE ON public.assuntos FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at_column();


--
-- Name: contador update_contador_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_contador_updated_at BEFORE UPDATE ON public.contador FOR EACH ROW EXECUTE FUNCTION public.feedback_update_updated_at_column();


--
-- Name: credit_products update_credit_products_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_credit_products_updated_at BEFORE UPDATE ON public.credit_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: criterio update_criterio_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_criterio_updated_at BEFORE UPDATE ON public.criterio FOR EACH ROW EXECUTE FUNCTION public.feedback_update_updated_at_column();


--
-- Name: dossie update_dossie_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_dossie_updated_at BEFORE UPDATE ON public.dossie FOR EACH ROW EXECUTE FUNCTION public.feedback_update_updated_at_column();


--
-- Name: elemento_avaliacao update_elemento_avaliacao_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_elemento_avaliacao_updated_at BEFORE UPDATE ON public.elemento_avaliacao FOR EACH ROW EXECUTE FUNCTION public.feedback_update_updated_at_column();


--
-- Name: flashcards update_flashcards_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at_column();


--
-- Name: flashcard_memory_state update_memory_state_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_memory_state_updated_at BEFORE UPDATE ON public.flashcard_memory_state FOR EACH ROW EXECUTE FUNCTION public.update_generic_updated_at_column();


--
-- Name: nota_elemento update_nota_elemento_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_nota_elemento_updated_at BEFORE UPDATE ON public.nota_elemento FOR EACH ROW EXECUTE FUNCTION public.feedback_update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_roles();


--
-- Name: student_loans update_student_loans_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_student_loans_updated_at BEFORE UPDATE ON public.student_loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles update_user_roles_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_roles();


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
-- Name: aluno_medida_educativa aluno_medida_educativa_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_medida_educativa
    ADD CONSTRAINT aluno_medida_educativa_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: aluno_medida_educativa aluno_medida_educativa_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_medida_educativa
    ADD CONSTRAINT aluno_medida_educativa_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: aluno_medida_educativa aluno_medida_educativa_registado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aluno_medida_educativa
    ADD CONSTRAINT aluno_medida_educativa_registado_por_id_fkey FOREIGN KEY (registado_por_id) REFERENCES public.users(id);


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
-- Name: alunos_encarregados alunos_encarregados_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.alunos_encarregados
    ADD CONSTRAINT alunos_encarregados_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: alunos_encarregados alunos_encarregados_encarregado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.alunos_encarregados
    ADD CONSTRAINT alunos_encarregados_encarregado_id_fkey FOREIGN KEY (encarregado_id) REFERENCES public.encarregados_educacao(id) ON DELETE CASCADE;


--
-- Name: aplicacoes_questionario aplicacoes_questionario_aplicador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_aplicador_id_fkey FOREIGN KEY (aplicador_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: aplicacoes_questionario aplicacoes_questionario_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: aplicacoes_questionario aplicacoes_questionario_questionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_questionario_id_fkey FOREIGN KEY (questionario_id) REFERENCES public.questionarios(id) ON DELETE RESTRICT;


--
-- Name: aplicacoes_questionario aplicacoes_questionario_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.aplicacoes_questionario
    ADD CONSTRAINT aplicacoes_questionario_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: assuntos assuntos_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.assuntos
    ADD CONSTRAINT assuntos_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: audio_flashcard_attempts audio_flashcard_attempts_flashcard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audio_flashcard_attempts
    ADD CONSTRAINT audio_flashcard_attempts_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;


--
-- Name: audio_flashcard_attempts audio_flashcard_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audio_flashcard_attempts
    ADD CONSTRAINT audio_flashcard_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: avaliacao_competencia avaliacao_competencia_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_competencia
    ADD CONSTRAINT avaliacao_competencia_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: avaliacao_competencia avaliacao_competencia_competencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_competencia
    ADD CONSTRAINT avaliacao_competencia_competencia_id_fkey FOREIGN KEY (competencia_id) REFERENCES public.competencia(id) ON DELETE CASCADE;


--
-- Name: avaliacao_competencia avaliacao_competencia_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_competencia
    ADD CONSTRAINT avaliacao_competencia_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id) ON DELETE CASCADE;


--
-- Name: avaliacao_competencia avaliacao_competencia_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_competencia
    ADD CONSTRAINT avaliacao_competencia_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: avaliacao_criterio_sucesso avaliacao_criterio_sucesso_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_criterio_sucesso
    ADD CONSTRAINT avaliacao_criterio_sucesso_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: avaliacao_criterio_sucesso avaliacao_criterio_sucesso_criterio_sucesso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_criterio_sucesso
    ADD CONSTRAINT avaliacao_criterio_sucesso_criterio_sucesso_id_fkey FOREIGN KEY (criterio_sucesso_id) REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE;


--
-- Name: avaliacao_criterio_sucesso avaliacao_criterio_sucesso_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_criterio_sucesso
    ADD CONSTRAINT avaliacao_criterio_sucesso_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id);


--
-- Name: avaliacao_criterio_sucesso avaliacao_criterio_sucesso_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.avaliacao_criterio_sucesso
    ADD CONSTRAINT avaliacao_criterio_sucesso_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


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
-- Name: competencia competencia_criado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia
    ADD CONSTRAINT competencia_criado_por_id_fkey FOREIGN KEY (criado_por_id) REFERENCES public.users(id);


--
-- Name: competencia competencia_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia
    ADD CONSTRAINT competencia_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: competencia_disciplina_turma competencia_disciplina_turma_competencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_disciplina_turma
    ADD CONSTRAINT competencia_disciplina_turma_competencia_id_fkey FOREIGN KEY (competencia_id) REFERENCES public.competencia(id) ON DELETE CASCADE;


--
-- Name: competencia_disciplina_turma competencia_disciplina_turma_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_disciplina_turma
    ADD CONSTRAINT competencia_disciplina_turma_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id) ON DELETE CASCADE;


--
-- Name: competencia_dominio competencia_dominio_competencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_dominio
    ADD CONSTRAINT competencia_dominio_competencia_id_fkey FOREIGN KEY (competencia_id) REFERENCES public.competencia(id) ON DELETE CASCADE;


--
-- Name: competencia_dominio competencia_dominio_dominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_dominio
    ADD CONSTRAINT competencia_dominio_dominio_id_fkey FOREIGN KEY (dominio_id) REFERENCES public.dominios(id) ON DELETE CASCADE;


--
-- Name: competencia_historico competencia_historico_alterado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_historico
    ADD CONSTRAINT competencia_historico_alterado_por_id_fkey FOREIGN KEY (alterado_por_id) REFERENCES public.users(id);


--
-- Name: competencia_historico competencia_historico_competencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia_historico
    ADD CONSTRAINT competencia_historico_competencia_id_fkey FOREIGN KEY (competencia_id) REFERENCES public.competencia(id) ON DELETE CASCADE;


--
-- Name: competencia competencia_validado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.competencia
    ADD CONSTRAINT competencia_validado_por_id_fkey FOREIGN KEY (validado_por_id) REFERENCES public.users(id);


--
-- Name: contador contador_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.contador
    ADD CONSTRAINT contador_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: contador_registo contador_registo_contador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.contador_registo
    ADD CONSTRAINT contador_registo_contador_id_fkey FOREIGN KEY (contador_id) REFERENCES public.contador(id) ON DELETE CASCADE;


--
-- Name: criterio criterio_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio
    ADD CONSTRAINT criterio_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: criterio_sucesso_departamento criterio_sucesso_departamento_criterio_sucesso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_departamento
    ADD CONSTRAINT criterio_sucesso_departamento_criterio_sucesso_id_fkey FOREIGN KEY (criterio_sucesso_id) REFERENCES public.criterio_sucesso(id) ON DELETE CASCADE;


--
-- Name: criterio_sucesso_departamento criterio_sucesso_departamento_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_departamento
    ADD CONSTRAINT criterio_sucesso_departamento_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento(id) ON DELETE CASCADE;


--
-- Name: criterio_sucesso_professor criterio_sucesso_professor_disciplina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_professor
    ADD CONSTRAINT criterio_sucesso_professor_disciplina_id_fkey FOREIGN KEY (disciplina_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: criterio_sucesso_professor criterio_sucesso_professor_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.criterio_sucesso_professor
    ADD CONSTRAINT criterio_sucesso_professor_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: departamento departamento_coordenador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.departamento
    ADD CONSTRAINT departamento_coordenador_id_fkey FOREIGN KEY (coordenador_id) REFERENCES public.users(id);


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_aplicacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_aplicacao_id_fkey FOREIGN KEY (aplicacao_id) REFERENCES public.aplicacoes_questionario(id) ON DELETE CASCADE;


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_encarregado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_encarregado_id_fkey FOREIGN KEY (encarregado_id) REFERENCES public.encarregados_educacao(id) ON DELETE CASCADE;


--
-- Name: destinatarios_aplicacao destinatarios_aplicacao_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.destinatarios_aplicacao
    ADD CONSTRAINT destinatarios_aplicacao_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: dominios dominios_criado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.dominios
    ADD CONSTRAINT dominios_criado_por_id_fkey FOREIGN KEY (criado_por_id) REFERENCES public.users(id);


--
-- Name: dossie dossie_professor_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.dossie
    ADD CONSTRAINT dossie_professor_disciplina_turma_id_fkey FOREIGN KEY (professor_disciplina_turma_id) REFERENCES public.professor_disciplina_turma(id) ON DELETE CASCADE;


--
-- Name: elemento_avaliacao elemento_avaliacao_criterio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.elemento_avaliacao
    ADD CONSTRAINT elemento_avaliacao_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES public.criterio(id) ON DELETE CASCADE;


--
-- Name: empresas_contactos empresas_contactos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_contactos
    ADD CONSTRAINT empresas_contactos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresas empresas_criador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_criador_id_fkey FOREIGN KEY (criador_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: empresas_enderecos empresas_enderecos_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_enderecos
    ADD CONSTRAINT empresas_enderecos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresas_tipos_parceria empresas_tipos_parceria_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_tipos_parceria
    ADD CONSTRAINT empresas_tipos_parceria_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE CASCADE;


--
-- Name: empresas_tipos_parceria empresas_tipos_parceria_tipo_parceria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.empresas_tipos_parceria
    ADD CONSTRAINT empresas_tipos_parceria_tipo_parceria_id_fkey FOREIGN KEY (tipo_parceria_id) REFERENCES public.tipos_parceria(id) ON DELETE CASCADE;


--
-- Name: eqavet_ciclos_formativos eqavet_ciclos_formativos_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_ciclos_formativos
    ADD CONSTRAINT eqavet_ciclos_formativos_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: eqavet_indicador_1_colocacao eqavet_indicador_1_colocacao_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_1_colocacao
    ADD CONSTRAINT eqavet_indicador_1_colocacao_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_indicador_1_colocacao eqavet_indicador_1_colocacao_turma997_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_1_colocacao
    ADD CONSTRAINT eqavet_indicador_1_colocacao_turma997_id_fkey FOREIGN KEY (turma997_id) REFERENCES public.classes(id);


--
-- Name: eqavet_indicador_2_conclusao eqavet_indicador_2_conclusao_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_2_conclusao
    ADD CONSTRAINT eqavet_indicador_2_conclusao_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_indicador_2_conclusao eqavet_indicador_2_conclusao_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_2_conclusao
    ADD CONSTRAINT eqavet_indicador_2_conclusao_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: eqavet_indicador_3_abandono eqavet_indicador_3_abandono_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_3_abandono
    ADD CONSTRAINT eqavet_indicador_3_abandono_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_indicador_4_utilizacao eqavet_indicador_4_utilizacao_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_4_utilizacao
    ADD CONSTRAINT eqavet_indicador_4_utilizacao_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_indicador_5b_satisfacao_empregadores eqavet_indicador_5b_satisfacao_empregad_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_5b_satisfacao_empregadores
    ADD CONSTRAINT eqavet_indicador_5b_satisfacao_empregad_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_indicador_6a_prosseguimento eqavet_indicador_6a_prosseguimento_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_indicador_6a_prosseguimento
    ADD CONSTRAINT eqavet_indicador_6a_prosseguimento_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_tracking_diplomados eqavet_tracking_diplomados_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados
    ADD CONSTRAINT eqavet_tracking_diplomados_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: eqavet_tracking_diplomados eqavet_tracking_diplomados_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados
    ADD CONSTRAINT eqavet_tracking_diplomados_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id);


--
-- Name: eqavet_tracking_diplomados eqavet_tracking_diplomados_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_tracking_diplomados
    ADD CONSTRAINT eqavet_tracking_diplomados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: eqavet_turma_ciclo eqavet_turma_ciclo_ciclo_formativo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_turma_ciclo
    ADD CONSTRAINT eqavet_turma_ciclo_ciclo_formativo_id_fkey FOREIGN KEY (ciclo_formativo_id) REFERENCES public.eqavet_ciclos_formativos(id) ON DELETE CASCADE;


--
-- Name: eqavet_turma_ciclo eqavet_turma_ciclo_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.eqavet_turma_ciclo
    ADD CONSTRAINT eqavet_turma_ciclo_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: products fk_category; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: external_user_disciplines fk_external_user_disciplines_discipline; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.external_user_disciplines
    ADD CONSTRAINT fk_external_user_disciplines_discipline FOREIGN KEY (discipline_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: external_user_disciplines fk_external_user_disciplines_user; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.external_user_disciplines
    ADD CONSTRAINT fk_external_user_disciplines_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flashcard_memory_state flashcard_memory_state_flashcard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_memory_state
    ADD CONSTRAINT flashcard_memory_state_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;


--
-- Name: flashcard_memory_state flashcard_memory_state_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_memory_state
    ADD CONSTRAINT flashcard_memory_state_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flashcard_review_log flashcard_review_log_flashcard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_review_log
    ADD CONSTRAINT flashcard_review_log_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;


--
-- Name: flashcard_review_log flashcard_review_log_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcard_review_log
    ADD CONSTRAINT flashcard_review_log_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flashcards flashcards_assunto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_assunto_id_fkey FOREIGN KEY (assunto_id) REFERENCES public.assuntos(id) ON DELETE SET NULL;


--
-- Name: flashcards flashcards_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: flashcards flashcards_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.flashcards
    ADD CONSTRAINT flashcards_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: form_answers form_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_answers
    ADD CONSTRAINT form_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: form_answers form_answers_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_answers
    ADD CONSTRAINT form_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.form_responses(id) ON DELETE CASCADE;


--
-- Name: form_responses form_responses_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id);


--
-- Name: form_responses form_responses_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.form_responses
    ADD CONSTRAINT form_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: forms forms_criador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_criador_id_fkey FOREIGN KEY (criador_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: forms forms_disciplina_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_disciplina_turma_id_fkey FOREIGN KEY (disciplina_turma_id) REFERENCES public.disciplina_turma(id);


--
-- Name: forms forms_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.forms(id);


--
-- Name: forms forms_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


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
-- Name: itens_resposta itens_resposta_pergunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.itens_resposta
    ADD CONSTRAINT itens_resposta_pergunta_id_fkey FOREIGN KEY (pergunta_id) REFERENCES public.perguntas(id) ON DELETE RESTRICT;


--
-- Name: itens_resposta itens_resposta_resposta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.itens_resposta
    ADD CONSTRAINT itens_resposta_resposta_id_fkey FOREIGN KEY (resposta_id) REFERENCES public.respostas_questionario(id) ON DELETE CASCADE;


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
-- Name: momento_avaliacao momento_avaliacao_dossie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.momento_avaliacao
    ADD CONSTRAINT momento_avaliacao_dossie_id_fkey FOREIGN KEY (dossie_id) REFERENCES public.dossie(id) ON DELETE CASCADE;


--
-- Name: nota_elemento nota_elemento_elemento_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_elemento
    ADD CONSTRAINT nota_elemento_elemento_avaliacao_id_fkey FOREIGN KEY (elemento_avaliacao_id) REFERENCES public.elemento_avaliacao(id) ON DELETE CASCADE;


--
-- Name: nota_final_momento nota_final_momento_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nota_final_momento nota_final_momento_momento_avaliacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.nota_final_momento
    ADD CONSTRAINT nota_final_momento_momento_avaliacao_id_fkey FOREIGN KEY (momento_avaliacao_id) REFERENCES public.momento_avaliacao(id) ON DELETE CASCADE;


--
-- Name: opcoes_resposta opcoes_resposta_pergunta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.opcoes_resposta
    ADD CONSTRAINT opcoes_resposta_pergunta_id_fkey FOREIGN KEY (pergunta_id) REFERENCES public.perguntas(id) ON DELETE CASCADE;


--
-- Name: perguntas perguntas_questionario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.perguntas
    ADD CONSTRAINT perguntas_questionario_id_fkey FOREIGN KEY (questionario_id) REFERENCES public.questionarios(id) ON DELETE CASCADE;


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
-- Name: question_options question_options_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questionarios questionarios_criador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questionarios
    ADD CONSTRAINT questionarios_criador_id_fkey FOREIGN KEY (criador_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: questions questions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: quiz_applications quiz_applications_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_applications
    ADD CONSTRAINT quiz_applications_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_applications quiz_applications_turma_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_applications
    ADD CONSTRAINT quiz_applications_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.classes(id);


--
-- Name: quiz_questions quiz_questions_flashcard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_flashcard_id_fkey FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id);


--
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_discipline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.subjects(id);


--
-- Name: quizzes quizzes_professor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_professor_id_fkey FOREIGN KEY (professor_id) REFERENCES public.users(id);


--
-- Name: respostas_questionario respostas_questionario_aplicacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_aplicacao_id_fkey FOREIGN KEY (aplicacao_id) REFERENCES public.aplicacoes_questionario(id) ON DELETE CASCADE;


--
-- Name: respostas_questionario respostas_questionario_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.destinatarios_aplicacao(id) ON DELETE SET NULL;


--
-- Name: respostas_questionario respostas_questionario_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- Name: respostas_questionario respostas_questionario_encarregado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_encarregado_id_fkey FOREIGN KEY (encarregado_id) REFERENCES public.encarregados_educacao(id);


--
-- Name: respostas_questionario respostas_questionario_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.respostas_questionario
    ADD CONSTRAINT respostas_questionario_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


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
-- Name: student_quiz_answers student_quiz_answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_answers
    ADD CONSTRAINT student_quiz_answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.student_quiz_attempts(id) ON DELETE CASCADE;


--
-- Name: student_quiz_answers student_quiz_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_answers
    ADD CONSTRAINT student_quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id);


--
-- Name: student_quiz_attempts student_quiz_attempts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_attempts
    ADD CONSTRAINT student_quiz_attempts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.quiz_applications(id) ON DELETE CASCADE;


--
-- Name: student_quiz_attempts student_quiz_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.student_quiz_attempts
    ADD CONSTRAINT student_quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


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
-- Name: subjects subjects_departamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamento(id);


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
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

