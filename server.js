const app = require('./src/app');
const env = require('./src/config/env');
const { testConnection } = require('./src/config/database');
const { logger } = require('./src/utils/logger');

// Probar conexión a la base de datos
testConnection().then(() => {
  // Iniciar servidor
  const server = app.listen(env.BACKEND_PORT, () => {
    logger.info('='.repeat(60));
    logger.info('📖 TIENDA DE LIBROS - BACKEND API v1.0');
    logger.info('='.repeat(60));
    logger.info(`🚀 Servidor Backend: http://localhost:${env.BACKEND_PORT}`);
    logger.info(`📚 Entorno: ${env.NODE_ENV}`);
    logger.info(`📊 Base de datos: ${env.DB_NAME} (conectado ✅)`);
    logger.info(`🕐 Iniciado: ${new Date().toLocaleString('es-PE')}`);
    logger.info('='.repeat(60));
  });

  // Manejar shutdown graceful
  const gracefulShutdown = () => {
    logger.info('🛑 Recibida señal de apagado, cerrando servidor...');
    
    server.close(() => {
      logger.info('✅ Servidor cerrado correctamente');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('❌ Forzando cierre del servidor');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  process.on('uncaughtException', (error) => {
    logger.error('❌ Error no capturado:', error);
    gracefulShutdown();
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Promesa rechazada no manejada:', reason);
  });

}).catch((error) => {
  logger.error('❌ Error al iniciar la aplicación:', error);
  logger.error('💡 Verifica tu conexión a la base de datos');
  process.exit(1);
});