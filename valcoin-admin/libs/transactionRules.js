const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { redisClient } = require('./redis');
const { invalidateCachesForTransaction } = require('./cache');
const { updateUserBalancesOnApproval } = require('./transactions');

const RULES_CACHE_KEY = 'transactionRules:all';

const clearTransactionRulesCache = async () => {
    try {
        await redisClient.del(RULES_CACHE_KEY);
        console.log(`[CACHE DEL] Cleared transaction rules cache.`);
    } catch (err) {
        console.error('Error clearing transaction rules cache:', err);
    }
};

// Utility function to parse numerical values safely
const parseNumeric = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const generateId = () => uuidv4();

const getUserNameById = async (userId) => {
  try {
    const { rows } = await db.query('SELECT nome FROM users WHERE id = $1', [userId]);
    return rows.length > 0 ? rows[0].nome : 'Utilizador não encontrado';
  } catch (error) {
    console.error('Error fetching user name:', error);
    return 'Utilizador não encontrado';
  }
};

const enrichTransactions = async (transactions) => {
  try {
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const utilizador_origem_nome = await getUserNameById(transaction.utilizador_origem_id);
        const utilizador_destino_nome = await getUserNameById(transaction.utilizador_destino_id);
        return {
          ...transaction,
          utilizador_origem_nome,
          utilizador_destino_nome,
        };
      })
    );
    return enrichedTransactions;
  } catch (error) {
    console.error('Error enriching transactions:', error);
    return transactions; // Return original if enrichment fails
  }
};

const checkTransactionLimit = async (rule, aluno_id, disciplina_id, currentDate) => {
  const limiteValor = parseNumeric(rule.limite_valor);
  const montante = parseNumeric(rule.montante);

  if (limiteValor === 0 || rule.limite_periodo === 'nenhum') {
    return {
      allowed: true,
      restante: limiteValor,
      limite_total: limiteValor,
      periodo: rule.limite_periodo,
    };
  }

  const startDate = new Date(currentDate);
  if (rule.limite_periodo === 'mensal') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  } else if (rule.limite_periodo === 'anual') {
    startDate.setMonth(0, 1);
    startDate.setHours(0, 0, 0, 0);
  }

  let query = `
    SELECT SUM(t.montante) as total 
    FROM transactions t
    WHERE t.utilizador_destino_id = $1 
      AND t.status = 'APROVADA' 
      AND t.data_transacao >= $2 
      AND t.data_transacao <= $3
      AND t.transaction_rule_id = $4
  `;
  const params = [aluno_id, startDate, currentDate, rule.id];

  if (rule.limite_por_disciplina && disciplina_id) {
    query += ` AND t.disciplina_id = $${params.length + 1}`;
    params.push(disciplina_id);
  }

  try {
    const { rows } = await db.query(query, params);
    const totalMontante = parseNumeric(rows[0].total);
    const restante = limiteValor - totalMontante;

    if (totalMontante + montante > limiteValor) {
      return {
        allowed: false,
        message: `Limite de ${limiteValor} ValCoins por ${rule.limite_periodo} excedido para ${
          rule.limite_por_disciplina ? 'esta disciplina' : 'este período'
        }. Total atual: ${totalMontante}.`,
        restante,
        limite_total: limiteValor,
        periodo: rule.limite_periodo,
      };
    }

    return {
      allowed: true,
      restante,
      limite_total: limiteValor,
      periodo: rule.limite_periodo,
    };
  } catch (error) {
    console.error('Error checking transaction limit:', error);
    throw error;
  }
};

