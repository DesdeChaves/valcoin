const db = require('./db');

const getStudentLoans = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT 
                sl.*, 
                u.nome as student_name, 
                cp.name as product_name
            FROM 
                student_loans sl
            JOIN 
                users u ON sl.student_id = u.id
            JOIN 
                credit_products cp ON sl.credit_product_id = cp.id
            ORDER BY 
                sl.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching student loans:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const applyForLoan = async (req, res) => {
    const student_id = req.user.id;
    const { product_id, amount } = req.body;

    try {
        // Get credit product details
        const { rows: productRows } = await db.query('SELECT * FROM credit_products WHERE id = $1 AND is_active = true', [product_id]);
        if (productRows.length === 0) {
            return res.status(400).json({ error: 'Produto de crédito não encontrado ou inativo.' });
        }
        const product = productRows[0];

        // Validate amount
        if (amount <= 0) {
            return res.status(400).json({ error: 'O montante do empréstimo deve ser positivo.' });
        }
        if (amount > product.max_amount) {
            return res.status(400).json({ error: `O montante máximo para este produto é ${product.max_amount}.` });
        }

        // Create the loan application
        const start_date = new Date();
        const maturity_date = new Date();
        maturity_date.setMonth(maturity_date.getMonth() + product.term_months);

        const { rows: newLoanRows } = await db.query(
            'INSERT INTO student_loans (student_id, credit_product_id, amount, start_date, maturity_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [student_id, product_id, amount, start_date, maturity_date, 'PENDING']
        );

        res.status(201).json(newLoanRows[0]);

    } catch (err) {
        console.error('Error applying for loan:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const approveLoan = async (req, res) => {
    const { id } = req.params;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { rows: loanRows } = await client.query('SELECT * FROM student_loans WHERE id = $1', [id]);
        if (loanRows.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        const loan = loanRows[0];

        if (loan.status !== 'PENDING') {
            return res.status(400).json({ error: `O empréstimo já foi ${loan.status}.` });
        }

        // Update loan status
        await client.query('UPDATE student_loans SET status = \'ACTIVE\', updated_at = now() WHERE id = $1', [id]);

        // Credit student account
        await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [loan.amount, loan.student_id]);

        // Get admin user
        const { rows: adminRows } = await client.query('SELECT id FROM users WHERE tipo_utilizador = \'ADMIN\' LIMIT 1');
        if (adminRows.length === 0) {
            return res.status(500).json({ error: 'Utilizador admin não encontrado.' });
        }
        const adminId = adminRows[0].id;

        // Create transaction
        await client.query(
            'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, descricao, tipo, status, taxa_iva_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [adminId, loan.student_id, loan.amount, 'Empréstimo Aprovado', 'DEBITO', 'APROVADA', 'isento']
        );

        await client.query('COMMIT');
        res.json({ message: 'Empréstimo aprovado com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error approving loan:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

const rejectLoan = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows: loanRows } = await db.query('SELECT * FROM student_loans WHERE id = $1', [id]);
        if (loanRows.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        const loan = loanRows[0];

        if (loan.status !== 'PENDING') {
            return res.status(400).json({ error: `O empréstimo já foi ${loan.status}.` });
        }

        await db.query('UPDATE student_loans SET status = \'REJECTED\', updated_at = now() WHERE id = $1', [id]);
        res.json({ message: 'Empréstimo rejeitado com sucesso!' });

    } catch (err) {
        console.error('Error rejecting loan:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStudentLoansByStudentId = async (req, res) => {
    const student_id = req.user.id;
    try {
        const { rows } = await db.query(`
            SELECT 
                sl.*, 
                cp.name as product_name
            FROM 
                student_loans sl
            JOIN 
                credit_products cp ON sl.credit_product_id = cp.id
            WHERE 
                sl.student_id = $1
            ORDER BY 
                sl.created_at DESC
        `, [student_id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching student loans:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const repayLoan = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const student_id = req.user.id;
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { rows: loanRows } = await client.query('SELECT * FROM student_loans WHERE id = $1 AND student_id = $2', [id, student_id]);
        if (loanRows.length === 0) {
            return res.status(404).json({ error: 'Empréstimo não encontrado.' });
        }
        const loan = loanRows[0];

        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ error: 'Este empréstimo não está ativo.' });
        }

        const repaymentAmount = parseFloat(amount);
        if (isNaN(repaymentAmount) || repaymentAmount <= 0) {
            return res.status(400).json({ error: 'Montante de pagamento inválido.' });
        }

        const outstandingAmount = parseFloat(loan.amount) - parseFloat(loan.paid_amount || 0);
        if (repaymentAmount > outstandingAmount) {
            return res.status(400).json({ error: `O montante a pagar não pode exceder o valor em dívida de ${outstandingAmount}.` });
        }

        // Debit student account
        await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [repaymentAmount, student_id]);

        // Get admin user
        const { rows: adminRows } = await client.query('SELECT id FROM users WHERE tipo_utilizador = \'ADMIN\' LIMIT 1');
        if (adminRows.length === 0) {
            return res.status(500).json({ error: 'Utilizador admin não encontrado.' });
        }
        const adminId = adminRows[0].id;

        // Create transaction
        await client.query(
            'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, descricao, tipo, status, taxa_iva_ref) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [student_id, adminId, repaymentAmount, 'Pagamento de Empréstimo', 'DEBITO', 'APROVADA', 'isento']
        );

        // Update loan
        const newPaidAmount = parseFloat(loan.paid_amount || 0) + repaymentAmount;
        const newStatus = newPaidAmount >= parseFloat(loan.amount) ? 'PAID' : 'ACTIVE';
        await client.query('UPDATE student_loans SET paid_amount = $1, status = $2, updated_at = now() WHERE id = $3', [newPaidAmount, newStatus, id]);

        await client.query('COMMIT');
        res.json({ message: 'Pagamento de empréstimo realizado com sucesso!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error repaying loan:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

module.exports = {
    getStudentLoans,
    applyForLoan,
    approveLoan,
    rejectLoan,
    getStudentLoansByStudentId,
    repayLoan,
};