const pool = require('../config/db');
const client = require('../whatsappClient');

exports.getGroups = async (req, res) => {
  try {
    const chats = await client.getChats();
    const groups = chats
      .filter(chat => chat.isGroup)
      .map(group => ({
        id: group.id._serialized,
        name: group.name || group.nameFormatted || 'Unnamed Group',
        participants: group.participants?.length || 0,
      }));

    res.json(groups); // ✅ return groups directly
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};
