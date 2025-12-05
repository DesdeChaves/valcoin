-- ============================================================
-- SISTEMA DE QUESTIONÁRIOS ESCOLARES - ARQUITETURA COMPLETA
-- Separa Template (questionário) de Aplicação (distribuição)
-- ============================================================



-- ============================================================
-- 1. ENCARREGADOS DE EDUCAÇÃO
-- ============================================================
CREATE TABLE public.encarregados_educacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(50),
    relacao_aluno character varying(50), -- ex: 'Pai', 'Mãe', 'Encarregado Legal'
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    
    CONSTRAINT uq_encarregado_email UNIQUE (email)
);

-- Índices essenciais
CREATE INDEX idx_encarregados_educacao_email ON public.encarregados_educacao(email) WHERE email IS NOT NULL;
CREATE INDEX idx_encarregados_educacao_ativo ON public.encarregados_educacao(ativo);

-- Trigger para updated_at
CREATE TRIGGER trigger_encarregados_updated_at
    BEFORE UPDATE ON public.encarregados_educacao
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- 2. RELAÇÃO ALUNOS ↔ ENCARREGADOS (muitos-para-muitos)
-- ============================================================
CREATE TABLE public.alunos_encarregados (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    aluno_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encarregado_id uuid NOT NULL REFERENCES public.encarregados_educacao(id) ON DELETE CASCADE,
    
    principal boolean DEFAULT false, -- se é o encarregado principal
    data_vinculo timestamp with time zone DEFAULT now(),
    
    UNIQUE(aluno_id, encarregado_id),
    UNIQUE(aluno_id) WHERE principal = true -- só um principal por aluno
);

-- Índices
CREATE INDEX idx_alunos_encarregados_aluno ON public.alunos_encarregados(aluno_id);
CREATE INDEX idx_alunos_encarregados_encarregado ON public.alunos_encarregados(encarregado_id);
CREATE INDEX idx_alunos_encarregados_principal ON public.alunos_encarregados(aluno_id) WHERE principal = true;


-- ============================================================
-- 3. EMPRESAS PARCEIRAS (estágios, protocolos, etc.)
-- ============================================================
CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    nome character varying(255) NOT NULL,
    nome_curto character varying(100),
    nif character varying(20),
    morada text,
    codigo_postal character varying(20),
    localidade character varying(100),
    email_contacto character varying(255),
    telefone character varying(50),
    pessoa_contacto character varying(255),
    
    tipo_parceria character varying(50), -- ex: 'estagios', 'protocolo', 'formacao', 'patrocinio'
    ativo boolean DEFAULT true,
    data_inicio_parceria date,
    data_fim_parceria date,
    
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    
    CONSTRAINT uq_empresas_nif UNIQUE (nif),
    CONSTRAINT uq_empresas_email UNIQUE (email_contacto)
);

-- Índices
CREATE INDEX idx_empresas_nome ON public.empresas(nome);
CREATE INDEX idx_empresas_ativo ON public.empresas(ativo);
CREATE INDEX idx_empresas_tipo_parceria ON public.empresas(tipo_parceria) WHERE tipo_parceria IS NOT NULL;
CREATE INDEX idx_empresas_parceria_atual ON public.empresas(ativo)
    WHERE ativo = true 
      AND (data_fim_parceria IS NULL OR data_fim_parceria >= now()::date);

-- Trigger para updated_at
CREATE TRIGGER trigger_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Comentários finais
-- ============================================================
COMMENT ON TABLE public.encarregados_educacao IS 'Encarregados de educação dos alunos (pais, tutores)';
COMMENT ON TABLE public.alunos_encarregados IS 'Relação muitos-para-muitos entre alunos e encarregados';
COMMENT ON TABLE public.empresas IS 'Empresas parceiras da escola (estágios, protocolos, etc.)';

-- Agora o teu trigger criar_destinatarios_aplicacao() compila e funciona 100%!





CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;





-- ============================================================
-- 1. QUESTIONÁRIOS (Templates reutilizáveis)
-- ============================================================
CREATE TABLE public.questionarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    titulo character varying(255) NOT NULL,
    descricao text,
    criador_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    
    -- Visibilidade e partilha
    visibilidade character varying(20) NOT NULL DEFAULT 'privado'
        CHECK (visibilidade IN ('privado', 'escola', 'publico')),
    -- privado: só o criador vê
    -- escola: todos os professores da escola podem usar
    -- publico: qualquer professor pode usar (biblioteca de questionários)
    
    categoria character varying(50), -- ex: 'avaliacao', 'satisfacao', 'diagnostico', 'quiz'
    tags text[], -- ['matematica', '10ano', 'trigonometria']
    
    -- Configurações gerais do questionário
    permite_anonimo boolean DEFAULT false,
    permite_multiplas_respostas boolean DEFAULT false,
    embaralhar_perguntas boolean DEFAULT false,
    mostrar_resultados_apos_submissao boolean DEFAULT false,
    
    versao integer DEFAULT 1, -- para controlar alterações
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);

