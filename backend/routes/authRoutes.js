// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

router.post('/login', authController.login);
router.post('/verify-token', authController.verifyToken);
router.post('/logout-whatsapp', authController.logoutWhatsapp);

module.exports = router;
