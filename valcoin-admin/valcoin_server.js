const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./libs/db');
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
const { startInterestPaymentCron, startLoanRepaymentCron, startProfessorSalaryCron, startInactivityFeeCron,  testProfessorSalaryManually, runInterestPaymentManually} = require('./libs/cronJobs');
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

// Importar funcionalidades dos professores
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

const app = express();

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(bodyParser.json());

// Initialize admin user and log credentials
console.log('Starting ValCoin Admin Server...');
initializeAdminUser();
startInterestPaymentCron();
startLoanRepaymentCron();
startProfessorSalaryCron();
startInactivityFeeCron();
testProfessorSalaryManually();

// Middleware de autenticação para qualquer utilizador autenticado
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

// Middleware de autenticação para Administradores
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader);
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    console.log('Token:', token);
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        return res.sendStatus(403);
      }
      console.log('Decoded user:', user);
      if (user.tipo_utilizador !== 'ADMIN' && user.tipo_utilizador !== 'PROFESSOR') {
        console.error('Non-admin user attempted access:', user.tipo_utilizador);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.error('No authorization header provided');
    res.sendStatus(401);
  }
};

// Middleware de autenticação apenas para Administradores
const authenticateAdminJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403); // Forbidden
      }
      if (user.tipo_utilizador !== 'ADMIN') {
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401); // Unauthorized
  }
};

