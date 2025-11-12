const db = require('./db');

const getAllCategories = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(rows);
    } catch (err) {
        console.error('Error getting all categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCategory = async (req, res) => {
    const { name, is_deductible, max_deduction_value } = req.body;
    try {
        const { rows } = await db.query(
            'INSERT INTO categories (name, is_deductible, max_deduction_value) VALUES ($1, $2, $3) RETURNING *',
            [name, is_deductible, max_deduction_value]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, is_deductible, max_deduction_value } = req.body;
    try {
        const { rows } = await db.query(
            `UPDATE categories 
             SET name = $1, is_deductible = $2, max_deduction_value = $3, updated_at = now() 
             WHERE id = $4 
             RETURNING *`,
            [name, is_deductible, max_deduction_value, id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);
        if (rowCount > 0) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Category not found' });
        }
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};
