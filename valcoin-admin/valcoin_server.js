const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./libs/db');
const { connect, redisClient } = require('./libs/redis');

// ============================================================================
// IMPORTS - ValCoin (Admin/Finance System)
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
// IMPORTS - Feedback/Assessment System (libs/feedback/)
// ============================================================================
const contadoresRoutes = require('./libs/feedback/contadores');
const criteriosRoutes = require('./libs/feedback/criterios');
const dossiesRoutes = require('./libs/feedback/dossies');
const instrumentosRoutes = require('./libs/feedback/instrumentos');
const resultadosRoutes = require('./libs/feedback/resultados');
const momentosAvaliacaoRoutes = require('./libs/feedback/momentos_avaliacao');
const feedbackStudentsRoutes = require('./libs/feedback/students');

const { getProfessorFeedbackDashboard } = require('./libs/feedback/dashboard.js');

// Users router for feedback-specific routes (includes professor assessment routes)
const usersRouter = require('./libs/feedback/users');

// ============================================================================
// APP SETUP
// ============================================================================
const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'unified-secret-key';

// Middleware
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

// Generic JWT authentication - sets req.user if valid token
const authenticateJWT = (req, res, next) => {
  console.log('authenticateJWT called for:', req.path);
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT verification failed for:', req.path, err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      console.log('JWT authenticated user:', user.tipo_utilizador, 'for:', req.path);
      next();
    });
  } else {
    console.error('No authorization header provided for:', req.path);
    res.sendStatus(401);
  }
};

// Requires any authenticated user
const authenticateAnyUserJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Admin only
const authenticateAdminJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      if (user.tipo_utilizador !== 'ADMIN') {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Admin or Professor
const authenticateAdminOrProfessor = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
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

// Professor only
const authorizeProfessor = (req, res, next) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  if (req.user.tipo_utilizador !== 'PROFESSOR') {
    return res.sendStatus(403);
  }
  next();
};

// Student only
const authorizeStudent = (req, res, next) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  if (req.user.tipo_utilizador !== 'ALUNO') {
    return res.sendStatus(403);
  }
  next();
};

// ============================================================================
// AUTHENTICATION ROUTES (Unified Login)
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
// VALCOIN ROUTES - Store
// ============================================================================

app.post('/api/store/buy', authenticateStoreJWT, createStoreTransaction);

// ============================================================================
// VALCOIN ROUTES - Professor
// ============================================================================

