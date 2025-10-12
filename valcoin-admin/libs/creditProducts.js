const db = require('./db');

const getCreditProducts = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM credit_products ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching credit products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCreditProduct = async (req, res) => {
    const { name, interest_rate, max_amount, term_months, is_active } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO credit_products (name, interest_rate, max_amount, term_months, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, interest_rate, max_amount, term_months, is_active]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating credit product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateCreditProduct = async (req, res) => {
    const { id } = req.params;
    const { name, interest_rate, max_amount, term_months, is_active } = req.body;
    try {
        const { rows } = await db.query(
            'UPDATE credit_products SET name = $1, interest_rate = $2, max_amount = $3, term_months = $4, is_active = $5 WHERE id = $6 RETURNING *',
            [name, interest_rate, max_amount, term_months, is_active, id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: 'Credit product not found' });
        }
    } catch (err) {
        console.error('Error updating credit product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteCreditProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM credit_products WHERE id = $1', [id]);
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Credit product not found' });
        }
    } catch (err) {
        console.error('Error deleting credit product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getCreditProducts,
    createCreditProduct,
    updateCreditProduct,
    deleteCreditProduct,
};