-- ============================================================
-- 2. PERGUNTAS
-- ============================================================
CREATE TABLE public.perguntas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    questionario_id uuid NOT NULL REFERENCES public.questionarios(id) ON DELETE CASCADE,
    
    pagina integer DEFAULT 1,
    ordem integer NOT NULL,
    
    tipo character varying(30) NOT NULL 
        CHECK (tipo IN (
            'texto_curto',      -- resposta de texto (max 255 chars)
            'texto_longo',      -- textarea
            'escolha_unica',    -- radio buttons
            'escolha_multipla', -- checkboxes
            'lista_suspensa',   -- dropdown/select
            'escala_linear',    -- 1-5, 1-10, etc
            'escala_likert',    -- Discordo totalmente ... Concordo totalmente
            'data',
            'hora',
            'email',
            'numero',
            'upload_ficheiro',
            'secao'             -- apenas título/descrição, não é pergunta
        )),
    
    enunciado text NOT NULL,
    descricao text, -- texto de ajuda
    obrigatoria boolean DEFAULT false,
    
    -- Configurações específicas por tipo
    config jsonb, -- flexível para qualquer tipo
    -- ex: {"min": 1, "max": 10, "step": 1, "label_min": "Nada satisfeito", "label_max": "Muito satisfeito"}
    -- ex: {"max_length": 500, "placeholder": "Escreva aqui..."}
    -- ex: {"max_files": 3, "allowed_types": [".pdf", ".docx"]}
    
    -- Para perguntas de quiz/avaliação
    pontos numeric(5,2), -- pontuação desta pergunta (se for avaliação)
    resposta_correta jsonb, -- para correção automática
    
    UNIQUE(questionario_id, pagina, ordem)
);

-- ============================================================
-- 3. OPÇÕES DE RESPOSTA (para escolhas)
-- ============================================================
CREATE TABLE public.opcoes_resposta (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    pergunta_id uuid NOT NULL REFERENCES public.perguntas(id) ON DELETE CASCADE,
    texto text NOT NULL,
    ordem integer NOT NULL,
    e_correta boolean DEFAULT false, -- para quiz
    pontos numeric(5,2), -- pontuação específica desta opção
    UNIQUE(pergunta_id, ordem)
);

-- ============================================================
-- 4. APLICAÇÕES (Distribuição do questionário)
-- Esta é a tabela-chave que resolve o problema!
-- ============================================================
CREATE TABLE public.aplicacoes_questionario (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    questionario_id uuid NOT NULL REFERENCES public.questionarios(id) ON DELETE RESTRICT,
    
    -- Quem aplicou (normalmente um professor)
    aplicador_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    
    -- Contexto da aplicação
    tipo_aplicacao character varying(30) NOT NULL
        CHECK (tipo_aplicacao IN (
            'turma',                -- para uma turma inteira
            'disciplina_turma',     -- para alunos de uma disciplina numa turma
            'grupo_alunos',         -- para um grupo específico de alunos
            'grupo_professores',    -- para um grupo de professores
            'grupo_funcionarios',   -- para funcionários específicos
            'todos_professores',    -- todos os professores da escola
            'todos_funcionarios',   -- todos os funcionários
            'encarregados_turma',   -- encarregados de educação de uma turma
            'encarregados_ano',     -- encarregados de um ano letivo
            'empresas_parceiras',   -- empresas com protocolo/estágio
            'lista_emails',         -- emails externos (não users do sistema)
            'individual',           -- destinatários específicos (multi-tipo)
            'link_aberto'           -- link público (qualquer um pode responder)
        )),
    
    -- Público-alvo da aplicação
    publico_alvo character varying(30) NOT NULL
        CHECK (publico_alvo IN (
            'alunos',
            'professores', 
            'funcionarios',
            'encarregados',
            'empresas',
            'externos',
            'misto'  -- quando tem vários tipos diferentes
        )),
    
    -- Destinatários (conforme tipo)
    turma_id uuid REFERENCES public.classes(id),
    disciplina_turma_id uuid REFERENCES public.disciplina_turma(id),
    ano_escolar integer, -- ex: 10, 11, 12 (para encarregados_ano)
    
    ano_letivo character varying(9) NOT NULL DEFAULT '2025/26',
    periodo character varying(20), -- '1º Período', '2º Período', etc
    
    -- Temporização
    data_abertura timestamp with time zone NOT NULL,
    data_fecho timestamp with time zone,
    
    -- Configurações específicas desta aplicação
    titulo_customizado character varying(255), -- sobrescreve título do questionário
    mensagem_introducao text,
    mensagem_conclusao text,
    
    notificar_destinatarios boolean DEFAULT true,
    lembrar_nao_respondidos boolean DEFAULT false,
    
    -- Controlo
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    
    -- Metadados
    total_destinatarios integer, -- cache do número de alunos
    total_respostas integer DEFAULT 0
);

