// routes/licenseRoutes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controller/licenseController');

router.post('/validate-license', licenseController.validateLicense);

module.exports = router;
