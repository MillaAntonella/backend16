const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Obtener todas las categorías
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      `SELECT id_categoria, nombre, slug, descripcion, imagen_url, activa, fecha_creacion 
       FROM categorias WHERE activa = 1 ORDER BY nombre ASC`
    );

    res.json({
      success: true,
      data: categories,
      total: categories.length
    });
  } catch (error) {
    logger.error('Error en getAllCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías'
    });
  }
};

// Obtener categoría por ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await pool.query(
      'SELECT * FROM categorias WHERE id_categoria = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: categories[0]
    });
  } catch (error) {
    logger.error('Error en getCategoryById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría'
    });
  }
};

// Obtener categoría por slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [categories] = await pool.query(
      'SELECT * FROM categorias WHERE slug = ? AND activa = 1',
      [slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: categories[0]
    });
  } catch (error) {
    logger.error('Error en getCategoryBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener categoría'
    });
  }
};

// Crear categoría (admin)
exports.createCategory = async (req, res) => {
  try {
    const { nombre, slug, descripcion, imagen_url } = req.body;

    if (!nombre || !slug) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y slug son obligatorios'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categorias (nombre, slug, descripcion, imagen_url) VALUES (?, ?, ?, ?)',
      [nombre, slug, descripcion || null, imagen_url || null]
    );

    logger.info(`✅ Categoría creada: ${nombre}`);

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: {
        id_categoria: result.insertId,
        nombre,
        slug
      }
    });
  } catch (error) {
    logger.error('Error en createCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear categoría'
    });
  }
};

// Actualizar categoría (admin)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, slug, descripcion, imagen_url, activa } = req.body;

    const updates = [];
    const values = [];

    if (nombre) { updates.push('nombre = ?'); values.push(nombre); }
    if (slug) { updates.push('slug = ?'); values.push(slug); }
    if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion); }
    if (imagen_url !== undefined) { updates.push('imagen_url = ?'); values.push(imagen_url); }
    if (activa !== undefined) { updates.push('activa = ?'); values.push(activa); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE categorias SET ${updates.join(', ')} WHERE id_categoria = ?`,
      values
    );

    logger.info(`✅ Categoría actualizada: ID ${id}`);

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error en updateCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría'
    });
  }
};

// Eliminar categoría (admin)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE categorias SET activa = 0 WHERE id_categoria = ?',
      [id]
    );

    logger.info(`✅ Categoría desactivada: ID ${id}`);

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    logger.error('Error en deleteCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría'
    });
  }
};
