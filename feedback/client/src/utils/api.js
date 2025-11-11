import axios from 'axios';

const API_BASE_URL = '/api/feedback'; // Base URL for feedback system

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Changed from 'accessToken' to 'authToken' for consistency
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error(`${error.response.status} Error: Redirecting to login`);
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// PROFESSOR - Dashboard
// ============================================================================
export const fetchProfessorFeedbackDashboard = () => api.get(`/professor/feedback-dashboard`);

// ============================================================================
// PROFESSOR - User/Professor Discipline Management
// ============================================================================
export const fetchProfessorDisciplines = (professorId) => api.get(`/users/${professorId}/disciplines`);
export const fetchProfessorDossiers = (professorId, showInactive = false) => api.get(`/users/${professorId}/dossiers/all`, { params: { showInactive } });
export const fetchProfessorCriteria = (professorId) => api.get(`/users/${professorId}/criteria/all`);
export const fetchProfessorInstruments = (professorId, showInactive) => api.get(`/users/${professorId}/instruments/all`, { params: { showInactive } });
export const fetchProfessorCounters = (professorId, showInactive) => api.get(`/users/${professorId}/counters/all`, { params: { showInactive } });

// ============================================================================
// PROFESSOR - Student Management & Grades
// ============================================================================
export const fetchStudentsProfessorByDiscipline = (disciplineId) => api.get(`/studentsprofessor/disciplina/${disciplineId}/alunos`);
export const fetchAllStudentProfessorGrades = (studentId) => api.get(`/studentprofessor/${studentId}/all-grades`);
export const fetchStudentProfessorDossierGrades = (studentId, dossierId) => api.get(`/studentprofessor/${studentId}/dossier/${dossierId}/grades`);

// ============================================================================
// PROFESSOR - Dossier Management
// ============================================================================
export const fetchDossiersByDiscipline = (disciplineId) => api.get(`/dossies/${disciplineId}/pesquisa`);
export const saveDossier = (dossierData) => api.post(`/dossies/save`, dossierData);
export const updateDossier = (dossieId, dossierData) => api.post(`/dossies/${dossieId}/atualiza`, dossierData);
export const deleteDossier = (dossieId) => api.get(`/dossies/${dossieId}/delete?hard=true`);
export const fetchDossierGrades = (dossieId) => api.get(`/dossies/${dossieId}/grades-calculation`);

// ============================================================================
// PROFESSOR - Criteria Management
// ============================================================================
export const fetchCriteriaByDossier = (dossieId) => api.get(`/criterios/${dossieId}/pesquisa`);
export const fetchCriterionDetails = (criterionId) => api.get(`/criterios/${criterionId}`);
export const saveCriterion = (criterionData) => api.post(`/criterios/save`, criterionData);
export const updateCriterion = (criterionId, criterionData) => api.post(`/criterios/${criterionId}/atualiza`, criterionData);
export const deleteCriterion = (criterionId) => api.get(`/criterios/${criterionId}/delete?hard=true`);

// ============================================================================
// PROFESSOR - Counter Management
// ============================================================================
export const fetchCounterDetails = (counterId) => api.get(`/contadores/contadore/${counterId}/search`);
export const saveCounter = (counterData) => api.post(`/contadores/contador/save`, counterData);
export const updateCounter = (counterId, counterData) => api.post(`/contadores/contadore/${counterId}/atualiza`, counterData);
export const deleteCounter = (counterId) => api.get(`/contadores/contador/${counterId}/delete?hard=true`);
export const registerTap = (alunoId, contadorId) => api.post(`/contadores/contador/regista`, { aluno_id: alunoId, contador_id: contadorId });
export const fetchDossierCounters = (dossieId) => api.get(`/contadores/dossie/${dossieId}/contadores`);
export const fetchCountersByType = (dossieId, tipo) => api.get(`/contadores/dossie/${dossieId}/contadores/tipo/${tipo}`);

