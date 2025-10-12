const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateStoreJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            if (user.tipo_utilizador !== 'ALUNO' && user.tipo_utilizador !== 'PROFESSOR') {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const createStoreTransaction = async (req, res) => {
    const utilizador_origem_id = req.user.id;
    const { utilizador_destino_id, montante, descricao, taxa_iva_ref } = req.body;

    console.log('Transaction request:', { utilizador_origem_id, utilizador_destino_id, montante, descricao, taxa_iva_ref });

    if (!utilizador_destino_id || !montante || !descricao) {
        return res.status(400).json({ error: 'Dados obrigatórios em falta' });
    }

    const parsedMontante = parseFloat(montante);
    if (isNaN(parsedMontante) || parsedMontante <= 0) {
        console.log('Invalid montante:', montante);
        return res.status(400).json({ error: 'Montante inválido' });
    }

    try {
        const { rows: destinoRows } = await db.query('SELECT * FROM users WHERE id = $1', [utilizador_destino_id]);
        if (destinoRows.length === 0) {
            return res.status(404).json({ error: 'Utilizador destino não encontrado' });
        }

        const { rows: origemRows } = await db.query('SELECT * FROM users WHERE id = $1', [utilizador_origem_id]);
        if (origemRows.length === 0) {
            return res.status(404).json({ error: 'Utilizador origem não encontrado' });
        }

        const saldo = parseFloat(origemRows[0].saldo); // Ensure saldo is a number
        console.log('User balance check:', { utilizador_origem_id, saldo, montante: parsedMontante });

        if (isNaN(saldo) || saldo < parsedMontante) {
            console.log('Insufficient balance:', { saldo, montante: parsedMontante });
            return res.status(400).json({ error: 'Saldo insuficiente', details: `Saldo: ${saldo}, Necessário: ${parsedMontante}` });
        }

        const transactionGroupId = uuidv4();
        
        const { rows } = await db.query(
            'INSERT INTO transactions (transaction_group_id, utilizador_origem_id, utilizador_destino_id, montante, descricao, tipo, status, taxa_iva_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [transactionGroupId, utilizador_origem_id, utilizador_destino_id, parsedMontante, descricao, 'DEBITO', 'APROVADA', taxa_iva_ref || 'isento']
        );
        const newTransaction = rows[0];

        // Uncomment to ensure balance updates
        // await updateUserBalancesOnApproval(newTransaction);

        res.status(201).json(newTransaction);
    } catch (err) {
        console.error('Transaction error:', err);
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
};

module.exports = {
    authenticateStoreJWT,
    createStoreTransaction
};
