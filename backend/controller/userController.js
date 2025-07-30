const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Add new user
exports.addUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users
exports.getAllUsers = async (_, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, image FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user by ID
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, image } = req.body;

  const allowedRoles = ['admin', 'user'];
  const normalizedRole = role?.trim().toLowerCase();

  if (!name || !email || !normalizedRole) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role. Allowed roles are admin or user.' });
  }

  try {
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists for another user' });
    }

    let query, values;

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE users 
        SET name = $1, email = $2, password = $3, role = $4, image = $5
        WHERE id = $6 
        RETURNING id, name, email, role, image
      `;
      values = [name, email, hashedPassword, normalizedRole, image, id];
    } else {
      query = `
        UPDATE users 
        SET name = $1, email = $2, role = $3, image = $4
        WHERE id = $5 
        RETURNING id, name, email, role, image
      `;
      values = [name, email, normalizedRole, image, id];
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user password
exports.updatePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.trim() === '') {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email, role',
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
