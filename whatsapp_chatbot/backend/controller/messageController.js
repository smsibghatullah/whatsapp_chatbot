const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { MessageMedia } = require('whatsapp-web.js');
const pool = require('../config/db');
const client = require('../whatsappClient'); 

exports.sendTextOrImage = async (req, res) => {
    console.log("========================================pppppppppppppppppppppppp======================================")
  const { numbers, message, category, userId } = req.body;
  const image = req.files?.image?.[0]?.path || null;

  try {
    let contactsNumbers = [];

    if (category) {
      const result = await pool.query(`
        SELECT contacts.number FROM contacts
        JOIN contact_categories ON contacts.id = contact_categories.contact_id
        JOIN categories ON contact_categories.category_id = categories.id
        WHERE categories.id = $1
      `, [category]);
      contactsNumbers = result.rows.map(r => r.number);
    } else {
      contactsNumbers = numbers ? JSON.parse(numbers) : [];
    }

    for (const number of contactsNumbers) {
      const formatted = number.replace(/\D/g, '') + '@c.us';

      if (image && fs.existsSync(image)) {
        const media = MessageMedia.fromFilePath(image);
        await client.sendMessage(formatted, media, { caption: message });
      } else if (message) {
        await client.sendMessage(formatted, message);
      }
    }

    await pool.query(
      'INSERT INTO messages (message, numbers, category_name, user_id, image) VALUES ($1, $2, $3, $4, $5)',
      [message, contactsNumbers, category || null, userId || null, image]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error in sendTextOrImage:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.sendVoice = async (req, res) => {
  const { numbers, userId, category } = req.body;
  const voicePath = req.files?.voice_note?.[0]?.path || null;

  try {
    let contactsNumbers = [];

    if (category) {
      const result = await pool.query(`
        SELECT contacts.number FROM contacts
        JOIN contact_categories ON contacts.id = contact_categories.contact_id
        JOIN categories ON contact_categories.category_id = categories.id
        WHERE categories.id = $1
      `, [category]);
      contactsNumbers = result.rows.map(r => r.number);
    } else {
      contactsNumbers = numbers ? JSON.parse(numbers) : [];
    }

    let convertedVoicePath = null;
    if (voicePath && voicePath.endsWith('.webm')) {
      convertedVoicePath = voicePath.replace('.webm', '.ogg');
      await new Promise((resolve, reject) => {
        ffmpeg(voicePath)
          .toFormat('ogg')
          .audioCodec('libopus')
          .on('end', resolve)
          .on('error', reject)
          .save(convertedVoicePath);
      });
    }

    for (const number of contactsNumbers) {
      const formatted = number.replace(/\D/g, '') + '@c.us';

      if (convertedVoicePath && fs.existsSync(convertedVoicePath)) {
        const media = MessageMedia.fromFilePath(convertedVoicePath);
        await client.sendMessage(formatted, media);
      }
    }

    await pool.query(
      'INSERT INTO messages (message, numbers, category_name, user_id, voice_note) VALUES ($1, $2, $3, $4, $5)',
      ['Voice note', contactsNumbers, category || null, userId || null, convertedVoicePath || voicePath]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error in sendVoice:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