-- ============================================================
-- 5. DESTINATÁRIOS (unificado para todos os tipos de público)
-- ============================================================
CREATE TABLE public.destinatarios_aplicacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    aplicacao_id uuid NOT NULL REFERENCES public.aplicacoes_questionario(id) ON DELETE CASCADE,
    
    -- Destinatário (usar campo apropriado conforme público-alvo)
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,  -- alunos, professores, funcionários
    encarregado_id uuid REFERENCES public.encarregados_educacao(id) ON DELETE CASCADE,
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
    email_externo character varying(255),  -- para destinatários sem conta no sistema
    
    nome_destinatario character varying(255), -- cache para relatórios
    tipo_destinatario character varying(30) NOT NULL
        CHECK (tipo_destinatario IN (
            'aluno', 'professor', 'funcionario', 
            'encarregado', 'empresa', 'externo'
        )),
    
    -- Estado
    enviado_em timestamp with time zone DEFAULT now(),
    visualizado_em timestamp with time zone,
    respondido_em timestamp with time zone,
    
    -- Para lembretes
    ultimo_lembrete_em timestamp with time zone,
    numero_lembretes integer DEFAULT 0,
    
    -- Token único para acesso (importante para externos e encarregados)
    token_acesso character varying(64) UNIQUE,
    
    UNIQUE(aplicacao_id, user_id),
    UNIQUE(aplicacao_id, encarregado_id),
    UNIQUE(aplicacao_id, empresa_id),
    UNIQUE(aplicacao_id, email_externo)
);

-- ============================================================
-- 6. RESPOSTAS (Submissões - unificado para todos)
-- ============================================================
CREATE TABLE public.respostas_questionario (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    aplicacao_id uuid NOT NULL REFERENCES public.aplicacoes_questionario(id) ON DELETE CASCADE,
    destinatario_id uuid REFERENCES public.destinatarios_aplicacao(id) ON DELETE SET NULL,
    
    -- Identificação de quem respondeu (pode ser diferente do destinatário se permitir anónimo)
    user_id uuid REFERENCES public.users(id),
    encarregado_id uuid REFERENCES public.encarregados_educacao(id),
    empresa_id uuid REFERENCES public.empresas(id),
    email_respondente character varying(255),
    anonimo boolean DEFAULT false,
    
    submetido_em timestamp with time zone DEFAULT now(),
    tempo_decorrido_segundos integer, -- quanto tempo demorou a preencher
    
    -- Pontuação (se for quiz/avaliação)
    pontuacao_obtida numeric(5,2),
    pontuacao_maxima numeric(5,2),
    
    -- Metadados
    ip_address inet,
    user_agent text,
    completado boolean DEFAULT true -- false se saiu a meio
);

-- ============================================================
-- 7. RESPOSTAS INDIVIDUAIS (por pergunta)
-- ============================================================
CREATE TABLE public.itens_resposta (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    resposta_id uuid NOT NULL REFERENCES public.respostas_questionario(id) ON DELETE CASCADE,
    pergunta_id uuid NOT NULL REFERENCES public.perguntas(id) ON DELETE RESTRICT,
    
    -- Resposta (usar campo apropriado conforme tipo de pergunta)
    texto text,
    opcoes_selecionadas uuid[], -- array de opcoes_resposta.id
    valor_numerico numeric,
    valor_data date,
    valor_hora time,
    ficheiros_url text[],
    
    -- Avaliação
    pontos_obtidos numeric(5,2),
    correta boolean, -- para correção automática
    
    tempo_resposta_segundos integer,
    data_criacao timestamp with time zone DEFAULT now(),
    
    UNIQUE(resposta_id, pergunta_id)
);

-- ============================================================
-- 8. PARTILHA/PERMISSÕES (para colaboração entre professores)
-- ============================================================
CREATE TABLE public.questionarios_partilhados (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    questionario_id uuid NOT NULL REFERENCES public.questionarios(id) ON DELETE CASCADE,
    partilhado_com_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    partilhado_por_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    permissao character varying(20) NOT NULL DEFAULT 'visualizar'
        CHECK (permissao IN ('visualizar', 'aplicar', 'editar')),
    -- visualizar: pode ver o questionário
    -- aplicar: pode criar aplicações
    -- editar: pode modificar o questionário
    
    data_partilha timestamp with time zone DEFAULT now(),
    
    UNIQUE(questionario_id, partilhado_com_id)
);

