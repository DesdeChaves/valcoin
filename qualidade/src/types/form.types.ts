// src/types/form.types.ts

/** Tipos de utilizador da tua tabela users */
export type TipoUtilizador = 'ALUNO' | 'PROFESSOR' | 'ADMIN'

/** Tipos de pergunta suportados (exatamente como no teu CHECK constraint) */
export type TipoPergunta =
  | 'texto_curto'
  | 'texto_longo'
  | 'escolha_multipla'
  | 'caixas_selecao'
  | 'lista_suspensa'
  | 'escala_linear'
  | 'data'
  | 'hora'
  | 'upload_ficheiro'
  | 'grelha'

export interface Form {
  id: string
  titulo: string
  descricao?: string | null
  criador_id: string
  disciplina_turma_id?: string | null
  turma_id?: string | null
  ano_letivo: string

  data_abertura?: string | null // ISO string ou null
  data_fecho?: string | null
  permite_anonimo: boolean
  requer_autenticacao: boolean
  permite_multiplas_respostas: boolean

  ativo: boolean
  data_criacao: string
  data_atualizacao: string

  // Relacionamentos (populados com include)
  criador?: {
    id: string
    nome: string
    email: string
    tipo_utilizador: TipoUtilizador
  }
  turma?: {
    id: string
    nome: string
    codigo: string
  }
  questions?: Question[]
  responses?: FormResponse[]
}

export interface Question {
  id: string
  form_id: string
  pagina: number
  ordem: number
  tipo_pergunta: TipoPergunta
  enunciado: string
  descricao?: string | null
  obrigatoria: boolean

  // Configurações específicas por tipo
  escala_min?: number | null
  escala_max?: number | null
  escala_label_min?: string | null
  escala_label_max?: string | null

  data_criacao?: string
  data_atualizacao?: string

  // Relacionamentos
  options?: QuestionOption[]
}

export interface QuestionOption {
  id: string
  question_id: string
  texto: string
  ordem: number
}

export interface FormResponse {
  id: string
  form_id: string
  aluno_id?: string | null // null se anónimo
  submetido_em: string
  ip_address?: string | null
  user_agent?: string | null

  // Relacionamentos
  aluno?: {
    id: string
    nome: string
    numero_mecanografico: string
    email: string
  } | null
  answers?: FormAnswer[]
}

export interface FormAnswer {
  id: string
  response_id: string
  question_id: string

  texto_resposta?: string | null
  opcoes_selecionadas?: string[] | null // array de question_option.id (string)
  valor_numerico?: number | null
  data_resposta?: string | null // ISO date
  ficheiros_url?: string[] | null // URLs dos ficheiros enviados

  data_criacao: string

  // Relacionamentos opcionais (útil no frontend)
  question?: Pick<Question, 'enunciado' | 'tipo_pergunta'>
}

/** Tipos auxiliares para formulários no frontend (React Hook Form) */
export type CreateFormData = {
  titulo: string
  descricao?: string
  turma_id?: string
  disciplina_turma_id?: string
  data_fecho?: string
  permite_anonimo?: boolean
  permite_multiplas_respostas?: boolean
  questions: Array<{
    tipo_pergunta: TipoPergunta
    enunciado: string
    obrigatoria: boolean
    opcoes?: string[] // textos das opções (para escolha múltipla, etc.)
    escala_min?: number
    escala_max?: number
  }>
}

/** Resposta do aluno (formato enviado ao backend) */
export type SubmitResponseData = {
  [questionId: string]: string | string[] | number | FileList | null
}

/** Dados para gráficos no dashboard de respostas */
export interface ChartData {
  name: string
  value: number
  porcentagem?: number
}