// ============================================================================
// PROFESSOR - Instrument Management
// ============================================================================
export const fetchDossierInstruments = (dossieId) => api.get(`/instrumentos/dossie/${dossieId}/instrumentos`);
export const fetchInstrumentDetails = (instrumentId) => api.get(`/instrumentos/elemento/${instrumentId}`);
export const fetchInstrumentGrades = (elementoId) => api.get(`/instrumentos/notaselemento/${elementoId}`);
export const fetchInstrumentStatistics = (instrumentId) => api.get(`/instrumentos/elemento/${instrumentId}/estatisticas`);
export const saveInstrument = (instrumentData) => api.post(`/instrumentos/save`, instrumentData);
export const updateInstrument = (elementoId, instrumentData) => api.post(`/instrumentos/elemento/${elementoId}/atualiza`, instrumentData);
export const deleteInstrument = (elementoId) => api.get(`/instrumentos/elemento/${elementoId}/delete?hard=true`);
export const fetchInstrumentsByCriterion = (criterionId) => api.get(`/instrumentos/criterio/${criterionId}/elementos`);
export const saveBatchGrades = (elementoId, notas) => api.post(`/instrumentos/elemento/${elementoId}/notas/lote`, { notas });

// ============================================================================
// PROFESSOR - Evaluation Moment Management
// ============================================================================
export const saveMomentoAvaliacao = (momentoData) => api.post(`/momentos-avaliacao/momento-avaliacao/save`, momentoData);
export const fetchMomentoAvaliacao = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}`);
export const fetchMomentosAvaliacaoByDossie = (dossieId) => api.get(`/momentos-avaliacao/dossie/${dossieId}/momentos-avaliacao`);
export const updateMomentoAvaliacao = (momentoId, momentoData) => api.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/atualiza`, momentoData);
export const deleteMomentoAvaliacao = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/delete`);
export const saveBatchNotasFinais = (momentoId, notas) => api.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais/save-batch`, { notas });
export const fetchNotasFinaisByMomento = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais`);

// ============================================================================
// STUDENT - Dashboard & Data
// ============================================================================
export const fetchStudentFeedbackDashboard = () => api.get(`/students/feedback-dashboard`);
export const fetchStudentDisciplines = (studentId) => api.get(`/students/${studentId}/disciplines`);
export const fetchStudentDisciplineGrades = (studentId, disciplineId) => api.get(`/students/${studentId}/disciplines/${disciplineId}/grades`);
export const fetchStudentDossiers = (studentId, disciplineId) => api.get(`/students/${studentId}/disciplines/${disciplineId}/dossiers`);
export const fetchStudentDossierGrades = (studentId, dossierId) => api.get(`/students/${studentId}/dossier/${dossierId}/grades`);
export const fetchAllStudentGrades = (studentId) => api.get(`/students/${studentId}/all-grades`);
export const fetchStudentCounters = (studentId, disciplineId, counterId, sortBy, sortOrder) => api.get(`/students/${studentId}/counters`, { params: { disciplineId, counterId, sortBy, sortOrder } });
export const fetchStudentCountersList = (studentId) => api.get(`/students/${studentId}/counters/all`);

// ============================================================================
// DEPRECATED - Student by Discipline (use Professor version instead)
// ============================================================================
// This endpoint appears to be a duplicate of the professor version
// Keeping for backwards compatibility but consider removing
export const fetchStudentsByDiscipline = (disciplineId) => api.get(`/students/disciplina/${disciplineId}/alunos`);

// ============================================================================
// AUTHENTICATION - Login (does not use feedback API base URL)
// ============================================================================
export const loginUser = (credentials) => axios.post('/api/login', credentials);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to handle API errors consistently
 * @param {Error} error - The error object from axios
 * @returns {Object} - Standardized error object
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      status: error.response.status,
      message: error.response.data?.error || error.response.data?.message || 'An error occurred',
      data: error.response.data
    };
  } else if (error.request) {
    // Request made but no response
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
      data: null
    };
  } else {
    // Error in request setup
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      data: null
    };
  }
};

/**
 * Helper to check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('authToken');
};

/**
 * Helper to get current user info from token
 * @returns {Object|null}
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    // Decode JWT token (simple base64 decode, not verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Helper to logout user
 */
export const logout = () => {
  localStorage.removeItem('authToken');
  window.location.href = '/';
};

// Export the axios instance for direct use if needed
export default api;
