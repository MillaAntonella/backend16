const express = require('express');
const router = express.Router();
const authorController = require('../controllers/author.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/', authorController.getAllAuthors);
router.get('/:id', authorController.getAuthorById);

// Rutas admin
router.post('/', authenticate, isAdmin, authorController.createAuthor);
router.put('/:id', authenticate, isAdmin, authorController.updateAuthor);
router.delete('/:id', authenticate, isAdmin, authorController.deleteAuthor);

module.exports = router;
