const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');
const { productValidations } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

// Rutas públicas
router.get('/', productValidations.getProducts, ProductController.getProducts);
router.get('/search', ProductController.searchProducts);
router.get('/featured', ProductController.getFeaturedProducts);
router.get('/categories', ProductController.getCategories);
router.get('/authors', ProductController.getAuthors);
router.get('/publishers', ProductController.getPublishers);
router.get('/:id', ProductController.getProduct);

// Rutas protegidas (solo admin)
router.post(
  '/',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeAdmin,
  productValidations.createProduct,
  ProductController.createProduct
);

router.put(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeAdmin,
  productValidations.updateProduct,
  ProductController.updateProduct
);

router.delete(
  '/:id',
  authMiddleware.authenticateToken,
  authMiddleware.authorizeAdmin,
  ProductController.deleteProduct
);

module.exports = router;