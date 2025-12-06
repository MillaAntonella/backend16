const { pool } = require('../config/database');

class ProductModel {
  static async create(productData) {
    const {
      isbn,
      titulo,
      slug,
      id_autor,
      id_editorial,
      sinopsis,
      precio,
      precio_descuento,
      stock,
      paginas,
      formato,
      idioma,
      fecha_publicacion,
      imagen_portada,
      imagenes_adicionales,
      destacado = 0,
      categorias = []
    } = productData;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insertar libro
      const [result] = await connection.execute(
        `INSERT INTO libros 
         (isbn, titulo, slug, id_autor, id_editorial, sinopsis, precio, precio_descuento, 
          stock, paginas, formato, idioma, fecha_publicacion, imagen_portada, 
          imagenes_adicionales, destacado) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          isbn,
          titulo,
          slug,
          id_autor,
          id_editorial,
          sinopsis,
          precio,
          precio_descuento,
          stock,
          paginas,
          formato,
          idioma,
          fecha_publicacion,
          imagen_portada,
          imagenes_adicionales ? JSON.stringify(imagenes_adicionales) : null,
          destacado
        ]
      );

      const libroId = result.insertId;

      // Asociar categorías
      if (categorias.length > 0) {
        const categoryValues = categorias.map(catId => [libroId, catId]);
        await connection.query(
          'INSERT INTO libro_categorias (id_libro, id_categoria) VALUES ?',
          [categoryValues]
        );
      }

      await connection.commit();

      return this.findById(libroId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT l.*, 
              a.nombre as autor_nombre,
              e.nombre as editorial_nombre,
              GROUP_CONCAT(DISTINCT c.id_categoria) as categorias_ids,
              GROUP_CONCAT(DISTINCT c.nombre) as categorias_nombres
       FROM libros l
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
       LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
       LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
       WHERE l.id_libro = ?
       GROUP BY l.id_libro`,
      [id]
    );

    const libro = rows[0];
    if (!libro) return null;

    // Procesar categorías
    if (libro.categorias_ids) {
      const categoriasIds = libro.categorias_ids.split(',').map(id => parseInt(id));
      const categoriasNombres = libro.categorias_nombres.split(',');
      libro.categorias = categoriasIds.map((id, index) => ({
        id_categoria: id,
        nombre: categoriasNombres[index]
      }));
    } else {
      libro.categorias = [];
    }

    // Procesar imágenes adicionales
    if (libro.imagenes_adicionales) {
      libro.imagenes_adicionales = JSON.parse(libro.imagenes_adicionales);
    }

    delete libro.categorias_ids;
    delete libro.categorias_nombres;

    return libro;
  }

  static async findAll(filters = {}) {
    const {
      categoria,
      autor,
      editorial,
      destacado,
      precio_min,
      precio_max,
      search,
      limit = 20,
      offset = 0
    } = filters;

    let query = `
      SELECT l.*, 
             a.nombre as autor_nombre,
             e.nombre as editorial_nombre,
             GROUP_CONCAT(DISTINCT c.nombre) as categorias
      FROM libros l
      LEFT JOIN autores a ON l.id_autor = a.id_autor
      LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
      LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
      LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
      WHERE l.activo = 1
    `;

    const values = [];

    if (categoria) {
      query += ' AND c.id_categoria = ?';
      values.push(categoria);
    }

    if (autor) {
      query += ' AND l.id_autor = ?';
      values.push(autor);
    }

    if (editorial) {
      query += ' AND l.id_editorial = ?';
      values.push(editorial);
    }

    if (destacado !== undefined) {
      query += ' AND l.destacado = ?';
      values.push(destacado ? 1 : 0);
    }

    if (precio_min !== undefined) {
      query += ' AND l.precio >= ?';
      values.push(precio_min);
    }

    if (precio_max !== undefined) {
      query += ' AND l.precio <= ?';
      values.push(precio_max);
    }

    if (search) {
      query += ' AND (l.titulo LIKE ? OR l.sinopsis LIKE ? OR a.nombre LIKE ?)';
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY l.id_libro ORDER BY l.fecha_creacion DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const [rows] = await pool.execute(query, values);

    return rows.map(libro => {
      if (libro.categorias) {
        libro.categorias = libro.categorias.split(',');
      }
      if (libro.imagenes_adicionales) {
        libro.imagenes_adicionales = JSON.parse(libro.imagenes_adicionales);
      }
      return libro;
    });
  }

  static async update(id, updateData) {
    const allowedFields = [
      'titulo', 'sinopsis', 'precio', 'precio_descuento', 'stock',
      'paginas', 'formato', 'idioma', 'imagen_portada', 'destacado', 'activo'
    ];

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
      `UPDATE libros SET ${updates.join(', ')} WHERE id_libro = ?`,
      values
    );
    
    return this.findById(id);
  }

  static async delete(id) {
    await pool.execute('UPDATE libros SET activo = 0 WHERE id_libro = ?', [id]);
    return true;
  }

  static async count(filters = {}) {
    const { categoria, autor, editorial, destacado, search } = filters;

    let query = `
      SELECT COUNT(DISTINCT l.id_libro) as total
      FROM libros l
      LEFT JOIN autores a ON l.id_autor = a.id_autor
      LEFT JOIN editoriales e ON l.id_editorial = e.id_editorial
      LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
      LEFT JOIN categorias c ON lc.id_categoria = c.id_categoria
      WHERE l.activo = 1
    `;

    const values = [];

    if (categoria) {
      query += ' AND c.id_categoria = ?';
      values.push(categoria);
    }

    if (autor) {
      query += ' AND l.id_autor = ?';
      values.push(autor);
    }

    if (editorial) {
      query += ' AND l.id_editorial = ?';
      values.push(editorial);
    }

    if (destacado !== undefined) {
      query += ' AND l.destacado = ?';
      values.push(destacado ? 1 : 0);
    }

    if (search) {
      query += ' AND (l.titulo LIKE ? OR l.sinopsis LIKE ? OR a.nombre LIKE ?)';
      const searchTerm = `%${search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    const [rows] = await pool.execute(query, values);
    return rows[0].total;
  }

  static async getCategories() {
    const [rows] = await pool.execute(
      'SELECT * FROM categorias WHERE activa = 1 ORDER BY nombre'
    );
    return rows;
  }

  static async getAuthors() {
    const [rows] = await pool.execute(
      'SELECT * FROM autores WHERE activo = 1 ORDER BY nombre'
    );
    return rows;
  }

  static async getPublishers() {
    const [rows] = await pool.execute(
      'SELECT * FROM editoriales WHERE activa = 1 ORDER BY nombre'
    );
    return rows;
  }
}

module.exports = ProductModel;