const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./libs/db');
const { connect: redisClient } = require('./libs/redis');
//const { connect: connectFeedbackRedis } = require('./libs/feedback/redis');

// ============================================================================
// IMPORTS - ValCoin System
// ============================================================================
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  initializeAdminUser,
  getUnassignedStudents,
  updateUserPassword,
  changeUserPassword,
} = require('./libs/users');

const { 
  startInterestPaymentCron, 
  startLoanRepaymentCron, 
  startProfessorSalaryCron, 
  startInactivityFeeCron,  
  testProfessorSalaryManually, 
  runInterestPaymentManually
} = require('./libs/cronJobs');

const {
  getTransactions,
  getTransactionById,
  getTransactionsByGroupId,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
} = require('./libs/transactions');

const {
  getSubjects,
  createSubject,
  updateSubject,
  softDeleteSubject,
} = require('./libs/subjects');

const {
  getEnrollments,
  getEnrollmentById,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
} = require('./libs/enrollments');

const {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getStudentsByClass,
} = require('./libs/classes');

const {
  getTransactionRules,
  createTransactionRule,
  updateTransactionRule,
  deleteTransactionRule,
  applyTransactionRule,
  getApplicableRules,
  checkApplicability,
} = require('./libs/transactionRules');

const {
  getDisciplinaTurma,
  createDisciplinaTurma,
  updateDisciplinaTurma,
} = require('./libs/disciplina_turma');

const {
  getAllCiclos,
  createCiclo,
  updateCiclo,
  deleteCiclo,
} = require('./libs/ciclos');

const {
  getAlunoTurma,
  getAlunoTurmaById,
  createAlunoTurma,
  updateAlunoTurma,
  deleteAlunoTurma,
} = require('./libs/aluno_turma');

const { getSettings, updateSettings } = require('./libs/settings');
const { getSchoolRevenues, createSchoolRevenue, updateSchoolRevenue, deleteSchoolRevenue } = require('./libs/schoolRevenues');
const { getDashboardMetrics } = require('./libs/dashboard');
const { getAllCategories, createCategory, updateCategory, deleteCategory } = require('./libs/categories');
const { getSavingsProducts, createSavingsProduct, updateSavingsProduct, deleteSavingsProduct } = require('./libs/savingsProducts');
const { getCreditProducts, createCreditProduct, updateCreditProduct, deleteCreditProduct } = require('./libs/creditProducts');
const { getHouses, getHouseById, getMyHouse, createHouse, updateHouse, manageHouseMembers, deleteHouse, getAvailableStudents, getStudentHouseHistory } = require('./libs/houses');

const {
  authenticateProfessorJWT,
  getProfessorDashboard,
  createProfessorTransaction,
  getProfessorTapRules,
  createProfessorTapTransaction,
  getProfessorStudentTransactionHistory,
  checkProfessorRuleApplicability,
} = require('./libs/professorTransactions');

const {
  authenticateStudentJWT,
  getStudentDashboard,
  createStudentManualPayment,
  getPayableUsers,
  getStudentSettings,
  getStudentTransactionRules,
  getStudentApplicableRules,
  applyStudentTransactionRule,
  checkStudentRuleApplicability,
  getStudentLegadoHistory,
} = require('./libs/studentTransactions');

const { getStudentSavingsAccounts, createStudentSavingsAccount } = require('./libs/studentSavings');
const { applyForLoan, getStudentLoans, approveLoan, rejectLoan, getStudentLoansByStudentId, repayLoan } = require('./libs/studentLoans');
const { authenticateStoreJWT, createStoreTransaction } = require('./libs/storeTransactions');

// ============================================================================
// IMPORTS - Feedback System
// ============================================================================
const contadoresRoutes = require('./libs/feedback/contadores');
const criteriosRoutes = require('./libs/feedback/criterios');
const dossiesRoutes = require('./libs/feedback/dossies');
const instrumentosRoutes = require('./libs/feedback/instrumentos');
const resultadosRoutes = require('./libs/feedback/resultados');
const momentosAvaliacaoRoutes = require('./libs/feedback/momentos_avaliacao');
const feedbackStudentsRoutes = require('./libs/feedback/students');
const { getProfessorFeedbackDashboard } = require('./libs/feedback/dashboard.js');
const usersRouter = require('./libs/feedback/users');

