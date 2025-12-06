const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array()
    });
  };
};

// Validaciones para autenticación
const authValidations = {
  register: validate([
    body('nombre').notEmpty().withMessage('El nombre es requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol').optional().isIn(['cliente', 'admin']).withMessage('Rol inválido')
  ]),

  login: validate([
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ])
};

// Validaciones para productos
const productValidations = {
  createProduct: validate([
    body('titulo').notEmpty().withMessage('El título es requerido'),
    body('precio').isFloat({ gt: 0 }).withMessage('El precio debe ser mayor a 0'),
    body('id_autor').isInt().withMessage('ID de autor inválido'),
    body('id_editorial').isInt().withMessage('ID de editorial inválido'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido'),
    body('categorias').optional().isArray().withMessage('Las categorías deben ser un array')
  ]),

  updateProduct: validate([
    param('id').isInt().withMessage('ID de producto inválido'),
    body('precio').optional().isFloat({ gt: 0 }).withMessage('Precio inválido'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock inválido')
  ]),

  getProducts: validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Límite inválido'),
    query('precio_min').optional().isFloat({ min: 0 }).withMessage('Precio mínimo inválido'),
    query('precio_max').optional().isFloat({ min: 0 }).withMessage('Precio máximo inválido')
  ])
};

// Validaciones para carrito
const cartValidations = {
  addToCart: validate([
    body('id_libro').isInt().withMessage('ID de libro inválido'),
    body('cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad inválida')
  ]),

  updateCartItem: validate([
    param('itemId').isInt().withMessage('ID de item inválido'),
    body('cantidad').isInt({ min: 0 }).withMessage('Cantidad inválida')
  ])
};

// Validaciones para pedidos
const orderValidations = {
  createOrder: validate([
    body('direccion_envio').notEmpty().withMessage('La dirección de envío es requerida'),
    body('ciudad_envio').notEmpty().withMessage('La ciudad de envío es requerida'),
    body('codigo_postal_envio').notEmpty().withMessage('El código postal es requerido'),
    body('telefono_contacto').notEmpty().withMessage('El teléfono de contacto es requerido'),
    body('metodo_pago').optional().isIn(['tarjeta', 'paypal', 'transferencia', 'efectivo'])
  ]),

  updateOrderStatus: validate([
    param('id').isInt().withMessage('ID de pedido inválido'),
    body('estado').isIn(['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'])
      .withMessage('Estado inválido')
  ])
};

module.exports = {
  validate,
  authValidations,
  productValidations,
  cartValidations,
  orderValidations,
  handleValidationErrors: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors.array()
      });
    }
    next();
  }
};