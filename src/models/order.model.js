const { pool } = require('../config/database');
const CartModel = require('./cart.model');

class OrderModel {
  static async createFromCart(userId, orderData) {
    const {
      direccion_envio,
      ciudad_envio,
      codigo_postal_envio,
      telefono_contacto,
      metodo_pago = 'tarjeta',
      notas
    } = orderData;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Obtener carrito del usuario
      const cart = await CartModel.getCartWithItems(userId);
      
      if (cart.items.length === 0) {
        throw new Error('El carrito está vacío');
      }

      // Verificar stock de todos los items
      for (const item of cart.items) {
        const [stockRows] = await connection.execute(
          'SELECT stock FROM libros WHERE id_libro = ?',
          [item.id_libro]
        );

        if (stockRows[0].stock < item.cantidad) {
          throw new Error(`Stock insuficiente para: ${item.titulo}`);
        }
      }

      // Generar número de pedido único
      const numeroPedido = `PED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calcular totales
      const subtotal = cart.subtotal;
      const impuestos = subtotal * 0.16; // 16% de IVA
      const costoEnvio = subtotal > 500 ? 0 : 50; // Envío gratis sobre $500
      const total = subtotal + impuestos + costoEnvio;

      // Crear pedido
      const [orderResult] = await connection.execute(
        `INSERT INTO pedidos 
         (numero_pedido, id_usuario, estado, subtotal, impuestos, costo_envio, total,
          direccion_envio, ciudad_envio, codigo_postal_envio, telefono_contacto, 
          metodo_pago, notas) 
         VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          numeroPedido,
          userId,
          subtotal,
          impuestos,
          costoEnvio,
          total,
          direccion_envio,
          ciudad_envio,
          codigo_postal_envio,
          telefono_contacto,
          metodo_pago,
          notas
        ]
      );

      const orderId = orderResult.insertId;

      // Crear items del pedido y actualizar stock
      for (const item of cart.items) {
        const itemSubtotal = item.precio_unitario * item.cantidad;

        // Insertar item del pedido
        await connection.execute(
          `INSERT INTO pedido_items 
           (id_pedido, id_libro, cantidad, precio_unitario, subtotal) 
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.id_libro, item.cantidad, item.precio_unitario, itemSubtotal]
        );

        // Actualizar stock del libro
        await connection.execute(
          'UPDATE libros SET stock = stock - ? WHERE id_libro = ?',
          [item.cantidad, item.id_libro]
        );
      }

      // Vaciar carrito
      await connection.execute(
        'DELETE FROM carrito_items WHERE id_carrito = ?',
        [cart.id_carrito]
      );

      await connection.commit();

      return this.findById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, 
              u.nombre as usuario_nombre,
              u.email as usuario_email
       FROM pedidos p
       JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE p.id_pedido = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const order = rows[0];

    // Obtener items del pedido
    const [items] = await pool.execute(
      `SELECT pi.*, l.titulo, l.imagen_portada, l.slug
       FROM pedido_items pi
       JOIN libros l ON pi.id_libro = l.id_libro
       WHERE pi.id_pedido = ?
       ORDER BY pi.id_item`,
      [id]
    );

    order.items = items;

    return order;
  }

  static async findByUser(userId, filters = {}) {
    const { limit = 20, offset = 0, estado } = filters;

    let query = `
      SELECT p.* 
      FROM pedidos p
      WHERE p.id_usuario = ?
    `;

    const values = [userId];

    if (estado) {
      query += ' AND p.estado = ?';
      values.push(estado);
    }

    query += ' ORDER BY p.fecha_pedido DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const [rows] = await pool.execute(query, values);

    // Obtener items para cada pedido
    const ordersWithItems = await Promise.all(
      rows.map(async (order) => {
        const [items] = await pool.execute(
          `SELECT pi.*, l.titulo, l.imagen_portada 
           FROM pedido_items pi
           JOIN libros l ON pi.id_libro = l.id_libro
           WHERE pi.id_pedido = ?`,
          [order.id_pedido]
        );

        return {
          ...order,
          items
        };
      })
    );

    return ordersWithItems;
  }

  static async findAll(filters = {}) {
    const { limit = 20, offset = 0, estado, fecha_desde, fecha_hasta } = filters;

    let query = `
      SELECT p.*, u.nombre as usuario_nombre, u.email
      FROM pedidos p
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      WHERE 1=1
    `;

    const values = [];

    if (estado) {
      query += ' AND p.estado = ?';
      values.push(estado);
    }

    if (fecha_desde) {
      query += ' AND DATE(p.fecha_pedido) >= ?';
      values.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ' AND DATE(p.fecha_pedido) <= ?';
      values.push(fecha_hasta);
    }

    query += ' ORDER BY p.fecha_pedido DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    const [rows] = await pool.execute(query, values);

    return rows;
  }

  static async updateStatus(id, estado) {
    const allowedStatus = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
    
    if (!allowedStatus.includes(estado)) {
      throw new Error('Estado inválido');
    }

    await pool.execute(
      'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
      [estado, id]
    );

    return this.findById(id);
  }

  static async getUserStats(userId) {
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) as total_pedidos,
         SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as pedidos_entregados,
         SUM(total) as total_gastado,
         MIN(fecha_pedido) as primer_pedido,
         MAX(fecha_pedido) as ultimo_pedido
       FROM pedidos 
       WHERE id_usuario = ?`,
      [userId]
    );

    return stats[0];
  }

  static async getDashboardStats() {
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) as total_pedidos,
         SUM(total) as ingresos_totales,
         AVG(total) as promedio_pedido,
         COUNT(DISTINCT id_usuario) as clientes_unicos,
         SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
         SUM(CASE WHEN estado = 'procesando' THEN 1 ELSE 0 END) as procesando,
         SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregados
       FROM pedidos 
       WHERE DATE(fecha_pedido) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    return stats[0];
  }
}

module.exports = OrderModel;