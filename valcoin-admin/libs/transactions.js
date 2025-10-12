const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const { invalidateCachesForTransaction } = require('./cache');

// Helper to get a user by ID, can use a specific client connection
const getUserById = async (userId, client = db) => {
    const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return rows[0];
};

// Helper to enrich transactions with user names, can use a specific client connection
const enrichTransactions = async (transactions, client = db) => {
    const userIds = [...new Set(transactions.flatMap(t => [t.utilizador_origem_id, t.utilizador_destino_id]))];
    if (userIds.length === 0) {
        return transactions;
    }
    const users = await Promise.all(userIds.map(id => getUserById(id, client)));
    const userMap = new Map(users.filter(u => u).map(u => [u.id, u.nome]));

    const { rows } = await client.query('SELECT value FROM settings WHERE key = $1', ['taxasIVA']);
    const taxasIVA = rows[0]?.value || {};

    return transactions.map((transaction) => ({
        ...transaction,
        nome_origem: userMap.get(transaction.utilizador_origem_id) || 'Utilizador não encontrado',
        nome_destino: userMap.get(transaction.utilizador_destino_id) || 'Utilizador não encontrado',
        utilizador_origem_nome: userMap.get(transaction.utilizador_origem_id) || 'Utilizador não encontrado',
        utilizador_destino_nome: userMap.get(transaction.utilizador_destino_id) || 'Utilizador não encontrado',
        taxa_iva_valor: taxasIVA[transaction.taxa_iva_ref] || 0,
    }));
};

// Corrected VAT calculation
const calculateIVAAmounts = (montante, taxaIVA) => {
    const taxaDecimal = taxaIVA / 100;
    const valorSemIVA = montante / (1 + taxaDecimal);
    const valorIVA = montante - valorSemIVA;
    
    return {
        valorTotal: montante,
        valorSemIVA: parseFloat(valorSemIVA.toFixed(2)),
        valorIVA: parseFloat(valorIVA.toFixed(2)),
        taxaIVA: taxaIVA
    };
};

// Updates balances and creates VAT transaction, requires a client for transaction integrity
const updateUserBalancesOnApproval = async (transaction, client) => {
    if (transaction.descricao.includes('[Contrapartida]')) {
        return;
    }

    const { utilizador_origem_id, utilizador_destino_id, montante, taxa_iva_ref } = transaction;
    
    const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['taxasIVA']);
    const taxasIVA = settingsRows[0]?.value || {};
    const taxaIVA = taxasIVA[taxa_iva_ref] || 0;

    await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [montante, utilizador_origem_id]);
    await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [montante, utilizador_destino_id]);

    if (taxaIVA > 0) {
        const { valorIVA } = calculateIVAAmounts(montante, taxaIVA);
        
        const { rows: ivaDestRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['ivaDestinationUserId']);
        let ivaDestinationUserId = ivaDestRows[0]?.value;

        if (!ivaDestinationUserId) {
            const { rows: adminRows } = await client.query('SELECT id FROM users WHERE tipo_utilizador = \'ADMIN\' LIMIT 1');
            if (adminRows.length > 0) {
                ivaDestinationUserId = adminRows[0].id;
            }
            else {
                throw new Error("Destinatário do IVA não encontrado. Configure o 'ivaDestinationUserId' ou garanta que existe um utilizador ADMIN.");
            }
        }

        await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [valorIVA, utilizador_destino_id]);
        await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [valorIVA, ivaDestinationUserId]);

        await client.query(
            'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao, taxa_iva_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [transaction.transaction_group_id, utilizador_destino_id, ivaDestinationUserId, valorIVA, 'DEBITO', 'APROVADA', `[IVA ${taxaIVA}%] ${transaction.descricao}`, 'isento']
        );
    }
};

