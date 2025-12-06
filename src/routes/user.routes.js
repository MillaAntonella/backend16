const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');
console.log(userController);
console.log('authenticate:', authenticate);
console.log('isAdmin:', isAdmin);


// Rutas públicas
router.post('/registro', userController.register);
router.post('/login', userController.login);
router.post('/google-login', userController.googleLogin);

// Rutas protegidas
router.get('/perfil', authenticate, userController.getProfile);
router.put('/perfil', authenticate, userController.updateProfile);

// Rutas admin
router.get('/', authenticate, isAdmin, userController.getAllUsers);
router.get('/:id', authenticate, isAdmin, userController.getUserById);
router.put('/:id/estado', authenticate, isAdmin, userController.toggleUserStatus);

module.exports = router;
