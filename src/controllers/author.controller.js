const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Obtener todos los autores
exports.getAllAuthors = async (req, res) => {
  try {
    const [authors] = await pool.query(
      'SELECT * FROM autores WHERE activo = 1 ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: authors,
      total: authors.length
    });
  } catch (error) {
    logger.error('Error en getAllAuthors:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener autores'
    });
  }
};

// Obtener autor por ID
exports.getAuthorById = async (req, res) => {
  try {
    const { id } = req.params;

    const [authors] = await pool.query(
      'SELECT * FROM autores WHERE id_autor = ?',
      [id]
    );

    if (authors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Autor no encontrado'
      });
    }

    res.json({
      success: true,
      data: authors[0]
    });
  } catch (error) {
    logger.error('Error en getAuthorById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener autor'
    });
  }
};

// Crear autor (admin)
exports.createAuthor = async (req, res) => {
  try {
    const { nombre, biografia, imagen_url, nacionalidad, fecha_nacimiento } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO autores (nombre, biografia, imagen_url, nacionalidad, fecha_nacimiento) VALUES (?, ?, ?, ?, ?)',
      [nombre, biografia || null, imagen_url || null, nacionalidad || null, fecha_nacimiento || null]
    );

    logger.info(`✅ Autor creado: ${nombre}`);

    res.status(201).json({
      success: true,
      message: 'Autor creado exitosamente',
      data: { id_autor: result.insertId, nombre }
    });
  } catch (error) {
    logger.error('Error en createAuthor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear autor'
    });
  }
};

// Actualizar autor (admin)
exports.updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, biografia, imagen_url, nacionalidad, fecha_nacimiento } = req.body;

    const updates = [];
    const values = [];

    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (biografia !== undefined) { updates.push('biografia = ?'); values.push(biografia); }
    if (imagen_url !== undefined) { updates.push('imagen_url = ?'); values.push(imagen_url); }
    if (nacionalidad !== undefined) { updates.push('nacionalidad = ?'); values.push(nacionalidad); }
    if (fecha_nacimiento !== undefined) { updates.push('fecha_nacimiento = ?'); values.push(fecha_nacimiento); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE autores SET ${updates.join(', ')} WHERE id_autor = ?`,
      values
    );

    logger.info(`✅ Autor actualizado: ID ${id}`);

    res.json({
      success: true,
      message: 'Autor actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error en updateAuthor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar autor'
    });
  }
};

// Eliminar autor (admin)
exports.deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE autores SET activo = 0 WHERE id_autor = ?',
      [id]
    );

    logger.info(`✅ Autor desactivado: ID ${id}`);

    res.json({
      success: true,
      message: 'Autor eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error en deleteAuthor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar autor'
    });
  }
};
