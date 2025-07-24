// middlewares/licenseMiddleware.js
const { verifyLicenseKey } = require('../controller/licenseController');

const licenseMiddleware = async (req, res, next) => {
  const licenseKey = req.headers['license_key'] || req.headers['x-license-key'];

  const isValid = await verifyLicenseKey(licenseKey);

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid or missing license key' });
  }

  next();
};

module.exports = licenseMiddleware;
