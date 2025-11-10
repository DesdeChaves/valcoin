const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');
const connectRedisPromise = require('./redis');
const { clearAdminDashboardCache } = require('./dashboard');

const USERS_CACHE_KEY = 'users:all';

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const clearUsersCache = async () => {
    try {
        const redis = await connectRedisPromise;
        await redis.del(USERS_CACHE_KEY);
        console.log(`[CACHE DEL] Cleared users cache.`);
    } catch (err) {
        console.error('Error clearing users cache:', err);
    }
};

// ============================================================================
// CORE USER FUNCTIONS (used by both systems)
// ============================================================================

const getUsers = async (req, res) => {
  try {
    const redis = await connectRedisPromise;
    const cachedUsers = await redis.get(USERS_CACHE_KEY);
    if (cachedUsers) {
        console.log(`[CACHE HIT] Serving users from cache.`);
        return res.json(JSON.parse(cachedUsers));
    }

    console.log(`[CACHE MISS] Fetching users from DB.`);
    const { rows } = await db.query('SELECT id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo, data_criacao FROM users');
    
    await redis.set(USERS_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
    console.log(`[CACHE SET] Users stored in cache.`);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo FROM users WHERE id = $1', [req.params.id]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createUser = async (req, res) => {
  const { numero_mecanografico, nome, email, tipo_utilizador, password, ano_escolar, saldo } = req.body;
  if (!numero_mecanografico || !nome || !email || !tipo_utilizador || !password) {
    return res.status(400).json({ error: 'All fields (numero_mecanografico, nome, email, tipo_utilizador, password) are required' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  const validTypes = ['ALUNO', 'PROFESSOR', 'ADMIN'];
  if (!validTypes.includes(tipo_utilizador)) {
    return res.status(400).json({ error: 'tipo_utilizador must be one of: ' + validTypes.join(', ') });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 8);
    const { rows } = await db.query(
      'INSERT INTO users (numero_mecanografico, nome, email, tipo_utilizador, password_hash, ano_escolar, saldo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo',
      [numero_mecanografico, nome, email, tipo_utilizador, password_hash, tipo_utilizador === 'ALUNO' ? ano_escolar : null, saldo !== undefined ? parseFloat(saldo) : 0]
    );
    await clearAdminDashboardCache();
    await clearUsersCache();
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUser = async (req, res) => {
  const { numero_mecanografico, nome, email, tipo_utilizador, saldo, ano_escolar, ativo } = req.body;
  if (!numero_mecanografico || !nome || !email || !tipo_utilizador) {
    return res.status(400).json({ error: 'All fields (numero_mecanografico, nome, email, tipo_utilizador) are required' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  const validTypes = ['ALUNO', 'PROFESSOR', 'ADMIN'];
  if (!validTypes.includes(tipo_utilizador)) {
    return res.status(400).json({ error: 'tipo_utilizador must be one of: ' + validTypes.join(', ') });
  }

  try {
    const { rows } = await db.query(
      'UPDATE users SET numero_mecanografico = $1, nome = $2, email = $3, tipo_utilizador = $4, ano_escolar = $5, saldo = $6, ativo = $7, data_atualizacao = now() WHERE id = $8 RETURNING id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo',
      [numero_mecanografico, nome, email, tipo_utilizador, tipo_utilizador === 'ALUNO' ? ano_escolar : null, saldo !== undefined ? parseFloat(saldo) : 0, ativo, req.params.id]
    );
    if (rows.length > 0) {
      await clearAdminDashboardCache();
      await clearUsersCache();
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount > 0) {
      await clearAdminDashboardCache();
      await clearUsersCache();
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const initializeAdminUser = async () => {
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE tipo_utilizador = \'ADMIN\'');
    if (rows.length === 0) {
      const adminPassword = 'admin123';
      const password_hash = bcrypt.hashSync(adminPassword, 8);
      await db.query(
        'INSERT INTO users (numero_mecanografico, nome, email, tipo_utilizador, password_hash, saldo) VALUES ($1, $2, $3, $4, $5, $6)',
        ['admin', 'Administrator', 'admin@valcoin.com', 'ADMIN', password_hash, 10000]
      );
      console.log('=====================================');
      console.log('INITIAL ADMIN USER CREATED:');
      console.log(`Username: admin`);
      console.log(`Password: ${adminPassword}`);
      console.log('Please change the password after first login.');
      console.log('=====================================');
    } else {
      console.log('Admin user already exists. No new admin user created.');
    }
  } catch (err) {
    console.error('Error initializing admin user:', err);
  }
};

const getUnassignedStudents = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, nome FROM users 
      WHERE tipo_utilizador = \'ALUNO\' 
      AND ativo = true
      AND id NOT IN (SELECT user_id FROM house_members WHERE data_saida IS NULL)
      ORDER BY nome
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error getting unassigned students:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateUserPassword = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 8);
    const { rowCount } = await db.query(
      'UPDATE users SET password_hash = $1, data_atualizacao = now() WHERE id = $2',
      [password_hash, req.params.id]
    );

    if (rowCount > 0) {
      res.status(200).json({ message: 'Password updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const changeUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  try {
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    const password_hash = bcrypt.hashSync(newPassword, 8);
    await db.query(
      'UPDATE users SET password_hash = $1, data_atualizacao = now() WHERE id = $2',
      [password_hash, userId]
    );

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================================================
// FEEDBACK SYSTEM - Professor Routes
// ============================================================================

// Get professor disciplines
router.get('/:id/disciplines', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching disciplines for professor ID: ${id}`);
    const { rows } = await db.query(`
      SELECT
          pdt.id AS professor_disciplina_turma_id,
          s.id AS subject_id,
          s.nome AS subject_name,
          s.codigo AS subject_code,
          c.id AS class_id,
          c.nome AS class_name,
          c.codigo AS class_code,
          pdt.ativo AS active
      FROM
          professor_disciplina_turma pdt
      JOIN
          disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
      JOIN
          subjects s ON dt.disciplina_id = s.id
      JOIN
          classes c ON dt.turma_id = c.id
      WHERE
          pdt.professor_id = $1;
    `, [id]);
    console.log(`Found ${rows.length} disciplines for professor ID: ${id}`);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching professor disciplines:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all dossiers for a professor
router.get('/:userId/dossiers/all', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { showInactive } = req.query;
    const filterActive = showInactive !== 'true';

    // First, get all disciplines for the professor
    const disciplinesResult = await db.query(
      `SELECT pdt.id as professor_disciplina_turma_id, s.nome as subject_name, s.codigo as subject_code, c.nome as class_name, c.codigo as class_code
       FROM professor_disciplina_turma pdt
       JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
       JOIN subjects s ON dt.disciplina_id = s.id
       JOIN classes c ON dt.turma_id = c.id
       WHERE pdt.professor_id = $1 ${filterActive ? 'AND pdt.ativo = true' : ''}`,
      [userId]
    );

    const disciplines = disciplinesResult.rows;

    // For each discipline, get the dossiers
    const dossiersByDiscipline = await Promise.all(
      disciplines.map(async (discipline) => {
        const dossiersResult = await db.query(
          `SELECT * FROM dossie WHERE professor_disciplina_turma_id = $1 ${filterActive ? 'AND ativo = true' : ''} ORDER BY nome`,
          [discipline.professor_disciplina_turma_id]
        );
        return {
          ...discipline,
          dossiers: dossiersResult.rows,
        };
      })
    );

    res.json(dossiersByDiscipline);
  } catch (error) {
    next(error);
  }
});

// Get all criteria for a professor
router.get('/:userId/criteria/all', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // First, get all dossiers for the professor
    const dossiersResult = await db.query(
      `SELECT d.id, d.nome,
              s.nome AS subject_name, s.codigo AS subject_code,
              cl.nome AS class_name, cl.codigo AS class_code
       FROM dossie d
       JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
       JOIN disciplina_turma dt ON dt.id = pdt.disciplina_turma_id
       JOIN subjects s ON s.id = dt.disciplina_id
       JOIN classes cl ON cl.id = dt.turma_id
       WHERE pdt.professor_id = $1 AND d.ativo = true
       ORDER BY d.nome`,
      [userId]
    );

    const dossiers = dossiersResult.rows;

    // For each dossier, get the criteria
    const criteriaByDossier = await Promise.all(
      dossiers.map(async (dossier) => {
        const criteriaResult = await db.query(
          'SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY nome',
          [dossier.id]
        );
        return {
          ...dossier,
          criterios: criteriaResult.rows,
        };
      })
    );

    res.json(criteriaByDossier);
  } catch (error) {
    next(error);
  }
});

// Get all instruments for a professor
router.get('/:userId/instruments/all', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { showInactive } = req.query;
    const filterActive = showInactive !== 'true';

    // First, get all criteria for the professor
    const criteriaResult = await db.query(
      `SELECT c.id, c.nome,
              d.id AS dossier_id, d.nome AS dossier_name,
              s.nome AS subject_name, s.codigo AS subject_code,
              cl.nome AS class_name, cl.codigo AS class_code
       FROM criterio c
       JOIN dossie d ON c.dossie_id = d.id
       JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
       JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
       JOIN subjects s ON dt.disciplina_id = s.id
       JOIN classes cl ON dt.turma_id = cl.id
       WHERE pdt.professor_id = $1 ${filterActive ? 'AND c.ativo = true' : ''}
       ORDER BY c.nome`,
      [userId]
    );

    const criteria = criteriaResult.rows;

    // For each criterion, get the instruments
    const instrumentsByCriterion = await Promise.all(
      criteria.map(async (criterion) => {
        const instrumentsResult = await db.query(
          `SELECT * FROM elemento_avaliacao WHERE criterio_id = $1 ${filterActive ? 'AND ativo = true' : ''} ORDER BY nome`,
          [criterion.id]
        );
        return {
          ...criterion,
          instrumentos: instrumentsResult.rows,
        };
      })
    );

    res.json(instrumentsByCriterion);
  } catch (error) {
    next(error);
  }
});

// Get all counters for a professor
router.get('/:userId/counters/all', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { showInactive } = req.query;
    const filterActive = showInactive !== 'true';

    // First, get all disciplines for the professor
    const disciplinesResult = await db.query(
      `SELECT pdt.id as professor_disciplina_turma_id, s.nome as subject_name, s.codigo as subject_code, c.nome as class_name, c.codigo as class_code
       FROM professor_disciplina_turma pdt
       JOIN disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
       JOIN subjects s ON dt.disciplina_id = s.id
       JOIN classes c ON dt.turma_id = c.id
       WHERE pdt.professor_id = $1 ${filterActive ? 'AND pdt.ativo = true' : ''}`,
      [userId]
    );

    const disciplines = disciplinesResult.rows;

    // For each discipline, get the dossiers
    const dossiersByDiscipline = await Promise.all(
      disciplines.map(async (discipline) => {
        const dossiersResult = await db.query(
          `SELECT d.id, d.nome FROM dossie d WHERE d.professor_disciplina_turma_id = $1 ${filterActive ? 'AND d.ativo = true' : ''} ORDER BY nome`,
          [discipline.professor_disciplina_turma_id]
        );

        // For each dossier, get the counters
        const dossiersWithCounters = await Promise.all(
          dossiersResult.rows.map(async (dossier) => {
            const countersResult = await db.query(
              `SELECT * FROM contador WHERE dossie_id = $1 ${filterActive ? 'AND ativo = true' : ''} ORDER BY shortname`,
              [dossier.id]
            );
            return {
              ...dossier,
              counters: countersResult.rows,
            };
          })
        );

        return {
          ...discipline,
          dossiers: dossiersWithCounters,
        };
      })
    );

    res.json(dossiersByDiscipline);
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ROUTER - Basic CRUD routes
// ============================================================================

router.get('/', getUsers);
router.get('/unassigned', getUnassignedStudents);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', updateUserPassword);
router.post('/change-password', changeUserPassword);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  router,
  // Functions for direct use (ValCoin system)
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  initializeAdminUser,
  getUnassignedStudents,
  updateUserPassword,
  changeUserPassword
};

// Default export for use with app.use()
module.exports.default = router;
