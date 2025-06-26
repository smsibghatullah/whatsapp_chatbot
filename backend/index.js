require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const pool = require('./config/db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// WhatsApp client setup
const client = new Client({ 
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox'] }
});

client.on('qr', async qr => {
  const qrCode = await QRCode.toDataURL(qr);
  io.emit('qr', qrCode);
});

client.on('ready', () => {
  console.log('✅ WhatsApp Connected');
  io.emit('ready');
});

client.initialize();

// --- API Endpoints ---
app.use('/images', express.static(__dirname + '/images'));

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Optional: Create a JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        image: user.image
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add user
app.post('/api/users', async (req, res) => {
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
});

// Get all users
app.get('/api/users', async (_, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role,image FROM users ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user by id (name, email, role only; no password update here)
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, image } = req.body; 

  const allowedRoles = ['admin', 'user'];
  const normalizedRole = role?.trim().toLowerCase();
  console.log(image)

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
});



// Delete user by id
app.delete('/api/users/:id', async (req, res) => {
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
});

app.put('/api/users/:id/password', async (req, res) => {
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
});



// Get all categories
app.get('/api/categories', async (_, res) => {
  const result = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json(result.rows);
});

// Add category
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;

  try {
    // Check if category already exists (case-insensitive)
    const exists = await pool.query(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // Insert new category
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Check for duplicate (optional for update)
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
});

// Delete category
app.delete('/api/categories/:id', async (req, res) => {
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

    // Foreign key constraint violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: '❌ Category is already used in contacts and cannot be deleted.'
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get contacts with categories as array
app.get('/api/contacts', async (_, res) => {
  try {
    const result = await pool.query(`
      SELECT contacts.id, contacts.name, contacts.number,
             COALESCE(json_agg(json_build_object('id', categories.id, 'name', categories.name)) FILTER (WHERE categories.id IS NOT NULL), '[]') AS categories
      FROM contacts
      LEFT JOIN contact_categories ON contacts.id = contact_categories.contact_id
      LEFT JOIN categories ON contact_categories.category_id = categories.id
      GROUP BY contacts.id
      ORDER BY contacts.name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contacts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add contact with duplicate check
app.post('/api/contacts', async (req, res) => {
  const { name, number, categories } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check for duplicate number
      const existing = await client.query('SELECT id FROM contacts WHERE number = $1', [number]);
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Contact number already exists' });
      }

      const insertContact = await client.query(
        'INSERT INTO contacts (name, number) VALUES ($1, $2) RETURNING id, name, number',
        [name, number]
      );
      const contactId = insertContact.rows[0].id;

      if (categories && categories.length > 0) {
        const insertCategoriesQuery = `
          INSERT INTO contact_categories (contact_id, category_id)
          VALUES ${categories.map((_, i) => `($1, $${i + 2})`).join(', ')}
        `;
        await client.query(insertCategoriesQuery, [contactId, ...categories]);
      }

      await client.query('COMMIT');
      res.json({ id: contactId, name, number, categories: categories || [] });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error adding contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update contact with multiple categories, and prevent duplicate numbers
app.put('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, number, categories } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 🚫 Check if another contact has the same number
      const duplicateCheck = await client.query(
        'SELECT id FROM contacts WHERE number = $1 AND id != $2',
        [number, id]
      );

      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Another contact with this number already exists' });
      }

      // ✅ Proceed to update contact
      await client.query(
        'UPDATE contacts SET name = $1, number = $2 WHERE id = $3',
        [name, number, id]
      );

      // 🧹 Remove old categories
      await client.query(
        'DELETE FROM contact_categories WHERE contact_id = $1',
        [id]
      );

      // ➕ Insert new category links
      if (categories && categories.length > 0) {
        const insertCategoriesQuery = `
          INSERT INTO contact_categories (contact_id, category_id)
          VALUES ${categories.map((_, i) => `($1, $${i + 2})`).join(', ')}
        `;
        await client.query(insertCategoriesQuery, [id, ...categories]);
      }

      await client.query('COMMIT');
      res.json({ id, name, number, categories: categories || [] });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction error during update:', err);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete contact
app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get message history
app.get('/api/history', async (_, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.message, m.numbers, m.category_name, m.timestamp,
             u.id AS user_id, u.name AS user_name, u.email AS user_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.timestamp DESC
      LIMIT 100
    `);

    const history = result.rows.map(row => ({
      id: row.id,
      message: row.message,
      numbers: row.numbers,
      categoryName: row.category_name,
      timestamp: row.timestamp,
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email
      } : null
    }));

    res.json(history);
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Send WhatsApp message and store history (with user)
app.post('/api/send', async (req, res) => {
  const { numbers, message, category, userId } = req.body;
  let contactsNumbers = numbers || [];
  let categoryName = null;

  try {
    if (category) {
      const result = await pool.query(`
        SELECT contacts.number, contacts.name
        FROM contacts
        JOIN contact_categories ON contacts.id = contact_categories.contact_id
        JOIN categories ON contact_categories.category_id = categories.id
        WHERE categories.id = $1
      `, [category]);

      contactsNumbers = result.rows.map(r => r.number);

      const cat = await pool.query('SELECT name FROM categories WHERE id = $1', [category]);
      categoryName = cat.rows[0]?.name || null;
    }

    for (const number of contactsNumbers) {
      const cleaned = number.replace(/\D/g, '');
      if (!cleaned) continue;
      const formatted = cleaned + '@c.us';

      try {
        await client.sendMessage(formatted, message);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    // Save message with user
    console.log(userId,"=========================================")
    await pool.query(
      'INSERT INTO messages (message, numbers, category_name, user_id) VALUES ($1, $2, $3, $4)',
      [message, contactsNumbers, categoryName, userId || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error in /api/send:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Start server
const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
