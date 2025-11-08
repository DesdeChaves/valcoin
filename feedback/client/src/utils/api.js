import axios from 'axios';

const API_BASE_URL = '/api/feedback'; // Base URL for your backend API

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- User/Professor Endpoints ---
export const fetchProfessorDisciplines = (professorId) => api.get(`/users/${professorId}/disciplines`);
export const fetchProfessorDossiers = (professorId, showInactive = false) => api.get(`/users/${professorId}/dossiers/all`, { params: { showInactive } });
export const fetchProfessorCriteria = (professorId) => api.get(`/users/${professorId}/criteria/all`);
export const fetchProfessorInstruments = (professorId, showInactive) => api.get(`/users/${professorId}/instruments/all`, { params: { showInactive } });
export const fetchProfessorCounters = (professorId, showInactive) => api.get(`/users/${professorId}/counters/all`, { params: { showInactive } });
export const fetchStudentCountersList = (studentId) => api.get(`/students/${studentId}/counters/all`);
export const fetchStudentDisciplines = (studentId) => api.get(`/students/${studentId}/disciplines`);
export const fetchStudentDisciplineGrades = (studentId, disciplineId) => api.get(`/students/${studentId}/disciplines/${disciplineId}/grades`);
export const fetchStudentDossiers = (studentId, disciplineId) => api.get(`/students/${studentId}/disciplines/${disciplineId}/dossiers`);
export const fetchStudentDossierGrades = (studentId, dossierId) => api.get(`/students/${studentId}/dossier/${dossierId}/grades`);

export const fetchStudentProfessorDossierGrades = (studentId, dossierId) => api.get(`/studentprofessor/${studentId}/dossier/${dossierId}/grades`);


export const fetchAllStudentGrades = (studentId) => api.get(`/students/${studentId}/all-grades`);
export const fetchAllStudentProfessorGrades = (studentId) => api.get(`/studentprofessor/${studentId}/all-grades`);

export const fetchStudentCounters = (studentId, disciplineId, counterId, sortBy, sortOrder) => api.get(`/students/${studentId}/counters`, { params: { disciplineId, counterId, sortBy, sortOrder } });
export const fetchStudentsByDiscipline = (disciplineId) => api.get(`/students/disciplina/${disciplineId}/alunos`);
export const fetchStudentsProfessorByDiscipline = (disciplineId) => api.get(`/studentsprofessor/disciplina/${disciplineId}/alunos`);

export const fetchProfessorFeedbackDashboard = (professorId) => api.get(`/professor/feedback-dashboard`);
export const fetchStudentFeedbackDashboard = (studentId) => api.get(`/student/feedback-dashboard`);

// --- Dossier Endpoints ---
export const fetchDossiersByDiscipline = (disciplineId) => api.get(`/dossies/${disciplineId}/pesquisa`);
export const saveDossier = (dossierData) => api.post(`/dossies/save`, dossierData);
export const updateDossier = (dossieId, dossierData) => api.post(`/dossies/${dossieId}/atualiza`, dossierData);
export const deleteDossier = (dossieId) => api.get(`/dossies/${dossieId}/delete?hard=true`);
export const fetchDossierGrades = (dossieId) => api.get(`/dossies/${dossieId}/grades-calculation`);

// --- Criteria Endpoints ---
export const fetchCriteriaByDossier = (dossieId) => api.get(`/criterios/${dossieId}/pesquisa`);
export const deleteCriterion = (criterionId) => api.get(`/criterios/${criterionId}/delete?hard=true`);
export const fetchCriterionDetails = (criterionId) => api.get(`/criterios/${criterionId}`);
export const saveCriterion = (criterionData) => api.post(`/criterios/save`, criterionData);
export const updateCriterion = (criterionId, criterionData) => api.post(`/criterios/${criterionId}/atualiza`, criterionData);

// --- Counter Endpoints ---
export const fetchCounterDetails = (counterId) => api.get(`/contadores/contadore/${counterId}/search`);
export const saveCounter = (counterData) => api.post(`/contadores/contador/save`, counterData);
export const updateCounter = (counterId, counterData) => api.post(`/contadores/contadore/${counterId}/atualiza`, counterData);
export const deleteCounter = (counterId) => api.get(`/contadores/contador/${counterId}/delete?hard=true`);
export const registerTap = (alunoId, contadorId) => api.post(`/contadores/contador/regista`, { aluno_id: alunoId, contador_id: contadorId });
export const fetchDossierCounters = (dossieId) => api.get(`/contadores/dossie/${dossieId}/contadores`);
export const fetchCountersByType = (dossieId, tipo) => api.get(`/contadores/dossie/${dossieId}/contadores/tipo/${tipo}`);

// --- Instrument Endpoints ---
export const fetchDossierInstruments = (dossieId) => api.get(`/instrumentos/dossie/${dossieId}/instrumentos`);
export const fetchInstrumentDetails = (instrumentId) => api.get(`/instrumentos/elemento/${instrumentId}`);
export const fetchInstrumentGrades = (elementoId) => api.get(`/instrumentos/notaselemento/${elementoId}`);
export const fetchInstrumentStatistics = (instrumentId) => api.get(`/instrumentos/elemento/${instrumentId}/estatisticas`);
export const saveInstrument = (instrumentData) => api.post(`/instrumentos/save`, instrumentData);
export const updateInstrument = (elementoId, instrumentData) => api.post(`/instrumentos/elemento/${elementoId}/atualiza`, instrumentData);
export const deleteInstrument = (elementoId) => api.get(`/instrumentos/elemento/${elementoId}/delete?hard=true`);
export const fetchInstrumentsByCriterion = (criterionId) => api.get(`/instrumentos/criterio/${criterionId}/elementos`);
export const saveBatchGrades = (elementoId, notas) => api.post(`/instrumentos/elemento/${elementoId}/notas/lote`, { notas });

// --- Evaluation Moment Endpoints ---
export const saveMomentoAvaliacao = (momentoData) => api.post(`/momentos-avaliacao/momento-avaliacao/save`, momentoData);
export const fetchMomentoAvaliacao = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}`);
export const fetchMomentosAvaliacaoByDossie = (dossieId) => api.get(`/momentos-avaliacao/dossie/${dossieId}/momentos-avaliacao`);
export const updateMomentoAvaliacao = (momentoId, momentoData) => api.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/atualiza`, momentoData);
export const deleteMomentoAvaliacao = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/delete`);
export const saveBatchNotasFinais = (momentoId, notas) => api.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais/save-batch`, { notas });
export const fetchNotasFinaisByMomento = (momentoId) => api.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais`);

// --- Other Endpoints ---
export const loginUser = (credentials) => axios.post('/api/login', credentials); // Login does not use interceptor
