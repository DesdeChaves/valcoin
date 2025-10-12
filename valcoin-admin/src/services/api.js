import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('API Request: Token retrieved:', token ? 'Present' : 'Missing');
    if (token) {
      config.headers.authorization = `Bearer ${token}`;
      console.log('API Request: Authorization header set:', config.headers.authorization);
    }
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
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

// Subjects
export const getSubjects = () => handleRequest(() => apiClient.get('/subjects'), 'getSubjects');
export const createSubject = (data) => handleRequest(() => apiClient.post('/subjects', data), 'createSubject');
export const updateSubject = (id, data) => handleRequest(() => apiClient.put(`/subjects/${id}`, data), 'updateSubject');
export const softDeleteSubject = (id) => handleRequest(() => apiClient.delete(`/subjects/${id}`), 'softDeleteSubject');

// Enrollments (aluno_disciplina)
export const getEnrollments = () => handleRequest(() => apiClient.get('/enrollments'), 'getEnrollments');
export const getEnrollment = (id) => handleRequest(() => apiClient.get(`/enrollments/${id}`), 'getEnrollment');
export const createEnrollment = (data) => handleRequest(() => apiClient.post('/enrollments', data), 'createEnrollment');
export const updateEnrollment = (id, data) => handleRequest(() => apiClient.put(`/enrollments/${id}`, data), 'updateEnrollment');
export const deleteEnrollment = (id) => handleRequest(() => apiClient.delete(`/enrollments/${id}`), 'deleteEnrollment');

// Disciplina-Turma
export const getDisciplinaTurma = () => handleRequest(() => apiClient.get('/disciplina_turma'), 'getDisciplinaTurma');
export const createDisciplinaTurma = (data) => handleRequest(() => apiClient.post('/disciplina_turma', data), 'createDisciplinaTurma');
export const updateDisciplinaTurma = (id, data) => handleRequest(() => apiClient.put(`/disciplina_turma/${id}`, data), 'updateDisciplinaTurma');

