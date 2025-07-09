// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controller/contactController');

// Routes
router.get('/', contactController.getContacts);
router.post('/', contactController.addContact);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
