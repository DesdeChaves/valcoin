const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('./db');
const redisClient = require('./redis');
const { clearAdminDashboardCache } = require('./dashboard');

const USERS_CACHE_KEY = 'users:all';

const clearUsersCache = async () => {
    try {
        await redisClient.del(USERS_CACHE_KEY);
        console.log(`[CACHE DEL] Cleared users cache.`);
    } catch (err) {
        console.error('Error clearing users cache:', err);
    }
};

const getUsers = async (req, res) => {
  try {
    const cachedUsers = await redisClient.get(USERS_CACHE_KEY);
    if (cachedUsers) {
        console.log(`[CACHE HIT] Serving users from cache.`);
        return res.json(JSON.parse(cachedUsers));
    }

    console.log(`[CACHE MISS] Fetching users from DB.`);
    const { rows } = await db.query('SELECT id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo, data_criacao FROM users');
    
    await redisClient.set(USERS_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
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

module.exports = {
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