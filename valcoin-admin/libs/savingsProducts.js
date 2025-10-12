const db = require('./db');

const getSavingsProducts = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM savings_products ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching savings products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createSavingsProduct = async (req, res) => {
    const { name, description, interest_rate, term_months, payment_frequency, min_deposit, max_deposit, early_withdrawal_penalty, is_active } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO savings_products (name, description, interest_rate, term_months, payment_frequency, payment_period, min_deposit, max_deposit, early_withdrawal_penalty, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [name, description, interest_rate, term_months, payment_frequency, payment_frequency, min_deposit, max_deposit, early_withdrawal_penalty, is_active]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating savings product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSavingsProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, interest_rate, term_months, payment_frequency, min_deposit, max_deposit, early_withdrawal_penalty, is_active } = req.body;
    try {
        const { rows } = await db.query(
            'UPDATE savings_products SET name = $1, description = $2, interest_rate = $3, term_months = $4, payment_frequency = $5, payment_period = $6, min_deposit = $7, max_deposit = $8, early_withdrawal_penalty = $9, is_active = $10, updated_at = now() WHERE id = $11 RETURNING *',
            [name, description, interest_rate, term_months, payment_frequency, payment_frequency, min_deposit, max_deposit, early_withdrawal_penalty, is_active, id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Savings product not found' });
        }
    } catch (err) {
        console.error('Error updating savings product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteSavingsProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM savings_products WHERE id = $1', [id]);
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Savings product not found' });
        }
    } catch (err) {
        console.error('Error deleting savings product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getSavingsProducts,
    createSavingsProduct,
    updateSavingsProduct,
    deleteSavingsProduct,
};