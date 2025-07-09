// controllers/contactController.js
const pool = require('../config/db');

// Get contacts with categories as array
exports.getContacts = async (_, res) => {
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
};

// Add contact
exports.addContact = async (req, res) => {
  const { name, number, categories } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

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
};

// Update contact
exports.updateContact = async (req, res) => {
  const { id } = req.params;
  const { name, number, categories } = req.body;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const duplicateCheck = await client.query(
        'SELECT id FROM contacts WHERE number = $1 AND id != $2',
        [number, id]
      );
      if (duplicateCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Another contact with this number already exists' });
      }

      await client.query(
        'UPDATE contacts SET name = $1, number = $2 WHERE id = $3',
        [name, number, id]
      );

      await client.query(
        'DELETE FROM contact_categories WHERE contact_id = $1',
        [id]
      );

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
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete contact
exports.deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