// Other existing functions...
export const login = (credentials) => handleRequest(() => apiClient.post('/login', credentials), 'login');
export const getDashboardMetrics = () => handleRequest(() => apiClient.get('/dashboard'), 'getDashboardMetrics');
export const getClasses = () => handleRequest(() => apiClient.get('/classes'), 'getClasses');
export const createClass = (data) => handleRequest(() => apiClient.post('/classes', data), 'createClass');
export const updateClass = (id, data) => handleRequest(() => apiClient.put(`/classes/${id}`, data), 'updateClass');
export const deleteClass = (id) => handleRequest(() => apiClient.delete(`/classes/${id}`), 'deleteClass');
export const getUsers = () => handleRequest(() => apiClient.get('/users'), 'getUsers');
export const getUnassignedStudents = () => handleRequest(() => apiClient.get('/unassigned-students'), 'getUnassignedStudents');
export const getUser = (id) => handleRequest(() => apiClient.get(`/users/${id}`), 'getUser');
export const createUser = (data) => handleRequest(() => apiClient.post('/users', data), 'createUser');
export const updateUser = (id, data) => handleRequest(() => apiClient.put(`/users/${id}`, data), 'updateUser');
export const deleteUser = (id) => handleRequest(() => apiClient.delete(`/users/${id}`), 'deleteUser');
export const getTransactionGroup = (groupId) => handleRequest(() => apiClient.get(`/transactions/group/${groupId}`), 'getTransactionGroup');
export const getTransactions = (timeFilter = 'all', startDate, endDate) => {
  const params = new URLSearchParams();
  if (timeFilter !== 'all') {
    params.append('timeFilter', timeFilter);
  }
  if (startDate) {
    params.append('startDate', startDate);
  }
  if (endDate) {
    params.append('endDate', endDate);
  }
  return handleRequest(() => apiClient.get(`/transactions?${params.toString()}`), 'getTransactions');
};
export const getTransaction = (id) => handleRequest(() => apiClient.get(`/transactions/${id}`), 'getTransaction');
export const createTransaction = (data) => handleRequest(() => apiClient.post('/transactions', data), 'createTransaction');
export const updateTransaction = (id, data) => handleRequest(() => apiClient.put(`/transactions/${id}`, data), 'updateTransaction');
export const deleteTransaction = (id) => handleRequest(() => apiClient.delete(`/transactions/${id}`), 'deleteTransaction');
export const approveTransaction = (id) => handleRequest(() => apiClient.patch(`/transactions/${id}/approve`), 'approveTransaction');
export const rejectTransaction = (id, motivo = '') => handleRequest(() => apiClient.patch(`/transactions/${id}/reject`, { motivo }), 'rejectTransaction');
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
// Ciclos
export const getAllCiclos = () => handleRequest(() => apiClient.get('/admin/ciclos'), 'getAllCiclos');
export const createCiclo = (data) => handleRequest(() => apiClient.post('/admin/ciclos', data), 'createCiclo');
export const updateCiclo = (id, data) => handleRequest(() => apiClient.put(`/admin/ciclos/${id}`, data), 'updateCiclo');
export const deleteCiclo = (id) => handleRequest(() => apiClient.delete(`/admin/ciclos/${id}`), 'deleteCiclo');
export const getAlunoTurma = () => handleRequest(() => apiClient.get('/aluno_turma'), 'getAlunoTurma');
export const getAlunoTurmaById = (id) => handleRequest(() => apiClient.get(`/aluno_turma/${id}`), 'getAlunoTurmaById');
export const createAlunoTurma = (data) => {
  console.log('API: Creating aluno_turma with data:', data);
  return handleRequest(() => apiClient.post('/aluno_turma', data), 'createAlunoTurma');
};
export const updateAlunoTurma = (id, data) => {
  console.log('API: Updating aluno_turma with ID:', id, 'and data:', data);
  return handleRequest(() => apiClient.put(`/aluno_turma/${id}`, data), 'updateAlunoTurma');
};
export const deleteAlunoTurma = (id) => {
  console.log('API: Deleting aluno_turma with ID:', id);
  return handleRequest(() => apiClient.delete(`/aluno_turma/${id}`), 'deleteAlunoTurma');
};
export const getSettings = () => handleRequest(() => apiClient.get('/settings'), 'getSettings');
export const updateSettings = (data) => handleRequest(() => apiClient.put('/settings', data), 'updateSettings');
export const getSchoolRevenues = () => handleRequest(() => apiClient.get('/school-revenues'), 'getSchoolRevenues');
export const createSchoolRevenue = (data) => handleRequest(() => apiClient.post('/school-revenues', data), 'createSchoolRevenue');
export const updateSchoolRevenue = (id, data) => handleRequest(() => apiClient.put(`/school-revenues/${id}`, data), 'updateSchoolRevenue');
export const deleteSchoolRevenue = (id) => handleRequest(() => apiClient.delete(`/school-revenues/${id}`), 'deleteSchoolRevenue');
export const getProfessorDashboard = () => handleRequest(() => apiClient.get('/professor/dashboard'), 'getProfessorDashboard');
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
export const getStudentDashboard = () => handleRequest(() => apiClient.get('/student/dashboard'), 'getStudentDashboard');
export const createStudentManualPayment = (data) => handleRequest(() => apiClient.post('/student/manual-payment', data), 'createStudentManualPayment');
export const getStudentPayableUsers = () => handleRequest(() => apiClient.get('/student/payable-users'), 'getStudentPayableUsers');
export const getStudentSettings = () => handleRequest(() => apiClient.get('/student/settings'), 'getStudentSettings');
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
export const getStudentTransactionRules = () => handleRequest(() => apiClient.get('/student/transaction-rules'), 'getStudentTransactionRules');

// Student Savings
export const getStudentSavingsAccounts = () => handleRequest(() => apiClient.get('/student/savings-accounts'), 'getStudentSavingsAccounts');
export const createStudentSavingsAccount = (data) => handleRequest(() => apiClient.post('/student/savings-accounts', data), 'createStudentSavingsAccount');
export const getStudentsByClass = (classId) => handleRequest(() => apiClient.get(`/classes/${classId}/students`), 'getStudentsByClass');

