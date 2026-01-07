const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db.js');

const getUsers = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo, data_criacao FROM users');
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
  const validTypes = ['ALUNO', 'PROFESSOR'];
  if (!validTypes.includes(tipo_utilizador)) {
    return res.status(400).json({ error: 'tipo_utilizador must be one of: ' + validTypes.join(', ') });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 8);
    const { rows } = await db.query(
      'INSERT INTO users (numero_mecanografico, nome, email, tipo_utilizador, password_hash, ano_escolar, saldo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo',
      [numero_mecanografico, nome, email, tipo_utilizador, password_hash, tipo_utilizador === 'ALUNO' ? ano_escolar : null, saldo !== undefined ? parseFloat(saldo) : 0]
    );
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
  const validTypes = ['ALUNO', 'PROFESSOR'];
  if (!validTypes.includes(tipo_utilizador)) {
    return res.status(400).json({ error: 'tipo_utilizador must be one of: ' + validTypes.join(', ') });
  }

  try {
    const { rows } = await db.query(
      'UPDATE users SET numero_mecanografico = $1, nome = $2, email = $3, tipo_utilizador = $4, ano_escolar = $5, saldo = $6, ativo = $7, data_atualizacao = now() WHERE id = $8 RETURNING id, numero_mecanografico, nome, email, tipo_utilizador, ano_escolar, ativo, saldo',
      [numero_mecanografico, nome, email, tipo_utilizador, tipo_utilizador === 'ALUNO' ? ano_escolar : null, saldo !== undefined ? parseFloat(saldo) : 0, ativo, req.params.id]
    );
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

const deleteUser = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
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

router.get('/', getUsers);
router.get('/unassigned', getUnassignedStudents);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', updateUserPassword);
router.post('/change-password', changeUserPassword);

router.get('/:id/disciplines', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching disciplines for professor ID: ${id}`);
    const { rows } = await db.query(`
      SELECT
        s.id AS subject_id,
        s.nome AS subject_name,
        s.codigo AS subject_code,
        json_agg(
            json_build_object(
                'professor_disciplina_turma_id', pdt.id,
                'disciplina_turma_id', dt.id,
                'class_id', c.id,
                'class_name', c.nome,
                'class_code', c.codigo
            )
        ) AS turmas
    FROM
        professor_disciplina_turma pdt
    JOIN
        disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
    JOIN
        subjects s ON dt.disciplina_id = s.id
    JOIN
        classes c ON dt.turma_id = c.id
    WHERE
        pdt.professor_id = $1 AND pdt.ativo = true
    GROUP BY
        s.id, s.nome, s.codigo
    ORDER BY
        s.nome;
    `, [id]);
    console.log(`Found ${rows.length} disciplines for professor ID: ${id}`);
    console.log(rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching professor disciplines:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

// Get all students for the logged-in professor, grouped by class
router.get('/professor/my-students', async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.tipo_utilizador !== 'PROFESSOR') {
        return res.status(403).json({ error: 'Not authorized' });
    }

    const professorId = req.user.id;

    try {
        const { rows } = await db.query(`
            SELECT DISTINCT
                u.id,
                u.nome,
                u.numero_mecanografico,
                c.id as turma_id,
                c.nome as turma_nome
            FROM
                users u
            JOIN
                aluno_disciplina ad ON u.id = ad.aluno_id
            JOIN
                disciplina_turma dt ON ad.disciplina_turma_id = dt.id
            JOIN
                classes c ON dt.turma_id = c.id
            JOIN
                professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id
            WHERE
                pdt.professor_id = $1
                AND u.tipo_utilizador = 'ALUNO'
                AND u.ativo = true
            ORDER BY
                c.nome, u.nome;
        `, [professorId]);

        // Group students by class
        const groupedByClass = rows.reduce((acc, student) => {
            const { turma_id, turma_nome } = student;
            if (!acc[turma_id]) {
                acc[turma_id] = {
                    turma_id,
                    turma_nome,
                    students: [],
                };
            }
            acc[turma_id].students.push({
                id: student.id,
                nome: student.nome,
                numero_mecanografico: student.numero_mecanografico,
            });
            return acc;
        }, {});

        res.json(Object.values(groupedByClass));
    } catch (err) {
        console.error('Error fetching professor students:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;