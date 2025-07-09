// routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const historyController = require('../controller/historyController');

// GET /api/history
router.get('/', historyController.getHistory);

module.exports = router;
