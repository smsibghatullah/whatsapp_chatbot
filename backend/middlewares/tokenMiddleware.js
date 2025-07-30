// middlewares/tokenMiddleware.js
const jwt = require('jsonwebtoken');

const tokenMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    console.log("❌ No Authorization header found");
    return res.status(401).json({ error: 'Token missing' });
  }

  const token = authHeader.split(' ')[1];
  console.log("🔑 Received token:", token);

  if (!token) {
    console.log("❌ Token missing after split");
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    console.log("✅ Decoded token:", decoded);

    // Attach user info to req
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = tokenMiddleware;
