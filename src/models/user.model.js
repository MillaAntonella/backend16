const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  static async create(userData) {
    const {
      nombre,
      email,
      password,
      telefono,
      direccion,
      ciudad,
      codigo_postal,
      rol = 'cliente'
    } = userData;

    const passwordHash = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      `INSERT INTO usuarios 
       (nombre, email, password_hash, telefono, direccion, ciudad, codigo_postal, rol) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, email, passwordHash, telefono, direccion, ciudad, codigo_postal, rol]
    );
    
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id_usuario, nombre, email, telefono, direccion, ciudad, codigo_postal, rol, fecha_registro, activo FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }

  static async update(id, updateData) {
    const allowedFields = ['nombre', 'telefono', 'direccion', 'ciudad', 'codigo_postal'];
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (updates.length === 0) return null;

    values.push(id);
    
    await pool.execute(
      `UPDATE usuarios SET ${updates.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_usuario = ?`,
      values
    );
    
    return this.findById(id);
  }

  static async updateLastAccess(id) {
    await pool.execute(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = ?',
      [id]
    );
  }

  static async comparePassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return false;
    
    return bcrypt.compare(password, user.password_hash);
  }
}

module.exports = UserModel;