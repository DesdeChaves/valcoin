-- ============================================================================
-- TABELAS PARA GESTÃO DE EMPRESAS
-- ============================================================================

-- Tabela principal de empresas
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
    
    -- Informações adicionais
    website character varying(255),
    setor_atividade character varying(100),
    numero_colaboradores integer,
    observacoes text,
    logo_url character varying(500),
    
    -- Gestão de parceria
    criador_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    ativo boolean DEFAULT true,
    data_inicio_parceria date,
    data_fim_parceria date,
    data_inativacao timestamp with time zone,
    
    -- Auditoria
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now(),
    
    -- Constraints
    CONSTRAINT uq_empresas_nif UNIQUE (nif),
    CONSTRAINT chk_nif_valido CHECK (nif ~ '^[0-9]{9}$'),
    CONSTRAINT chk_datas_parceria CHECK (data_fim_parceria IS NULL OR data_fim_parceria >= data_inicio_parceria)
);

-- Tabela de tipos de parceria
CREATE TABLE public.tipos_parceria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome character varying(50) NOT NULL UNIQUE,
    descricao text,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now()
);

-- Tabela de relação entre empresas e tipos de parceria (muitos para muitos)
CREATE TABLE public.empresas_tipos_parceria (
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_parceria_id uuid REFERENCES public.tipos_parceria(id) ON DELETE CASCADE,
    data_inicio date,
    data_fim date,
    observacoes text,
    data_criacao timestamp with time zone DEFAULT now(),
    PRIMARY KEY (empresa_id, tipo_parceria_id),
    CONSTRAINT chk_datas_tipo_parceria CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Tabela de contactos das empresas (permite múltiplos contactos por empresa)
CREATE TABLE public.empresas_contactos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
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

-- ============================================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_empresas_nome ON public.empresas(nome);
CREATE INDEX idx_empresas_ativo ON public.empresas(ativo);
CREATE INDEX idx_empresas_criador ON public.empresas(criador_id);
CREATE INDEX idx_empresas_localidade ON public.empresas(localidade);
CREATE INDEX idx_empresas_nif ON public.empresas(nif);
CREATE INDEX idx_empresas_setor ON public.empresas(setor_atividade);

CREATE INDEX idx_empresas_contactos_empresa ON public.empresas_contactos(empresa_id);
CREATE INDEX idx_empresas_contactos_principal ON public.empresas_contactos(empresa_id, principal) WHERE principal = true;

CREATE INDEX idx_empresas_tipos_empresa ON public.empresas_tipos_parceria(empresa_id);
CREATE INDEX idx_empresas_tipos_parceria ON public.empresas_tipos_parceria(tipo_parceria_id);

-- ============================================================================
-- FUNÇÃO E TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE data_atualizacao
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para empresas
CREATE TRIGGER trigger_atualizar_empresas
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_atualizacao();

-- Trigger para contactos
CREATE TRIGGER trigger_atualizar_empresas_contactos
    BEFORE UPDATE ON public.empresas_contactos
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_atualizacao();

-- ============================================================================
-- INSERIR TIPOS DE PARCERIA PADRÃO
-- ============================================================================

INSERT INTO public.tipos_parceria (nome, descricao) VALUES
    ('Estágios', 'Empresas que recebem estagiários'),
    ('Protocolo', 'Empresas com protocolo de colaboração'),
    ('Formação', 'Empresas que fornecem formação'),
    ('Patrocínio', 'Empresas patrocinadoras'),
    ('Investigação', 'Parceria para projetos de investigação'),
    ('Empregabilidade', 'Empresas que recrutam antigos alunos');

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS (DOCUMENTAÇÃO)
-- ============================================================================

COMMENT ON TABLE public.empresas IS 'Tabela principal de empresas parceiras';
COMMENT ON TABLE public.tipos_parceria IS 'Tipos de parceria disponíveis (estágios, protocolos, etc)';
COMMENT ON TABLE public.empresas_tipos_parceria IS 'Relação muitos-para-muitos entre empresas e tipos de parceria';
COMMENT ON TABLE public.empresas_contactos IS 'Contactos das empresas (permite múltiplos contactos por empresa)';

COMMENT ON COLUMN public.empresas.logo_url IS 'URL do logo armazenado em cloud storage (não guardar binário na BD)';
COMMENT ON COLUMN public.empresas.data_inativacao IS 'Data em que a empresa foi inativada';
COMMENT ON COLUMN public.empresas_contactos.principal IS 'Indica se este é o contacto principal da empresa';

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View para listar empresas com seus tipos de parceria
CREATE OR REPLACE VIEW public.v_empresas_completa AS
SELECT 
    e.id,
    e.nome,
    e.nome_curto,
    e.nif,
    e.email_contacto,
    e.telefone,
    e.localidade,
    e.website,
    e.ativo,
    e.data_inicio_parceria,
    e.data_fim_parceria,
    ARRAY_AGG(DISTINCT tp.nome) FILTER (WHERE tp.nome IS NOT NULL) as tipos_parceria,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.ativo = true) as num_contactos
FROM public.empresas e
LEFT JOIN public.empresas_tipos_parceria etp ON e.id = etp.empresa_id
LEFT JOIN public.tipos_parceria tp ON etp.tipo_parceria_id = tp.id AND tp.ativo = true
LEFT JOIN public.empresas_contactos ec ON e.id = ec.empresa_id
GROUP BY e.id;

-- View para contacto principal de cada empresa
CREATE OR REPLACE VIEW public.v_empresas_contacto_principal AS
SELECT 
    e.id as empresa_id,
    e.nome as empresa_nome,
    ec.nome_pessoa,
    ec.cargo,
    ec.email,
    ec.telefone,
    ec.telemovel
FROM public.empresas e
LEFT JOIN public.empresas_contactos ec ON e.id = ec.empresa_id AND ec.principal = true AND ec.ativo = true;

-- ============================================================================
-- PERMISSÕES (AJUSTAR CONFORME TEU SISTEMA)
-- ============================================================================

-- Exemplo de permissões (ajusta conforme teus roles)
-- GRANT SELECT, INSERT, UPDATE ON public.empresas TO role_professor;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO role_admin;

-- ============================================================================
-- QUERIES ÚTEIS PARA TESTE
-- ============================================================================

-- Listar empresas ativas com tipos de parceria
-- SELECT * FROM public.v_empresas_completa WHERE ativo = true;

-- Listar contactos principais
-- SELECT * FROM public.v_empresas_contacto_principal;

-- Empresas por tipo de parceria
-- SELECT e.nome, tp.nome as tipo_parceria
-- FROM public.empresas e
-- JOIN public.empresas_tipos_parceria etp ON e.id = etp.empresa_id
-- JOIN public.tipos_parceria tp ON etp.tipo_parceria_id = tp.id
-- WHERE e.ativo = true;
