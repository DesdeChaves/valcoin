const db = require('./db');

const getAllCategories = async () => {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    return rows;
};

const createCategory = async ({ name, is_deductible, max_deduction_value }) => {
    const { rows } = await db.query(
        'INSERT INTO categories (name, is_deductible, max_deduction_value) VALUES ($1, $2, $3) RETURNING *',
        [name, is_deductible, max_deduction_value]
    );
    return rows[0];
};

const updateCategory = async (id, { name, is_deductible, max_deduction_value }) => {
    const { rows } = await db.query(
        `UPDATE categories 
         SET name = $1, is_deductible = $2, max_deduction_value = $3, updated_at = now() 
         WHERE id = $4 
         RETURNING *`,
        [name, is_deductible, max_deduction_value, id]
    );
    return rows[0];
};

const deleteCategory = async (id) => {
    const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);
    return rowCount > 0;
};

module.exports = {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
};