const getTransactionRules = async (req, res) => {
  try {
    const cachedRules = await redisClient.get(RULES_CACHE_KEY);
    if (cachedRules) {
        console.log(`[CACHE HIT] Serving transaction rules from cache.`);
        return res.json(JSON.parse(cachedRules));
    }

    console.log(`[CACHE MISS] Fetching transaction rules from DB.`);
    const { rows } = await db.query('SELECT * FROM transaction_rules WHERE ativo = true ORDER BY nome');
    
    await redisClient.set(RULES_CACHE_KEY, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
    console.log(`[CACHE SET] Transaction rules stored in cache.`);

    res.json(rows);
  } catch (error) {
    console.error('GET /api/transactionRules - Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const createTransactionRule = async (req, res) => {
  try {
     console.log('Received req.body:', req.body); // Add this log
    const {
      nome,
      montante,
      tipo_transacao,
      origem_permitida,
      destino_permitido,
      limite_valor,
      limite_periodo,
      limite_por_disciplina,
      categoria, // Add categoria here
      taxa_iva_ref,
      ano_min,
      ano_max,
      icon,
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO transaction_rules (
        id, nome, montante, tipo_transacao, origem_permitida, destino_permitido, 
        limite_valor, limite_periodo, limite_por_disciplina, categoria, taxa_iva_ref, 
        ano_min, ano_max, ativo, data_criacao, icon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *`,
      [
        generateId(),
        nome,
        parseNumeric(montante),
        tipo_transacao,
        origem_permitida,
        destino_permitido,
        parseNumeric(limite_valor),
        limite_periodo,
        limite_por_disciplina,
        categoria, // Add categoria here
        taxa_iva_ref,
        ano_min ? parseInt(ano_min, 10) : null,
        ano_max ? parseInt(ano_max, 10) : null,
        true,
        new Date().toISOString(),
        icon,
      ]
    );

    const newRule = rows[0];
    await clearTransactionRulesCache();
    await invalidateCachesForTransaction(null, null);
    res.status(201).json(newRule);
  } catch (error) {
    console.error('POST /api/transactionRules - Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};


const updateTransactionRule = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Received req.body:', req.body); // Add this log
    const {
      nome,
      montante,
      tipo_transacao,
      origem_permitida,
      destino_permitido,
      limite_valor,
      limite_periodo,
      limite_por_disciplina,
      categoria, // Add categoria here
      taxa_iva_ref,
      ano_min,
      ano_max,
      ativo,
      icon,
    } = req.body;

    const { rows: existingRows } = await db.query('SELECT * FROM transaction_rules WHERE id = $1', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Transaction rule not found' });
    }

    const parsedMontante = parseNumeric(montante);
    const parsedLimiteValor = parseNumeric(limite_valor);

    const { rows } = await db.query(
      `UPDATE transaction_rules SET 
        nome = $1, montante = $2, tipo_transacao = $3, origem_permitida = $4, 
        destino_permitido = $5, limite_valor = $6, limite_periodo = $7, 
        limite_por_disciplina = $8, categoria = $9, taxa_iva_ref = $10, 
        ano_min = $11, ano_max = $12, ativo = $13, data_atualizacao = $14, icon = $15
      WHERE id = $16 
      RETURNING *`,
      [
        nome,
        parsedMontante,
        tipo_transacao,
        origem_permitida,
        destino_permitido,
        parsedLimiteValor,
        limite_periodo,
        limite_por_disciplina,
        categoria, // Add categoria here
        taxa_iva_ref,
        ano_min ? parseInt(ano_min, 10) : null,
        ano_max ? parseInt(ano_max, 10) : null,
        ativo ?? existingRows[0].ativo,
        new Date().toISOString(),
        icon,
        id,
      ]
    );

    const updatedRule = rows[0];
    await clearTransactionRulesCache();
    await invalidateCachesForTransaction(null, null);
    res.json(updatedRule);
  } catch (error) {
    console.error(`PUT /api/transactionRules/${req.params.id} - Error:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const deleteTransactionRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM transaction_rules WHERE id = $1', [id]);

    if (rowCount > 0) {
      await clearTransactionRulesCache();
      await invalidateCachesForTransaction(null, null);
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Rule not found' });
    }
  } catch (error) {
    console.error(`DELETE /api/transactionRules/${req.params.id} - Error:`, error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

const applyTransactionRule = async (req, res) => {
  console.log('--- applyTransactionRule START ---');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    console.log('Database transaction started.');

    const { rule_id, utilizador_origem_id, utilizador_destino_id, disciplina_id, descricao, taxa_iva_ref } = req.body;
    console.log('Request body:', req.body);

    if (!rule_id || !utilizador_origem_id || !utilizador_destino_id || !descricao) {
      console.log('Validation failed: Missing required fields.');
      return res.status(400).json({
        error: 'rule_id, utilizador_origem_id, utilizador_destino_id, and descricao are required',
      });
    }

    console.log(`Fetching rule with id: ${rule_id}`);
    const { rows: ruleRows } = await client.query(
      'SELECT * FROM transaction_rules WHERE id = $1 AND ativo = true',
      [rule_id]
    );
    if (ruleRows.length === 0) {
      console.log('Validation failed: Rule not found or inactive.');
      return res.status(400).json({ error: 'Invalid rule_id: Rule not found or inactive' });
    }
    const rule = ruleRows[0];
    console.log('Rule found:', rule);

    console.log(`Fetching origin user with id: ${utilizador_origem_id}`);
    const { rows: origemRows } = await client.query(
      'SELECT * FROM users WHERE id = $1 AND ativo = true',
      [utilizador_origem_id]
    );
    if (origemRows.length === 0) {
      console.log('Validation failed: Origin user not found or inactive.');
      return res.status(400).json({ error: 'Invalid utilizador_origem_id: User not found or inactive' });
    }
    const origem = origemRows[0];
    console.log('Origin user found:', origem);

    console.log(`Fetching destination user with id: ${utilizador_destino_id}`);
    const { rows: destinoRows } = await client.query(
      'SELECT * FROM users WHERE id = $1 AND ativo = true',
      [utilizador_destino_id]
    );
    if (destinoRows.length === 0) {
      console.log('Validation failed: Destination user not found or inactive.');
      return res.status(400).json({ error: 'Invalid utilizador_destino_id: User not found or inactive' });
    }
    const destino = destinoRows[0];
    console.log('Destination user found:', destino);

    console.log(`Checking user types. Origin: ${origem.tipo_utilizador}, Allowed: ${rule.origem_permitida}`);
    if (origem.tipo_utilizador !== rule.origem_permitida) {
      console.log('Validation failed: Origin user type not allowed.');
      return res.status(400).json({
        error: `Origem must be ${rule.origem_permitida}, got ${origem.tipo_utilizador}`,
      });
    }

    console.log(`Checking user types. Destination: ${destino.tipo_utilizador}, Allowed: ${rule.destino_permitido}`);
    if (destino.tipo_utilizador !== rule.destino_permitido) {
      console.log('Validation failed: Destination user type not allowed.');
      return res.status(400).json({
        error: `Destino must be ${rule.destino_permitido}, got ${destino.tipo_utilizador}`,
      });
    }

    console.log(`Checking balance. Origin balance: ${origem.saldo}, Rule amount: ${rule.montante}`);
    if (rule.tipo_transacao === 'DEBITO' && parseNumeric(origem.saldo) < parseNumeric(rule.montante)) {
      console.log('Validation failed: Insufficient balance.');
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    console.log('Checking transaction limits.');
    const limitCheck = await checkTransactionLimit(rule, utilizador_destino_id, disciplina_id, new Date());
    if (!limitCheck.allowed) {
      console.log('Validation failed: Transaction limit exceeded.', limitCheck);
      return res.status(400).json({ error: limitCheck.message });
    }
    console.log('Transaction limits check passed.');

    const transactionId = generateId();
    const transactionGroupId = generateId();

    console.log('Inserting transaction into database.');
    const { rows: transactionRows } = await client.query(
      `INSERT INTO transactions (
        id, transaction_group_id, utilizador_origem_id, utilizador_destino_id, 
        montante, tipo, status, data_transacao, data_atualizacao, descricao, 
        taxa_iva_ref, transaction_rule_id, disciplina_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [
        transactionId,
        transactionGroupId,
        utilizador_origem_id,
        utilizador_destino_id,
        parseNumeric(rule.montante),
        rule.tipo_transacao,
        'APROVADA',
        new Date().toISOString(),
        new Date().toISOString(),
        descricao,
        taxa_iva_ref || rule.taxa_iva_ref,
        rule_id,
        disciplina_id || null
      ]
    );

    const newTransaction = transactionRows[0];
    console.log('Transaction inserted:', newTransaction);

    console.log('Updating user balances.');
    if (rule.tipo_transacao === 'CREDITO' || rule.tipo_transacao === 'DEBITO') {
      await updateUserBalancesOnApproval(newTransaction, client);
    }

    if (rule.categoria === 'Legado') {
      console.log('Rule category is Legado, inserting into legados table.');
      await client.query(
        'INSERT INTO legados (aluno_id, atribuidor_id, regra_id, descricao) VALUES ($1, $2, $3, $4)',
        [utilizador_destino_id, utilizador_origem_id, rule_id, rule.descricao]
      );
      console.log('Inserted into legados table.');
    }

    console.log('Committing database transaction.');
    await client.query('COMMIT');

    console.log('Invalidating caches.');
    await invalidateCachesForTransaction(utilizador_origem_id, utilizador_destino_id);

    console.log('Enriching transaction for response.');
    const enrichedTransactions = await enrichTransactions([newTransaction]);
    console.log('--- applyTransactionRule END ---');
    res.status(201).json(enrichedTransactions[0]);
  } catch (error) {
    console.log('--- applyTransactionRule ERROR ---');
    await client.query('ROLLBACK');
    console.error('POST /api/applyTransactionRule - Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
    console.log('Database client released.');
  }
};

const getApplicableRules = async (req, res) => {
  try {
    const { destino_tipo, destino_id, origem_id, disciplina_id } = req.query;

    if (!origem_id) {
      return res.status(400).json({
        success: false,
        message: 'origem_id is required',
      });
    }

    const { rows: userRows } = await db.query('SELECT * FROM users WHERE id = $1', [origem_id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Origem user not found' });
    }
    const utilizadorOrigem = userRows[0];

    let query = 'SELECT * FROM transaction_rules WHERE ativo = true AND origem_permitida = $1';
    const params = [utilizadorOrigem.tipo_utilizador];

    if (destino_tipo) {
      query += ` AND destino_permitido = $${params.length + 1}`;
      params.push(destino_tipo);
    }

    query += ' ORDER BY nome';

    const { rows: applicableRules } = await db.query(query, params);

    const detailedRules = await Promise.all(
      applicableRules.map(async (rule) => {
        try {
          const verificacaoLimites = await checkTransactionLimit(rule, destino_id, disciplina_id, new Date());
          return {
            ...rule,
            can_apply: verificacaoLimites.allowed,
            limites: verificacaoLimites,
          };
        } catch (error) {
          console.error('Error checking limits for rule:', rule.id, error);
          return {
            ...rule,
            can_apply: false,
            limites: {
              allowed: false,
              message: 'Erro na verificação de limites',
              restante: 0,
              limite_total: parseNumeric(rule.limite_valor),
              periodo: rule.limite_periodo,
            },
          };
        }
      })
    );

    res.status(200).json(detailedRules);
  } catch (error) {
    console.error('GET /api/transaction-rules/applicable - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
};

const checkApplicability = async (req, res) => {
  try {
    const { rule_id, utilizador_origem_id, utilizador_destino_id, disciplina_id } = req.body;

    if (!rule_id) {
      return res.status(400).json({
        success: false,
        message: 'rule_id é obrigatório',
      });
    }

    if (!utilizador_origem_id) {
      return res.status(400).json({
        success: false,
        message: 'utilizador_origem_id é obrigatório',
      });
    }

    if (!utilizador_destino_id) {
      return res.status(400).json({
        success: false,
        message: 'utilizador_destino_id é obrigatório',
      });
    }

    const { rows: ruleRows } = await db.query('SELECT * FROM transaction_rules WHERE id = $1', [rule_id]);
    if (ruleRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Regra de transação não encontrada para ID: ${rule_id}`,
      });
    }
    const rule = ruleRows[0];

    const errors = [];
    const warnings = [];

    if (!rule.ativo) {
      errors.push('Regra está desativada');
    }

    const { rows: origemRows } = await db.query('SELECT * FROM users WHERE id = $1', [utilizador_origem_id]);
    const { rows: destinoRows } = await db.query('SELECT * FROM users WHERE id = $1', [utilizador_destino_id]);

    const utilizadorOrigem = origemRows[0];
    const utilizadorDestino = destinoRows[0];

    if (!utilizadorOrigem) {
      errors.push(`Utilizador de origem não encontrado: ${utilizador_origem_id}`);
    }

    if (!utilizadorDestino) {
      errors.push(`Utilizador de destino não encontrado: ${utilizador_destino_id}`);
    }

    if (utilizadorOrigem && utilizadorDestino) {
      if (utilizadorOrigem.tipo_utilizador !== rule.origem_permitida) {
        errors.push(`Origem deve ser ${rule.origem_permitida}, mas é ${utilizadorOrigem.tipo_utilizador}`);
      }

      if (utilizadorDestino.tipo_utilizador !== rule.destino_permitido) {
        errors.push(`Destino deve ser ${rule.destino_permitido}, mas é ${utilizadorDestino.tipo_utilizador}`);
      }

      if (rule.tipo_transacao === 'DEBITO') {
        const saldoOrigem = parseNumeric(utilizadorOrigem.saldo);
        const montante = parseNumeric(rule.montante);
        if (saldoOrigem < montante) {
          errors.push(`Saldo insuficiente (${saldoOrigem}/${montante})`);
        } else if (saldoOrigem - montante < 10) {
          warnings.push('Saldo ficará baixo após esta transação');
        }
      }
    }

    if (rule.limite_por_disciplina) {
      if (!disciplina_id || disciplina_id === '') {
        errors.push('Disciplina é obrigatória para esta regra');
      } else {
        const { rows: disciplinaRows } = await db.query('SELECT * FROM subjects WHERE id = $1', [disciplina_id]);
        if (disciplinaRows.length === 0) {
          errors.push(`Disciplina não encontrada: ${disciplina_id}`);
        } else {
          const { rows: alunoDisciplinaRows } = await db.query(
            `SELECT * FROM aluno_disciplina 
             WHERE aluno_id = $1 
             AND disciplina_turma_id IN (
               SELECT id FROM disciplina_turma WHERE disciplina_id = $2 AND ativo = true
             )
             AND ativo = true`,
            [utilizador_destino_id, disciplina_id]
          );
          if (alunoDisciplinaRows.length === 0) {
            errors.push('Aluno não está inscrito na disciplina especificada');
          }
        }
      }
    }

    let verificacaoLimites;
    try {
      verificacaoLimites = await checkTransactionLimit(rule, utilizador_destino_id, disciplina_id, new Date());
    } catch (limitError) {
      errors.push(`Erro na verificação de limites: ${limitError.message}`);
      verificacaoLimites = {
        allowed: false,
        message: limitError.message,
        restante: 0,
        limite_total: parseNumeric(rule.limite_valor),
        periodo: rule.limite_periodo,
      };
    }

    if (verificacaoLimites && !verificacaoLimites.allowed) {
      errors.push(verificacaoLimites.message);
    }

    const canApply = errors.length === 0;

    const response = {
      success: true,
      can_apply: canApply,
      regra: {
        id: rule.id,
        nome: rule.nome,
        montante: parseNumeric(rule.montante),
        tipo: rule.tipo_transacao,
      },
      errors: errors,
      warnings: warnings,
      limites: verificacaoLimites || {
        allowed: true,
        restante: parseNumeric(rule.limite_valor),
        limite_total: parseNumeric(rule.limite_valor),
        periodo: rule.limite_periodo,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('💥 Unexpected error in checkApplicability:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

module.exports = {
  getTransactionRules,
  createTransactionRule,
  updateTransactionRule,
  deleteTransactionRule,
  applyTransactionRule,
  getApplicableRules,
  checkApplicability,
};