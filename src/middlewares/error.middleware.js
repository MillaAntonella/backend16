const errorMiddleware = {
  // Middleware para manejar errores 404
  notFound: (req, res, next) => {
    const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
    error.status = 404;
    next(error);
  },

  // Middleware para manejar errores generales
  errorHandler: (err, req, res, next) => {
    const statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    const errorResponse = {
      success: false,
      message: err.message || 'Error interno del servidor',
      ...(isProduction ? {} : { stack: err.stack })
    };

    // Log del error en desarrollo
    if (!isProduction) {
      console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
      });
    }

    // Manejo de errores específicos de la base de datos
    if (err.code === 'ER_DUP_ENTRY') {
      errorResponse.message = 'El registro ya existe';
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorResponse.message = 'Referencia a registro no existente';
    } else if (err.code === 'ER_DATA_TOO_LONG') {
      errorResponse.message = 'Datos demasiado largos para la columna';
    }

    res.status(statusCode).json(errorResponse);
  },

  // Middleware para validar JSON
  validateJSON: (err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        success: false,
        message: 'JSON inválido en el cuerpo de la solicitud'
      });
    }
    next(err);
  }
};

module.exports = errorMiddleware;