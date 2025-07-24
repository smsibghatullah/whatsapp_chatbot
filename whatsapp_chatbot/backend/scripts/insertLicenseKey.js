const bcrypt = require('bcrypt');
const pool = require('../config/db');

const insertLicenseKey = async () => {
  const plainKey = 'dynamicsolutionmaker'; 
  const hashedKey = await bcrypt.hash(plainKey, 10);

  try {
    await pool.query(
      'INSERT INTO license_keys (hashed_key, is_active) VALUES ($1, TRUE)',
      [hashedKey]
    );
    console.log('✅ License key inserted successfully.');
  } catch (error) {
    console.error('❌ Error inserting license key:', error);
  } finally {
    pool.end(); // close DB connection
  }
};

insertLicenseKey();
