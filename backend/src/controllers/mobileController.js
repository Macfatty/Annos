/**
 * PHASE 3B.5: Mobile API Controller
 *
 * Endpoints specifically designed for mobile app integration
 * Handles push notification registration, real-time tracking, etc.
 */

const pushService = require('../services/pushNotificationService');
const socketService = require('../services/socketService');
const realtimeService = require('../services/realtimeEventService');
const pool = require('../config/database');

/**
 * Register device for push notifications
 */
exports.registerDevice = async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Token and platform are required'
      });
    }

    const result = pushService.registerDevice(userId, token, platform);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Unregister device from push notifications
 */
exports.unregisterDevice = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const result = pushService.unregisterDevice(userId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error unregistering device:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get WebSocket connection info
 */
exports.getWebSocketInfo = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    return res.status(200).json({
      success: true,
      data: {
        url: process.env.WEBSOCKET_URL || 'http://localhost:3001',
        path: '/socket.io',
        connected: socketService.isUserConnected(userId),
        auth: {
          method: 'token',
          description: 'Include JWT token in auth.token or cookie'
        }
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket info:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get courier's current location (for tracking)
 */
exports.getCourierLocation = async (req, res) => {
  try {
    const { courierId } = req.params;

    const location = socketService.getCourierLocation(parseInt(courierId));

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Courier location not available'
      });
    }

    return res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Error getting courier location:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all courier locations (admin only)
 */
exports.getAllCourierLocations = async (req, res) => {
  try {
    const locations = socketService.getAllCourierLocations();

    return res.status(200).json({
      success: true,
      data: locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error getting courier locations:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get real-time statistics
 */
exports.getRealtimeStats = async (req, res) => {
  try {
    const stats = realtimeService.getStatistics();

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting real-time stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Send test push notification (for testing)
 */
exports.sendTestNotification = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { title, body, data } = req.body;

    const result = await pushService.sendToUser(userId, {
      title: title || 'Test Notification',
      body: body || 'This is a test notification from Annos',
      data: data || { type: 'test' }
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get notification history (for debugging)
 */
exports.getNotificationHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = pushService.getHistory(limit);

    return res.status(200).json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Broadcast system announcement (admin only)
 */
exports.broadcastAnnouncement = async (req, res) => {
  try {
    const { title, message, severity } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    await realtimeService.broadcastAnnouncement(title, message, severity);

    return res.status(200).json({
      success: true,
      message: 'Announcement broadcasted successfully'
    });
  } catch (error) {
    console.error('Error broadcasting announcement:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get order tracking info (customer view)
 */
exports.getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId || req.user.id;

    const client = await pool.connect();

    try {
      // Get order details
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      const order = orderResult.rows[0];

      // Check authorization (customer can only see their own orders, unless admin)
      if (req.user.role !== 'admin' && order.customer_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get courier location if order has assigned courier
      let courierLocation = null;
      if (order.courier_id) {
        courierLocation = socketService.getCourierLocation(order.courier_id);
      }

      return res.status(200).json({
        success: true,
        data: {
          order: {
            id: order.id,
            status: order.status,
            created_at: order.created_at,
            updated_at: order.updated_at,
            courier_id: order.courier_id,
            restaurant_slug: order.restaurant_slug,
            customer_address: order.customer_address
          },
          courierLocation: courierLocation,
          webSocketSubscription: `order:${orderId}`,
          tracking: {
            canTrack: !!order.courier_id,
            status: order.status,
            lastUpdate: order.updated_at
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting order tracking:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get courier's active deliveries (courier view)
 */
exports.getCourierActiveDeliveries = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Only couriers can access this
    if (req.user.role !== 'courier') {
      return res.status(403).json({
        success: false,
        error: 'Only couriers can access this endpoint'
      });
    }

    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT * FROM orders
        WHERE courier_id = $1
        AND status IN ('ready', 'in_transit')
        ORDER BY created_at ASC
      `, [userId]);

      return res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting active deliveries:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;
