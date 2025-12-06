const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Generar número de pedido único
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

// Crear pedido desde el carrito
exports.createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { direccion_envio, ciudad_envio, codigo_postal_envio, telefono_contacto, metodo_pago, notas } = req.body;

    if (!direccion_envio || !ciudad_envio || !codigo_postal_envio || !telefono_contacto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos de envío obligatorios'
      });
    }

    // Obtener carrito del usuario
    const [carts] = await connection.query(
      'SELECT id_carrito FROM carrito_compras WHERE id_usuario = ?',
      [userId]
    );

    if (carts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tienes un carrito activo'
      });
    }

    const cartId = carts[0].id_carrito;

    // Obtener items del carrito
    const [cartItems] = await connection.query(
      `SELECT ci.*, l.stock, l.titulo 
       FROM carrito_items ci
       INNER JOIN libros l ON ci.id_libro = l.id_libro
       WHERE ci.id_carrito = ?`,
      [cartId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    // Verificar stock y calcular totales
    let subtotal = 0;
    for (const item of cartItems) {
      if (item.cantidad > item.stock) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para "${item.titulo}". Solo hay ${item.stock} unidades disponibles`
        });
      }
      subtotal += item.precio_unitario * item.cantidad;
    }

    const impuestos = subtotal * 0.18; // 18% IGV
    const costo_envio = subtotal > 100 ? 0 : 10; // Envío gratis si supera 100
    const total = subtotal + impuestos + costo_envio;

    // Crear pedido
    const numero_pedido = `P${Date.now()}${Math.floor(Math.random() * 1000)}`; // Único y corto

    const [orderResult] = await connection.query(
      `INSERT INTO pedidos (numero_pedido, id_usuario, subtotal, impuestos, costo_envio, 
                            total, direccion_envio, ciudad_envio, codigo_postal_envio, 
                            telefono_contacto, metodo_pago, notas, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [numero_pedido, userId, subtotal, impuestos, costo_envio, total,
       direccion_envio, ciudad_envio, codigo_postal_envio, telefono_contacto,
       metodo_pago || 'tarjeta', notas || null]
    );

    const orderId = orderResult.insertId;

    // Insertar items del pedido y actualizar stock
    for (const item of cartItems) {
      await connection.query(
        `INSERT INTO pedido_items (id_pedido, id_libro, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id_libro, item.cantidad, item.precio_unitario, 
         item.precio_unitario * item.cantidad]
      );

      // Actualizar stock
      await connection.query(
        'UPDATE libros SET stock = stock - ? WHERE id_libro = ?',
        [item.cantidad, item.id_libro]
      );
    }

    // Vaciar carrito
    await connection.query(
      'DELETE FROM carrito_items WHERE id_carrito = ?',
      [cartId]
    );

    await connection.commit();

    logger.info(`✅ Pedido creado: ${numero_pedido} - Usuario ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: {
        id_pedido: orderId,
        numero_pedido,
        total,
        estado: 'pendiente'
      }
    });

  } catch (error) {
    await connection.rollback();
    logger.error('Error en createOrder:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear pedido'
    });
  } finally {
    connection.release();
  }
};

// Obtener pedidos del usuario
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await pool.query(
      `SELECT p.*, COUNT(pi.id_item) as total_items
       FROM pedidos p
       LEFT JOIN pedido_items pi ON p.id_pedido = pi.id_pedido
       WHERE p.id_usuario = ?
       GROUP BY p.id_pedido
       ORDER BY p.fecha_pedido DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: orders,
      total: orders.length
    });
  } catch (error) {
    logger.error('Error en getUserOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos'
    });
  }
};

// Obtener pedido por ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.rol === 'admin';

    // Obtener pedido
    const [orders] = await pool.query(
      `SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM pedidos p
       INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
       WHERE p.id_pedido = ? ${!isAdmin ? 'AND p.id_usuario = ?' : ''}`,
      isAdmin ? [id] : [id, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Obtener items del pedido
    const [items] = await pool.query(
      `SELECT pi.*, l.titulo, l.imagen_portada, a.nombre as autor_nombre
       FROM pedido_items pi
       INNER JOIN libros l ON pi.id_libro = l.id_libro
       LEFT JOIN autores a ON l.id_autor = a.id_autor
       WHERE pi.id_pedido = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orders[0],
        items
      }
    });
  } catch (error) {
    logger.error('Error en getOrderById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedido'
    });
  }
};

// Obtener todos los pedidos (admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { estado } = req.query;

    let query = `
      SELECT p.*, u.nombre as usuario_nombre, u.email as usuario_email,
             COUNT(pi.id_item) as total_items
      FROM pedidos p
      INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
      LEFT JOIN pedido_items pi ON p.id_pedido = pi.id_pedido
    `;

    const params = [];

    if (estado) {
      query += ' WHERE p.estado = ?';
      params.push(estado);
    }

    query += ' GROUP BY p.id_pedido ORDER BY p.fecha_pedido DESC';

    const [orders] = await pool.query(query, params);

    res.json({
      success: true,
      data: orders,
      total: orders.length
    });
  } catch (error) {
    logger.error('Error en getAllOrders:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos'
    });
  }
};

// Actualizar estado del pedido (admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const validStates = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];

    if (!estado || !validStates.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${validStates.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE pedidos SET estado = ? WHERE id_pedido = ?',
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    logger.info(`✅ Estado de pedido actualizado: ID ${id} -> ${estado}`);

    res.json({
      success: true,
      message: 'Estado del pedido actualizado exitosamente',
      data: { estado }
    });
  } catch (error) {
    logger.error('Error en updateOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado del pedido'
    });
  }
};