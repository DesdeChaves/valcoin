const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { updateUserBalancesOnApproval, enrichTransactions } = require('./transactions');
const { invalidateCachesForTransaction } = require('./cache');
const { redisClient } = require('./redis');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CACHE_EXPIRATION = 60; // Cache expiration in seconds

const authenticateProfessorJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            if (user.tipo_utilizador !== 'PROFESSOR') {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const getProfessorDashboard = async (req, res) => {
    const professorId = req.user.id;
    const cacheKey = `professor-dashboard:${professorId}`;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`[CACHE HIT] Serving dashboard for professor ${professorId} from cache.`);
            return res.json(JSON.parse(cachedData));
        }

        console.log(`[CACHE MISS] Fetching dashboard for professor ${professorId} from DB.`);
        const [
            professorRes,
            transactionsRes,
            rulesRes,
            subjectsRes,
            studentSubjectEnrollmentsRes,
            studentClassEnrollmentsRes,
            professorAssignmentsRes
        ] = await Promise.all([
            db.query('SELECT * FROM users WHERE id = $1', [professorId]),
            db.query("SELECT * FROM transactions WHERE (utilizador_origem_id = $1 OR utilizador_destino_id = $1) AND descricao NOT LIKE '%[Contrapartida]%' ORDER BY data_transacao DESC", [professorId]),
            db.query('SELECT * FROM transaction_rules'),
            db.query('SELECT * FROM subjects'),
            db.query('SELECT * FROM aluno_disciplina'),
            db.query('SELECT * FROM aluno_turma'),
            db.query(`
                SELECT 
                    id, 
                    disciplina_id, 
                    turma_id, 
                    ano_letivo, 
                    ativo,
                    professor_id
                FROM 
                    disciplina_turma
                WHERE 
                    professor_id = $1
            `, [professorId])
        ]);

        const professor = professorRes.rows[0];
        const enrichedTransactions = await enrichTransactions(transactionsRes.rows);

        const finalTransactions = enrichedTransactions.map(tx => ({
            ...tx,
            tipo_para_professor: tx.utilizador_destino_id === professorId ? 'CREDITO' : 'DEBITO',
            remetente_nome: tx.nome_origem,
            destinatario_nome: tx.nome_destino
        }));

        const dashboardData = {
            saldo: professor.saldo,
            transactions: finalTransactions,
            transactionRules: rulesRes.rows,
            subjects: subjectsRes.rows,
            enrollments: studentSubjectEnrollmentsRes.rows,
            studentClassEnrollments: studentClassEnrollmentsRes.rows,
            professorAssignments: professorAssignmentsRes.rows,
            professor: professor
        };

        await redisClient.set(cacheKey, JSON.stringify(dashboardData), { EX: CACHE_EXPIRATION });
        console.log(`[CACHE SET] Dashboard for professor ${professorId} stored in cache.`);

        res.json(dashboardData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createProfessorTransaction = async (req, res) => {
    const utilizador_origem_id = req.user.id;
    const { utilizador_destino_id, montante, descricao, taxa_iva_ref = 'isento', disciplina_id } = req.body;
    if (!utilizador_destino_id || !montante || !descricao) {
        return res.status(400).json({ error: 'Dados obrigatórios em falta' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { rows: destinoRows } = await client.query('SELECT * FROM users WHERE id = $1 AND ativo = true', [utilizador_destino_id]);
        if (destinoRows.length === 0) {
            throw new Error('Utilizador destino não encontrado ou inativo');
        }

        const { rows: professorRows } = await client.query('SELECT * FROM users WHERE id = $1', [utilizador_origem_id]);
        if (professorRows.length === 0 || professorRows[0].saldo < montante) {
            throw new Error('Saldo insuficiente');
        }

        const { rows } = await client.query(
            'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, descricao, tipo, status, taxa_iva_ref, disciplina_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [uuidv4(), utilizador_origem_id, utilizador_destino_id, parseFloat(montante), descricao, 'DEBITO', 'APROVADA', taxa_iva_ref, disciplina_id || null]
        );
        const newTransaction = rows[0];

        await updateUserBalancesOnApproval(newTransaction, client);

        await client.query('COMMIT');

        await invalidateCachesForTransaction(utilizador_origem_id, utilizador_destino_id);

        res.status(201).json(newTransaction);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in createProfessorTransaction:', err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

const getProfessorTapRules = async (req, res) => {
    const professorId = req.user.id;
    try {
        const { rows: professorRows } = await db.query('SELECT * FROM users WHERE id = $1', [professorId]);
        const professor = professorRows[0];
        const { rows } = await db.query('SELECT * FROM transaction_rules WHERE origem_permitida = $1', [professor.tipo_utilizador]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createProfessorTapTransaction = async (req, res) => {
    const utilizador_origem_id = req.user.id;
    const { rule_id, utilizador_destino_id, disciplina_id } = req.body;
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { rows: ruleRows } = await client.query('SELECT * FROM transaction_rules WHERE id = $1', [rule_id]);
        if (ruleRows.length === 0) {
            throw new Error('Rule not found');
        }
        const rule = ruleRows[0];

        if (rule.limite_por_disciplina && !disciplina_id) {
            throw new Error('disciplina_id is required for this rule');
        }

        const { rows: destinoRows } = await client.query('SELECT * FROM users WHERE id = $1 AND ativo = true', [utilizador_destino_id]);
        if (destinoRows.length === 0) {
            throw new Error('Utilizador destino não encontrado ou inativo');
        }

        const { rows: professorRows } = await client.query('SELECT * FROM users WHERE id = $1', [utilizador_origem_id]);
        if (professorRows.length === 0 || professorRows[0].saldo < rule.montante) {
            throw new Error('Saldo insuficiente');
        }

        const { rows } = await client.query(
            'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, descricao, tipo, status, taxa_iva_ref, transaction_rule_id, disciplina_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [uuidv4(), utilizador_origem_id, utilizador_destino_id, parseFloat(rule.montante), rule.descricao, 'DEBITO', 'APROVADA', rule.taxa_iva_ref, rule_id, disciplina_id || null]
        );
        const newTransaction = rows[0];

        await updateUserBalancesOnApproval(newTransaction, client);

        if (rule.categoria === 'Legado') {
            await client.query(
                'INSERT INTO legados (aluno_id, atribuidor_id, regra_id, descricao) VALUES ($1, $2, $3, $4)',
                [utilizador_destino_id, utilizador_origem_id, rule_id, rule.descricao]
            );
        }

        await client.query('COMMIT');

        await invalidateCachesForTransaction(utilizador_origem_id, utilizador_destino_id);

        res.status(201).json(newTransaction);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in createProfessorTapTransaction:', err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

const getProfessorStudentTransactionHistory = async (req, res) => {
    const { student_id, disciplina_id } = req.query;
    const professor_id = req.user.id;

    if (!professor_id || !student_id || !disciplina_id) {
        return res.status(400).json({ error: 'Professor, student, and disciplina IDs are required.' });
    }

    try {
        const query = `
            SELECT 
                t.id,
                t.data_transacao,
                t.montante,
                tr.nome,
                tr.categoria
            FROM 
                transactions t
            JOIN 
                transaction_rules tr ON t.transaction_rule_id = tr.id
            WHERE 
                t.utilizador_origem_id = $1 
                AND t.utilizador_destino_id = $2 
                AND t.disciplina_id = $3
                AND t.transaction_rule_id IS NOT NULL
            ORDER BY 
                t.data_transacao DESC;
        `;
        const { rows } = await db.query(query, [professor_id, student_id, disciplina_id]);
        
        const total = rows.reduce((sum, row) => sum + parseFloat(row.montante), 0);

        res.json({ transactions: rows, total });
    } catch (err) {
        console.error('Error fetching professor-student transaction history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const checkProfessorRuleApplicability = async (req, res) => {
  const { rule_id, utilizador_origem_id, utilizador_destino_id, disciplina_id } = req.body;
  console.log('checkProfessorRuleApplicability payload:', req.body);
  console.log('typeof rule_id:', typeof rule_id);
  console.log('typeof utilizador_origem_id:', typeof utilizador_origem_id);
  console.log('typeof utilizador_destino_id:', typeof utilizador_destino_id);
  console.log('typeof disciplina_id:', typeof disciplina_id);

  try {
    // Validate inputs
    if (!rule_id || !utilizador_origem_id) {
      return res.status(400).json({ 
        error: 'rule_id and utilizador_origem_id are required',
        can_apply: false,
        errors: ['rule_id e utilizador_origem_id são obrigatórios']
      });
    }

    // Fetch rule
    const { rows: ruleRows } = await db.query(
      'SELECT * FROM transaction_rules WHERE id = $1 AND ativo = true',
      [rule_id]
    );
    
    if (ruleRows.length === 0) {
      return res.status(404).json({ 
        error: 'Rule not found or inactive',
        can_apply: false,
        errors: ['Regra não encontrada ou inativa']
      });
    }
    
    const rule = ruleRows[0];
    console.log('Checking rule:', rule);

    // Validate origem user
    const { rows: origemRows } = await db.query(
      'SELECT * FROM users WHERE id = $1 AND ativo = true',
      [utilizador_origem_id]
    );
    
    if (origemRows.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or inactive utilizador_origem_id',
        can_apply: false,
        errors: ['Utilizador de origem inválido ou inativo']
      });
    }
    
    const origemUser = origemRows[0];
    
    if (origemUser.tipo_utilizador !== rule.origem_permitida) {
      return res.status(400).json({ 
        error: `Origem user type ${origemUser.tipo_utilizador} not allowed for rule`,
        can_apply: false,
        errors: [`Tipo de utilizador ${origemUser.tipo_utilizador} não permitido para esta regra`]
      });
    }

    // Validate destino user if provided
    if (utilizador_destino_id) {
      const { rows: destinoRows } = await db.query(
        'SELECT * FROM users WHERE id = $1 AND ativo = true',
        [utilizador_destino_id]
      );
      
      if (destinoRows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or inactive utilizador_destino_id',
          can_apply: false,
          errors: ['Utilizador de destino inválido ou inativo']
        });
      }
      
      const destinoUser = destinoRows[0];
      
      if (destinoUser.tipo_utilizador !== rule.destino_permitido) {
        return res.status(400).json({ 
          error: `Destino user type ${destinoUser.tipo_utilizador} not allowed for rule`,
          can_apply: false,
          errors: [`Tipo de utilizador ${destinoUser.tipo_utilizador} não permitido como destino para esta regra`]
        });
      }
    }

    // Validate disciplina if required
    if (rule.limite_por_disciplina && !disciplina_id) {
      return res.status(400).json({ 
        error: 'disciplina_id is required for this rule',
        can_apply: false,
        errors: ['disciplina_id é obrigatório para esta regra']
      });
    }
    
    if (disciplina_id) {
      const { rows: subjectRows } = await db.query(
        'SELECT * FROM subjects WHERE id = $1 AND ativo = true',
        [disciplina_id]
      );
      
      if (subjectRows.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid or inactive disciplina_id',
          can_apply: false,
          errors: ['Disciplina inválida ou inativa']
        });
      }
    }

    // Check saldo for origem user
    if (rule.tipo_transacao === 'DEBITO' && parseFloat(origemUser.saldo) < parseFloat(rule.montante)) {
      return res.status(400).json({
        error: 'Saldo insuficiente para aplicar a regra',
        can_apply: false,
        errors: ['Saldo insuficiente para aplicar esta regra'],
      });
    }

    // Check limits
   let limits = {
  restante: parseFloat(rule.limite_valor) || 0,
  limite_total: parseFloat(rule.limite_valor) || 0,
  periodo: rule.limite_periodo || 'nenhum',
};

if (rule.limite_valor && rule.limite_periodo && rule.limite_periodo !== 'nenhum') {
  const periodQuery = rule.limite_periodo === 'diario'
    ? `AND data_transacao >= NOW() - INTERVAL '1 day'`
    : rule.limite_periodo === 'semanal'
    ? `AND data_transacao >= NOW() - INTERVAL '1 week'`
    : `AND data_transacao >= NOW() - INTERVAL '1 month'`;
    
  const params = [rule_id, utilizador_origem_id];
  let query = `
    SELECT COALESCE(SUM(montante), 0) as total
    FROM transactions
    WHERE transaction_rule_id = $1
    AND utilizador_origem_id = $2
    AND status != 'REJEITADA'
  `;
  
  if (utilizador_destino_id) {
    query += ` AND utilizador_destino_id = $${params.length + 1}`;
    params.push(utilizador_destino_id);
  }
  if (rule.limite_por_disciplina) {
    query += ` AND disciplina_id IS NOT DISTINCT FROM $${params.length + 1}`;
    params.push(disciplina_id);
  }
  
  query += ` ${periodQuery}`;

  console.log('Limit check query:', query);
  console.log('Limit check params:', params);

  const { rows: transactionRows } = await db.query(query, params);
  const totalUsed = parseFloat(transactionRows[0].total) || 0;
  console.log('Total used:', totalUsed);

  limits.restante = parseFloat(rule.limite_valor) - totalUsed;
  
  if (limits.restante < parseFloat(rule.montante)) {
    return res.status(400).json({
      error: `Limite de ${rule.limite_valor} ValCoins por ${rule.limite_periodo} excedido para este período. Total atual: ${totalUsed}.`,
      can_apply: false,
      errors: ['Limite de transações excedido para o período'],
      limits
    });
  }
}
    res.json({
      can_apply: true,
      errors: [],
      warnings: [],
      limits,
    });
  } catch (error) {
    console.error('Error in checkProfessorRuleApplicability:', error);
    res.status(500).json({ 
      error: 'Server error while checking rule applicability',
      can_apply: false,
      errors: ['Erro interno do servidor']
    });
  }
};

module.exports = {
    authenticateProfessorJWT,
    getProfessorDashboard,
    createProfessorTransaction,
    getProfessorTapRules,
    createProfessorTapTransaction,
    getProfessorStudentTransactionHistory,
    checkProfessorRuleApplicability,
};
