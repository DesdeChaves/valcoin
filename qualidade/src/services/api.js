import axios from 'axios';
// src/services/api.js
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

const publicApiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.authorization = `Bearer ${token}`;
  return config;
});

// 401/403
apiClient.interceptors.response.use(
  res => res,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ============================================================
// FUNÇÕES NOVAS (2025) – FUNCIONAIS
// ============================================================

// Funções para Empresas
export const getTiposParceria = async () => {
  const res = await apiClient.get('/qualidade/empresas/tipos-parceria');
  return res.data;
};

export const getEmpresas = async () => {
  const res = await apiClient.get('/qualidade/empresas');
  return res.data;
};

export const getEmpresaById = async (id) => {
  const res = await apiClient.get(`/qualidade/empresas/${id}`);
  return res.data;
};

export const createEmpresa = async (data) => {
  const res = await apiClient.post('/qualidade/empresas', data);
  return res.data;
};

export const updateEmpresa = async (id, data) => {
  const res = await apiClient.put(`/qualidade/empresas/${id}`, data);
  return res.data;
};

export const deleteEmpresa = async (id) => {
  await apiClient.delete(`/qualidade/empresas/${id}`);
};

export const getAplicacoes = async () => {
  const res = await apiClient.get('/qualidade/professor/aplicacoes');
  return res.data;
};

export const getAplicacaoById = async (id) => {
  const res = await apiClient.get(`/qualidade/professor/aplicacoes/${id}`);
  return res.data;
};

export const getRespostasByAplicacao = async (id) => {
  const res = await apiClient.get(`/qualidade/professor/aplicacoes/${id}/respostas`);
  return res.data;
};

export const createAplicacaoQuestionario = async (dados) => {
  const res = await apiClient.post('/qualidade/professor/aplicacoes', dados);
  return res.data;
};

export const updateAplicacao = async (id, dados) => {
  const res = await apiClient.put(`/qualidade/professor/aplicacoes/${id}`, dados);
  return res.data;
};

export const deleteAplicacao = async (id) => {
  await apiClient.delete(`/qualidade/professor/aplicacoes/${id}`);
};

export const getQuestionariosTemplates = async () => {
  const res = await apiClient.get('/qualidade/professor/questionarios/templates');
  return res.data;
};

export const getQuestionarioById = async (id) => {
  const res = await apiClient.get(`/qualidade/professor/questionarios/${id}`);
  return res.data;
};

export const createQuestionario = async (dados) => {
  const res = await apiClient.post('/qualidade/professor/questionarios', dados);
  return res.data;
};

export const updateQuestionario = async (id, dados) => {
  const res = await apiClient.put(`/qualidade/professor/questionarios/${id}`, dados);
  return res.data;
};

export const getQuestionarios = async () => {
  const res = await apiClient.get('/qualidade/professor/questionarios');
  return res.data;
};

export const deleteQuestionario = async (id) => {
  await apiClient.delete(`/qualidade/professor/questionarios/${id}`);
};


export const createPergunta = async (questionarioId, perguntaData) => {
  const res = await apiClient.post(`/qualidade/professor/questionarios/${questionarioId}/perguntas`, perguntaData);
  return res.data;
};

export const createOpcaoResposta = async (perguntaId, opcoes) => {
  const res = await apiClient.post(`/qualidade/professor/perguntas/${perguntaId}/opcoes`, { opcoes });
  return res.data;
};

export const getClasses = async () => {
  const res = await apiClient.get('/classes');
  return res.data;
};

export const getDisciplinaTurma = async () => {
  const res = await apiClient.get('/disciplina_turma');
  return res.data;
};

export const getProfessorDisciplinaTurma = async (professorId) => {
  const res = await apiClient.get(`/disciplina_turma/professor/${professorId}`);
  return res.data;
};

export const getStudentAplications = async () => {
  const res = await apiClient.get('/qualidade/student/aplicacoes');
  return res.data;
}

export const getQuestionarioByAplicacaoId = async (aplicacaoId) => {
  const res = await apiClient.get(`/qualidade/student/aplicacoes/${aplicacaoId}/questionario`);
  return res.data;
}

// src/services/api.js – adiciona estas duas funções

export const getQuestionarioByToken = async (token) => {
  const response = await publicApiClient.get(`/qualidade/public/responder/${token}`);
  return response.data;
};

// Por esta (que aceita o payload completo):
export const submeterResposta = async (token, payload) => {
  const response = await publicApiClient.post(`/qualidade/public/responder/${token}`, payload);
  return response.data;
};

// Adicionar estas funções novas para estatísticas (opcional):
export const getEstatisticasAplicacao = async (id) => {
  const res = await apiClient.get(`/qualidade/professor/aplicacoes/${id}/estatisticas`);
  return res.data;
};

export const getRespostaById = async (id) => {
  const res = await apiClient.get(`/qualidade/professor/respostas/${id}`);
  return res.data;
};

export const submeterRespostaAutenticada = async (aplicacaoId, payload) => {
  const res = await apiClient.post(`/qualidade/student/aplicacoes/${aplicacaoId}/responder`, payload);
  return res.data;
};



// ============================================================
// FUNÇÕES EQAVET – 2025 (adicionar ao teu api.js)
// ============================================================

// Ciclos Formativos
export const getCiclosFormativos = async (ativo = 'true', responsavelId = null) => {
  const params = {};
  if (ativo !== 'all') {
    params.ativo = ativo;
  }
  if (responsavelId) {
    params.responsavel_id = responsavelId;
  }
  const res = await apiClient.get('/qualidade/equavet/ciclos', { params });
  return res.data;
};

export const createCicloFormativo = async (data) => {
  const res = await apiClient.post('/qualidade/equavet/ciclos', data);
  return res.data;
};

export const updateCicloFormativo = async (id, data) => {
  const res = await apiClient.put(`/qualidade/equavet/ciclos/${id}`, data);
  return res.data;
};

export const getTurmasByCiclo = async (id) => {
  const res = await apiClient.get(`/qualidade/equavet/ciclos/${id}/turmas`);
  return res.data;
};

export const updateTurmasForCiclo = async (id, turmas) => {
  const res = await apiClient.put(`/qualidade/equavet/ciclos/${id}/turmas`, { turmas });
  return res.data;
};

// Metas Institucionais
export const getMetasInstitucionais = async (ano_letivo, responsavelId = null) => {
  const params = { ano_letivo };
  if (responsavelId) {
    params.responsavel_id = responsavelId;
  }
  const res = await apiClient.get('/qualidade/equavet/metas', { params });
  return res.data;
};

export const saveMetaInstitucional = async (data) => {
  const res = await apiClient.post('/qualidade/equavet/metas', data);
  return res.data;
};

// Dashboard principal (Metas vs Resultados)
export const getEqavetDashboard = async () => {
  const res = await apiClient.get('/qualidade/equavet/dashboard');
  return res.data;
};

// Indicadores (todos com GET, POST e PUT)
export const getIndicador = async (nome, cicloId, ano) => {
  const res = await apiClient.get(`/qualidade/equavet/indicador${nome}`, { params: { cicloId, ano } });
  return res.data;
};

export const saveIndicador = async (nome, data) => {
  const res = await apiClient.post(`/qualidade/equavet/indicador${nome}`, data);
  return res.data;
};

export const updateIndicador = async (nome, data) => {
  const res = await apiClient.put(`/qualidade/equavet/indicador${nome}`, data);
  return res.data;
};

// Tracking de Diplomados
export const getTrackingDiplomados = async (cicloId) => {
  const res = await apiClient.get('/qualidade/equavet/tracking', { params: { cicloId } });
  return res.data;
};

export const updateTrackingDiplomado = async (data) => {
  const res = await apiClient.post('/qualidade/equavet/tracking', data);
  return res.data;
};

// Adiciona esta função ao teu api.js
export const getEqavetResumoAnual = async (responsavelId = null) => {
  const params = {};
  if (responsavelId) {
    params.responsavel_id = responsavelId;
  }
  const response = await apiClient.get('/qualidade/equavet/resumo-anual', { params });
  return response.data;
};

export const getProfessors = async () => {
  const res = await apiClient.get('/professors');
  return res.data;
};

// ============================================================
// TODAS AS FUNÇÕES ANTIGAS – MANTIDAS SÓ PARA NÃO DAR ERRO DE IMPORT
// (Podes apagar depois de limpar o código)
// ============================================================
export const getForms = async () => getAplicacoes();
export const getFormById = async (id) => getAplicacaoById(id);
export const getFormTemplates = async () => getQuestionariosTemplates();
export const createFormFromTemplate = async (dados) => createAplicacaoQuestionario(dados);
export const updateForm = async (id, dados) => updateAplicacao(id, dados);
export const deleteForm = async (id) => deleteAplicacao(id);

export const createQuestion = async (...args) => createPergunta(...args);
export const getQuestionsByFormId = async (id) => {
  const q = await getQuestionarioById(id);
  return q.perguntas || [];
};
export const getQuestionById = async () => { /* não usado */ };
export const updateQuestion = async () => { /* não usado */ };
export const deleteQuestion = async () => { /* não usado */ };
export const addOptionsToQuestion = async () => { /* não usado */ };
export const updateOption = async () => { /* não usado */ };
export const deleteOption = async () => { /* não usado */ };
export const makeFormTemplate = async () => { /* não usado */ };

export const submitFormResponse = async () => { /* não usado ainda */ };
export const getFormResponsesByFormId = async () => { /* não usado ainda */ };
export const getFormResponseById = async () => { /* não usado ainda */ };

export default apiClient;
