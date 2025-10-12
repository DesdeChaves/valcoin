const db = require('./db');

const getStudentSavingsAccounts = async (req, res) => {
    const student_id = req.user.id;
    try {
        const { rows } = await db.query(
            'SELECT ssa.*, sp.name as product_name, sp.interest_rate FROM student_savings_accounts ssa JOIN savings_products sp ON ssa.product_id = sp.id WHERE ssa.student_id = $1 ORDER BY ssa.start_date DESC',
            [student_id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching student savings accounts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createStudentSavingsAccount = async (req, res) => {
    const student_id = req.user.id;
    const { product_id, deposit_amount } = req.body;
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // Get product details
        const { rows: productRows } = await client.query('SELECT * FROM savings_products WHERE id = $1 AND is_active = true', [product_id]);
        if (productRows.length === 0) {
            throw new Error('Produto de poupança não encontrado ou inativo.');
        }
        const product = productRows[0];

        // Get student details
        const { rows: userRows } = await client.query('SELECT * FROM users WHERE id = $1', [student_id]);
        const student = userRows[0];

        // Validations
        if (deposit_amount < product.min_deposit) {
            throw new Error(`O depósito mínimo é de ${product.min_deposit}.`);
        }
        if (product.max_deposit && deposit_amount > product.max_deposit) {
            throw new Error(`O depósito máximo é de ${product.max_deposit}.`);
        }
        if (student.saldo < deposit_amount) {
            throw new Error('Saldo insuficiente na conta principal.');
        }

        // Get interest source user
        const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['interestSourceUserId']);
        const interestSourceUserId = settingsRows[0]?.value?.replace(/"/g, '');
        if (!interestSourceUserId) {
            throw new Error('Utilizador de origem dos juros não configurado.');
        }
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(interestSourceUserId)) {
            throw new Error(`O ID do utilizador de origem dos juros ('${interestSourceUserId}') não é um UUID válido.`);
        }

        // Verify if interest source user exists
        const { rows: interestUserRows } = await client.query('SELECT id FROM users WHERE id = $1', [interestSourceUserId]);
        if (interestUserRows.length === 0) {
            throw new Error('O utilizador de origem dos juros configurado não existe.');
        }

        // 1. Debit from student's main account
        await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [deposit_amount, student_id]);

        // 2. Credit the interest source user's account
        await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [deposit_amount, interestSourceUserId]);

        // 3. Create transaction log
        await client.query(
            'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
            [student_id, interestSourceUserId, deposit_amount, 'DEBITO', 'APROVADA', `Depósito Poupança: ${product.name}`]
        );

        // 4. Create the savings account
        const maturity_date = new Date();
        maturity_date.setMonth(maturity_date.getMonth() + product.term_months);

        const { rows: newAccountRows } = await client.query(
            'INSERT INTO student_savings_accounts (student_id, product_id, balance, maturity_date) VALUES ($1, $2, $3, $4) RETURNING *',
            [student_id, product_id, deposit_amount, maturity_date]
        );

        await client.query('COMMIT');
        res.status(201).json(newAccountRows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating savings account:', err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getStudentSavingsAccounts,
    createStudentSavingsAccount,
};