// Validates transaction data, can use a specific client connection
const validateTransaction = async (transactionData, client = db) => {
    const errors = [];
    if (!transactionData.utilizador_origem_id) errors.push('Utilizador origem é obrigatório');
    if (!transactionData.utilizador_destino_id) errors.push('Utilizador destino é obrigatório');
    if (transactionData.utilizador_origem_id === transactionData.utilizador_destino_id) {
        errors.push('Utilizador destino deve ser diferente do utilizador origem');
    }
    if (!transactionData.montante || isNaN(transactionData.montante) || parseFloat(transactionData.montante) <= 0) {
        errors.push('Montante é obrigatório e deve ser um número positivo');
    }
    if (!transactionData.descricao || typeof transactionData.descricao !== 'string' || transactionData.descricao.trim() === '') {
        errors.push('Descrição é obrigatória e deve ser uma string não vazia');
    }

    if (transactionData.utilizador_origem_id && transactionData.utilizador_destino_id) {
        const origemUser = await getUserById(transactionData.utilizador_origem_id, client);
        const destinoUser = await getUserById(transactionData.utilizador_destino_id, client);
        if (!origemUser) errors.push('Utilizador origem não encontrado');
        if (!destinoUser) errors.push('Utilizador destino não encontrado');
        if (origemUser && !origemUser.ativo) errors.push('Utilizador origem não está ativo');
        if (destinoUser && !destinoUser.ativo) errors.push('Utilizador destino não está ativo');
        
        if (transactionData.status === 'APROVADA') {
            if (origemUser && origemUser.saldo < transactionData.montante) {
                errors.push('Saldo insuficiente no utilizador origem');
            }
        }
    }
    return errors;
};

// --- API Handlers ---

