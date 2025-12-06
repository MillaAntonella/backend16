const express = require('express');
const router = express.Router();
const editorialController = require('../controllers/editorial.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/', editorialController.getAllEditorials);

// Rutas admin
router.post('/', authenticate, isAdmin, editorialController.createEditorial);

module.exports = router;
