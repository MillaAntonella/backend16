const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

class DatabaseSetup {
  constructor() {
    this.connection = null;
  }

  async connect() {
    this.connection = await pool.getConnection();
  }

  async release() {
    if (this.connection) {
      this.connection.release();
      this.connection = null;
    }
  }

  async createTable(tableName, createSQL) {
    try {
      await this.connection.query(createSQL);
      logger.info(`✅ Tabla "${tableName}" creada/verificada`);
      return true;
    } catch (error) {
      logger.error(`❌ Error al crear tabla "${tableName}":`, error.message);
      throw error;
    }
  }

  async createAllTables() {
    await this.connect();
    
    try {
      logger.info('🛠️  Iniciando creación de tablas...');
      
      // 1. Tabla usuarios
      await this.createTable('usuarios', `
        CREATE TABLE IF NOT EXISTS usuarios (
          id_usuario INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          telefono VARCHAR(20),
          direccion TEXT,
          ciudad VARCHAR(100),
          codigo_postal VARCHAR(10),
          rol ENUM('cliente', 'admin') DEFAULT 'cliente',
          fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
          activo TINYINT(1) DEFAULT 1,
          INDEX idx_email (email),
          INDEX idx_rol (rol)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Tabla categorias
      await this.createTable('categorias', `
        CREATE TABLE IF NOT EXISTS categorias (
          id_categoria INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL UNIQUE,
          slug VARCHAR(120) NOT NULL UNIQUE,
          descripcion TEXT,
          imagen_url VARCHAR(255),
          activa TINYINT(1) DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_slug (slug),
          INDEX idx_activa (activa)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Tabla autores
      await this.createTable('autores', `
        CREATE TABLE IF NOT EXISTS autores (
          id_autor INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(150) NOT NULL,
          biografia TEXT,
          imagen_url VARCHAR(255),
          nacionalidad VARCHAR(50),
          fecha_nacimiento DATE,
          activo TINYINT(1) DEFAULT 1,
          INDEX idx_nombre (nombre)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Tabla editoriales
      await this.createTable('editoriales', `
        CREATE TABLE IF NOT EXISTS editoriales (
          id_editorial INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(150) NOT NULL UNIQUE,
          pais VARCHAR(50),
          sitio_web VARCHAR(255),
          activa TINYINT(1) DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Tabla libros (se crea después de autores y editoriales)
      await this.createTable('libros', `
        CREATE TABLE IF NOT EXISTS libros (
          id_libro INT AUTO_INCREMENT PRIMARY KEY,
          isbn VARCHAR(20) UNIQUE,
          titulo VARCHAR(255) NOT NULL,
          slug VARCHAR(300) NOT NULL UNIQUE,
          id_autor INT NOT NULL,
          id_editorial INT NOT NULL,
          sinopsis TEXT,
          precio DECIMAL(10,2) NOT NULL,
          precio_descuento DECIMAL(10,2),
          stock INT DEFAULT 0,
          paginas INT,
          formato ENUM('tapa_blanda', 'tapa_dura', 'digital', 'audiolibro') DEFAULT 'tapa_blanda',
          idioma VARCHAR(50) DEFAULT 'Español',
          fecha_publicacion DATE,
          imagen_portada VARCHAR(255) NOT NULL,
          imagenes_adicionales JSON,
          puntuacion_promedio DECIMAL(3,2) DEFAULT 0.00,
          num_resenas INT DEFAULT 0,
          destacado TINYINT(1) DEFAULT 0,
          activo TINYINT(1) DEFAULT 1,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_titulo (titulo),
          INDEX idx_precio (precio),
          INDEX idx_destacado (destacado),
          INDEX idx_activo (activo),
          INDEX idx_slug (slug),
          INDEX fk_libro_autor (id_autor),
          INDEX fk_libro_editorial (id_editorial),
          CONSTRAINT fk_libro_autor 
            FOREIGN KEY (id_autor) 
            REFERENCES autores (id_autor)
            ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_libro_editorial 
            FOREIGN KEY (id_editorial) 
            REFERENCES editoriales (id_editorial)
            ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Tabla libro_categorias
      await this.createTable('libro_categorias', `
        CREATE TABLE IF NOT EXISTS libro_categorias (
          id_libro INT NOT NULL,
          id_categoria INT NOT NULL,
          PRIMARY KEY (id_libro, id_categoria),
          INDEX fk_lc_categoria (id_categoria),
          CONSTRAINT fk_lc_libro 
            FOREIGN KEY (id_libro) 
            REFERENCES libros (id_libro)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_lc_categoria 
            FOREIGN KEY (id_categoria) 
            REFERENCES categorias (id_categoria)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 7. Tabla carrito_compras
      await this.createTable('carrito_compras', `
        CREATE TABLE IF NOT EXISTS carrito_compras (
          id_carrito INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX fk_carrito_usuario (id_usuario),
          CONSTRAINT fk_carrito_usuario 
            FOREIGN KEY (id_usuario) 
            REFERENCES usuarios (id_usuario)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 8. Tabla carrito_items
      await this.createTable('carrito_items', `
        CREATE TABLE IF NOT EXISTS carrito_items (
          id_item INT AUTO_INCREMENT PRIMARY KEY,
          id_carrito INT NOT NULL,
          id_libro INT NOT NULL,
          cantidad INT NOT NULL DEFAULT 1,
          precio_unitario DECIMAL(10,2) NOT NULL,
          fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX fk_item_carrito (id_carrito),
          INDEX fk_item_libro (id_libro),
          CONSTRAINT fk_item_carrito 
            FOREIGN KEY (id_carrito) 
            REFERENCES carrito_compras (id_carrito)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_item_libro 
            FOREIGN KEY (id_libro) 
            REFERENCES libros (id_libro)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 9. Tabla pedidos
      await this.createTable('pedidos', `
        CREATE TABLE IF NOT EXISTS pedidos (
          id_pedido INT AUTO_INCREMENT PRIMARY KEY,
          numero_pedido VARCHAR(20) NOT NULL UNIQUE,
          id_usuario INT NOT NULL,
          fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado ENUM('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado') DEFAULT 'pendiente',
          subtotal DECIMAL(10,2) NOT NULL,
          impuestos DECIMAL(10,2) DEFAULT 0.00,
          costo_envio DECIMAL(10,2) DEFAULT 0.00,
          total DECIMAL(10,2) NOT NULL,
          direccion_envio TEXT NOT NULL,
          ciudad_envio VARCHAR(100) NOT NULL,
          codigo_postal_envio VARCHAR(10) NOT NULL,
          telefono_contacto VARCHAR(20) NOT NULL,
          metodo_pago ENUM('tarjeta', 'paypal', 'transferencia', 'efectivo') DEFAULT 'tarjeta',
          notas TEXT,
          INDEX fk_pedido_usuario (id_usuario),
          INDEX idx_numero_pedido (numero_pedido),
          INDEX idx_fecha_pedido (fecha_pedido),
          INDEX idx_estado (estado),
          CONSTRAINT fk_pedido_usuario 
            FOREIGN KEY (id_usuario) 
            REFERENCES usuarios (id_usuario)
            ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 10. Tabla pedido_items
      await this.createTable('pedido_items', `
        CREATE TABLE IF NOT EXISTS pedido_items (
          id_item INT AUTO_INCREMENT PRIMARY KEY,
          id_pedido INT NOT NULL,
          id_libro INT NOT NULL,
          cantidad INT NOT NULL,
          precio_unitario DECIMAL(10,2) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          INDEX fk_pi_pedido (id_pedido),
          INDEX fk_pi_libro (id_libro),
          CONSTRAINT fk_pi_pedido 
            FOREIGN KEY (id_pedido) 
            REFERENCES pedidos (id_pedido)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_pi_libro 
            FOREIGN KEY (id_libro) 
            REFERENCES libros (id_libro)
            ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 11. Tabla resenas
      await this.createTable('resenas', `
        CREATE TABLE IF NOT EXISTS resenas (
          id_resena INT AUTO_INCREMENT PRIMARY KEY,
          id_usuario INT NOT NULL,
          id_libro INT NOT NULL,
          puntuacion TINYINT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
          comentario TEXT,
          fecha_resena TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          aprobada TINYINT(1) DEFAULT 0,
          INDEX fk_resena_usuario (id_usuario),
          INDEX fk_resena_libro (id_libro),
          UNIQUE KEY unique_usuario_libro (id_usuario, id_libro),
          CONSTRAINT fk_resena_usuario 
            FOREIGN KEY (id_usuario) 
            REFERENCES usuarios (id_usuario)
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_resena_libro 
            FOREIGN KEY (id_libro) 
            REFERENCES libros (id_libro)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      logger.info('🎉 ¡Todas las tablas creadas exitosamente!');

    } finally {
      await this.release();
    }
  }

  async insertInitialData() {
    await this.connect();
    
    try {
      logger.info('📝 Insertando datos iniciales...');
      
      // Insertar categorías principales
      await this.connection.query(`
        INSERT IGNORE INTO categorias (nombre, slug, descripcion) VALUES
        ('Ficción', 'ficcion', 'Novelas de ficción literaria'),
        ('Misterio y Thriller', 'misterio-thriller', 'Libros de misterio, suspenso y thriller'),
        ('Ciencia ficción y fantasía', 'ciencia-ficcion-fantasia', 'Ciencia ficción, fantasía y distopías')
      `);
      logger.info('✅ Categorías básicas insertadas');
      
      // Crear usuario admin (contraseña: admin123)
      const bcrypt = require('bcryptjs');
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      await this.connection.query(`
        INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol) VALUES
        (?, ?, ?, 'admin')
      `, ['Administrador', 'admin@tienda.com', adminPassword]);
      logger.info('✅ Usuario admin creado: admin@tienda.com / admin123');
      
      logger.info('📦 Datos iniciales insertados exitosamente');
      
    } finally {
      await this.release();
    }
  }

  async checkExistingTables() {
    await this.connect();
    
    try {
      const [tables] = await this.connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [process.env.DB_NAME || 'railway']);
      
      const tableNames = tables.map(row => row.TABLE_NAME);
      logger.info(`📋 Tablas existentes: ${tableNames.length}`);
      
      if (tableNames.length > 0) {
        logger.info('📊 Lista de tablas:');
        tableNames.forEach(table => logger.info(`   - ${table}`));
      }
      
      return tableNames;
      
    } finally {
      await this.release();
    }
  }

  async setupCompleteDatabase() {
    logger.info('='.repeat(60));
    logger.info('🛠️  INICIANDO CONFIGURACIÓN COMPLETA DE BASE DE DATOS');
    logger.info('='.repeat(60));
    
    // Verificar tablas existentes
    const existingTables = await this.checkExistingTables();
    
    if (existingTables.length > 0) {
      logger.warn('⚠️  Ya existen tablas en la base de datos');
      logger.warn('💡 Si quieres recrear todo, usa el comando de reset');
      return {
        success: false,
        message: 'Ya existen tablas en la base de datos',
        existingTables: existingTables
      };
    }
    
    // Crear todas las tablas
    await this.createAllTables();
    
    // Insertar datos iniciales
    await this.insertInitialData();
    
    logger.info('='.repeat(60));
    logger.info('🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
    logger.info('='.repeat(60));
    
    return {
      success: true,
      message: 'Base de datos configurada exitosamente',
      tablesCreated: 11,
      initialData: true
    };
  }
}

module.exports = new DatabaseSetup();