const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authValidations } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.post('/register', authValidations.register, AuthController.register);
router.post('/login', authValidations.login, AuthController.login);

// Rutas protegidas
router.get('/profile', authMiddleware.authenticate, AuthController.getProfile);
router.put('/profile', authMiddleware.authenticate, AuthController.updateProfile);

module.exports = router;