const getTransactions = async (req, res) => {
    try {
        const { timeFilter, startDate, endDate } = req.query;
        let query = "SELECT * FROM transactions WHERE descricao NOT LIKE '%[Contrapartida]%' AND descricao NOT LIKE '%[IVA]%'";
        const params = [];

        if (timeFilter === 'today') {
            query += ' AND data_transacao >= NOW()::date';
        } else if (timeFilter === 'week') {
            query += ' AND data_transacao >= date_trunc(\'week\', NOW())';
        } else if (timeFilter === 'month') {
            query += ' AND data_transacao >= date_trunc(\'month\', NOW())';
        } else if (startDate && endDate) {
            params.push(startDate);
            params.push(endDate);
            query += ` AND data_transacao BETWEEN $1 AND $2`;
        }
        
        query += ' ORDER BY data_transacao DESC';

        const { rows } = await db.query(query, params);
        const enrichedTransactions = await enrichTransactions(rows);
        res.json(enrichedTransactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTransactionById = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
        if (rows.length > 0) {
            const enrichedTransaction = await enrichTransactions(rows);
            res.json(enrichedTransaction[0]);
        }
        else {
            res.status(404).json({ error: 'Transaction not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getTransactionsByGroupId = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM transactions WHERE transaction_group_id = $1', [req.params.groupId]);
        if (rows.length > 0) {
            const enrichedTransactions = await enrichTransactions(rows);
            res.json(enrichedTransactions);
        }
        else {
            res.status(404).json({ error: 'Transaction group not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createTransaction = async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const transactionData = req.body;
        const errors = await validateTransaction(transactionData, client);
        if (errors.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: errors.join(', ') });
        }

        const transactionGroupId = uuidv4();
        const { rows } = await client.query(
            'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao, taxa_iva_ref, icon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [transactionGroupId, transactionData.utilizador_origem_id, transactionData.utilizador_destino_id, parseFloat(transactionData.montante), 'DEBITO', transactionData.status || 'PENDENTE', transactionData.descricao, transactionData.taxa_iva_ref || 'isento', transactionData.icon || null]
        );
        const newTransaction = rows[0];

        // Update last activity date for student
        const originUser = await getUserById(newTransaction.utilizador_origem_id, client);
        const excludedTransactionTypes = ['JUROS_POUPANCA', 'JUROS_EMPRESTIMO', 'PAGAMENTO_EMPRESTIMO'];
        if (originUser.tipo_utilizador === 'ALUNO' && !excludedTransactionTypes.includes(newTransaction.tipo) && newTransaction.descricao !== 'Taxa de inatividade') {
            await client.query('UPDATE users SET last_activity_date = NOW() WHERE id = $1', [newTransaction.utilizador_origem_id]);
        }

        if (newTransaction.status === 'APROVADA') {
            await updateUserBalancesOnApproval(newTransaction, client);
        }

        await client.query('COMMIT');
        await invalidateCachesForTransaction(newTransaction.utilizador_origem_id, newTransaction.utilizador_destino_id);

        const enrichedTransaction = await enrichTransactions([newTransaction]);
        res.status(201).json(enrichedTransaction[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao criar transação:", err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    } finally {
        client.release();
    }
};

const updateTransaction = async (req, res) => {
    const { id } = req.params;
    const transactionData = req.body;
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { rows: originalRows } = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (originalRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const originalTransaction = originalRows[0];

        if (originalTransaction.descricao.includes('[Contrapartida]') || originalTransaction.descricao.includes('[IVA')) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot edit system-generated transaction directly' });
        }
        
        const errors = await validateTransaction(transactionData, client);
        if (errors.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: errors.join(', ') });
        }

        const { rows } = await client.query(
            'UPDATE transactions SET utilizador_origem_id = $1, utilizador_destino_id = $2, montante = $3, tipo = $4, status = $5, descricao = $6, data_atualizacao = now(), taxa_iva_ref = $7, icon = $8 WHERE id = $9 RETURNING *',
            [transactionData.utilizador_origem_id, transactionData.utilizador_destino_id, parseFloat(transactionData.montante), transactionData.tipo, transactionData.status, transactionData.descricao, transactionData.taxa_iva_ref || 'isento', transactionData.icon || null, id]
        );
        const updatedTransaction = rows[0];

        if (originalTransaction.status !== 'APROVADA' && updatedTransaction.status === 'APROVADA') {
            await updateUserBalancesOnApproval(updatedTransaction, client);
        }

        await client.query('COMMIT');
        await invalidateCachesForTransaction(updatedTransaction.utilizador_origem_id, updatedTransaction.utilizador_destino_id);

        const enrichedTransaction = await enrichTransactions([updatedTransaction]);
        res.json(enrichedTransaction[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao atualizar transação:", err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    } finally {
        client.release();
    }
};

const deleteTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const transaction = rows[0];

        if (transaction.descricao.includes('[Contrapartida]') || transaction.descricao.includes('[IVA')) {
            return res.status(400).json({ error: 'Cannot delete system-generated transaction directly' });
        }

        await db.query('DELETE FROM transactions WHERE id = $1', [id]);
        await invalidateCachesForTransaction(transaction.utilizador_origem_id, transaction.utilizador_destino_id);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const approveTransaction = async (req, res) => {
    const { id } = req.params;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transaction not found' });
        }
        const transaction = rows[0];

        if (transaction.status === 'APROVADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Transaction already approved' });
        }
        if (transaction.status === 'REJEITADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot approve rejected transaction' });
        }

        await client.query('UPDATE transactions SET status = \'APROVADA\', data_atualizacao = now() WHERE id = $1', [id]);
        await updateUserBalancesOnApproval({ ...transaction, status: 'APROVada' }, client);

        await client.query('COMMIT');
        await invalidateCachesForTransaction(transaction.utilizador_origem_id, transaction.utilizador_destino_id);

        const { rows: updatedRows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        const enrichedTransaction = await enrichTransactions(updatedRows);
        res.json(enrichedTransaction[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao aprovar transação:", err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    } finally {
        client.release();
    }
};

const rejectTransaction = async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    try {
        const { rowCount } = await db.query('UPDATE transactions SET status = \'REJEITADA\', motivo_rejeicao = $1, data_atualizacao = now() WHERE id = $2', [motivo, id]);
        if (rowCount > 0) {
            const { rows } = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
            const enrichedTransaction = await enrichTransactions(rows);
            res.json(enrichedTransaction[0]);
        }
        else {
            res.status(404).json({ error: 'Transaction not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getTransactions,
    getTransactionById,
    getTransactionsByGroupId,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    approveTransaction,
    rejectTransaction,
    updateUserBalancesOnApproval,
    enrichTransactions
};