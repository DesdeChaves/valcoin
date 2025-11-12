import axios from 'axios';

// ============================================================================
// AXIOS CLIENTS - Separate instances for different base URLs
// ============================================================================

// Main API client for ValCoin system
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Feedback API client
const feedbackClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/feedback',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// SHARED INTERCEPTORS
// ============================================================================

const setupInterceptors = (client) => {
  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      console.log('API Request: Token retrieved:', token ? 'Present' : 'Missing');
      if (token) {
        config.headers.authorization = `Bearer ${token}`;
        console.log('API Request: Authorization header set');
      }
      return config;
    },
    (error) => {
      console.error('API Request Interceptor Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
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
};

// Apply interceptors to both clients
setupInterceptors(apiClient);
setupInterceptors(feedbackClient);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const handleRequest = async (request, endpointName) => {
  console.log(`Making API request to ${endpointName}`);
  try {
    const response = await request();
    console.log(`${endpointName} response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`${endpointName} failed:`, {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw error;
  }
};

// ============================================================================
// AUTHENTICATION & USER
// ============================================================================
export const login = (credentials) => handleRequest(() => apiClient.post('/login', credentials), 'login');
export const changePassword = (data) => handleRequest(() => apiClient.post('/user/change-password', data), 'changePassword');

// ============================================================================
// VALCOIN - PROFESSOR Routes
// ============================================================================
export const getProfessorValcoinDashboard = () => handleRequest(() => apiClient.get('/professor/valcoin-dashboard'), 'getProfessorValcoinDashboard');
export const createProfessorTransaction = (data) => handleRequest(() => apiClient.post('/professor/transactions', data), 'createProfessorTransaction');
export const getProfessorTapRules = () => handleRequest(() => apiClient.get('/professor/tap-rules'), 'getProfessorTapRules');
export const createProfessorTapTransaction = (data) => handleRequest(() => apiClient.post('/professor/tap-transactions', data), 'createProfessorTapTransaction');
export const getProfessorStudentTransactionHistory = (professorId, studentId, disciplinaId) => {
  const params = new URLSearchParams({
    professor_id: professorId,
    student_id: studentId,
    disciplina_id: disciplinaId,
  });
  return handleRequest(() => apiClient.get(`/professor/student-transaction-history?${params.toString()}`), 'getProfessorStudentTransactionHistory');
};
export const checkProfessorRuleApplicability = (data) => handleRequest(() => apiClient.post('/professor/check-rule-applicability', data), 'checkProfessorRuleApplicability');

// ============================================================================
// VALCOIN - STUDENT Routes
// ============================================================================
export const getStudentValcoinDashboard = () => handleRequest(() => apiClient.get('/student/dashboard'), 'getStudentValcoinDashboard');
export const createStudentManualPayment = (data) => handleRequest(() => apiClient.post('/student/manual-payment', data), 'createStudentManualPayment');
export const getStudentPayableUsers = () => handleRequest(() => apiClient.get('/student/payable-users'), 'getStudentPayableUsers');
export const getStudentSettings = () => handleRequest(() => apiClient.get('/student/settings'), 'getStudentSettings');
export const getStudentTransactionRules = () => handleRequest(() => apiClient.get('/student/transaction-rules'), 'getStudentTransactionRules');
export const getStudentApplicableRules = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/student/transaction-rules/applicable${queryString ? `?${queryString}` : ''}`;
  return handleRequest(() => apiClient.get(url), 'getStudentApplicableRules');
};
export const applyStudentTransactionRule = (data) => handleRequest(() => apiClient.post('/student/transaction-rules/apply', data), 'applyStudentTransactionRule');
export const checkStudentRuleApplicability = (data) => handleRequest(() => apiClient.post('/student/transaction-rules/check-applicability', data), 'checkStudentRuleApplicability');
export const getStudentAppliedRulesHistory = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/student/transaction-rules/applied-history${queryString ? `?${queryString}` : ''}`;
  return handleRequest(() => apiClient.get(url), 'getStudentAppliedRulesHistory');
};
export const getStudentHouseHistory = () => handleRequest(() => apiClient.get('/student/house-history'), 'getStudentHouseHistory');
export const getStudentLegadoHistory = () => handleRequest(() => apiClient.get('/student/legado-history'), 'getStudentLegadoHistory');

// Student Savings
export const getStudentSavingsAccounts = () => handleRequest(() => apiClient.get('/student/savings-accounts'), 'getStudentSavingsAccounts');
export const createStudentSavingsAccount = (data) => handleRequest(() => apiClient.post('/student/savings-accounts', data), 'createStudentSavingsAccount');

// Student Loans (Student side)
export const applyForStudentLoan = (data) => handleRequest(() => apiClient.post('/student/loans', data), 'applyForStudentLoan');
export const getMyStudentLoans = () => handleRequest(() => apiClient.get('/student/loans/my-loans'), 'getMyStudentLoans');
export const repayStudentLoan = (id, data) => handleRequest(() => apiClient.post(`/student/loans/${id}/repay`, data), 'repayStudentLoan');

// ============================================================================
// VALCOIN - ADMIN Routes
// ============================================================================
export const getDashboardMetrics = () => handleRequest(() => apiClient.get('/dashboard'), 'getDashboardMetrics');
export const getUsers = () => handleRequest(() => apiClient.get('/users'), 'getUsers');
export const getUnassignedStudents = () => handleRequest(() => apiClient.get('/unassigned-students'), 'getUnassignedStudents');
export const getUser = (id) => handleRequest(() => apiClient.get(`/users/${id}`), 'getUser');
export const createUser = (data) => handleRequest(() => apiClient.post('/users', data), 'createUser');
export const updateUser = (id, data) => handleRequest(() => apiClient.put(`/users/${id}`, data), 'updateUser');
export const deleteUser = (id) => handleRequest(() => apiClient.delete(`/users/${id}`), 'deleteUser');

export const getTransactions = (timeFilter = 'all', startDate, endDate) => {
  const params = new URLSearchParams();
  if (timeFilter !== 'all') params.append('timeFilter', timeFilter);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return handleRequest(() => apiClient.get(`/transactions?${params.toString()}`), 'getTransactions');
};
export const getTransaction = (id) => handleRequest(() => apiClient.get(`/transactions/${id}`), 'getTransaction');
export const getTransactionGroup = (groupId) => handleRequest(() => apiClient.get(`/transactions/group/${groupId}`), 'getTransactionGroup');
export const createTransaction = (data) => handleRequest(() => apiClient.post('/transactions', data), 'createTransaction');
export const updateTransaction = (id, data) => handleRequest(() => apiClient.put(`/transactions/${id}`, data), 'updateTransaction');
export const deleteTransaction = (id) => handleRequest(() => apiClient.delete(`/transactions/${id}`), 'deleteTransaction');
export const approveTransaction = (id) => handleRequest(() => apiClient.patch(`/transactions/${id}/approve`), 'approveTransaction');
export const rejectTransaction = (id, motivo = '') => handleRequest(() => apiClient.patch(`/transactions/${id}/reject`, { motivo }), 'rejectTransaction');

export const getSubjects = () => handleRequest(() => apiClient.get('/subjects'), 'getSubjects');
export const createSubject = (data) => handleRequest(() => apiClient.post('/subjects', data), 'createSubject');
export const updateSubject = (id, data) => handleRequest(() => apiClient.put(`/subjects/${id}`, data), 'updateSubject');
export const softDeleteSubject = (id) => handleRequest(() => apiClient.delete(`/subjects/${id}`), 'softDeleteSubject');

export const getEnrollments = () => handleRequest(() => apiClient.get('/enrollments'), 'getEnrollments');
export const getEnrollment = (id) => handleRequest(() => apiClient.get(`/enrollments/${id}`), 'getEnrollment');
export const createEnrollment = (data) => handleRequest(() => apiClient.post('/enrollments', data), 'createEnrollment');
export const updateEnrollment = (id, data) => handleRequest(() => apiClient.put(`/enrollments/${id}`, data), 'updateEnrollment');
export const deleteEnrollment = (id) => handleRequest(() => apiClient.delete(`/enrollments/${id}`), 'deleteEnrollment');

export const getClasses = () => handleRequest(() => apiClient.get('/classes'), 'getClasses');
export const getStudentsByClass = (classId) => handleRequest(() => apiClient.get(`/classes/${classId}/students`), 'getStudentsByClass');
export const createClass = (data) => handleRequest(() => apiClient.post('/classes', data), 'createClass');
export const updateClass = (id, data) => handleRequest(() => apiClient.put(`/classes/${id}`, data), 'updateClass');
export const deleteClass = (id) => handleRequest(() => apiClient.delete(`/classes/${id}`), 'deleteClass');

export const getTransactionRules = () => handleRequest(() => apiClient.get('/transactionRules'), 'getTransactionRules');
export const createTransactionRule = (data) => handleRequest(() => apiClient.post('/transactionRules', data), 'createTransactionRule');
export const updateTransactionRule = (id, data) => handleRequest(() => apiClient.put(`/transactionRules/${id}`, data), 'updateTransactionRule');
export const deleteTransactionRule = (id) => handleRequest(() => apiClient.delete(`/transactionRules/${id}`), 'deleteTransactionRule');
export const applyTransactionRule = (data) => handleRequest(() => apiClient.post('/applyTransactionRule', data), 'applyTransactionRule');
export const applyTransactionRuleTap = (data) => handleRequest(() => apiClient.post('/transaction-rules/apply', data), 'applyTransactionRuleTap');
export const checkRuleApplicability = (data) => handleRequest(() => apiClient.post('/transaction-rules/check-applicability', data), 'checkRuleApplicability');
export const getApplicableRules = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/transaction-rules/applicable${queryString ? `?${queryString}` : ''}`;
  return handleRequest(() => apiClient.get(url), 'getApplicableRules');
};
export const getAppliedRulesHistory = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `/transaction-rules/applied-history${queryString ? `?${queryString}` : ''}`;
  return handleRequest(() => apiClient.get(url), 'getAppliedRulesHistory');
};

export const getDisciplinaTurma = () => handleRequest(() => apiClient.get('/disciplina_turma'), 'getDisciplinaTurma');
export const createDisciplinaTurma = (data) => handleRequest(() => apiClient.post('/disciplina_turma', data), 'createDisciplinaTurma');
export const updateDisciplinaTurma = (id, data) => handleRequest(() => apiClient.put(`/disciplina_turma/${id}`, data), 'updateDisciplinaTurma');

export const getAllCiclos = () => handleRequest(() => apiClient.get('/admin/ciclos'), 'getAllCiclos');
export const createCiclo = (data) => handleRequest(() => apiClient.post('/admin/ciclos', data), 'createCiclo');
export const updateCiclo = (id, data) => handleRequest(() => apiClient.put(`/admin/ciclos/${id}`, data), 'updateCiclo');
export const deleteCiclo = (id) => handleRequest(() => apiClient.delete(`/admin/ciclos/${id}`), 'deleteCiclo');
export const runInterestPayment = () => handleRequest(() => apiClient.post('/admin/run-interest-payment'), 'runInterestPayment');

export const getAlunoTurma = () => handleRequest(() => apiClient.get('/aluno_turma'), 'getAlunoTurma');
export const getAlunoTurmaById = (id) => handleRequest(() => apiClient.get(`/aluno_turma/${id}`), 'getAlunoTurmaById');
export const createAlunoTurma = (data) => handleRequest(() => apiClient.post('/aluno_turma', data), 'createAlunoTurma');
export const updateAlunoTurma = (id, data) => handleRequest(() => apiClient.put(`/aluno_turma/${id}`, data), 'updateAlunoTurma');
export const deleteAlunoTurma = (id) => handleRequest(() => apiClient.delete(`/aluno_turma/${id}`), 'deleteAlunoTurma');

export const getSettings = () => handleRequest(() => apiClient.get('/settings'), 'getSettings');
export const updateSettings = (data) => handleRequest(() => apiClient.put('/settings', data), 'updateSettings');

export const getSchoolRevenues = () => handleRequest(() => apiClient.get('/school-revenues'), 'getSchoolRevenues');
export const createSchoolRevenue = (data) => handleRequest(() => apiClient.post('/school-revenues', data), 'createSchoolRevenue');
export const updateSchoolRevenue = (id, data) => handleRequest(() => apiClient.put(`/school-revenues/${id}`, data), 'updateSchoolRevenue');
export const deleteSchoolRevenue = (id) => handleRequest(() => apiClient.delete(`/school-revenues/${id}`), 'deleteSchoolRevenue');

export const getAllCategories = () => handleRequest(() => apiClient.get('/categories'), 'getAllCategories');
export const createCategory = (data) => handleRequest(() => apiClient.post('/categories', data), 'createCategory');
export const updateCategory = (id, data) => handleRequest(() => apiClient.put(`/categories/${id}`, data), 'updateCategory');
export const deleteCategory = (id) => handleRequest(() => apiClient.delete(`/categories/${id}`), 'deleteCategory');

export const getSavingsProducts = () => handleRequest(() => apiClient.get('/savings-products'), 'getSavingsProducts');
export const createSavingsProduct = (data) => handleRequest(() => apiClient.post('/savings-products', data), 'createSavingsProduct');
export const updateSavingsProduct = (id, data) => handleRequest(() => apiClient.put(`/savings-products/${id}`, data), 'updateSavingsProduct');
export const deleteSavingsProduct = (id) => handleRequest(() => apiClient.delete(`/savings-products/${id}`), 'deleteSavingsProduct');

export const getCreditProducts = () => handleRequest(() => apiClient.get('/credit-products'), 'getCreditProducts');
export const createCreditProduct = (data) => handleRequest(() => apiClient.post('/credit-products', data), 'createCreditProduct');
export const updateCreditProduct = (id, data) => handleRequest(() => apiClient.put(`/credit-products/${id}`, data), 'updateCreditProduct');
export const deleteCreditProduct = (id) => handleRequest(() => apiClient.delete(`/credit-products/${id}`), 'deleteCreditProduct');

export const getHouses = () => handleRequest(() => apiClient.get('/houses'), 'getHouses');
export const getAvailableStudentsForHouse = () => handleRequest(() => apiClient.get('/houses/available-students'), 'getAvailableStudentsForHouse');
export const getMyHouse = () => handleRequest(() => apiClient.get('/my-house'), 'getMyHouse');
export const getHouse = (id) => handleRequest(() => apiClient.get(`/houses/${id}`), 'getHouse');
export const createHouse = (data) => handleRequest(() => apiClient.post('/houses', data), 'createHouse');
export const updateHouse = (id, data) => handleRequest(() => apiClient.put(`/houses/${id}`, data), 'updateHouse');
export const deleteHouse = (id) => handleRequest(() => apiClient.delete(`/houses/${id}`), 'deleteHouse');
export const manageHouseMembers = (id, data) => handleRequest(() => apiClient.post(`/houses/${id}/members`, data), 'manageHouseMembers');

// Student Loans (Admin Management)
export const getAllStudentLoans = () => handleRequest(() => apiClient.get('/admin/student-loans'), 'getAllStudentLoans');
export const approveStudentLoan = (id) => handleRequest(() => apiClient.patch(`/admin/student-loans/${id}/approve`), 'approveStudentLoan');
export const rejectStudentLoan = (id) => handleRequest(() => apiClient.patch(`/admin/student-loans/${id}/reject`), 'rejectStudentLoan');

// ============================================================================
// FEEDBACK SYSTEM - Professor
// ============================================================================
export const getProfessorFeedbackDashboard = () => handleRequest(() => feedbackClient.get('/professor/feedback-dashboard'), 'getProfessorFeedbackDashboard');
export const fetchProfessorDisciplines = (professorId) => handleRequest(() => feedbackClient.get(`/users/${professorId}/disciplines`), 'fetchProfessorDisciplines');
export const fetchProfessorDossiers = (professorId, showInactive = false) => handleRequest(() => feedbackClient.get(`/users/${professorId}/dossiers/all`, { params: { showInactive } }), 'fetchProfessorDossiers');
export const fetchProfessorCriteria = (professorId) => handleRequest(() => feedbackClient.get(`/users/${professorId}/criteria/all`), 'fetchProfessorCriteria');
export const fetchProfessorInstruments = (professorId, showInactive) => handleRequest(() => feedbackClient.get(`/users/${professorId}/instruments/all`, { params: { showInactive } }), 'fetchProfessorInstruments');
export const fetchProfessorCounters = (professorId, showInactive) => handleRequest(() => feedbackClient.get(`/users/${professorId}/counters/all`, { params: { showInactive } }), 'fetchProfessorCounters');

// Students by Discipline (Professor view)
export const fetchStudentsProfessorByDiscipline = (disciplineId) => handleRequest(() => feedbackClient.get(`/studentsprofessor/disciplina/${disciplineId}/alunos`), 'fetchStudentsProfessorByDiscipline');
export const fetchAllStudentProfessorGrades = (studentId) => handleRequest(() => feedbackClient.get(`/studentprofessor/${studentId}/all-grades`), 'fetchAllStudentProfessorGrades');
export const fetchStudentProfessorDossierGrades = (studentId, dossierId) => handleRequest(() => feedbackClient.get(`/studentprofessor/${studentId}/dossier/${dossierId}/grades`), 'fetchStudentProfessorDossierGrades');

// Dossier Management
export const fetchDossiersByDiscipline = (disciplineId) => handleRequest(() => feedbackClient.get(`/dossies/${disciplineId}/pesquisa`), 'fetchDossiersByDiscipline');
export const saveDossier = (dossierData) => handleRequest(() => feedbackClient.post(`/dossies/save`, dossierData), 'saveDossier');
export const updateDossier = (dossieId, dossierData) => handleRequest(() => feedbackClient.post(`/dossies/${dossieId}/atualiza`, dossierData), 'updateDossier');
export const deleteDossier = (dossieId) => handleRequest(() => feedbackClient.get(`/dossies/${dossieId}/delete?hard=true`), 'deleteDossier');
export const fetchDossierGrades = (dossieId) => handleRequest(() => feedbackClient.get(`/dossies/${dossieId}/grades-calculation`), 'fetchDossierGrades');

// Criteria Management
export const fetchCriteriaByDossier = (dossieId) => handleRequest(() => feedbackClient.get(`/criterios/${dossieId}/pesquisa`), 'fetchCriteriaByDossier');
export const fetchCriterionDetails = (criterionId) => handleRequest(() => feedbackClient.get(`/criterios/${criterionId}`), 'fetchCriterionDetails');
export const saveCriterion = (criterionData) => handleRequest(() => feedbackClient.post(`/criterios/save`, criterionData), 'saveCriterion');
export const updateCriterion = (criterionId, criterionData) => handleRequest(() => feedbackClient.post(`/criterios/${criterionId}/atualiza`, criterionData), 'updateCriterion');
export const deleteCriterion = (criterionId) => handleRequest(() => feedbackClient.get(`/criterios/${criterionId}/delete?hard=true`), 'deleteCriterion');

// Counter Management
export const fetchCounterDetails = (counterId) => handleRequest(() => feedbackClient.get(`/contadores/contadore/${counterId}/search`), 'fetchCounterDetails');
export const saveCounter = (counterData) => handleRequest(() => feedbackClient.post(`/contadores/contador/save`, counterData), 'saveCounter');
export const updateCounter = (counterId, counterData) => handleRequest(() => feedbackClient.post(`/contadores/contadore/${counterId}/atualiza`, counterData), 'updateCounter');
export const deleteCounter = (counterId) => handleRequest(() => feedbackClient.get(`/contadores/contador/${counterId}/delete?hard=true`), 'deleteCounter');
export const registerTap = (alunoId, contadorId) => handleRequest(() => feedbackClient.post(`/contadores/contador/regista`, { aluno_id: alunoId, contador_id: contadorId }), 'registerTap');
export const fetchDossierCounters = (dossieId) => handleRequest(() => feedbackClient.get(`/contadores/dossie/${dossieId}/contadores`), 'fetchDossierCounters');
export const fetchCountersByType = (dossieId, tipo) => handleRequest(() => feedbackClient.get(`/contadores/dossie/${dossieId}/contadores/tipo/${tipo}`), 'fetchCountersByType');

// Instrument Management
export const fetchDossierInstruments = (dossieId) => handleRequest(() => feedbackClient.get(`/instrumentos/dossie/${dossieId}/instrumentos`), 'fetchDossierInstruments');
export const fetchInstrumentDetails = (instrumentId) => handleRequest(() => feedbackClient.get(`/instrumentos/elemento/${instrumentId}`), 'fetchInstrumentDetails');
export const fetchInstrumentGrades = (elementoId) => handleRequest(() => feedbackClient.get(`/instrumentos/notaselemento/${elementoId}`), 'fetchInstrumentGrades');
export const fetchInstrumentStatistics = (instrumentId) => handleRequest(() => feedbackClient.get(`/instrumentos/elemento/${instrumentId}/estatisticas`), 'fetchInstrumentStatistics');
export const saveInstrument = (instrumentData) => handleRequest(() => feedbackClient.post(`/instrumentos/save`, instrumentData), 'saveInstrument');
export const updateInstrument = (elementoId, instrumentData) => handleRequest(() => feedbackClient.post(`/instrumentos/elemento/${elementoId}/atualiza`, instrumentData), 'updateInstrument');
export const deleteInstrument = (elementoId) => handleRequest(() => feedbackClient.get(`/instrumentos/elemento/${elementoId}/delete?hard=true`), 'deleteInstrument');
export const fetchInstrumentsByCriterion = (criterionId) => handleRequest(() => feedbackClient.get(`/instrumentos/criterio/${criterionId}/elementos`), 'fetchInstrumentsByCriterion');
export const saveBatchGrades = (elementoId, notas) => handleRequest(() => feedbackClient.post(`/instrumentos/elemento/${elementoId}/notas/lote`, { notas }), 'saveBatchGrades');

// Evaluation Moment Management
export const saveMomentoAvaliacao = (momentoData) => handleRequest(() => feedbackClient.post(`/momentos-avaliacao/momento-avaliacao/save`, momentoData), 'saveMomentoAvaliacao');
export const fetchMomentoAvaliacao = (momentoId) => handleRequest(() => feedbackClient.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}`), 'fetchMomentoAvaliacao');
export const fetchMomentosAvaliacaoByDossie = (dossieId) => handleRequest(() => feedbackClient.get(`/momentos-avaliacao/dossie/${dossieId}/momentos-avaliacao`), 'fetchMomentosAvaliacaoByDossie');
export const updateMomentoAvaliacao = (momentoId, momentoData) => handleRequest(() => feedbackClient.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/atualiza`, momentoData), 'updateMomentoAvaliacao');
export const deleteMomentoAvaliacao = (momentoId) => handleRequest(() => feedbackClient.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/delete`), 'deleteMomentoAvaliacao');
export const saveBatchNotasFinais = (momentoId, notas) => handleRequest(() => feedbackClient.post(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais/save-batch`, { notas }), 'saveBatchNotasFinais');
export const fetchNotasFinaisByMomento = (momentoId) => handleRequest(() => feedbackClient.get(`/momentos-avaliacao/momento-avaliacao/${momentoId}/notas-finais`), 'fetchNotasFinaisByMomento');

