const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Obtener o crear carrito del usuario
const getOrCreateCart = async (userId) => {
  let [carts] = await pool.query(
    'SELECT id_carrito FROM carrito_compras WHERE id_usuario = ?',
    [userId]
  );

  if (carts.length === 0) {
    const [result] = await pool.query(
      'INSERT INTO carrito_compras (id_usuario) VALUES (?)',
      [userId]
    );
    return result.insertId;
  }

  return carts[0].id_carrito;
};

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = await getOrCreateCart(userId);

    const [items] = await pool.query(
      `SELECT ci.*, l.titulo, l.imagen_portada, l.stock, l.precio as precio_actual,
              a.nombre as autor_nombre
       FROM carrito_items ci
       INNER JOIN libros l ON ci.id_libro = l.id_libro
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       WHERE ci.id_carrito = ?`,
      [cartId]
    );

    const subtotal = items.reduce((sum, item) => sum + (item.precio_unitario * item.cantidad), 0);

    res.json({
      success: true,
      data: {
        id_carrito: cartId,
        items,
        subtotal,
        total_items: items.reduce((sum, item) => sum + item.cantidad, 0)
      }
    });
  } catch (error) {
    logger.error('Error en getCart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener carrito'
    });
  }
};

// Agregar item al carrito
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id_libro, cantidad } = req.body;

    if (!id_libro || !cantidad || cantidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'ID del libro y cantidad válida son obligatorios'
      });
    }

    // Verificar que el libro existe y tiene stock
    const [books] = await pool.query(
      'SELECT precio, stock, activo FROM libros WHERE id_libro = ?',
      [id_libro]
    );

    if (books.length === 0 || !books[0].activo) {
      return res.status(404).json({
        success: false,
        message: 'Libro no encontrado'
      });
    }

    if (books[0].stock < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${books[0].stock} unidades disponibles`
      });
    }

    const cartId = await getOrCreateCart(userId);
    const precio_unitario = books[0].precio;

    // Verificar si el item ya existe en el carrito
    const [existingItems] = await pool.query(
      'SELECT id_item, cantidad FROM carrito_items WHERE id_carrito = ? AND id_libro = ?',
      [cartId, id_libro]
    );

    if (existingItems.length > 0) {
      // Actualizar cantidad
      const newQuantity = existingItems[0].cantidad + cantidad;

      if (newQuantity > books[0].stock) {
        return res.status(400).json({
          success: false,
          message: `No se puede agregar. Stock máximo: ${books[0].stock}`
        });
      }

      await pool.query(
        'UPDATE carrito_items SET cantidad = ? WHERE id_item = ?',
        [newQuantity, existingItems[0].id_item]
      );

      logger.info(`✅ Item actualizado en carrito: Usuario ${userId}, Libro ${id_libro}`);
    } else {
      // Insertar nuevo item
      await pool.query(
        'INSERT INTO carrito_items (id_carrito, id_libro, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [cartId, id_libro, cantidad, precio_unitario]
      );

      logger.info(`✅ Item agregado al carrito: Usuario ${userId}, Libro ${id_libro}`);
    }

    res.status(201).json({
      success: true,
      message: 'Producto agregado al carrito exitosamente'
    });
  } catch (error) {
    logger.error('Error en addItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar item al carrito'
    });
  }
};

// Actualizar cantidad de un item
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad < 1) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad debe ser mayor a 0'
      });
    }

    const cartId = await getOrCreateCart(userId);

    // Verificar que el item pertenece al carrito del usuario
    const [items] = await pool.query(
      `SELECT ci.id_libro, l.stock 
       FROM carrito_items ci
       INNER JOIN libros l ON ci.id_libro = l.id_libro
       WHERE ci.id_item = ? AND ci.id_carrito = ?`,
      [id, cartId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    if (cantidad > items[0].stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Máximo: ${items[0].stock}`
      });
    }

    await pool.query(
      'UPDATE carrito_items SET cantidad = ? WHERE id_item = ?',
      [cantidad, id]
    );

    logger.info(`✅ Cantidad actualizada: Item ${id}`);

    res.json({
      success: true,
      message: 'Cantidad actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error en updateItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item'
    });
  }
};

// Eliminar item del carrito
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cartId = await getOrCreateCart(userId);

    const [result] = await pool.query(
      'DELETE FROM carrito_items WHERE id_item = ? AND id_carrito = ?',
      [id, cartId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado en el carrito'
      });
    }

    logger.info(`✅ Item eliminado del carrito: Item ${id}`);

    res.json({
      success: true,
      message: 'Item eliminado del carrito exitosamente'
    });
  } catch (error) {
    logger.error('Error en removeItem:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar item'
    });
  }
};

// Vaciar carrito
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartId = await getOrCreateCart(userId);

    await pool.query(
      'DELETE FROM carrito_items WHERE id_carrito = ?',
      [cartId]
    );

    logger.info(`✅ Carrito vaciado: Usuario ${userId}`);

    res.json({
      success: true,
      message: 'Carrito vaciado exitosamente'
    });
  } catch (error) {
    logger.error('Error en clearCart:', error);
    res.status(500).json({
      success: false,
      message: 'Error al vaciar carrito'
    });
  }
};