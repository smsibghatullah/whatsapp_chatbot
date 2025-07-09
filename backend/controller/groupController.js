const pool = require('../config/db');
const client = require('../whatsappClient'); 

exports.getGroups = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.syncGroups = async (req, res) => {
  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    console.log("=====================================================")

    for (const group of groups) {
      await pool.query(
        `INSERT INTO groups (name, group_id)
         VALUES ($1, $2)
         ON CONFLICT (group_id) DO NOTHING`,
        [group.name || group.nameFormatted || 'Unnamed Group', group.id._serialized]
      );
    }

    res.json({ success: true, message: `${groups.length} groups synced.` });
  } catch (err) {
    console.error('Error syncing groups:', err);
    res.status(500).json({ error: 'Failed to sync groups' });
  }
};