-- ============================================================
-- 9. ARQUIVO HISTÓRICO (para limpeza anual)
-- ============================================================
CREATE TABLE public.aplicacoes_arquivo (
    LIKE public.aplicacoes_questionario INCLUDING ALL,
    data_arquivamento timestamp with time zone DEFAULT now(),
    arquivado_por_id uuid REFERENCES public.users(id)
);

CREATE TABLE public.respostas_arquivo (
    LIKE public.respostas_questionario INCLUDING ALL,
    data_arquivamento timestamp with time zone DEFAULT now()
);

-- ============================================================
-- ÍNDICES ESSENCIAIS
-- ============================================================

-- Questionários
CREATE INDEX idx_questionarios_criador ON public.questionarios(criador_id);
CREATE INDEX idx_questionarios_visibilidade ON public.questionarios(visibilidade) WHERE ativo = true;
CREATE INDEX idx_questionarios_categoria ON public.questionarios(categoria) WHERE ativo = true;
CREATE INDEX idx_questionarios_tags ON public.questionarios USING gin(tags);

-- Aplicações
CREATE INDEX idx_aplicacoes_questionario ON public.aplicacoes_questionario(questionario_id);
CREATE INDEX idx_aplicacoes_aplicador ON public.aplicacoes_questionario(aplicador_id);
CREATE INDEX idx_aplicacoes_turma ON public.aplicacoes_questionario(turma_id);
CREATE INDEX idx_aplicacoes_disciplina ON public.aplicacoes_questionario(disciplina_turma_id);
CREATE INDEX idx_aplicacoes_ano_letivo ON public.aplicacoes_questionario(ano_letivo);
CREATE INDEX idx_aplicacoes_datas ON public.aplicacoes_questionario(data_abertura, data_fecho);
CREATE INDEX idx_aplicacoes_ativo ON public.aplicacoes_questionario(ativo, data_fecho);

-- Destinatários
CREATE INDEX idx_destinatarios_aplicacao ON public.destinatarios_aplicacao(aplicacao_id);
CREATE INDEX idx_destinatarios_user ON public.destinatarios_aplicacao(user_id);
CREATE INDEX idx_destinatarios_encarregado ON public.destinatarios_aplicacao(encarregado_id);
CREATE INDEX idx_destinatarios_empresa ON public.destinatarios_aplicacao(empresa_id);
CREATE INDEX idx_destinatarios_tipo ON public.destinatarios_aplicacao(tipo_destinatario);
CREATE INDEX idx_destinatarios_token ON public.destinatarios_aplicacao(token_acesso) WHERE token_acesso IS NOT NULL;
CREATE INDEX idx_destinatarios_nao_respondido ON public.destinatarios_aplicacao(aplicacao_id) 
    WHERE respondido_em IS NULL;

-- Respostas
CREATE INDEX idx_respostas_aplicacao ON public.respostas_questionario(aplicacao_id);
CREATE INDEX idx_respostas_destinatario ON public.respostas_questionario(destinatario_id);
CREATE INDEX idx_respostas_user ON public.respostas_questionario(user_id);
CREATE INDEX idx_respostas_encarregado ON public.respostas_questionario(encarregado_id);
CREATE INDEX idx_respostas_empresa ON public.respostas_questionario(empresa_id);
CREATE INDEX idx_respostas_data ON public.respostas_questionario(submetido_em DESC);

CREATE INDEX idx_itens_resposta_pergunta ON public.itens_resposta(pergunta_id);

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: Questionários disponíveis para um professor
DROP VIEW IF EXISTS v_questionarios_disponiveis CASCADE;
CREATE VIEW v_questionarios_disponiveis AS
SELECT DISTINCT
    q.*,
    u.nome AS criador_nome,
    CASE 
        WHEN q.criador_id = u.id THEN 'proprietario'
        WHEN qp.permissao IS NOT NULL THEN qp.permissao
        WHEN q.visibilidade IN ('escola', 'publico') THEN 'aplicar'
    END AS minha_permissao,
    COUNT(DISTINCT aq.id) AS total_aplicacoes,
    COUNT(DISTINCT rq.id) AS total_respostas
