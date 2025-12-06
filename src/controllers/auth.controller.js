const jwt = require('jsonwebtoken');
const env = require('../config/env');
const UserModel = require('../models/user.model');

class AuthController {
  static async register(req, res, next) {
    try {
      const userData = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }

      // Crear usuario
      const user = await UserModel.create(userData);

      // Generar token JWT
      const token = jwt.sign(
        { id: user.id_usuario, email: user.email, rol: user.rol },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      // Actualizar último acceso
      await UserModel.updateLastAccess(user.id_usuario);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            fecha_registro: user.fecha_registro
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Verificar credenciales
      const isValidPassword = await UserModel.comparePassword(email, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Obtener usuario
      const user = await UserModel.findByEmail(email);
      if (!user || !user.activo) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { id: user.id_usuario, email: user.email, rol: user.rol },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      // Actualizar último acceso
      await UserModel.updateLastAccess(user.id_usuario);

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            ultimo_acceso: user.ultimo_acceso
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const updates = req.body;
      const user = await UserModel.update(req.user.id, updates);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;