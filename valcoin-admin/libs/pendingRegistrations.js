const db = require('./db');
const bcrypt = require('bcryptjs'); 
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('./email');

// POST /api/external-register
const registerExternalUser = async (req, res) => {
    const { nome, email, password } = req.body;

    if (!nome || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e password são obrigatórios.' });
    }

    try {
        // Check if email already exists in users or pending_registrations
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email já registado.' });
        }
        const existingPending = await db.query('SELECT id FROM pending_registrations WHERE email = $1', [email]);
        if (existingPending.rows.length > 0) {
            return res.status(409).json({ error: 'Email já registado e aguardando aprovação.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newPendingUser = await db.query(
            'INSERT INTO pending_registrations (nome, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [nome, email, passwordHash]
        );

        res.status(201).json({ message: 'Registo enviado para aprovação.', user: newPendingUser.rows[0] });

    } catch (err) {
        console.error('Error registering external user:', err);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
};

// GET /api/pending-registrations
const getPendingRegistrations = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT id, nome, email, status, data_pedido, data_atualizacao FROM pending_registrations WHERE status = $1 ORDER BY data_pedido ASC', ['PENDING']);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching pending registrations:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// PUT /api/pending-registrations/:id/approve
const approvePendingRegistration = async (req, res) => {
    const { id } = req.params;
    const client = await db.getClient(); // Use a client for transaction

    try {
        await client.query('BEGIN');

        const { rows: pendingUserRows } = await client.query('SELECT * FROM pending_registrations WHERE id = $1 AND status = $2 FOR UPDATE', [id, 'PENDING']);

        if (pendingUserRows.length === 0) {
            throw new Error('Registo pendente não encontrado ou já processado.');
        }

        const pendingUser = pendingUserRows[0];
        const numeroMecanografico = `EXT-${Date.now()}`;

        // Create user in the main users table
        const newUser = await client.query(
            'INSERT INTO users (id, nome, email, password_hash, tipo_utilizador, numero_mecanografico) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, tipo_utilizador',
            [uuidv4(), pendingUser.nome, pendingUser.email, pendingUser.password_hash, 'EXTERNO', numeroMecanografico] // Generate a simple mecanografico
        );

        // Update pending_registrations status
        await client.query('UPDATE pending_registrations SET status = $1, data_atualizacao = NOW() WHERE id = $2', ['APPROVED', id]);

        await client.query('COMMIT');
        
        // Send approval email
        const subject = 'A sua inscrição foi aprovada!';
        const html = `
            <p>Olá ${pendingUser.nome},</p>
            <p>A sua inscrição na plataforma foi aprovada com sucesso.</p>
            <p>O seu número mecanográfico é: <strong>${numeroMecanografico}</strong></p>
            <p>Pode agora fazer login utilizando o seu email ou o número mecanográfico e a palavra-passe que definiu no momento do registo.</p>
            <p>Pode aceder à plataforma aqui: <a href="http://aevalpacos.duckdns.org">http://aevalpacos.duckdns.org</a></p>
            <p>Obrigado!</p>
        `;
        await sendEmail(pendingUser.email, subject, html);

        res.json({ message: 'Utilizador externo aprovado com sucesso.', user: newUser.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error approving pending registration:', err);
        res.status(500).json({ error: err.message || 'Internal server error during approval.' });
    } finally {
        client.release();
    }
};

// PUT /api/pending-registrations/:id/reject
const rejectPendingRegistration = async (req, res) => {
    const { id } = req.params;

    try {
        const { rows } = await db.query(
            'UPDATE pending_registrations SET status = $1, data_atualizacao = NOW() WHERE id = $2 AND status = $3 RETURNING *',
            ['REJECTED', id, 'PENDING']
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Registo pendente não encontrado ou já processado.' });
        }

        res.json({ message: 'Registo pendente rejeitado com sucesso.', user: rows[0] });

    } catch (err) {
        console.error('Error rejecting pending registration:', err);
        res.status(500).json({ error: 'Internal server error during rejection.' });
    }
};

module.exports = {
    registerExternalUser,
    getPendingRegistrations,
    approvePendingRegistration,
    rejectPendingRegistration,
};