// ============================================================================
// APP SETUP
// ============================================================================
const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'unified-secret-key';

// ============================================================================
// MIDDLEWARE - Global
// ============================================================================
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(bodyParser.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================
console.log('Starting Unified Server (ValCoin + Feedback)...');
initializeAdminUser();
startInterestPaymentCron();
startLoanRepaymentCron();
startProfessorSalaryCron();
startInactivityFeeCron();
testProfessorSalaryManually();

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT verification failed:', req.path, err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.error('No authorization header:', req.path);
    res.sendStatus(401);
  }
};

const authenticateAnyUserJWT = authenticateJWT;

const authenticateAdminJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      if (user.tipo_utilizador !== 'ADMIN') return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const authenticateAdminOrProfessor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      if (user.tipo_utilizador !== 'ADMIN' && user.tipo_utilizador !== 'PROFESSOR') {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const authorizeProfessor = (req, res, next) => {
  if (!req.user) return res.sendStatus(401);
  if (req.user.tipo_utilizador !== 'PROFESSOR') return res.sendStatus(403);
  next();
};

const authorizeStudent = (req, res, next) => {
  if (!req.user) return res.sendStatus(401);
  if (req.user.tipo_utilizador !== 'ALUNO') return res.sendStatus(403);
  next();
};

// ============================================================================
// HEALTH CHECK - Must be FIRST
// ============================================================================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'unified-server',
    systems: ['valcoin', 'feedback']
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    systems: { valcoin: 'active', feedback: 'active' }
  });
});

