const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

exports.getAllEditorials = async (req, res) => {
  try {
    const [editorials] = await pool.query(
      'SELECT * FROM editoriales WHERE activa = 1 ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: editorials,
      total: editorials.length
    });
  } catch (error) {
    logger.error('Error en getAllEditorials:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener editoriales'
    });
  }
};

exports.createEditorial = async (req, res) => {
  try {
    const { nombre, pais, sitio_web } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es obligatorio'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO editoriales (nombre, pais, sitio_web) VALUES (?, ?, ?)',
      [nombre, pais || null, sitio_web || null]
    );

    logger.info(`✅ Editorial creada: ${nombre}`);

    res.status(201).json({
      success: true,
      message: 'Editorial creada exitosamente',
      data: { id_editorial: result.insertId, nombre }
    });
  } catch (error) {
    logger.error('Error en createEditorial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear editorial'
    });
  }
};
