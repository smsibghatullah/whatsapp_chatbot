// middlewares/tokenMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const tokenMiddleware = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const result = await pool.query('SELECT id FROM users WHERE id = $1 AND token = $2', [decoded.id, token]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

module.exports = tokenMiddleware;