// ============================================================================
// AUTHENTICATION ROUTES - Public
// ============================================================================
app.post('/api/login', async (req, res) => {
  const { numero_mecanografico, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE numero_mecanografico = $1', [numero_mecanografico]);
    if (rows.length > 0) {
      const user = rows[0];
      if (bcrypt.compareSync(password, user.password_hash)) {
        const accessToken = jwt.sign(
          { 
            id: user.id, 
            numero_mecanografico: user.numero_mecanografico, 
            tipo_utilizador: user.tipo_utilizador 
          }, 
          JWT_SECRET, 
          { expiresIn: '8h' }
        );
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ accessToken, user: userWithoutPassword });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user', authenticateAnyUserJWT, (req, res) => {
  res.json(req.user);
});

app.post('/api/user/change-password', authenticateAnyUserJWT, changeUserPassword);

// ============================================================================
// ROUTER: STORE
// ============================================================================
const storeRouter = express.Router();
storeRouter.post('/buy', authenticateStoreJWT, createStoreTransaction);
app.use('/api/store', storeRouter);

// ============================================================================
// ROUTER: PROFESSOR (ValCoin)
// ============================================================================
const professorValcoinRouter = express.Router();
professorValcoinRouter.use(authenticateProfessorJWT);
professorValcoinRouter.get('/valcoin-dashboard', getProfessorDashboard);
professorValcoinRouter.post('/transactions', createProfessorTransaction);
professorValcoinRouter.get('/tap-rules', getProfessorTapRules);
professorValcoinRouter.post('/tap-transactions', createProfessorTapTransaction);
professorValcoinRouter.get('/student-transaction-history', getProfessorStudentTransactionHistory);
professorValcoinRouter.post('/check-rule-applicability', checkProfessorRuleApplicability);
app.use('/api/professor', professorValcoinRouter);

// ============================================================================
// ROUTER: STUDENT (ValCoin)
// ============================================================================
const studentValcoinRouter = express.Router();
studentValcoinRouter.use(authenticateStudentJWT);
studentValcoinRouter.get('/dashboard', getStudentDashboard);
studentValcoinRouter.post('/manual-payment', createStudentManualPayment);
studentValcoinRouter.get('/payable-users', getPayableUsers);
studentValcoinRouter.get('/settings', getStudentSettings);
studentValcoinRouter.get('/transaction-rules', getStudentTransactionRules);
studentValcoinRouter.get('/transaction-rules/applicable', getStudentApplicableRules);
studentValcoinRouter.post('/transaction-rules/apply', applyStudentTransactionRule);
studentValcoinRouter.post('/transaction-rules/check-applicability', checkStudentRuleApplicability);
studentValcoinRouter.get('/house-history', getStudentHouseHistory);
studentValcoinRouter.get('/legado-history', getStudentLegadoHistory);
studentValcoinRouter.get('/savings-accounts', getStudentSavingsAccounts);
studentValcoinRouter.post('/savings-accounts', createStudentSavingsAccount);
studentValcoinRouter.post('/loans', applyForLoan);
studentValcoinRouter.get('/loans/my-loans', getStudentLoansByStudentId);
studentValcoinRouter.post('/loans/:id/repay', repayLoan);
studentValcoinRouter.get('/feedback-dashboard', (req, res) => {
  res.json({ 
    message: `Welcome Student ${req.user.numero_mecanografico}`, 
    system: 'feedback',
    user: req.user
  });
});
app.use('/api/student', studentValcoinRouter);

// ============================================================================
// ROUTER: ADMIN (ValCoin)
// ============================================================================
const adminRouter = express.Router();

// Dashboard
adminRouter.get('/dashboard', authenticateAdminOrProfessor, getDashboardMetrics);

// Users
adminRouter.get('/users', authenticateAdminOrProfessor, getUsers);
adminRouter.get('/unassigned-students', authenticateAnyUserJWT, getUnassignedStudents);
adminRouter.get('/users/:id', authenticateAnyUserJWT, getUserById);
adminRouter.post('/users', authenticateAdminOrProfessor, createUser);
adminRouter.put('/users/:id', authenticateAdminOrProfessor, updateUser);
adminRouter.put('/users/:id/password', authenticateAdminJWT, updateUserPassword);
adminRouter.delete('/users/:id', authenticateAdminOrProfessor, deleteUser);

// Transactions
adminRouter.get('/transactions', authenticateAdminOrProfessor, getTransactions);
adminRouter.get('/transactions/:id', authenticateAdminOrProfessor, getTransactionById);
adminRouter.get('/transactions/group/:groupId', authenticateAdminOrProfessor, getTransactionsByGroupId);
adminRouter.post('/transactions', authenticateAdminOrProfessor, createTransaction);
adminRouter.put('/transactions/:id', authenticateAdminOrProfessor, updateTransaction);
adminRouter.delete('/transactions/:id', authenticateAdminOrProfessor, deleteTransaction);
adminRouter.patch('/transactions/:id/approve', authenticateAdminOrProfessor, approveTransaction);
adminRouter.patch('/transactions/:id/reject', authenticateAdminOrProfessor, rejectTransaction);

// Subjects
adminRouter.get('/subjects', authenticateAdminOrProfessor, getSubjects);
adminRouter.post('/subjects', authenticateAdminOrProfessor, createSubject);
adminRouter.put('/subjects/:id', authenticateAdminOrProfessor, updateSubject);
adminRouter.delete('/subjects/:id', authenticateAdminOrProfessor, softDeleteSubject);

// Enrollments
adminRouter.get('/enrollments', authenticateAdminOrProfessor, getEnrollments);
adminRouter.get('/enrollments/:id', authenticateAdminOrProfessor, getEnrollmentById);
adminRouter.post('/enrollments', authenticateAdminOrProfessor, createEnrollment);
adminRouter.put('/enrollments/:id', authenticateAdminOrProfessor, updateEnrollment);
adminRouter.delete('/enrollments/:id', authenticateAdminOrProfessor, deleteEnrollment);

// Classes
adminRouter.get('/classes', authenticateAnyUserJWT, getClasses);
adminRouter.get('/classes/:id/students', authenticateAnyUserJWT, getStudentsByClass);
adminRouter.post('/classes', authenticateAdminOrProfessor, createClass);
adminRouter.put('/classes/:id', authenticateAdminOrProfessor, updateClass);
adminRouter.delete('/classes/:id', authenticateAdminOrProfessor, deleteClass);

// Transaction Rules
adminRouter.get('/transactionRules', authenticateAdminOrProfessor, getTransactionRules);
adminRouter.post('/transactionRules', authenticateAdminOrProfessor, createTransactionRule);
adminRouter.put('/transactionRules/:id', authenticateAdminOrProfessor, updateTransactionRule);
adminRouter.delete('/transactionRules/:id', authenticateAdminOrProfessor, deleteTransactionRule);
adminRouter.post('/applyTransactionRule', authenticateAdminOrProfessor, applyTransactionRule);
adminRouter.post('/transaction-rules/apply', authenticateAdminOrProfessor, applyTransactionRule);
adminRouter.get('/transaction-rules/applicable', authenticateAdminOrProfessor, getApplicableRules);
adminRouter.post('/transaction-rules/check-applicability', authenticateAdminOrProfessor, checkApplicability);

// Disciplina Turma
adminRouter.get('/disciplina_turma', authenticateAdminOrProfessor, getDisciplinaTurma);
adminRouter.post('/disciplina_turma', authenticateAdminOrProfessor, createDisciplinaTurma);
adminRouter.put('/disciplina_turma/:id', authenticateAdminOrProfessor, updateDisciplinaTurma);

// Ciclos
adminRouter.get('/ciclos', authenticateAdminOrProfessor, getAllCiclos);
adminRouter.post('/ciclos', authenticateAdminOrProfessor, createCiclo);
adminRouter.put('/ciclos/:id', authenticateAdminOrProfessor, updateCiclo);
adminRouter.delete('/ciclos/:id', authenticateAdminOrProfessor, deleteCiclo);
adminRouter.post('/run-interest-payment', authenticateAdminJWT, async (req, res) => {
  try {
    const result = await runInterestPaymentManually();
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Aluno Turma
adminRouter.get('/aluno_turma', authenticateAdminOrProfessor, getAlunoTurma);
adminRouter.get('/aluno_turma/:id', authenticateAdminOrProfessor, getAlunoTurmaById);
adminRouter.post('/aluno_turma', authenticateAdminOrProfessor, createAlunoTurma);
adminRouter.put('/aluno_turma/:id', authenticateAdminOrProfessor, updateAlunoTurma);
adminRouter.delete('/aluno_turma/:id', authenticateAdminOrProfessor, deleteAlunoTurma);

// Settings
adminRouter.get('/settings', authenticateAnyUserJWT, getSettings);
adminRouter.put('/settings', authenticateAdminOrProfessor, updateSettings);

// School Revenues
adminRouter.get('/school-revenues', authenticateAdminOrProfessor, getSchoolRevenues);
adminRouter.post('/school-revenues', authenticateAdminOrProfessor, createSchoolRevenue);
adminRouter.put('/school-revenues/:id', authenticateAdminOrProfessor, updateSchoolRevenue);
adminRouter.delete('/school-revenues/:id', authenticateAdminOrProfessor, deleteSchoolRevenue);

// Categories
adminRouter.get('/categories', authenticateAdminOrProfessor, getAllCategories);
adminRouter.post('/categories', authenticateAdminOrProfessor, createCategory);
adminRouter.put('/categories/:id', authenticateAdminOrProfessor, updateCategory);
adminRouter.delete('/categories/:id', authenticateAdminOrProfessor, deleteCategory);

// Savings Products
adminRouter.get('/savings-products', authenticateAnyUserJWT, getSavingsProducts);
adminRouter.post('/savings-products', authenticateAdminOrProfessor, createSavingsProduct);
adminRouter.put('/savings-products/:id', authenticateAdminOrProfessor, updateSavingsProduct);
adminRouter.delete('/savings-products/:id', authenticateAdminOrProfessor, deleteSavingsProduct);

// Credit Products
adminRouter.get('/credit-products', authenticateAnyUserJWT, getCreditProducts);
adminRouter.post('/credit-products', authenticateAdminOrProfessor, createCreditProduct);
adminRouter.put('/credit-products/:id', authenticateAdminOrProfessor, updateCreditProduct);
adminRouter.delete('/credit-products/:id', authenticateAdminOrProfessor, deleteCreditProduct);

// Houses
adminRouter.get('/houses', authenticateAnyUserJWT, getHouses);
adminRouter.get('/houses/available-students', authenticateAnyUserJWT, getAvailableStudents);
adminRouter.get('/houses/:id', authenticateAnyUserJWT, getHouseById);
adminRouter.get('/my-house', authenticateAnyUserJWT, getMyHouse);
adminRouter.post('/houses', authenticateAdminOrProfessor, createHouse);
adminRouter.put('/houses/:id', authenticateAnyUserJWT, updateHouse);
adminRouter.post('/houses/:id/members', authenticateAnyUserJWT, manageHouseMembers);
adminRouter.delete('/houses/:id', authenticateAdminOrProfessor, deleteHouse);

// Student Loans (Admin)
adminRouter.get('/student-loans', authenticateAdminOrProfessor, getStudentLoans);
adminRouter.patch('/student-loans/:id/approve', authenticateAdminOrProfessor, approveLoan);
adminRouter.patch('/student-loans/:id/reject', authenticateAdminOrProfessor, rejectLoan);

app.use('/api/admin', adminRouter);

// Legacy routes for backwards compatibility
app.get('/api/dashboard', authenticateAdminOrProfessor, getDashboardMetrics);
app.get('/api/users', authenticateAdminOrProfessor, getUsers);
app.get('/api/unassigned-students', authenticateAnyUserJWT, getUnassignedStudents);
app.get('/api/users/:id', authenticateAnyUserJWT, getUserById);
app.post('/api/users', authenticateAdminOrProfessor, createUser);
app.put('/api/users/:id', authenticateAdminOrProfessor, updateUser);
app.delete('/api/users/:id', authenticateAdminOrProfessor, deleteUser);
app.get('/api/transactions', authenticateAdminOrProfessor, getTransactions);
app.get('/api/transactions/:id', authenticateAdminOrProfessor, getTransactionById);
app.get('/api/transactions/group/:groupId', authenticateAdminOrProfessor, getTransactionsByGroupId);
app.post('/api/transactions', authenticateAdminOrProfessor, createTransaction);
app.put('/api/transactions/:id', authenticateAdminOrProfessor, updateTransaction);
app.delete('/api/transactions/:id', authenticateAdminOrProfessor, deleteTransaction);
app.patch('/api/transactions/:id/approve', authenticateAdminOrProfessor, approveTransaction);
app.patch('/api/transactions/:id/reject', authenticateAdminOrProfessor, rejectTransaction);
app.get('/api/subjects', authenticateAdminOrProfessor, getSubjects);
app.post('/api/subjects', authenticateAdminOrProfessor, createSubject);
app.put('/api/subjects/:id', authenticateAdminOrProfessor, updateSubject);
app.delete('/api/subjects/:id', authenticateAdminOrProfessor, softDeleteSubject);
app.get('/api/enrollments', authenticateAdminOrProfessor, getEnrollments);
app.get('/api/enrollments/:id', authenticateAdminOrProfessor, getEnrollmentById);
app.post('/api/enrollments', authenticateAdminOrProfessor, createEnrollment);
app.put('/api/enrollments/:id', authenticateAdminOrProfessor, updateEnrollment);
app.delete('/api/enrollments/:id', authenticateAdminOrProfessor, deleteEnrollment);
app.get('/api/classes', authenticateAnyUserJWT, getClasses);
app.get('/api/classes/:id/students', authenticateAnyUserJWT, getStudentsByClass);
app.post('/api/classes', authenticateAdminOrProfessor, createClass);
app.put('/api/classes/:id', authenticateAdminOrProfessor, updateClass);
app.delete('/api/classes/:id', authenticateAdminOrProfessor, deleteClass);
app.get('/api/transactionRules', authenticateAdminOrProfessor, getTransactionRules);
app.post('/api/transactionRules', authenticateAdminOrProfessor, createTransactionRule);
app.put('/api/transactionRules/:id', authenticateAdminOrProfessor, updateTransactionRule);
app.delete('/api/transactionRules/:id', authenticateAdminOrProfessor, deleteTransactionRule);
app.post('/api/applyTransactionRule', authenticateAdminOrProfessor, applyTransactionRule);
app.post('/api/transaction-rules/apply', authenticateAdminOrProfessor, applyTransactionRule);
app.get('/api/transaction-rules/applicable', authenticateAdminOrProfessor, getApplicableRules);
app.post('/api/transaction-rules/check-applicability', authenticateAdminOrProfessor, checkApplicability);
app.get('/api/disciplina_turma', authenticateAdminOrProfessor, getDisciplinaTurma);
app.post('/api/disciplina_turma', authenticateAdminOrProfessor, createDisciplinaTurma);
app.put('/api/disciplina_turma/:id', authenticateAdminOrProfessor, updateDisciplinaTurma);
app.get('/api/aluno_turma', authenticateAdminOrProfessor, getAlunoTurma);
app.get('/api/aluno_turma/:id', authenticateAdminOrProfessor, getAlunoTurmaById);
app.post('/api/aluno_turma', authenticateAdminOrProfessor, createAlunoTurma);
app.put('/api/aluno_turma/:id', authenticateAdminOrProfessor, updateAlunoTurma);
app.delete('/api/aluno_turma/:id', authenticateAdminOrProfessor, deleteAlunoTurma);
app.get('/api/settings', authenticateAnyUserJWT, getSettings);
app.put('/api/settings', authenticateAdminOrProfessor, updateSettings);
app.get('/api/school-revenues', authenticateAdminOrProfessor, getSchoolRevenues);
app.post('/api/school-revenues', authenticateAdminOrProfessor, createSchoolRevenue);
app.put('/api/school-revenues/:id', authenticateAdminOrProfessor, updateSchoolRevenue);
app.delete('/api/school-revenues/:id', authenticateAdminOrProfessor, deleteSchoolRevenue);
app.get('/api/categories', authenticateAdminOrProfessor, getAllCategories);
app.post('/api/categories', authenticateAdminOrProfessor, createCategory);
app.put('/api/categories/:id', authenticateAdminOrProfessor, updateCategory);
app.delete('/api/categories/:id', authenticateAdminOrProfessor, deleteCategory);
app.get('/api/savings-products', authenticateAnyUserJWT, getSavingsProducts);
app.post('/api/savings-products', authenticateAdminOrProfessor, createSavingsProduct);
app.put('/api/savings-products/:id', authenticateAdminOrProfessor, updateSavingsProduct);
app.delete('/api/savings-products/:id', authenticateAdminOrProfessor, deleteSavingsProduct);
app.get('/api/credit-products', authenticateAnyUserJWT, getCreditProducts);
app.post('/api/credit-products', authenticateAdminOrProfessor, createCreditProduct);
app.put('/api/credit-products/:id', authenticateAdminOrProfessor, updateCreditProduct);
app.delete('/api/credit-products/:id', authenticateAdminOrProfessor, deleteCreditProduct);
app.get('/api/houses', authenticateAnyUserJWT, getHouses);
app.get('/api/houses/available-students', authenticateAnyUserJWT, getAvailableStudents);
app.get('/api/houses/:id', authenticateAnyUserJWT, getHouseById);
app.get('/api/my-house', authenticateAnyUserJWT, getMyHouse);
app.post('/api/houses', authenticateAdminOrProfessor, createHouse);
app.put('/api/houses/:id', authenticateAnyUserJWT, updateHouse);
app.post('/api/houses/:id/members', authenticateAnyUserJWT, manageHouseMembers);
app.delete('/api/houses/:id', authenticateAdminOrProfessor, deleteHouse);

// ============================================================================
// ROUTER: FEEDBACK SYSTEM (Professor)
// ============================================================================
const feedbackRouter = express.Router();

// Apply authentication to all feedback routes
feedbackRouter.use(authenticateJWT);

// Dashboard - Professor only
feedbackRouter.get('/professor/feedback-dashboard', authorizeProfessor, getProfessorFeedbackDashboard);

// Student lists - Professor only
feedbackRouter.get('/studentsprofessor/disciplina/:disciplineId/alunos', authorizeProfessor, async (req, res) => {
  try {
    const { disciplineId } = req.params;
    console.log('📋 Fetching students for discipline:', disciplineId);
    console.log('👤 Requested by professor:', req.user.id);

    const query = `
      WITH selected_discipline AS (
        SELECT disciplina_turma_id
        FROM professor_disciplina_turma
        WHERE id = $1
      )
      SELECT u.id, u.nome, u.numero_mecanografico
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      WHERE ad.disciplina_turma_id = (SELECT disciplina_turma_id FROM selected_discipline)
        AND u.tipo_utilizador = 'ALUNO'
        AND u.ativo = true
      ORDER BY u.nome;
    `;

    const { rows } = await db.query(query, [disciplineId]);
    console.log(`✅ Found ${rows.length} students`);
    res.json(rows);
    
  } catch (error) {
    console.error('❌ Error fetching students by discipline:', error);
    res.status(500).json({ 
      error: 'Failed to fetch students',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Student grades - All grades - Professor only
feedbackRouter.get('/studentprofessor/:studentId/all-grades', authorizeProfessor, async (req, res) => {
  const { studentId } = req.params;
  console.log('📊 Fetching ALL grades for student:', studentId);
  
  try {
    const result = await db.query(`
      SELECT
        d.id as dossier_id,
        d.nome as dossier_nome,
        s.nome as disciplina_nome,
        ma.id as momento_id,
        ma.nome as momento_nome,
        nfm.nota,
        ma.created_at as data_avaliacao
      FROM
        nota_final_momento nfm
      JOIN
        momento_avaliacao ma ON nfm.momento_avaliacao_id = ma.id
      JOIN
        dossie d ON ma.dossie_id = d.id
      JOIN
        professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
      JOIN
        disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
      JOIN
        subjects s ON dt.disciplina_id = s.id
      WHERE
        nfm.aluno_id = $1
      ORDER BY
        s.nome, d.nome, ma.created_at DESC;
    `, [studentId]);
    
    console.log(`✅ Found ${result.rows.length} grades for student ${studentId}`);
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching all student grades:', error);
    res.status(500).json({ 
      error: 'Failed to fetch all student grades',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Student grades by dossier - Professor only
feedbackRouter.get('/studentprofessor/:studentId/dossier/:dossierId/grades', authorizeProfessor, async (req, res) => {
  const { studentId, dossierId } = req.params;
  console.log(`📊 Fetching grades for student ${studentId} in dossier ${dossierId}`);
  
  try {
    const result = await db.query(`
      SELECT 
        ma.id as momento_id, 
        ma.nome as momento_nome, 
        nfm.nota, 
        ma.created_at as data_avaliacao, 
        s.nome as disciplina_nome
      FROM momento_avaliacao ma
      LEFT JOIN nota_final_momento nfm ON ma.id = nfm.momento_avaliacao_id AND nfm.aluno_id = $1
      JOIN dossie d ON ma.dossie_id = d.id
      JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
      JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
      JOIN subjects s ON dt.disciplina_id = s.id
      WHERE ma.dossie_id = $2
      ORDER BY ma.created_at DESC;
    `, [studentId, dossierId]);
    
    console.log(`✅ Found ${result.rows.length} grades for student ${studentId} in dossier ${dossierId}`);
    res.status(200).json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching student grades by dossier:', error);
    res.status(500).json({ 
      error: 'Failed to fetch grades by dossier',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Sub-routers for specific feedback resources - All require professor authorization
feedbackRouter.use('/contadores', authorizeProfessor, contadoresRoutes);
feedbackRouter.use('/criterios', authorizeProfessor, criteriosRoutes);
feedbackRouter.use('/dossies', authorizeProfessor, dossiesRoutes);
feedbackRouter.use('/instrumentos', authorizeProfessor, instrumentosRoutes);
feedbackRouter.use('/resultados', authorizeProfessor, resultadosRoutes);
feedbackRouter.use('/momentos-avaliacao', authorizeProfessor, momentosAvaliacaoRoutes);
feedbackRouter.use('/users', authorizeProfessor, usersRouter);

// Student routes - Student authorization
feedbackRouter.use('/students', authorizeStudent, feedbackStudentsRoutes);

// Mount feedback router
app.use('/api/feedback', feedbackRouter);

// ============================================================================
// ERROR HANDLING
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// 404 HANDLER - Must be LAST
// ============================================================================
app.use((req, res) => {
  console.warn(`⚠️  404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ============================================================================
// START SERVER
// ============================================================================
redisClient()
  .then(() => {
    app.listen(port, () => {
      console.log('=====================================');
      console.log(`✔ Unified Server running on port ${port}`);
      console.log(`✔ ValCoin System: Active`);
      console.log(`✔ Feedback System: Active`);
      console.log(`✔ Health check: http://localhost:${port}/health`);
      console.log('=====================================');
    });
  })
  .catch(err => {
    console.error('Failed to connect to Redis, server not started:', err);
    process.exit(1);
  });

module.exports = app;