// Unified Professor Dashboard
app.get('/api/professor/dashboard', authenticateProfessorJWT, async (req, res) => {
  try {
    // Create mock request/response objects to call the existing functions
    const valcoinReq = { user: req.user };
    const feedbackReq = { user: req.user };
    let valcoinData = {};
    let feedbackData = {};
    let errorOccurred = false;

    // Create a mock response object to capture the JSON data
    const valcoinRes = {
      json: (data) => { valcoinData = data; },
      status: (code) => {
        console.error(`ValCoin dashboard function failed with status ${code}`);
        errorOccurred = true;
        return { json: (err) => console.error(err) };
      }
    };
    const feedbackRes = {
      json: (data) => { feedbackData = data; },
      status: (code) => {
        console.error(`Feedback dashboard function failed with status ${code}`);
        errorOccurred = true;
        return { json: (err) => console.error(err) };
      }
    };

    // Call both dashboard functions in parallel
    await Promise.all([
      getProfessorDashboard(valcoinReq, valcoinRes),
      getProfessorFeedbackDashboard(feedbackReq, feedbackRes)
    ]);

    if (errorOccurred) {
      return res.status(500).json({ error: 'Failed to retrieve complete dashboard data.' });
    }

    // Combine the results
    const unifiedDashboardData = {
      valcoin: valcoinData,
      feedback: feedbackData,
    };

    res.json(unifiedDashboardData);
  } catch (err) {
    console.error('Error creating unified professor dashboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/professor/valcoin-dashboard', authenticateProfessorJWT, getProfessorDashboard);
app.post('/api/professor/transactions', authenticateProfessorJWT, createProfessorTransaction);
app.get('/api/professor/tap-rules', authenticateProfessorJWT, getProfessorTapRules);
app.post('/api/professor/tap-transactions', authenticateProfessorJWT, createProfessorTapTransaction);
app.get('/api/professor/student-transaction-history', authenticateProfessorJWT, getProfessorStudentTransactionHistory);
app.post('/api/professor/check-rule-applicability', authenticateProfessorJWT, checkProfessorRuleApplicability);

// ============================================================================
// VALCOIN ROUTES - Student
// ============================================================================

app.get('/api/student/dashboard', authenticateStudentJWT, getStudentDashboard);
app.post('/api/student/manual-payment', authenticateStudentJWT, createStudentManualPayment);
app.get('/api/student/payable-users', authenticateStudentJWT, getPayableUsers);
app.get('/api/student/settings', authenticateStudentJWT, getStudentSettings);
app.get('/api/student/transaction-rules', authenticateStudentJWT, getStudentTransactionRules);
app.get('/api/student/transaction-rules/applicable', authenticateStudentJWT, getStudentApplicableRules);
app.post('/api/student/transaction-rules/apply', authenticateStudentJWT, applyStudentTransactionRule);
app.post('/api/student/transaction-rules/check-applicability', authenticateStudentJWT, checkStudentRuleApplicability);
app.get('/api/student/house-history', authenticateStudentJWT, getStudentHouseHistory);
app.get('/api/student/legado-history', authenticateStudentJWT, getStudentLegadoHistory);

// Student Savings
app.get('/api/student/savings-accounts', authenticateStudentJWT, getStudentSavingsAccounts);
app.post('/api/student/savings-accounts', authenticateStudentJWT, createStudentSavingsAccount);

// Student Loans
app.post('/api/student/loans', authenticateStudentJWT, applyForLoan);
app.get('/api/student/loans/my-loans', authenticateStudentJWT, getStudentLoansByStudentId);
app.post('/api/student/loans/:id/repay', authenticateStudentJWT, repayLoan);

// Student Loans (Admin)
app.get('/api/admin/student-loans', authenticateAdminOrProfessor, getStudentLoans);
app.patch('/api/admin/student-loans/:id/approve', authenticateAdminOrProfessor, approveLoan);
app.patch('/api/admin/student-loans/:id/reject', authenticateAdminOrProfessor, rejectLoan);

// ============================================================================
// FEEDBACK ROUTES - Professor Assessment System
// ============================================================================

// Dashboard route
app.get('/api/feedback/professor/feedback-dashboard', authenticateJWT, authorizeProfessor, getProfessorFeedbackDashboard);


app.get('/api/feedback/studentsprofessor/disciplina/:disciplineId/alunos', 
  authenticateJWT, 
  authorizeProfessor,  // <-- PROFESSOR pode acessar
  async (req, res) => {
    try {
      const { disciplineId } = req.params;
      console.log('🔍 Fetching students for discipline:', disciplineId);
      console.log('👤 Requested by professor:', req.user.id);

      // Query para buscar alunos matriculados na disciplina_turma
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
  }
);


// Rota 1: Buscar todas as notas de um aluno em todos os dossiês
app.get('/api/feedback/studentprofessor/:studentId/all-grades', 
  authenticateJWT,
  authorizeProfessor,
  async (req, res) => {
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
      console.error('Error details:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch all student grades',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Rota 2: Buscar notas de um aluno em um dossiê específico
app.get('/api/feedback/studentprofessor/:studentId/dossier/:dossierId/grades', 
  authenticateJWT,
  authorizeProfessor,
  async (req, res) => {
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
      console.error('Error details:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch grades by dossier',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);


// Mount feedback system routes (all require professor authentication)
app.use('/api/feedback/contadores', authenticateJWT, authorizeProfessor, contadoresRoutes);
app.use('/api/feedback/criterios', authenticateJWT, authorizeProfessor, criteriosRoutes);
app.use('/api/feedback/dossies', authenticateJWT, authorizeProfessor, dossiesRoutes);
app.use('/api/feedback/instrumentos', authenticateJWT, authorizeProfessor, instrumentosRoutes);
app.use('/api/feedback/resultados', authenticateJWT, authorizeProfessor, resultadosRoutes);
app.use('/api/feedback/momentos-avaliacao', authenticateJWT, authorizeProfessor, momentosAvaliacaoRoutes);

// Professor-specific user routes (disciplines, dossiers, criteria, instruments, counters)
// These routes are defined in users.js router and include:
// - GET /:id/disciplines
// - GET /:userId/dossiers/all
// - GET /:userId/criteria/all
// - GET /:userId/instruments/all
// - GET /:userId/counters/all
app.use('/api/feedback/users', authenticateJWT, authorizeProfessor, usersRouter);

// ============================================================================
// FEEDBACK ROUTES - Student Assessment View
// ============================================================================

app.get('/api/student/feedback-dashboard', authenticateJWT, authorizeStudent, (req, res) => {
  res.json({ 
    message: `Welcome Student ${req.user.numero_mecanografico}`, 
    system: 'feedback',
    user: req.user
  });
});

app.use('/api/feedback/students', authenticateJWT, authorizeStudent, feedbackStudentsRoutes);

// ============================================================================
// ADMIN ROUTES - Dashboard
// ============================================================================

app.get('/api/dashboard', authenticateAdminOrProfessor, getDashboardMetrics);

// ============================================================================
// ADMIN ROUTES - Users
// ============================================================================

app.get('/api/users', authenticateAdminOrProfessor, getUsers);
app.get('/api/unassigned-students', authenticateAnyUserJWT, getUnassignedStudents);
app.get('/api/users/:id', authenticateAnyUserJWT, getUserById);
app.post('/api/users', authenticateAdminOrProfessor, createUser);
app.put('/api/users/:id', authenticateAdminOrProfessor, updateUser);
app.put('/api/admin/users/:id/password', authenticateAdminJWT, updateUserPassword);
app.delete('/api/users/:id', authenticateAdminOrProfessor, deleteUser);

// ============================================================================
// ADMIN ROUTES - Transactions
// ============================================================================

app.get('/api/transactions', authenticateAdminOrProfessor, getTransactions);
app.get('/api/transactions/:id', authenticateAdminOrProfessor, getTransactionById);
app.get('/api/transactions/group/:groupId', authenticateAdminOrProfessor, getTransactionsByGroupId);
app.post('/api/transactions', authenticateAdminOrProfessor, createTransaction);
app.put('/api/transactions/:id', authenticateAdminOrProfessor, updateTransaction);
app.delete('/api/transactions/:id', authenticateAdminOrProfessor, deleteTransaction);
app.patch('/api/transactions/:id/approve', authenticateAdminOrProfessor, approveTransaction);
app.patch('/api/transactions/:id/reject', authenticateAdminOrProfessor, rejectTransaction);

// ============================================================================
// ADMIN ROUTES - Subjects
// ============================================================================

app.get('/api/subjects', authenticateAdminOrProfessor, getSubjects);
app.post('/api/subjects', authenticateAdminOrProfessor, createSubject);
app.put('/api/subjects/:id', authenticateAdminOrProfessor, updateSubject);
app.delete('/api/subjects/:id', authenticateAdminOrProfessor, softDeleteSubject);

// ============================================================================
// ADMIN ROUTES - Enrollments
// ============================================================================

app.get('/api/enrollments', authenticateAdminOrProfessor, getEnrollments);
app.get('/api/enrollments/:id', authenticateAdminOrProfessor, getEnrollmentById);
app.post('/api/enrollments', authenticateAdminOrProfessor, createEnrollment);
app.put('/api/enrollments/:id', authenticateAdminOrProfessor, updateEnrollment);
app.delete('/api/enrollments/:id', authenticateAdminOrProfessor, deleteEnrollment);

// ============================================================================
// ADMIN ROUTES - Classes
// ============================================================================

app.get('/api/classes', authenticateAnyUserJWT, getClasses);
app.get('/api/classes/:id/students', authenticateAnyUserJWT, getStudentsByClass);
app.post('/api/classes', authenticateAdminOrProfessor, createClass);
app.put('/api/classes/:id', authenticateAdminOrProfessor, updateClass);
app.delete('/api/classes/:id', authenticateAdminOrProfessor, deleteClass);

// ============================================================================
// ADMIN ROUTES - Transaction Rules
// ============================================================================

app.get('/api/transactionRules', authenticateAdminOrProfessor, getTransactionRules);
app.post('/api/transactionRules', authenticateAdminOrProfessor, createTransactionRule);
app.put('/api/transactionRules/:id', authenticateAdminOrProfessor, updateTransactionRule);
app.delete('/api/transactionRules/:id', authenticateAdminOrProfessor, deleteTransactionRule);
app.post('/api/applyTransactionRule', authenticateAdminOrProfessor, applyTransactionRule);
app.post('/api/transaction-rules/apply', authenticateAdminOrProfessor, applyTransactionRule);
app.get('/api/transaction-rules/applicable', authenticateAdminOrProfessor, getApplicableRules);
app.post('/api/transaction-rules/check-applicability', authenticateAdminOrProfessor, checkApplicability);

// ============================================================================
// ADMIN ROUTES - Disciplina Turma
// ============================================================================

app.get('/api/disciplina_turma', authenticateAdminOrProfessor, getDisciplinaTurma);
app.post('/api/disciplina_turma', authenticateAdminOrProfessor, createDisciplinaTurma);
app.put('/api/disciplina_turma/:id', authenticateAdminOrProfessor, updateDisciplinaTurma);

// ============================================================================
// ADMIN ROUTES - Ciclos
// ============================================================================

app.get('/api/admin/ciclos', authenticateAdminOrProfessor, getAllCiclos);
app.post('/api/admin/ciclos', authenticateAdminOrProfessor, createCiclo);
app.put('/api/admin/ciclos/:id', authenticateAdminOrProfessor, updateCiclo);
app.delete('/api/admin/ciclos/:id', authenticateAdminOrProfessor, deleteCiclo);
app.post('/api/admin/run-interest-payment', authenticateAdminJWT, async (req, res) => {
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

// ============================================================================
// ADMIN ROUTES - Aluno Turma
// ============================================================================

app.get('/api/aluno_turma', authenticateAdminOrProfessor, getAlunoTurma);
app.get('/api/aluno_turma/:id', authenticateAdminOrProfessor, getAlunoTurmaById);
app.post('/api/aluno_turma', authenticateAdminOrProfessor, createAlunoTurma);
app.put('/api/aluno_turma/:id', authenticateAdminOrProfessor, updateAlunoTurma);
app.delete('/api/aluno_turma/:id', authenticateAdminOrProfessor, deleteAlunoTurma);

// ============================================================================
// ADMIN ROUTES - Settings
// ============================================================================

app.get('/api/settings', authenticateAnyUserJWT, getSettings);
app.put('/api/settings', authenticateAdminOrProfessor, updateSettings);

// ============================================================================
// ADMIN ROUTES - School Revenues
// ============================================================================

app.get('/api/school-revenues', authenticateAdminOrProfessor, getSchoolRevenues);
app.post('/api/school-revenues', authenticateAdminOrProfessor, createSchoolRevenue);
app.put('/api/school-revenues/:id', authenticateAdminOrProfessor, updateSchoolRevenue);
app.delete('/api/school-revenues/:id', authenticateAdminOrProfessor, deleteSchoolRevenue);

// ============================================================================
// ADMIN ROUTES - Categories
// ============================================================================

app.get('/api/categories', authenticateAdminOrProfessor, getAllCategories);
app.post('/api/categories', authenticateAdminOrProfessor, createCategory);
app.put('/api/categories/:id', authenticateAdminOrProfessor, updateCategory);
app.delete('/api/categories/:id', authenticateAdminOrProfessor, deleteCategory);

// ============================================================================
// ADMIN ROUTES - Savings Products
// ============================================================================

app.get('/api/savings-products', authenticateAnyUserJWT, getSavingsProducts);
app.post('/api/savings-products', authenticateAdminOrProfessor, createSavingsProduct);
app.put('/api/savings-products/:id', authenticateAdminOrProfessor, updateSavingsProduct);
app.delete('/api/savings-products/:id', authenticateAdminOrProfessor, deleteSavingsProduct);

// ============================================================================
// ADMIN ROUTES - Credit Products
// ============================================================================

app.get('/api/credit-products', authenticateAnyUserJWT, getCreditProducts);
app.post('/api/credit-products', authenticateAdminOrProfessor, createCreditProduct);
app.put('/api/credit-products/:id', authenticateAdminOrProfessor, updateCreditProduct);
app.delete('/api/credit-products/:id', authenticateAdminOrProfessor, deleteCreditProduct);

// ============================================================================
// ADMIN ROUTES - House System
// ============================================================================

app.get('/api/houses', authenticateAnyUserJWT, getHouses);
app.get('/api/houses/available-students', authenticateAnyUserJWT, getAvailableStudents);
app.get('/api/houses/:id', authenticateAnyUserJWT, getHouseById);
app.get('/api/my-house', authenticateAnyUserJWT, getMyHouse);
app.post('/api/houses', authenticateAdminOrProfessor, createHouse);
app.put('/api/houses/:id', authenticateAnyUserJWT, updateHouse);
app.post('/api/houses/:id/members', authenticateAnyUserJWT, manageHouseMembers);
app.delete('/api/houses/:id', authenticateAdminOrProfessor, deleteHouse);

// ============================================================================
// HEALTH CHECK
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
    systems: {
      valcoin: 'active',
      feedback: 'active'
    }
  });
});

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
// START SERVER
// ============================================================================

// Await Redis connection before starting the server
connect().then(() => {
  app.listen(port, () => {
    console.log('=====================================');
    console.log(`✓ Unified Server running on port ${port}`);
    console.log(`✓ ValCoin System: Active`);
    console.log(`✓ Feedback System: Active`);
    console.log(`✓ Health check: http://localhost:${port}/health`);
    console.log('=====================================');
  });
}).catch(err => {
  console.error('Failed to connect to Redis, server not started:', err);
  process.exit(1); // Exit if Redis connection fails
});

module.exports = app;
