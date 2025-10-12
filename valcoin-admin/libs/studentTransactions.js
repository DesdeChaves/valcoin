const jwt = require('jsonwebtoken');
const { enrichTransactions, updateUserBalancesOnApproval } = require('./transactions');
const { v4: uuidv4 } = require('uuid');
const { invalidateCachesForTransaction } = require('./cache');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateStudentJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      if (user.tipo_utilizador !== 'ALUNO') {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const getStudentDashboard = async (req, res) => {
  const studentId = req.user.id;
  try {
    const { rows: studentRows } = await db.query('SELECT * FROM users WHERE id = $1', [studentId]);
    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Estudante não encontrado' });
    }
    const student = studentRows[0];

    const { rows: transactionRows } = await db.query(
      "SELECT * FROM transactions WHERE (utilizador_origem_id = $1 OR utilizador_destino_id = $1) AND descricao NOT LIKE '%[Contrapartida]%' ORDER BY data_transacao DESC",
      [studentId]
    );

    const enrichedTransactions = await enrichTransactions(transactionRows);

    const finalTransactions = enrichedTransactions.map(tx => ({
      ...tx,
      tipo: tx.utilizador_destino_id === studentId ? 'CREDITO' : 'DEBITO'
    }));

    res.json({
      student: {
        id: student.id,
        nome: student.nome,
        tipo_utilizador: student.tipo_utilizador,
        saldo: parseFloat(student.saldo) || 0,
      },
      saldo: parseFloat(student.saldo) || 0,
      transactions: finalTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createStudentManualPayment = async (req, res) => {
  const remetente_id = req.user.id;
  const { utilizador_destino_id, montante, descricao, taxa_iva_ref } = req.body;

  try {
    const { rows: remetenteRows } = await db.query('SELECT * FROM users WHERE id = $1', [remetente_id]);
    if (remetenteRows.length === 0 || remetenteRows[0].saldo < montante) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    const { rows } = await db.query(
      'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, descricao, status, tipo, taxa_iva_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [uuidv4(), remetente_id, utilizador_destino_id, montante, descricao, 'PENDENTE', 'DEBITO', taxa_iva_ref]
    );

    await invalidateCachesForTransaction(remetente_id, utilizador_destino_id);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPayableUsers = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id, nome, tipo_utilizador FROM users WHERE tipo_utilizador IN ('PROFESSOR', 'ALUNO', 'ADMIN') AND ativo = true");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStudentSettings = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM settings');
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStudentTransactionRules = async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM transaction_rules WHERE origem_permitida = 'ALUNO' AND ativo = true");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getStudentApplicableRules = async (req, res) => {
  try {
    const { categoria, origem_id, origem_tipo, destino_id, destino_tipo } = req.query;
    let query = `
      SELECT * FROM transaction_rules 
      WHERE ativo = true 
      AND origem_permitida = $1
    `;
    const params = [origem_tipo || 'ALUNO'];

    if (categoria) {
      query += ` AND categoria = $${params.length + 1}`;
      params.push(categoria);
    }
    if (destino_tipo) {
      query += ` AND destino_permitido = $${params.length + 1}`;
      params.push(destino_tipo);
    }
    if (destino_id) {
      query += ` AND (destino_permitido = (SELECT tipo_utilizador FROM users WHERE id = $${params.length + 1} AND ativo = true))`;
      params.push(destino_id);
    }
    if (origem_id) {
      query += ` AND (origem_permitida = (SELECT tipo_utilizador FROM users WHERE id = $${params.length + 1} AND ativo = true))`;
      params.push(origem_id);
    }

    console.log('Query for applicable rules:', query, params);
    const { rows } = await db.query(query, params);
    console.log('Fetched rules:', rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching applicable student rules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const checkStudentRuleApplicability = async (req, res) => {
  const { rule_id, utilizador_origem_id, utilizador_destino_id, disciplina_id } = req.body;

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
      
      // ✅ CORREÇÃO: Usar $N placeholders corretamente
      if (utilizador_destino_id) {
        query += ` AND utilizador_destino_id = $${params.length + 1}`;
        params.push(utilizador_destino_id);
      }
      if (rule.limite_por_disciplina && disciplina_id) {
        query += ` AND disciplina_id = $${params.length + 1}`;
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
    console.error('Error in checkStudentRuleApplicability:', error);
    res.status(500).json({ 
      error: 'Server error while checking rule applicability',
      can_apply: false,
      errors: ['Erro interno do servidor']
    });
  }
};

const applyStudentTransactionRule = async (req, res) => {
  const { rule_id, utilizador_origem_id, utilizador_destino_id, descricao, taxa_iva_ref, disciplina_id } = req.body;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Validate inputs
    if (!rule_id || !utilizador_origem_id || !utilizador_destino_id || !descricao) {
      throw new Error('rule_id, utilizador_origem_id, utilizador_destino_id, and descricao are required');
    }

    // Fetch rule
    const { rows: [rule] } = await client.query(
      'SELECT * FROM transaction_rules WHERE id = $1 AND ativo = true',
      [rule_id]
    );
    if (!rule) {
      throw new Error('Rule not found or inactive');
    }

    // Validate origem user
    const { rows: [origemUser] } = await client.query(
      'SELECT * FROM users WHERE id = $1 AND ativo = true',
      [utilizador_origem_id]
    );
    if (!origemUser) {
      throw new Error('Invalid or inactive utilizador_origem_id');
    }
    if (origemUser.tipo_utilizador !== rule.origem_permitida) {
      throw new Error(`Origem user type ${origemUser.tipo_utilizador} not allowed for rule`);
    }

    // Validate destino user
    const { rows: [destinoUser] } = await client.query(
      'SELECT * FROM users WHERE id = $1 AND ativo = true',
      [utilizador_destino_id]
    );
    if (!destinoUser) {
      throw new Error('Invalid or inactive utilizador_destino_id');
    }
    if (destinoUser.tipo_utilizador !== rule.destino_permitido) {
      throw new Error(`Destino user type ${destinoUser.tipo_utilizador} not allowed for rule`);
    }

    // Validate disciplina if required
    if (rule.limite_por_disciplina && !disciplina_id) {
      throw new Error('disciplina_id is required for this rule');
    }
    if (disciplina_id) {
      const { rows: [subject] } = await client.query(
        'SELECT * FROM subjects WHERE id = $1 AND ativo = true',
        [disciplina_id]
      );
      if (!subject) {
        throw new Error('Invalid or inactive disciplina_id');
      }
      // Check if destino user is enrolled
      const { rows: [enrollment] } = await client.query(
        `SELECT * FROM aluno_disciplina
         WHERE aluno_id = $1
         AND disciplina_turma_id IN (
           SELECT id FROM disciplina_turma
           WHERE disciplina_id = $2 AND ativo = true
         ) AND ativo = true`,
        [utilizador_destino_id, disciplina_id]
      );
      if (!enrollment) {
        throw new Error('Destino user not enrolled in the specified disciplina');
      }
    }

    // Check saldo
    if (rule.tipo_transacao === 'DEBITO' && origemUser.saldo < parseFloat(rule.montante)) {
      throw new Error('Saldo insuficiente');
    }

    // Check limits
    if (rule.limite_valor && rule.limite_periodo !== 'nenhum') {
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
      
      // ✅ CORREÇÃO: Usar $N placeholders corretamente
      if (utilizador_destino_id) {
        query += ` AND utilizador_destino_id = $${params.length + 1}`;
        params.push(utilizador_destino_id);
      }
      if (rule.limite_por_disciplina && disciplina_id) {
        query += ` AND disciplina_id = $${params.length + 1}`;
        params.push(disciplina_id);
      }
      query += ` ${periodQuery}`;

      console.log('Limit check query:', query, params);
      const { rows: transactions } = await client.query(query, params);
      const totalUsed = parseFloat(transactions[0].total);
      const restante = parseFloat(rule.limite_valor) - totalUsed;
      if (restante < parseFloat(rule.montante)) {
        throw new Error('Limite de transações excedido');
      }
    }

    // Create transaction
    const transactionGroupId = uuidv4();
    const { rows: transactionRows } = await client.query(
      `
      INSERT INTO transactions (
        transaction_group_id, 
        utilizador_origem_id, 
        utilizador_destino_id, 
        montante, 
        tipo, 
        descricao, 
        taxa_iva_ref, 
        status, 
        transaction_rule_id,
        disciplina_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        transactionGroupId,
        utilizador_origem_id,
        utilizador_destino_id,
        rule.montante,
        rule.tipo_transacao,
        descricao,
        taxa_iva_ref || null,
        'APROVADA',
        rule_id,
        disciplina_id || null
      ]
    );
    const newTransaction = transactionRows[0];

    await updateUserBalancesOnApproval(newTransaction, client);

    await client.query('COMMIT');
    
    await invalidateCachesForTransaction(utilizador_origem_id, utilizador_destino_id);

    res.status(201).json(newTransaction);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in applyStudentTransactionRule:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

const getStudentLegadoHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { rows } = await db.query(`
            SELECT l.descricao, l.data_atribuicao, u.nome as atribuidor_nome, tr.nome as regra_nome, tr.icon as regra_icon
            FROM legados l
            JOIN users u ON l.atribuidor_id = u.id
            JOIN transaction_rules tr ON l.regra_id = tr.id
            WHERE l.aluno_id = $1
            ORDER BY l.data_atribuicao DESC;
        `, [studentId]);
        res.json(rows);
    } catch (err) {
        console.error('Error getting student legado history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
  authenticateStudentJWT,
  getStudentDashboard,
  createStudentManualPayment,
  getPayableUsers,
  getStudentSettings,
  getStudentTransactionRules,
  getStudentApplicableRules,
  checkStudentRuleApplicability,
  applyStudentTransactionRule,
  getStudentLegadoHistory,
};