// Categories
export const getAllCategories = () => handleRequest(() => apiClient.get('/categories'), 'getAllCategories');
export const createCategory = (data) => handleRequest(() => apiClient.post('/categories', data), 'createCategory');
export const updateCategory = (id, data) => handleRequest(() => apiClient.put(`/categories/${id}`, data), 'updateCategory');
export const deleteCategory = (id) => handleRequest(() => apiClient.delete(`/categories/${id}`), 'deleteCategory');

// Savings Products
export const getSavingsProducts = () => handleRequest(() => apiClient.get('/savings-products'), 'getSavingsProducts');
export const createSavingsProduct = (data) => handleRequest(() => apiClient.post('/savings-products', data), 'createSavingsProduct');
export const updateSavingsProduct = (id, data) => handleRequest(() => apiClient.put(`/savings-products/${id}`, data), 'updateSavingsProduct');
export const deleteSavingsProduct = (id) => handleRequest(() => apiClient.delete(`/savings-products/${id}`), 'deleteSavingsProduct');

// Credit Products
export const getCreditProducts = () => handleRequest(() => apiClient.get('/credit-products'), 'getCreditProducts');
export const createCreditProduct = (data) => handleRequest(() => apiClient.post('/credit-products', data), 'createCreditProduct');
export const updateCreditProduct = (id, data) => handleRequest(() => apiClient.put(`/credit-products/${id}`, data), 'updateCreditProduct');
export const deleteCreditProduct = (id) => handleRequest(() => apiClient.delete(`/credit-products/${id}`), 'deleteCreditProduct');

export const getStudentLoansByStudentId = () => handleRequest(() => apiClient.get('/student/loans/my-loans'), 'getStudentLoansByStudentId');

export const repayLoan = (id, data) => handleRequest(() => apiClient.post(`/student/loans/${id}/repay`, data), 'repayLoan');

// Student Loans
export const applyForLoan = (data) => handleRequest(() => apiClient.post('/student/loans', data), 'applyForLoan');
export const getStudentLoans = () => handleRequest(() => apiClient.get('/student/loans'), 'getStudentLoans');
export const approveLoan = (id) => handleRequest(() => apiClient.patch(`/student/loans/${id}/approve`), 'approveLoan');
export const rejectLoan = (id) => handleRequest(() => apiClient.patch(`/student/loans/${id}/reject`), 'rejectLoan');
export const getStudentHouseHistory = () => handleRequest(() => apiClient.get('/student/house-history'), 'getStudentHouseHistory');
export const getStudentLegadoHistory = () => handleRequest(() => apiClient.get('/student/legado-history'), 'getStudentLegadoHistory');
export const checkProfessorRuleApplicability = (data) => handleRequest(() => apiClient.post('/professor/check-rule-applicability', data), 'checkProfessorRuleApplicability');
export const getAvailableStudentsForHouse = () => handleRequest(() => apiClient.get('/houses/available-students'), 'getAvailableStudentsForHouse');


// Se o seu endpoint for /api/houses, use estas funções no lugar das anteriores:

// Houses
export const getHouses = () => handleRequest(() => apiClient.get('/houses'), 'getHouses');
export const getMyHouse = () => handleRequest(() => apiClient.get('/my-house'), 'getMyHouse');
export const getHouse = (id) => handleRequest(() => apiClient.get(`/houses/${id}`), 'getHouse');
export const createHouse = (data) => handleRequest(() => apiClient.post('/houses', data), 'createHouse');
export const updateHouse = (id, data) => handleRequest(() => apiClient.put(`/houses/${id}`, data), 'updateHouse');
export const deleteHouse = (id) => handleRequest(() => apiClient.delete(`/houses/${id}`), 'deleteHouse');
export const manageHouseMembers = (id, data) => handleRequest(() => apiClient.post(`/houses/${id}/members`, data), 'manageHouseMembers');

export const changePassword = (data) => handleRequest(() => apiClient.post('/user/change-password', data), 'changePassword');
