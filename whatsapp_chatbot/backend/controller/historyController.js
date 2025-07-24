// controllers/historyController.js
const pool = require('../config/db');

exports.getHistory = async (_, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id, 
        m.message, 
        m.numbers, 
        m.category_name, 
        m.timestamp,
        m.image,
        m.voice_note,
        u.id AS user_id, 
        u.name AS user_name, 
        u.email AS user_email
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
      image: row.image || "",
      voice_note: row.voice_note || "",
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
};
