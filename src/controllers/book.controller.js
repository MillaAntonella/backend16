const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Obtener todos los libros con paginación
exports.getAllBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const { q } = req.query;

    // Si hay un parámetro de búsqueda, realizar búsqueda
    if (q) {
      const searchTerm = `%${q}%`;
      
      const [books] = await pool.query(
        `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre,
                GROUP_CONCAT(c.nombre) as categorias
         FROM libros l
         LEFT JOIN autores a ON l.id_autor = a.id_autor
         LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
         LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
         LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
         WHERE l.activo = 1 AND (l.titulo LIKE ? OR a.nombre LIKE ? OR l.isbn LIKE ?)
         GROUP BY l.id_libro
         ORDER BY l.titulo ASC`,
        [searchTerm, searchTerm, searchTerm]
      );

      return res.json({
        success: true,
        data: books,
        total: books.length
      });
    }

    // Si no hay búsqueda, devolver todos los libros con paginación
    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre,
              GROUP_CONCAT(c.nombre) as categorias
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
       WHERE l.activo = 1
       GROUP BY l.id_libro
       ORDER BY l.fecha_creacion DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [total] = await pool.query(
      'SELECT COUNT(*) as count FROM libros WHERE activo = 1'
    );

    res.json({
      success: true,
      data: books,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (error) {
    logger.error('Error en getAllBooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libros'
    });
  }
};

// Obtener libros destacados
exports.getFeaturedBooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       WHERE l.activo = 1 AND l.destacado = 1
       ORDER BY l.puntuacion_promedio DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: books
    });
  } catch (error) {
    logger.error('Error en getFeaturedBooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libros destacados'
    });
  }
};

// Buscar libros
exports.searchBooks = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un término de búsqueda'
      });
    }

    const searchTerm = `%${q}%`;

    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       WHERE l.activo = 1 AND (l.titulo LIKE ? OR a.nombre LIKE ? OR l.isbn LIKE ?)
       ORDER BY l.titulo ASC`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.json({
      success: true,
      data: books,
      total: books.length
    });
  } catch (error) {
    logger.error('Error en searchBooks:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar libros'
    });
  }
};

// Obtener libro por ID
exports.getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, a.biografia as autor_biografia,
              e.nombre as editorial_nombre, e.pais as editorial_pais,
              GROUP_CONCAT(c.nombre) as categorias
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
       WHERE l.id_libro = ?
       GROUP BY l.id_libro`,
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Libro no encontrado'
      });
    }

    res.json({
      success: true,
      data: books[0]
    });
  } catch (error) {
    logger.error('Error en getBookById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libro'
    });
  }
};

// Obtener libro por slug
exports.getBookBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre,
              GROUP_CONCAT(c.nombre) as categorias
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
       WHERE l.slug = ? AND l.activo = 1
       GROUP BY l.id_libro`,
      [slug]
    );

    if (books.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Libro no encontrado'
      });
    }

    res.json({
      success: true,
      data: books[0]
    });
  } catch (error) {
    logger.error('Error en getBookBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libro'
    });
  }
};

// Obtener libros por categoría
exports.getBooksByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       INNER JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       WHERE lc.id_categoria = ? AND l.activo = 1
       ORDER BY l.titulo ASC`,
      [id]
    );

    res.json({
      success: true,
      data: books,
      total: books.length
    });
  } catch (error) {
    logger.error('Error en getBooksByCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libros por categoría'
    });
  }
};

// Obtener libros por slug de categoría
exports.getBooksByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Primero obtener la categoría por slug
    const [categories] = await pool.query(
      'SELECT id_categoria FROM categorias WHERE slug = ? AND activa = 1',
      [slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    const categoryId = categories[0].id_categoria;

    // Luego obtener los libros de esa categoría
    const [books] = await pool.query(
      `SELECT l.*, a.nombre as autor_nombre, e.nombre as editorial_nombre
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       INNER JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       WHERE lc.id_categoria = ? AND l.activo = 1
       ORDER BY l.titulo ASC`,
      [categoryId]
    );

    res.json({
      success: true,
      data: books,
      total: books.length
    });
  } catch (error) {
    logger.error('Error en getBooksByCategorySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener libros por categoría'
    });
  }
};

// Crear libro (admin)
exports.createBook = async (req, res) => {
  try {
    const {
      isbn, titulo, slug, id_autor, id_editorial, sinopsis, precio,
      precio_descuento, stock, paginas, formato, idioma, fecha_publicacion,
      imagen_portada, imagenes_adicionales, destacado, categorias
    } = req.body;

    if (!titulo || !id_autor || !id_editorial || !precio || !imagen_portada) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO libros (isbn, titulo, slug, id_autor, id_editorial, sinopsis, 
                           precio, precio_descuento, stock, paginas, formato, idioma, 
                           fecha_publicacion, imagen_portada, imagenes_adicionales, destacado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn || null, titulo, slug, id_autor, id_editorial, sinopsis || null,
       precio, precio_descuento || null, stock || 0, paginas || null,
       formato || 'tapa_blanda', idioma || 'Español', fecha_publicacion || null,
       imagen_portada, imagenes_adicionales ? JSON.stringify(imagenes_adicionales) : null,
       destacado || 0]
    );

    // Asociar categorías si se proporcionaron
    if (categorias && Array.isArray(categorias)) {
      for (const id_categoria of categorias) {
        await pool.query(
          'INSERT INTO libro_categorias (id_libro, id_categoria) VALUES (?, ?)',
          [result.insertId, id_categoria]
        );
      }
    }

    logger.info(`✅ Libro creado: ${titulo}`);

    res.status(201).json({
      success: true,
      message: 'Libro creado exitosamente',
      data: { id_libro: result.insertId, titulo }
    });
  } catch (error) {
    logger.error('Error en createBook:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear libro'
    });
  }
};

// Actualizar libro (admin)
exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = ['isbn', 'titulo', 'slug', 'id_autor', 'id_editorial', 
                           'sinopsis', 'precio', 'precio_descuento', 'stock', 
                           'paginas', 'formato', 'idioma', 'fecha_publicacion', 
                           'imagen_portada', 'destacado', 'activo'];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE libros SET ${updates.join(', ')} WHERE id_libro = ?`,
      values
    );

    logger.info(`✅ Libro actualizado: ID ${id}`);

    res.json({
      success: true,
      message: 'Libro actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error en updateBook:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar libro'
    });
  }
};

// Eliminar libro (admin)
exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE libros SET activo = 0 WHERE id_libro = ?',
      [id]
    );

    logger.info(`✅ Libro desactivado: ID ${id}`);

    res.json({
      success: true,
      message: 'Libro eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error en deleteBook:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar libro'
    });
  }
};
