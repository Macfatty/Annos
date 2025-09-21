const pool = require('../config/database');
const { sanitizeInput } = require('../middleware/validation');

/**
 * Order Service
 * Hanterar all beställningslogik
 */
class OrderService {
  /**
   * Create new order
   */
  static async createOrder(orderData) {
    const {
      restaurant_slug,
      customer_name,
      customer_phone,
      customer_address,
      customer_email,
      items_total,
      delivery_fee = 0,
      discount_total = 0,
      grand_total,
      customer_notes = '',
      order_json,
      payment_method = 'mock',
      payment_status = 'pending'
    } = orderData;

    try {
      // Start transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Create order
        const orderResult = await client.query(
          `INSERT INTO orders (
            restaurant_slug, customer_name, customer_phone, customer_address, 
            customer_email, items_total, delivery_fee, discount_total, 
            grand_total, customer_notes, order_json, payment_method, payment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id, created_at`,
          [
            sanitizeInput(restaurant_slug),
            sanitizeInput(customer_name),
            sanitizeInput(customer_phone),
            sanitizeInput(customer_address),
            sanitizeInput(customer_email),
            items_total,
            delivery_fee,
            discount_total,
            grand_total,
            sanitizeInput(customer_notes),
            JSON.stringify(order_json),
            payment_method,
            payment_status
          ]
        );

        const orderId = orderResult.rows[0].id;

        // Create order items
        if (order_json && order_json.items) {
          for (const item of order_json.items) {
            const itemResult = await client.query(
              `INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [orderId, item.name, item.quantity, item.price, item.total]
            );

            const orderItemId = itemResult.rows[0].id;

            // Create order item options
            if (item.options && item.options.length > 0) {
              for (const option of item.options) {
                await client.query(
                  `INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [
                    orderItemId,
                    option.typ,
                    option.label,
                    option.price || 0,
                    option.custom_note || null
                  ]
                );
              }
            }
          }
        }

        await client.query('COMMIT');

        return {
          id: orderId,
          created_at: orderResult.rows[0].created_at,
          message: 'Order created successfully'
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }

  /**
   * Get orders for specific restaurant
   */
  static async getRestaurantOrders(restaurantSlug, status = null) {
    try {
      let query = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id,
                     'name', oi.name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'line_total', oi.line_total,
                     'options', COALESCE(opt.options, '[]'::json)
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN (
          SELECT oio.order_item_id,
                 json_agg(
                   json_build_object(
                     'typ', oio.typ,
                     'label', oio.label,
                     'price_delta', oio.price_delta,
                     'custom_note', oio.custom_note
                   )
                 ) as options
          FROM order_item_options oio
          GROUP BY oio.order_item_id
        ) opt ON oi.id = opt.order_item_id
        WHERE o.restaurant_slug = $1
      `;
      
      const params = [restaurantSlug];
      
      if (status) {
        query += ' AND o.status = $2';
        params.push(status);
      }
      
      query += `
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get restaurant orders error:', error);
      throw error;
    }
  }

  /**
   * Get all orders (admin)
   */
  static async getAllOrders(restaurantSlug = null, status = null) {
    try {
      let query = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id,
                     'name', oi.name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'line_total', oi.line_total,
                     'options', COALESCE(opt.options, '[]'::json)
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN (
          SELECT oio.order_item_id,
                 json_agg(
                   json_build_object(
                     'typ', oio.typ,
                     'label', oio.label,
                     'price_delta', oio.price_delta,
                     'custom_note', oio.custom_note
                   )
                 ) as options
          FROM order_item_options oio
          GROUP BY oio.order_item_id
        ) opt ON oi.id = opt.order_item_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 1;
      
      if (restaurantSlug) {
        query += ` AND o.restaurant_slug = $${paramCount}`;
        params.push(restaurantSlug);
        paramCount++;
      }
      
      if (status) {
        query += ` AND o.status = $${paramCount}`;
        params.push(status);
        paramCount++;
      }
      
      query += `
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get all orders error:', error);
      throw error;
    }
  }

  /**
   * Get courier orders
   */
  static async getCourierOrders() {
    try {
      const query = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id,
                     'name', oi.name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'line_total', oi.line_total,
                     'options', COALESCE(opt.options, '[]'::json)
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN (
          SELECT oio.order_item_id,
                 json_agg(
                   json_build_object(
                     'typ', oio.typ,
                     'label', oio.label,
                     'price_delta', oio.price_delta,
                     'custom_note', oio.custom_note
                   )
                 ) as options
          FROM order_item_options oio
          GROUP BY oio.order_item_id
        ) opt ON oi.id = opt.order_item_id
        WHERE o.status IN ('ready', 'assigned')
        GROUP BY o.id
        ORDER BY o.created_at ASC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Get courier orders error:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, status, userId = null) {
    try {
      const validStatuses = ['received', 'preparing', 'ready', 'assigned', 'delivered', 'cancelled'];
      
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      let query = 'UPDATE orders SET status = $1, updated_at = NOW()';
      const params = [status];
      let paramCount = 2;

      if (status === 'assigned' && userId) {
        query += `, assigned_courier_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }

      if (status === 'delivered') {
        query += ', delivered_at = NOW()';
      }

      query += ' WHERE id = $' + paramCount + ' RETURNING *';
      params.push(orderId);

      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId) {
    try {
      const query = `
        SELECT o.*, 
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', oi.id,
                     'name', oi.name,
                     'quantity', oi.quantity,
                     'unit_price', oi.unit_price,
                     'line_total', oi.line_total,
                     'options', COALESCE(opt.options, '[]'::json)
                   )
                 ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
               ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN (
          SELECT oio.order_item_id,
                 json_agg(
                   json_build_object(
                     'typ', oio.typ,
                     'label', oio.label,
                     'price_delta', oio.price_delta,
                     'custom_note', oio.custom_note
                   )
                 ) as options
          FROM order_item_options oio
          GROUP BY oio.order_item_id
        ) opt ON oi.id = opt.order_item_id
        WHERE o.id = $1
        GROUP BY o.id
      `;

      const result = await pool.query(query, [orderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw error;
    }
  }
}

module.exports = OrderService;