FROM public.questionarios q
JOIN public.users u ON u.id = q.criador_id
LEFT JOIN public.questionarios_partilhados qp ON qp.questionario_id = q.id
LEFT JOIN public.aplicacoes_questionario aq ON aq.questionario_id = q.id
LEFT JOIN public.respostas_questionario rq ON rq.aplicacao_id = aq.id
WHERE q.ativo = true
GROUP BY q.id, u.nome, qp.permissao;

-- View: Dashboard de aplicação (para o professor)
DROP VIEW IF EXISTS v_aplicacoes_dashboard CASCADE;
CREATE VIEW v_aplicacoes_dashboard AS
SELECT 
    aq.*,
    q.titulo AS questionario_titulo,
    q.categoria AS questionario_categoria,
    c.nome AS turma_nome,
    COUNT(DISTINCT da.id) AS total_destinatarios_real,
    COUNT(DISTINCT CASE WHEN da.respondido_em IS NOT NULL THEN da.id END) AS total_respondidos,
    COUNT(DISTINCT CASE WHEN da.visualizado_em IS NOT NULL AND da.respondido_em IS NULL THEN da.id END) AS total_visualizados,
    CASE 
        WHEN aq.data_fecho < now() THEN 'fechado'
        WHEN aq.data_abertura > now() THEN 'agendado'
        WHEN aq.ativo = false THEN 'inativo'
        ELSE 'ativo'
    END AS estado
FROM public.aplicacoes_questionario aq
JOIN public.questionarios q ON q.id = aq.questionario_id
LEFT JOIN public.classes c ON c.id = aq.turma_id
LEFT JOIN public.destinatarios_aplicacao da ON da.aplicacao_id = aq.id
GROUP BY aq.id, q.titulo, q.categoria, c.nome;

-- View: Questionários pendentes (universal para todos os tipos de utilizador)
DROP VIEW IF EXISTS v_questionarios_pendentes CASCADE;
CREATE VIEW v_questionarios_pendentes AS
SELECT 
    da.id AS destinatario_id,
    da.tipo_destinatario,
    da.token_acesso,
    aq.id AS aplicacao_id,
    aq.questionario_id,
    aq.publico_alvo,
    COALESCE(aq.titulo_customizado, q.titulo) AS titulo,
    q.descricao,
    aq.mensagem_introducao,
    aq.data_abertura,
    aq.data_fecho,
    da.visualizado_em,
    da.respondido_em,
    CASE 
        WHEN da.respondido_em IS NOT NULL THEN 'respondido'
        WHEN aq.data_fecho < now() THEN 'expirado'
        WHEN aq.data_abertura > now() THEN 'agendado'
        ELSE 'pendente'
    END AS estado,
    (SELECT COUNT(*) FROM public.perguntas WHERE questionario_id = q.id) AS total_perguntas,
    -- Identificadores conforme tipo
    da.user_id,
    da.encarregado_id,
    da.empresa_id,
    da.email_externo
FROM public.destinatarios_aplicacao da
JOIN public.aplicacoes_questionario aq ON aq.id = da.aplicacao_id
JOIN public.questionarios q ON q.id = aq.questionario_id
WHERE aq.ativo = true;

-- ============================================================
-- FUNÇÕES ÚTEIS
-- ============================================================

-- Função: Criar destinatários automaticamente ao criar aplicação
CREATE OR REPLACE FUNCTION criar_destinatarios_aplicacao()
RETURNS TRIGGER AS $$
DECLARE
    v_token text;
