-- 1. Formulários / Questionários
CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    titulo character varying(255) NOT NULL,
    descricao text,
    criador_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    disciplina_turma_id uuid REFERENCES public.disciplina_turma(id), -- opcional: vincular à disciplina/turma
    turma_id uuid REFERENCES public.classes(id),                    -- ou só à turma
    ano_letivo character varying(9) NOT NULL DEFAULT '2025/26',

    data_abertura timestamp with time zone,
    data_fecho timestamp with time zone,
    permite_anonimo boolean DEFAULT false,
    requer_autenticacao boolean DEFAULT true,
    permite_multiplas_respostas boolean DEFAULT false, -- aluno pode responder mais que 1 vez?
    
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT now(),
    data_atualizacao timestamp with time zone DEFAULT now()
);

-- 2. Perguntas do formulário
CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    pagina integer DEFAULT 1,
    ordem integer NOT NULL,
    tipo_pergunta character varying(30) NOT NULL 
        CHECK (tipo_pergunta IN (
            'texto_curto', 'texto_longo', 'escolha_multipla', 
            'caixas_selecao', 'lista_suspensa', 'escala_linear',
            'data', 'hora', 'upload_ficheiro', 'grelha'
        )),
    enunciado text NOT NULL,
    descricao text,
    obrigatoria boolean DEFAULT false,
    
    -- Configurações por tipo
    escala_min integer,
    escala_max integer,
    escala_label_min text,
    escala_label_max text,
    
    UNIQUE(form_id, pagina, ordem)
);

-- 3. Opções de resposta (para escolha múltipla, caixas, etc)
CREATE TABLE public.question_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    texto text NOT NULL,
    ordem integer NOT NULL,
    UNIQUE(question_id, ordem)
);

-- 4. Respostas (cabeçalho da submissão)
CREATE TABLE public.form_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    aluno_id uuid REFERENCES public.users(id),  -- NULL se anónimo
    submetido_em timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- 5. Itens de resposta (uma linha por pergunta respondida)
CREATE TABLE public.form_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    response_id uuid NOT NULL REFERENCES public.form_responses(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    
    texto_resposta text,
    opcoes_selecionadas uuid[],        -- array de question_options.id
    valor_numerico numeric,
    data_resposta date,
    ficheiros_url text[],              -- ex: ["https://storage.../file1.pdf"]
    
    data_criacao timestamp with time zone DEFAULT now(),
    
    UNIQUE(response_id, question_id)   -- evita duplicados na mesma submissão
);

CREATE INDEX idx_forms_criador ON public.forms(criador_id);
CREATE INDEX idx_forms_turma ON public.forms(turma_id);
CREATE INDEX idx_forms_disciplina_turma ON public.forms(disciplina_turma_id);
CREATE INDEX idx_forms_ano_letivo ON public.forms(ano_letivo);
CREATE INDEX idx_forms_datas ON public.forms(data_abertura, data_fecho);

CREATE INDEX idx_form_responses_form ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_aluno ON public.form_responses(aluno_id);
CREATE INDEX idx_form_responses_submetido ON public.form_responses(submetido_em DESC);

CREATE INDEX idx_form_answers_question ON public.form_answers(question_id);




-- ==================================================
-- MIGRAÇÃO: Adicionar reutilização de modelos (Templates)
-- Executar este script inteiro de uma vez
-- ==================================================

BEGIN;

-- 1. Adicionar colunas para suportar "é modelo" e "baseado em modelo"
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.forms(id);

-- 2. Criar índices para performance (essenciais!)
CREATE INDEX IF NOT EXISTS idx_forms_is_template ON public.forms(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_forms_template_id ON public.forms(template_id) WHERE template_id IS NOT NULL;

-- 3. Garantir que forms existentes continuam a funcionar (todos são "instâncias")
-- (não é necessário fazer nada — por padrão is_template = false)

-- 4. (Opcional mas recomendado) Criar vista para facilitar listagem de modelos
DROP VIEW IF EXISTS v_form_templates;
CREATE VIEW v_form_templates AS
SELECT 
    f.*,
    u.nome AS criador_nome,
    COUNT(DISTINCT fi.id) AS total_instancias,
    COUNT(DISTINCT fr.id) AS total_respostas
FROM public.forms f
LEFT JOIN public.users u ON u.id = f.criador_id
LEFT JOIN public.forms fi ON fi.template_id = f.id
LEFT JOIN public.form_responses fr ON fr.form_id = f.id OR fr.form_id IN (SELECT id FROM public.forms WHERE template_id = f.id)
WHERE f.is_template = true AND f.ativo = true
GROUP BY f.id, u.nome;

-- 5. (Opcional) Criar vista para ver instâncias com info do modelo
DROP VIEW IF EXISTS v_form_instances;
CREATE VIEW v_form_instances AS
SELECT 
    fi.*,
    ft.titulo AS titulo_modelo,
    ft.criador_id AS modelo_criador_id,
    u.nome AS criador_instancia_nome
FROM public.forms fi
LEFT JOIN public.forms ft ON ft.id = fi.template_id
LEFT JOIN public.users u ON u.id = fi.criador_id
WHERE fi.is_template = false OR fi.is_template IS NULL;

COMMIT;

-- ==================================================
-- PRONTO! Agora tens reutilização total
-- ==================================================
-- 1. Transformar um formulário existente em modelo (faz isto uma vez)
UPDATE public.forms 
SET is_template = true 
WHERE id = 'a1b2c3d4-...' -- ID do formulário que queres reutilizar;

-- 2. Criar nova aplicação do mesmo modelo para outra turma
INSERT INTO public.forms (
    titulo, descricao, criador_id, turma_id, disciplina_turma_id,
 ano_letivo, data_abertura, data_fecho, template_id, ativo
) VALUES (
 'Sondagem de Matemática - 10ºB - 1º Período',
 'Mesmas perguntas do modelo oficial',
 'prof-uuid-123',
 'turma-10b-uuid',
 'disc-matematica-10b-uuid',
 '2025/26',
 '2025-12-01 00:00:00+00',
 '2025-12-20 23:59:59+00',
 'a1b2c3d4-...',  -- ← este é o ID do modelo
 true
);

-- 3. Listar todos os modelos disponíveis (para o professor escolher)
SELECT id, titulo, criador_nome, total_instancias 
FROM v_form_templates 
ORDER BY data_criacao DESC;


// Quando o professor clica em "Usar modelo"
const criarAPartirDeModelo = async (modeloId: string) => {
  const novoForm = await api.post('/forms/from-template', { template_id: modeloId, turma_id: '...', data_fecho: '...' })
}



