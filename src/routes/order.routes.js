const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');

// Rutas de usuario autenticado
router.post('/', authenticate, orderController.createOrder);
router.get('/mis-pedidos', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);

// Rutas admin
router.get('/', authenticate, isAdmin, orderController.getAllOrders);
router.put('/:id/estado', authenticate, isAdmin, orderController.updateOrderStatus);

module.exports = router;