BEGIN
    -- Gerar token único para acesso externo
    v_token := encode(gen_random_bytes(32), 'hex');
    
    -- ALUNOS: turma inteira
    IF NEW.tipo_aplicacao = 'turma' AND NEW.turma_id IS NOT NULL AND NEW.publico_alvo = 'alunos' THEN
        INSERT INTO public.destinatarios_aplicacao (aplicacao_id, user_id, tipo_destinatario, nome_destinatario)
        SELECT NEW.id, u.id, 'aluno', u.nome
        FROM public.users u
        JOIN public.aluno_turma mt ON mt.aluno_id = u.id
        WHERE mt.turma_id = NEW.turma_id
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;
    
    -- ALUNOS: disciplina_turma
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
    
    -- PROFESSORES: todos os professores da escola
    IF NEW.tipo_aplicacao = 'todos_professores' AND NEW.publico_alvo = 'professores' THEN
        INSERT INTO public.destinatarios_aplicacao (aplicacao_id, user_id, tipo_destinatario, nome_destinatario)
        SELECT NEW.id, u.id, 'professor', u.nome
        FROM public.users u
        WHERE u.tipo_utilizador = 'PROFESSOR'
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;
    
    -- FUNCIONÁRIOS: todos os funcionários
    IF NEW.tipo_aplicacao = 'todos_funcionarios' AND NEW.publico_alvo = 'funcionarios' THEN
        INSERT INTO public.destinatarios_aplicacao (aplicacao_id, user_id, tipo_destinatario, nome_destinatario)
        SELECT NEW.id, u.id, 'funcionario', u.nome
        FROM public.users u
        WHERE u.tipo_utilizador = 'FUNCIONARIO'
          AND u.ativo = true
        ON CONFLICT (aplicacao_id, user_id) DO NOTHING;
    END IF;
    
    -- ENCARREGADOS: de uma turma específica
    IF NEW.tipo_aplicacao = 'encarregados_turma' AND NEW.turma_id IS NOT NULL AND NEW.publico_alvo = 'encarregados' THEN
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
        JOIN public.aluno_turma mt ON mt.aluno_id = ae.aluno_id
        WHERE mt.turma_id = NEW.turma_id
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND ee.ativo = true
        ON CONFLICT (aplicacao_id, encarregado_id) DO NOTHING;
    END IF;
    
    -- ENCARREGADOS: de um ano escolar (ex: todos do 10º ano)
    IF NEW.tipo_aplicacao = 'encarregados_ano' AND NEW.ano_escolar IS NOT NULL AND NEW.publico_alvo = 'encarregados' THEN
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
        JOIN public.aluno_turma mt ON mt.aluno_id = ae.aluno_id
        JOIN public.classes c ON c.id = mt.turma_id
        WHERE c.ano = NEW.ano_escolar
          AND mt.ano_letivo = NEW.ano_letivo
          AND mt.ativo = true
          AND ee.ativo = true
        ON CONFLICT (aplicacao_id, encarregado_id) DO NOTHING;
    END IF;
    
    -- EMPRESAS: empresas parceiras ativas
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
          AND e.tipo_parceria IS NOT NULL  -- tem algum tipo de parceria
        ON CONFLICT (aplicacao_id, empresa_id) DO NOTHING;
    END IF;
    
    -- Atualizar contador
    UPDATE public.aplicacoes_questionario 
    SET total_destinatarios = (
        SELECT COUNT(*) FROM public.destinatarios_aplicacao 
        WHERE aplicacao_id = NEW.id
    )
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_criar_destinatarios
    AFTER INSERT ON public.aplicacoes_questionario
    FOR EACH ROW
    EXECUTE FUNCTION criar_destinatarios_aplicacao();

-- Função: Atualizar contadores ao submeter resposta
CREATE OR REPLACE FUNCTION atualizar_contadores_resposta()
RETURNS TRIGGER AS $
BEGIN
    -- Atualizar destinatário (se existir)
    IF NEW.destinatario_id IS NOT NULL THEN
        UPDATE public.destinatarios_aplicacao
        SET respondido_em = NEW.submetido_em
        WHERE id = NEW.destinatario_id;
    END IF;
    
    -- Atualizar contador na aplicação
    UPDATE public.aplicacoes_questionario
    SET total_respostas = total_respostas + 1
    WHERE id = NEW.aplicacao_id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_contadores
    AFTER INSERT ON public.respostas_questionario
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_contadores_resposta();

-- Função: Arquivar aplicações antigas (executar anualmente)
CREATE OR REPLACE FUNCTION arquivar_aplicacoes_antigas(
    anos_atras integer DEFAULT 2
)
RETURNS integer AS $$
DECLARE
    total_arquivado integer;
BEGIN
    -- Arquivar aplicações
    WITH arquivadas AS (
        INSERT INTO public.aplicacoes_arquivo
        SELECT *, now(), NULL
        FROM public.aplicacoes_questionario
        WHERE data_fecho < now() - interval '1 year' * anos_atras
        RETURNING id
    )
    SELECT COUNT(*) INTO total_arquivado FROM arquivadas;
    
    -- Arquivar respostas associadas
    INSERT INTO public.respostas_arquivo
    SELECT r.*, now()
    FROM public.respostas_questionario r
    WHERE r.aplicacao_id IN (
        SELECT id FROM public.aplicacoes_arquivo
    );
    
    -- Remover originais (CASCADE remove destinatários e respostas)
    DELETE FROM public.aplicacoes_questionario
    WHERE data_fecho < now() - interval '1 year' * anos_atras;
    
    RETURN total_arquivado;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- EXEMPLOS DE USO
-- ============================================================

