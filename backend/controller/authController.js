// controllers/authController.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const client = require('../whatsappClient');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });

    await pool.query('UPDATE users SET token = $1 WHERE id = $2', [token, user.id]);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyToken = async (req, res) => {
    const { token, license_key } = req.body;
    console.log(token, license_key,"========================================================token, license_key================")
    if (!token || !license_key) {
      return res.status(400).json({ valid: false, error: 'Token or license key missing' });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
  
      const userResult = await pool.query('SELECT id FROM users WHERE id = $1 AND token = $2', [
        decoded.id,
        token,
      ]);
  
      if (userResult.rows.length === 0) {
        return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
      }
  
      const licenseResult = await pool.query('SELECT hashed_key FROM license_keys WHERE is_active = TRUE');
  
      let matchFound = false;
  
      for (let row of licenseResult.rows) {
        const isMatch = await bcrypt.compare(license_key, row.hashed_key);
        if (isMatch) {
          matchFound = true;
          break;
        }
      }
  
      if (!matchFound) {
        return res.status(403).json({ valid: false, error: 'Invalid or inactive license key' });
      }
  
      return res.json({ valid: true });
  
    } catch (err) {
      console.error('Token/license verification failed:', err);
      return res.status(401).json({ valid: false, error: 'Verification failed' });
    }
  };

exports.logoutWhatsapp = async (req, res) => {
  try {
    await client.logout();
    console.log("✅ WhatsApp session logged out.");

    setTimeout(() => {
      client.initialize();
      console.log("🔄 Re-initializing WhatsApp client...");
    }, 2000);

    res.json({ success: true, message: 'Logged out and reinitializing for QR.' });
  } catch (error) {
    console.error('❌ Error during WhatsApp logout:', error);
    res.status(500).json({ error: 'Failed to logout WhatsApp session' });
  }
};
