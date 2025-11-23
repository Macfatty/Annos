const OrderService = require('../services/orderService');
const { sanitizeInput } = require('../middleware/validation');

/**
 * Order Controller
 * Hanterar alla beställningsrelaterade endpoints
 */
class OrderController {
  /**
   * Create new order
   */
  static async createOrder(req, res, next) {
    try {
      const orderData = {
        restaurant_slug: req.body.restaurant_slug,
        customer_name: sanitizeInput(req.body.customer_name),
        customer_phone: sanitizeInput(req.body.customer_phone),
        customer_address: sanitizeInput(req.body.customer_address),
        customer_email: sanitizeInput(req.body.customer_email),
        items_total: req.body.items_total,
        delivery_fee: req.body.delivery_fee || 0,
        discount_total: req.body.discount_total || 0,
        grand_total: req.body.grand_total,
        customer_notes: sanitizeInput(req.body.customer_notes || ''),
        order_json: req.body.order_json,
        payment_method: req.body.payment_method || 'mock',
        payment_status: req.body.payment_status || 'pending'
      };

      // Validate required fields
      if (!orderData.restaurant_slug || !orderData.customer_name || 
          !orderData.customer_phone || !orderData.customer_address || 
          !orderData.customer_email || !orderData.grand_total) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const result = await OrderService.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user orders
   */
  static async getUserOrders(req, res, next) {
    try {
      // This would typically filter by user ID, but for now we'll get all orders
      // In a real implementation, you'd add user filtering
      const orders = await OrderService.getAllOrders();

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin orders
   */
  static async getAdminOrders(req, res, next) {
    try {
      const { slug, status } = req.query;
      const orders = await OrderService.getAllOrders(slug, status);

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get restaurant orders
   */
  static async getRestaurantOrders(req, res, next) {
    try {
      const { slug } = req.query;
      const { status } = req.query;

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant slug is required'
        });
      }

      const orders = await OrderService.getRestaurantOrders(slug, status);

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get courier orders
   */
  static async getCourierOrders(req, res, next) {
    try {
      const orders = await OrderService.getCourierOrders();

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      // BACKWARD COMPATIBILITY: Support both userId (new) and id (old)
      const userId = req.user?.userId || req.user?.id;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const updatedOrder = await OrderService.updateOrderStatus(orderId, status, userId);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await OrderService.getOrderById(orderId);

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark order as done (restaurant)
   */
  static async markOrderAsDone(req, res, next) {
    try {
      const { orderId } = req.params;
      const updatedOrder = await OrderService.updateOrderStatus(orderId, 'ready');

      res.json({
        success: true,
        message: 'Order marked as ready',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept order (courier)
   */
  static async acceptOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const updatedOrder = await OrderService.updateOrderStatus(orderId, 'assigned', userId);

      res.json({
        success: true,
        message: 'Order accepted',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark order as delivered (courier)
   */
  static async markOrderAsDelivered(req, res, next) {
    try {
      const { orderId } = req.params;
      const updatedOrder = await OrderService.updateOrderStatus(orderId, 'delivered');

      res.json({
        success: true,
        message: 'Order marked as delivered',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;
