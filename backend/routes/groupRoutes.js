const express = require('express');
const router = express.Router();
const groupController = require('../controller/groupController');

router.get('/', groupController.getGroups);

router.post('/sync', groupController.syncGroups);

module.exports = router;
