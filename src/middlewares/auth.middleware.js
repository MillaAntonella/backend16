const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authMiddleware = {
  // Middleware para verificar token JWT
  authenticate: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    jwt.verify(token, env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }

      req.user = user;
      next();
    });
  },

  // Middleware para verificar rol de admin
  isAdmin: (req, res, next) => {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador'
      });
    }
    next();
  },

  // Middleware para verificar que es el usuario mismo o admin
  authorizeSelfOrAdmin: (req, res, next) => {
    const requestedUserId = parseInt(req.params.userId || req.params.id);

    if (req.user.rol !== 'admin' && req.user.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }
    next();
  }
};

module.exports = authMiddleware;
