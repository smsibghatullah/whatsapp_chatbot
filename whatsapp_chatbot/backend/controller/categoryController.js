// controllers/categoryController.js
const pool = require('../config/db');

// Get all categories
exports.getAllCategories = async (_, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add new category
exports.addCategory = async (req, res) => {
  const { name } = req.body;

  try {
    const exists = await pool.query(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const duplicate = await pool.query(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name, id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const result = await pool.query(
      'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const check = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });

  } catch (err) {
    console.error('Error deleting category:', err);

    if (err.code === '23503') {
      return res.status(400).json({
        error: '❌ Category is already used in contacts and cannot be deleted.'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};
