const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../config/database');
const env = require('../config/env');
const { logger } = require('../utils/logger');

// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Registrar nuevo usuario
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion, ciudad, codigo_postal } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son obligatorios'
      });
    }

    // Verificar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si el usuario ya existe
    const [existingUser] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Insertar usuario
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, telefono, direccion, ciudad, codigo_postal, rol) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'cliente')`,
      [nombre, email, password_hash, telefono || null, direccion || null, ciudad || null, codigo_postal || null]
    );

    // Generar token
    const token = jwt.sign(
      { id: result.insertId, email, rol: 'cliente' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    logger.info(`✅ Usuario registrado: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id: result.insertId,
        nombre,
        email,
        rol: 'cliente',
        token
      }
    });
  } catch (error) {
    logger.error('Error en register:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario: ' + error.message
    });
  }
};

// Login de usuario
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son obligatorios'
      });
    }

    const [users] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último acceso
    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
      [user.id_usuario]
    );

    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    logger.info(`✅ Login exitoso: ${email}`);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        id: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        token
      }
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
};

// Obtener perfil
exports.getProfile = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id_usuario, nombre, email, telefono, direccion, ciudad, codigo_postal, 
              rol, fecha_registro, ultimo_acceso 
       FROM usuarios WHERE id_usuario = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Error en getProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil'
    });
  }
};

// Actualizar perfil
exports.updateProfile = async (req, res) => {
  try {
    const { nombre, telefono, direccion, ciudad, codigo_postal } = req.body;
    const userId = req.user.id;

    if (!nombre && !telefono && !direccion && !ciudad && !codigo_postal) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar'
      });
    }

    const updates = [];
    const values = [];

    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (telefono) { updates.push('telefono = ?'); values.push(telefono); }
    if (direccion) { updates.push('direccion = ?'); values.push(direccion); }
    if (ciudad) { updates.push('ciudad = ?'); values.push(ciudad); }
    if (codigo_postal) { updates.push('codigo_postal = ?'); values.push(codigo_postal); }

    values.push(userId);

    await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id_usuario = ?`,
      values
    );

    const [users] = await pool.query(
      'SELECT id_usuario, nombre, email, telefono, direccion, ciudad, codigo_postal FROM usuarios WHERE id_usuario = ?',
      [userId]
    );

    logger.info(`✅ Perfil actualizado: Usuario ID ${userId}`);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: users[0]
    });
  } catch (error) {
    logger.error('Error en updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil'
    });
  }
};

// Obtener todos los usuarios (admin)
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id_usuario, nombre, email, telefono, ciudad, rol, activo, fecha_registro, ultimo_acceso 
       FROM usuarios ORDER BY fecha_registro DESC`
    );

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    logger.error('Error en getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios'
    });
  }
};

// Obtener usuario por ID (admin)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      `SELECT id_usuario, nombre, email, telefono, direccion, ciudad, codigo_postal, 
              rol, activo, fecha_registro, ultimo_acceso 
       FROM usuarios WHERE id_usuario = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Error en getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
};

// Activar/desactivar usuario (admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      'SELECT activo FROM usuarios WHERE id_usuario = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const newStatus = users[0].activo ? 0 : 1;

    await pool.query(
      'UPDATE usuarios SET activo = ? WHERE id_usuario = ?',
      [newStatus, id]
    );

    logger.info(`✅ Estado de usuario ${id} cambiado a: ${newStatus ? 'activo' : 'inactivo'}`);

    res.json({
      success: true,
      message: `Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
      data: { activo: newStatus }
    });
  } catch (error) {
    logger.error('Error en toggleUserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado del usuario'
    });
  }
};

// Login con Google (comentado temporalmente)
exports.googleLogin = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Google Login no implementado todavía. Instala: npm install google-auth-library'
  });
};