/*
-- ============================================================
-- EXEMPLOS DE USO PARA SISTEMA DE GESTÃO DA QUALIDADE
-- ============================================================

-- 1. QUESTIONÁRIO PARA AVALIAÇÃO DE PROFESSORES (Gestão da Qualidade)
INSERT INTO questionarios (titulo, descricao, criador_id, visibilidade, categoria, tags)
VALUES (
    'Avaliação de Desempenho Docente 2025/26',
    'Questionário oficial para avaliação dos professores pelos alunos',
    'gestao-qualidade-uuid',
    'escola', -- todos os professores podem aplicar
    'avaliacao',
    ARRAY['qualidade', 'desempenho', 'docente']
);

-- 2. QUESTIONÁRIO PARA SATISFAÇÃO DOS ENCARREGADOS DE EDUCAÇÃO
INSERT INTO questionarios (titulo, descricao, criador_id, visibilidade, categoria)
VALUES (
    'Satisfação dos Encarregados de Educação - 1º Período',
    'Avaliação da satisfação com o funcionamento da escola',
    'gestao-qualidade-uuid',
    'escola',
    'satisfacao'
);

-- 3. APLICAR A TODOS OS PROFESSORES (avaliação interna)
INSERT INTO aplicacoes_questionario (
    questionario_id, aplicador_id, 
    tipo_aplicacao, publico_alvo,
    ano_letivo, periodo,
    data_abertura, data_fecho
)
VALUES (
    'quest-professores-uuid',
    'diretor-uuid',
    'todos_professores',
    'professores',
    '2025/26',
    '1º Período',
    '2025-12-01 00:00:00+00',
    '2025-12-20 23:59:59+00'
);
-- Trigger cria automaticamente todos os professores como destinatários!

-- 4. APLICAR A ENCARREGADOS DE UMA TURMA ESPECÍFICA
INSERT INTO aplicacoes_questionario (
    questionario_id, aplicador_id,
    tipo_aplicacao, publico_alvo,
    turma_id, ano_letivo,
    data_abertura, data_fecho,
    notificar_destinatarios
)
VALUES (
    'quest-encarregados-uuid',
    'diretor-turma-uuid',
    'encarregados_turma',
    'encarregados',
    'turma-10a-uuid',
    '2025/26',
    '2025-12-01 00:00:00+00',
    '2025-12-15 23:59:59+00',
    true
);
-- Trigger cria todos os encarregados da turma com tokens únicos!

-- 5. APLICAR A TODOS OS ENCARREGADOS DO 10º ANO
INSERT INTO aplicacoes_questionario (
    questionario_id, aplicador_id,
    tipo_aplicacao, publico_alvo,
    ano_escolar, ano_letivo,
    data_abertura, data_fecho
)
VALUES (
    'quest-encarregados-uuid',
    'gestao-qualidade-uuid',
    'encarregados_ano',
    'encarregados',
    10, -- 10º ano
    '2025/26',
    '2025-12-01 00:00:00+00',
    '2025-12-31 23:59:59+00'
);

-- 6. APLICAR A TODOS OS FUNCIONÁRIOS
INSERT INTO aplicacoes_questionario (
    questionario_id, aplicador_id,
    tipo_aplicacao, publico_alvo,
    ano_letivo,
    data_abertura, data_fecho
)
VALUES (
    'quest-funcionarios-uuid',
    'rh-uuid',
    'todos_funcionarios',
    'funcionarios',
    '2025/26',
    '2025-12-01 00:00:00+00',
    '2025-12-20 23:59:59+00'
);

-- 7. APLICAR A EMPRESAS PARCEIRAS (estágios/protocolos)
INSERT INTO aplicacoes_questionario (
    questionario_id, aplicador_id,
    tipo_aplicacao, publico_alvo,
    ano_letivo,
    data_abertura, data_fecho,
    mensagem_introducao
)
VALUES (
    'quest-empresas-uuid',
    'coordenador-estagios-uuid',
    'empresas_parceiras',
    'empresas',
    '2025/26',
    '2025-12-01 00:00:00+00',
    '2026-01-31 23:59:59+00',
    'Avaliação da qualidade dos nossos estagiários na vossa empresa'
);

-- 8. ADICIONAR DESTINATÁRIOS EXTERNOS MANUALMENTE (emails)
-- Para aplicações tipo 'lista_emails' ou 'individual' com externos
INSERT INTO destinatarios_aplicacao (
    aplicacao_id, 
    tipo_destinatario, 
    email_externo, 
    nome_destinatario,
    token_acesso
)
VALUES 
    ('aplicacao-uuid', 'externo', 'parceiro@empresa.pt', 'João Silva', encode(gen_random_bytes(32), 'hex')),
    ('aplicacao-uuid', 'externo', 'consultor@exemplo.pt', 'Maria Costa', encode(gen_random_bytes(32), 'hex'));

-- 9. GERAR LINK DE ACESSO PARA ENCARREGADO/EMPRESA/EXTERNO
-- (este link seria enviado por email)
SELECT 
    'https://escola.pt/questionario/' || token_acesso as link_acesso,
    nome_destinatario,
    tipo_destinatario
FROM destinatarios_aplicacao
WHERE aplicacao_id = 'aplicacao-uuid'
  AND token_acesso IS NOT NULL;

-- 10. VER QUESTIONÁRIOS PENDENTES PARA UM ALUNO
SELECT * FROM v_questionarios_pendentes
WHERE user_id = 'aluno-uuid' AND estado = 'pendente';

-- 11. VER QUESTIONÁRIOS PENDENTES PARA UM PROFESSOR
SELECT * FROM v_questionarios_pendentes
WHERE user_id = 'prof-uuid' AND tipo_destinatario = 'professor' AND estado = 'pendente';

-- 12. VER QUESTIONÁRIOS PENDENTES PARA UM ENCARREGADO
SELECT * FROM v_questionarios_pendentes
WHERE encarregado_id = 'enc-uuid' AND estado = 'pendente';

-- 13. ACESSO POR TOKEN (para encarregados/empresas/externos)
SELECT * FROM v_questionarios_pendentes
WHERE token_acesso = 'abc123...' AND estado = 'pendente';

-- 14. DASHBOARD DA GESTÃO DA QUALIDADE
SELECT 
    aq.id,
    q.titulo AS questionario,
    aq.publico_alvo,
    aq.tipo_aplicacao,
    aq.periodo,
    COUNT(DISTINCT da.id) AS total_destinatarios,
    COUNT(DISTINCT CASE WHEN da.respondido_em IS NOT NULL THEN da.id END) AS total_respostas,
    ROUND(
        COUNT(DISTINCT CASE WHEN da.respondido_em IS NOT NULL THEN da.id END)::numeric / 
        NULLIF(COUNT(DISTINCT da.id), 0) * 100, 
        1
    ) AS taxa_resposta_pct,
    aq.data_fecho
FROM aplicacoes_questionario aq
JOIN questionarios q ON q.id = aq.questionario_id
LEFT JOIN destinatarios_aplicacao da ON da.aplicacao_id = aq.id
WHERE aq.aplicador_id = 'gestao-qualidade-uuid'
  AND aq.ano_letivo = '2025/26'
GROUP BY aq.id, q.titulo, aq.publico_alvo, aq.tipo_aplicacao, aq.periodo, aq.data_fecho
ORDER BY aq.data_fecho DESC;

-- 15. RELATÓRIO DE NÃO RESPONDIDOS (para enviar lembretes)
SELECT 
    da.nome_destinatario,
    da.tipo_destinatario,
    da.email_externo,
    u.email AS email_user,
    ee.email AS email_encarregado,
    e.email_contacto AS email_empresa,
    da.enviado_em,
    da.numero_lembretes,
    COALESCE(aq.titulo_customizado, q.titulo) AS questionario
FROM destinatarios_aplicacao da
JOIN aplicacoes_questionario aq ON aq.id = da.aplicacao_id
JOIN questionarios q ON q.id = aq.questionario_id
LEFT JOIN users u ON u.id = da.user_id
LEFT JOIN encarregados_educacao ee ON ee.id = da.encarregado_id
LEFT JOIN empresas e ON e.id = da.empresa_id
WHERE da.respondido_em IS NULL
  AND aq.data_fecho > now()
  AND aq.ativo = true
  AND (da.numero_lembretes < 2 OR da.ultimo_lembrete_em < now() - interval '7 days');

-- 16. RESPOSTA DE UM ENCARREGADO (via token)
-- Primeiro, validar o token e obter info
SELECT 
    da.id AS destinatario_id,
    aq.id AS aplicacao_id,
    q.id AS questionario_id,
    da.encarregado_id,
    da.respondido_em -- se já respondeu
FROM destinatarios_aplicacao da
JOIN aplicacoes_questionario aq ON aq.id = da.aplicacao_id
JOIN questionarios q ON q.id = aq.questionario_id
WHERE da.token_acesso = 'token-do-link'
  AND aq.ativo = true
  AND aq.data_abertura <= now()
  AND (aq.data_fecho IS NULL OR aq.data_fecho >= now());

-- Depois submeter a resposta
INSERT INTO respostas_questionario (
    aplicacao_id, destinatario_id, encarregado_id, completado
)
VALUES (
    'aplicacao-uuid',
    'destinatario-uuid',
    'encarregado-uuid',
    true
)
RETURNING id;

-- 17. ARQUIVAR DADOS ANTIGOS (executar anualmente)
SELECT arquivar_aplicacoes_antigas(2); -- move aplicações com +2 anos para arquivo
*/
