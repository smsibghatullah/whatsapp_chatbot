// controllers/licenseController.js
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Helper function
const verifyLicenseKey = async (key) => {
  if (!key) return false;

  const result = await pool.query('SELECT hashed_key FROM license_keys WHERE is_active = TRUE');

  for (const row of result.rows) {
    const match = await bcrypt.compare(key, row.hashed_key);
    console.log(match,"match==================================================")
    if (match) return true;
  }

  return false;
};

exports.validateLicense = async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ valid: false, error: 'License key is required' });
  }
  console.log(licenseKey,"=========================================================")
  try {
    const isValid = await verifyLicenseKey(licenseKey);
    res.json({ valid: isValid });
  } catch (err) {
    console.error('License validation error:', err);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
};

exports.verifyLicenseKey = verifyLicenseKey;
