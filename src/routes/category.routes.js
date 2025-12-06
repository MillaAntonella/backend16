const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/', categoryController.getAllCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', categoryController.getCategoryById);

// Rutas admin
router.post('/', authenticate, isAdmin, categoryController.createCategory);
router.put('/:id', authenticate, isAdmin, categoryController.updateCategory);
router.delete('/:id', authenticate, isAdmin, categoryController.deleteCategory);

module.exports = router;
