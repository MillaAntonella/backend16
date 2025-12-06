const mysql = require('mysql2/promise');
const env = require('./env');
const { logger } = require('../utils/logger');

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  connectTimeout: 10000
});

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('✅ Conexión a la base de datos exitosa');
    logger.info(`📊 Base de datos: ${env.DB_NAME}`);
    
    // Verificar que las tablas existen
    const [tables] = await connection.query('SHOW TABLES');
    logger.info(`📋 Tablas encontradas: ${tables.length}`);
    
    connection.release();
    return true;
  } catch (error) {
    logger.error('❌ Error al conectar a la base de datos:', error.message);
    throw error;
  }
};

module.exports = { pool, testConnection };