// ============================================================================
// FEEDBACK SYSTEM - Student
// ============================================================================
export const getStudentFeedbackDashboard = () => handleRequest(() => feedbackClient.get('/students/feedback-dashboard'), 'getStudentFeedbackDashboard');
export const fetchStudentDisciplines = (studentId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/disciplines`), 'fetchStudentDisciplines');
export const fetchStudentDisciplineGrades = (studentId, disciplineId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/disciplines/${disciplineId}/grades`), 'fetchStudentDisciplineGrades');
export const fetchStudentDossiers = (studentId, disciplineId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/disciplines/${disciplineId}/dossiers`), 'fetchStudentDossiers');
export const fetchStudentDossierGrades = (studentId, dossierId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/dossier/${dossierId}/grades`), 'fetchStudentDossierGrades');
export const fetchAllStudentGrades = (studentId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/all-grades`), 'fetchAllStudentGrades');
export const fetchStudentCounters = (studentId, disciplineId, counterId, sortBy, sortOrder) => handleRequest(() => feedbackClient.get(`/students/${studentId}/counters`, { params: { disciplineId, counterId, sortBy, sortOrder } }), 'fetchStudentCounters');
export const fetchStudentCountersList = (studentId) => handleRequest(() => feedbackClient.get(`/students/${studentId}/counters/all`), 'fetchStudentCountersList');

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

/**
 * Helper to set authentication token
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

/**
 * Helper to get authentication token
 * @returns {string|null}
 */
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Export the axios instances for direct use if needed
export { apiClient, feedbackClient };

// ============================================================================
// MIGRATION GUIDE - For existing code
// ============================================================================

/*
 * NOME DAS FUNÇÕES ALTERADO PARA EVITAR COLISÕES:
 * 
 * === ValCoin System ===
 * getProfessorDashboard → getProfessorValcoinDashboard
 * getStudentDashboard → getStudentValcoinDashboard
 * 
 * === Student Loans ===
 * getStudentLoans → getAllStudentLoans (admin)
 * applyForLoan → applyForStudentLoan (student)
 * getStudentLoansByStudentId → getMyStudentLoans (student)
 * repayLoan → repayStudentLoan (student)
 * approveLoan → approveStudentLoan (admin)
 * rejectLoan → rejectStudentLoan (admin)
 * 
 * === Feedback System ===
 * Todas as funções feedback mantêm o prefixo "fetch" para distinção clara
 * 
 * EXEMPLO DE USO:
 * 
 * // ValCoin Dashboard
 * import { getProfessorValcoinDashboard } from './api';
 * const data = await getProfessorValcoinDashboard();
 * 
 * // Feedback Dashboard
 * import { getProfessorFeedbackDashboard } from './api';
 * const data = await getProfessorFeedbackDashboard();
 * 
 * // Student Loans (Admin)
 * import { getAllStudentLoans, approveStudentLoan } from './api';
 * const loans = await getAllStudentLoans();
 * await approveStudentLoan(loanId);
 * 
 * // Student Loans (Student)
 * import { applyForStudentLoan, getMyStudentLoans, repayStudentLoan } from './api';
 * await applyForStudentLoan(loanData);
 * const myLoans = await getMyStudentLoans();
 * await repayStudentLoan(loanId, paymentData);
 */
