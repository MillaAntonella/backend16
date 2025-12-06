const helpers = {
  // Generar respuesta estandarizada
  createResponse: (success, message, data = null, meta = null) => {
    const response = { success, message };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    return response;
  },

  // Manejar errores asíncronos
  asyncHandler: (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  },

  // Generar número de pedido único
  generateOrderNumber: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  },

  // Calcular totales del carrito
  calculateCartTotals: (items) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.precio_unitario * item.cantidad);
    }, 0);

    const impuestos = subtotal * 0.16; // 16% IVA
    const costoEnvio = subtotal > 500 ? 0 : 50; // Envío gratis sobre $500
    const total = subtotal + impuestos + costoEnvio;

    return {
      subtotal,
      impuestos,
      costoEnvio,
      total,
      items: items.length
    };
  },

  // Formatear fecha
  formatDate: (date, includeTime = true) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };

    return new Date(date).toLocaleDateString('es-MX', options);
  },

  // Validar y sanitizar entrada
  sanitizeInput: (input) => {
    if (typeof input === 'string') {
      return input.trim().replace(/[<>]/g, '');
    }
    return input;
  },

  // Paginar resultados
  paginate: (array, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    const totalPages = Math.ceil(array.length / limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: array.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
};

module.exports = helpers;