// Rota de login
app.post('/api/login', async (req, res) => {
  const { numero_mecanografico, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE numero_mecanografico = $1', [numero_mecanografico]);
    if (rows.length > 0) {
      const user = rows[0];
      if (bcrypt.compareSync(password, user.password_hash)) {
        const accessToken = jwt.sign({ id: user.id, numero_mecanografico: user.numero_mecanografico, tipo_utilizador: user.tipo_utilizador }, JWT_SECRET, { expiresIn: '1h' });
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ accessToken, user: userWithoutPassword });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user', authenticateAnyUserJWT, (req, res) => {
  res.json(req.user);
});

app.post('/api/user/change-password', authenticateAnyUserJWT, changeUserPassword);

// Rota para a loja
app.post('/api/store/buy', authenticateStoreJWT, createStoreTransaction);

// Rotas para Professores
app.get('/api/professor/dashboard', authenticateProfessorJWT, getProfessorDashboard);
app.post('/api/professor/transactions', authenticateProfessorJWT, createProfessorTransaction);
app.get('/api/professor/tap-rules', authenticateProfessorJWT, getProfessorTapRules);
app.post('/api/professor/tap-transactions', authenticateProfessorJWT, createProfessorTapTransaction);
app.get('/api/professor/student-transaction-history', authenticateProfessorJWT, getProfessorStudentTransactionHistory);
app.post('/api/professor/check-rule-applicability', authenticateProfessorJWT, checkProfessorRuleApplicability);

// Rotas para Alunos
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
app.get('/api/student/loans', authenticateJWT, getStudentLoans);
app.patch('/api/student/loans/:id/approve', authenticateJWT, approveLoan);
app.patch('/api/student/loans/:id/reject', authenticateJWT, rejectLoan);

// Classes - Students
app.get('/api/classes/:id/students', authenticateStudentJWT, getStudentsByClass);

// Dashboard
app.get('/api/dashboard', authenticateJWT, getDashboardMetrics);

// Users
app.get('/api/users', authenticateJWT, getUsers);
app.get('/api/unassigned-students', authenticateAnyUserJWT, getUnassignedStudents);
app.get('/api/users/:id', authenticateAnyUserJWT, getUserById);
app.post('/api/users', authenticateJWT, createUser);
app.put('/api/users/:id', authenticateJWT, updateUser);
app.put('/api/admin/users/:id/password', authenticateAdminJWT, updateUserPassword);
app.delete('/api/users/:id', authenticateJWT, deleteUser);

// Transactions
app.get('/api/transactions', authenticateJWT, getTransactions);
app.get('/api/transactions/:id', authenticateJWT, getTransactionById);
app.get('/api/transactions/group/:groupId', authenticateJWT, getTransactionsByGroupId);
app.post('/api/transactions', authenticateJWT, createTransaction);
app.put('/api/transactions/:id', authenticateJWT, updateTransaction);
app.delete('/api/transactions/:id', authenticateJWT, deleteTransaction);
app.patch('/api/transactions/:id/approve', authenticateJWT, approveTransaction);
app.patch('/api/transactions/:id/reject', authenticateJWT, rejectTransaction);

// Subjects
app.get('/api/subjects', authenticateJWT, getSubjects);
app.post('/api/subjects', authenticateJWT, createSubject);
app.put('/api/subjects/:id', authenticateJWT, updateSubject);
app.delete('/api/subjects/:id', authenticateJWT, softDeleteSubject);

// Enrollments
app.get('/api/enrollments', authenticateJWT, getEnrollments);
app.get('/api/enrollments/:id', authenticateJWT, getEnrollmentById);
app.post('/api/enrollments', authenticateJWT, createEnrollment);
app.put('/api/enrollments/:id', authenticateJWT, updateEnrollment);
app.delete('/api/enrollments/:id', authenticateJWT, deleteEnrollment);

// Classes
app.get('/api/classes', authenticateAnyUserJWT, getClasses);
app.post('/api/classes', authenticateJWT, createClass);
app.put('/api/classes/:id', authenticateJWT, updateClass);
app.delete('/api/classes/:id', authenticateJWT, deleteClass);

// Transaction Rules
app.get('/api/transactionRules', authenticateJWT, getTransactionRules);
app.post('/api/transactionRules', authenticateJWT, createTransactionRule);
app.put('/api/transactionRules/:id', authenticateJWT, updateTransactionRule);
app.delete('/api/transactionRules/:id', authenticateJWT, deleteTransactionRule);
app.post('/api/applyTransactionRule', authenticateJWT, (req, res, next) => {
  console.log('Received request to /applyTransactionRule:', req.body);
  applyTransactionRule(req, res, next);
});
app.post('/api/transaction-rules/apply', authenticateJWT, (req, res, next) => {
  console.log('Received request to /applyTransactionRule:', req.body);
  applyTransactionRule(req, res, next);
});
app.get('/api/transaction-rules/applicable', authenticateJWT, getApplicableRules);
app.post('/api/transaction-rules/check-applicability', authenticateJWT, checkApplicability);

// Disciplina Turma
app.get('/api/disciplina_turma', authenticateJWT, getDisciplinaTurma);
app.post('/api/disciplina_turma', authenticateJWT, createDisciplinaTurma);
app.put('/api/disciplina_turma/:id', authenticateJWT, updateDisciplinaTurma);

// Ciclos
app.get('/api/admin/ciclos', authenticateJWT, async (req, res) => {
  try {
    const ciclos = await getAllCiclos();
    res.json(ciclos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/ciclos', authenticateJWT, async (req, res) => {
  try {
    const newCiclo = await createCiclo(req.body);
    res.status(201).json(newCiclo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/ciclos/:id', authenticateJWT, async (req, res) => {
  try {
    const updatedCiclo = await updateCiclo(req.params.id, req.body);
    if (updatedCiclo) {
      res.json(updatedCiclo);
    } else {
      res.status(404).json({ error: 'Ciclo not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/ciclos/:id', authenticateJWT, async (req, res) => {
  try {
    const deletedCiclo = await deleteCiclo(req.params.id);
    if (deletedCiclo) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Ciclo not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Aluno Turma
app.get('/api/aluno_turma', authenticateJWT, getAlunoTurma);
app.get('/api/aluno_turma/:id', authenticateJWT, getAlunoTurmaById);
app.post('/api/aluno_turma', authenticateJWT, createAlunoTurma);
app.put('/api/aluno_turma/:id', authenticateJWT, updateAlunoTurma);
app.delete('/api/aluno_turma/:id', authenticateJWT, deleteAlunoTurma);

// Settings
app.get('/api/settings', authenticateAnyUserJWT, getSettings);
app.put('/api/settings', authenticateJWT, updateSettings);

// School Revenues
app.get('/api/school-revenues', authenticateJWT, getSchoolRevenues);
app.post('/api/school-revenues', authenticateJWT, createSchoolRevenue);
app.put('/api/school-revenues/:id', authenticateJWT, updateSchoolRevenue);
app.delete('/api/school-revenues/:id', authenticateJWT, deleteSchoolRevenue);

// Categories
app.get('/api/categories', authenticateJWT, async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/categories', authenticateJWT, async (req, res) => {
  try {
    const newCategory = await createCategory(req.body);
    res.status(201).json(newCategory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/categories/:id', authenticateJWT, async (req, res) => {
  try {
    const updatedCategory = await updateCategory(req.params.id, req.body);
    if (updatedCategory) {
      res.json(updatedCategory);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/categories/:id', authenticateJWT, async (req, res) => {
  try {
    const wasDeleted = await deleteCategory(req.params.id);
    if (wasDeleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Savings Products
app.get('/api/savings-products', authenticateAnyUserJWT, getSavingsProducts);
app.post('/api/savings-products', authenticateJWT, createSavingsProduct);
app.put('/api/savings-products/:id', authenticateJWT, updateSavingsProduct);
app.delete('/api/savings-products/:id', authenticateJWT, deleteSavingsProduct);

// Credit Products
app.get('/api/credit-products', authenticateAnyUserJWT, getCreditProducts);
app.post('/api/credit-products', authenticateJWT, createCreditProduct);
app.put('/api/credit-products/:id', authenticateJWT, updateCreditProduct);
app.delete('/api/credit-products/:id', authenticateJWT, deleteCreditProduct);

// House System
app.get('/api/houses', authenticateAnyUserJWT, getHouses);
app.post('/api/houses', authenticateJWT, createHouse); // Only admin can create
app.get('/api/my-house', authenticateAnyUserJWT, getMyHouse);
app.get('/api/houses/available-students', authenticateAnyUserJWT, getAvailableStudents);
app.get('/api/houses/:id', authenticateAnyUserJWT, getHouseById);
app.put('/api/houses/:id', authenticateAnyUserJWT, updateHouse); // Leader or Admin
app.post('/api/houses/:id/members', authenticateAnyUserJWT, manageHouseMembers); // Leader or Admin
app.delete('/api/houses/:id', authenticateJWT, deleteHouse); // Admin only


// Health check endpoint (adicionar antes do app.listen)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'valcoin-admin-server' 
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Rota para obter todos os dados (para depuração)
app.get('/api/all-data', (req, res) => {
  res.json(mockData);
});
