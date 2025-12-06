const express = require('express');
const router = express.Router();
const dbSetup = require('../database/setup');

// Middleware para bloquear en producción
const developmentOnly = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Esta operación solo está disponible en modo desarrollo'
    });
  }
  next();
};

// Verificar estado de la base de datos
router.get('/status', developmentOnly, async (req, res) => {
  try {
    const tables = await dbSetup.checkExistingTables();
    
    res.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV,
        database: process.env.DB_NAME,
        existingTables: tables,
        totalTables: tables.length,
        isProduction: process.env.NODE_ENV === 'production'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado',
      error: error.message
    });
  }
});

// Crear todas las tablas
router.post('/setup', developmentOnly, async (req, res) => {
  try {
    const result = await dbSetup.setupCompleteDatabase();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al configurar base de datos',
      error: error.message
    });
  }
});

// Crear solo una tabla específica
router.post('/create-table/:tableName', developmentOnly, async (req, res) => {
  const { tableName } = req.params;
  
  try {
    // Aquí podrías agregar lógica para crear tablas específicas
    res.json({
      success: true,
      message: `Función para crear tabla ${tableName} (por implementar)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear tabla',
      error: error.message
    });
  }
});

// Insertar datos iniciales
router.post('/seed', developmentOnly, async (req, res) => {
  try {
    await dbSetup.insertInitialData();
    
    res.json({
      success: true,
      message: 'Datos iniciales insertados exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al insertar datos iniciales',
      error: error.message
    });
  }
});

module.exports = router;