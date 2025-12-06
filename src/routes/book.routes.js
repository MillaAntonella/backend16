const express = require('express');
const router = express.Router();
const bookController = require('../controllers/book.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/', bookController.getAllBooks);
router.get('/destacados', bookController.getFeaturedBooks);
router.get('/buscar', bookController.searchBooks);
router.get('/slug/:slug', bookController.getBookBySlug);
router.get('/:id', bookController.getBookById);
router.get('/categoria/:id', bookController.getBooksByCategory);
router.get('/categoria/slug/:slug', bookController.getBooksByCategorySlug);

// Rutas admin
router.post('/', authenticate, isAdmin, bookController.createBook);
router.put('/:id', authenticate, isAdmin, bookController.updateBook);
router.delete('/:id', authenticate, isAdmin, bookController.deleteBook);

module.exports = router;
