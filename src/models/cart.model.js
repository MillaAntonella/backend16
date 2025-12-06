const { pool } = require('../config/database');

class CartModel {
  static async getOrCreateCart(userId) {
    // Buscar carrito activo del usuario
    const [rows] = await pool.execute(
      'SELECT * FROM carrito_compras WHERE id_usuario = ?',
      [userId]
    );

    if (rows.length > 0) {
      return rows[0];
    }

    // Crear nuevo carrito
    const [result] = await pool.execute(
      'INSERT INTO carrito_compras (id_usuario) VALUES (?)',
      [userId]
    );

    return {
      id_carrito: result.insertId,
      id_usuario: userId,
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date()
    };
  }

  static async getCartWithItems(userId) {
    const cart = await this.getOrCreateCart(userId);

    const [items] = await pool.execute(
      `SELECT ci.*, l.titulo, l.imagen_portada, l.slug, l.stock, 
              (l.precio_descuento IS NOT NULL AND l.precio_descuento < l.precio) as tiene_descuento,
              COALESCE(l.precio_descuento, l.precio) as precio_actual
       FROM carrito_items ci
       JOIN libros l ON ci.id_libro = l.id_libro
       WHERE ci.id_carrito = ?
       ORDER BY ci.fecha_agregado DESC`,
      [cart.id_carrito]
    );

    // Calcular totales
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.precio_unitario * item.cantidad);
    }, 0);

    return {
      ...cart,
      items,
      subtotal,
      total_items: items.length
    };
  }

  static async addItem(userId, itemData) {
    const { id_libro, cantidad = 1 } = itemData;

    // Verificar que el libro existe y tiene stock
    const [libroRows] = await pool.execute(
      'SELECT precio, precio_descuento, stock FROM libros WHERE id_libro = ? AND activo = 1',
      [id_libro]
    );

    if (libroRows.length === 0) {
      throw new Error('Libro no encontrado');
    }

    const libro = libroRows[0];
    const precioUnitario = libro.precio_descuento || libro.precio;

    if (libro.stock < cantidad) {
      throw new Error('Stock insuficiente');
    }

    const cart = await this.getOrCreateCart(userId);

    // Verificar si el producto ya está en el carrito
    const [existingItems] = await pool.execute(
      'SELECT * FROM carrito_items WHERE id_carrito = ? AND id_libro = ?',
      [cart.id_carrito, id_libro]
    );

    if (existingItems.length > 0) {
      // Actualizar cantidad
      const newCantidad = existingItems[0].cantidad + cantidad;
      
      await pool.execute(
        'UPDATE carrito_items SET cantidad = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_item = ?',
        [newCantidad, existingItems[0].id_item]
      );
    } else {
      // Agregar nuevo item
      await pool.execute(
        `INSERT INTO carrito_items (id_carrito, id_libro, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?)`,
        [cart.id_carrito, id_libro, cantidad, precioUnitario]
      );
    }

    // Actualizar fecha del carrito
    await pool.execute(
      'UPDATE carrito_compras SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = ?',
      [cart.id_carrito]
    );

    return this.getCartWithItems(userId);
  }

  static async updateItem(userId, itemId, cantidad) {
    if (cantidad < 1) {
      await this.removeItem(userId, itemId);
      return this.getCartWithItems(userId);
    }

    // Verificar que el item pertenece al usuario
    const [items] = await pool.execute(
      `SELECT ci.*, l.stock 
       FROM carrito_items ci
       JOIN carrito_compras cc ON ci.id_carrito = cc.id_carrito
       JOIN libros l ON ci.id_libro = l.id_libro
       WHERE ci.id_item = ? AND cc.id_usuario = ?`,
      [itemId, userId]
    );

    if (items.length === 0) {
      throw new Error('Item no encontrado en el carrito');
    }

    const item = items[0];

    if (item.stock < cantidad) {
      throw new Error('Stock insuficiente');
    }

    await pool.execute(
      'UPDATE carrito_items SET cantidad = ? WHERE id_item = ?',
      [cantidad, itemId]
    );

    // Actualizar fecha del carrito
    await pool.execute(
      `UPDATE carrito_compras 
       SET fecha_actualizacion = CURRENT_TIMESTAMP 
       WHERE id_carrito = (SELECT id_carrito FROM carrito_items WHERE id_item = ?)`,
      [itemId]
    );

    return this.getCartWithItems(userId);
  }

  static async removeItem(userId, itemId) {
    // Verificar que el item pertenece al usuario
    const [items] = await pool.execute(
      `SELECT ci.id_carrito 
       FROM carrito_items ci
       JOIN carrito_compras cc ON ci.id_carrito = cc.id_carrito
       WHERE ci.id_item = ? AND cc.id_usuario = ?`,
      [itemId, userId]
    );

    if (items.length === 0) {
      throw new Error('Item no encontrado en el carrito');
    }

    await pool.execute('DELETE FROM carrito_items WHERE id_item = ?', [itemId]);

    // Actualizar fecha del carrito
    await pool.execute(
      'UPDATE carrito_compras SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = ?',
      [items[0].id_carrito]
    );

    return this.getCartWithItems(userId);
  }

  static async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    
    await pool.execute('DELETE FROM carrito_items WHERE id_carrito = ?', [cart.id_carrito]);
    
    await pool.execute(
      'UPDATE carrito_compras SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_carrito = ?',
      [cart.id_carrito]
    );

    return this.getCartWithItems(userId);
  }
}

module.exports = CartModel;