const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');

router.post('/', userController.addUser);                
router.get('/', userController.getAllUsers);             
router.put('/:id', userController.updateUser);           
router.delete('/:id', userController.deleteUser);        
router.put('/:id/password', userController.updatePassword); 

module.exports = router;
