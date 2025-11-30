/**
 * PHASE 3B.5: Real-time Event Service
 *
 * Orchestrates WebSocket and Push Notification events
 * Provides high-level API for broadcasting real-time updates
 */

const socketService = require('./socketService');
const pushService = require('./pushNotificationService');

class RealtimeEventService {
  /**
   * Initialize real-time services
   */
  async initialize() {
    await pushService.initialize();
    console.log('✅ Real-time Event Service initialized');
  }

  /**
   * Broadcast order created event
   * @param {object} order - Order object
   */
  async onOrderCreated(order) {
    // Broadcast via WebSocket to admins and couriers
    socketService.broadcastOrderCreated(order);

    // Send push notification to customer
    if (order.customer_id) {
      await pushService.notifyOrderStatus(
        order.customer_id,
        order.id,
        'pending',
        `Order #${order.id} has been received and is being processed`
      );
    }

    console.log(`📦 Order ${order.id} created event broadcasted`);
  }

  /**
   * Broadcast order status change
   * @param {number} orderId - Order ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {object} orderData - Full order object
   */
  async onOrderStatusChanged(orderId, oldStatus, newStatus, orderData) {
    // Broadcast via WebSocket
    socketService.broadcastOrderStatusChanged(orderId, oldStatus, newStatus, orderData);

    // Send push notification to customer
    if (orderData.customer_id) {
      const messages = {
        preparing: 'Your order is being prepared',
        ready: 'Your order is ready for pickup',
        in_transit: 'Your order is on the way!',
        delivered: 'Your order has been delivered. Enjoy!',
        cancelled: 'Your order has been cancelled'
      };

      await pushService.notifyOrderStatus(
        orderData.customer_id,
        orderId,
        newStatus,
        messages[newStatus]
      );
    }

    // Special handling for different statuses
    if (newStatus === 'delivered' && orderData.customer_id) {
      await pushService.notifyDeliveryCompleted(orderData.customer_id, orderId);
    }

    console.log(`📦 Order ${orderId} status changed: ${oldStatus} -> ${newStatus}`);
  }

  /**
   * Broadcast order assigned to courier
   * @param {number} orderId - Order ID
   * @param {number} courierId - Courier ID
   * @param {object} orderData - Full order object
   */
  async onOrderAssigned(orderId, courierId, orderData) {
    // Broadcast via WebSocket
    socketService.broadcastOrderAssigned(orderId, courierId, orderData);

    // Send push notification to courier
    await pushService.notifyCourierOrderAssigned(courierId, orderId, {
      restaurant: orderData.restaurant_slug,
      items: orderData.items?.length || 0,
      deliveryAddress: orderData.customer_address
    });

    // Notify customer if they have device registered
    if (orderData.customer_id) {
      await pushService.sendToUser(orderData.customer_id, {
        title: '🚚 Courier Assigned',
        body: 'A courier has been assigned to your order',
        data: {
          type: 'order_assigned',
          orderId,
          courierId
        }
      });
    }

    console.log(`📦 Order ${orderId} assigned to courier ${courierId}`);
  }

  /**
   * Broadcast courier location update
   * @param {number} courierId - Courier ID
   * @param {object} location - { latitude, longitude, accuracy }
   * @param {number} orderId - Optional order ID being delivered
   */
  async onCourierLocationUpdate(courierId, location, orderId = null) {
    // This is handled directly by socketService when courier emits location
    // But we can add additional logic here if needed

    // Example: Check if courier is near destination and notify customer
    if (orderId) {
      // TODO: Calculate distance to destination
      // If distance < 500m, notify customer
      // await pushService.notifyCourierNearby(customerId, orderId, estimatedMinutes);
    }
  }

  /**
   * Broadcast courier status change
   * @param {number} courierId - Courier ID
   * @param {string} status - New status (available, busy, offline)
   */
  async onCourierStatusChanged(courierId, status) {
    // Broadcast via WebSocket to admins
    socketService.notifyAdmins('courier:status:change', {
      courierId,
      status
    });

    console.log(`👷 Courier ${courierId} status: ${status}`);
  }

  /**
   * Send notification to specific user
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data
   */
  async notifyUser(userId, title, body, data = {}) {
    // Send via WebSocket if connected
    socketService.notifyUser(userId, 'notification', {
      title,
      body,
      data
    });

    // Send push notification
    await pushService.sendToUser(userId, {
      title,
      body,
      data
    });

    console.log(`📢 Notification sent to user ${userId}`);
  }

  /**
   * Broadcast system announcement to all users
   * @param {string} title - Announcement title
   * @param {string} message - Announcement message
   * @param {string} severity - info, warning, critical
   */
  async broadcastAnnouncement(title, message, severity = 'info') {
    // Broadcast via WebSocket to all connected clients
    if (socketService.io) {
      socketService.io.emit('system:announcement', {
        title,
        message,
        severity,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📢 System announcement broadcasted: ${title}`);
  }

  /**
   * Get real-time statistics
   */
  getStatistics() {
    return {
      websocket: {
        connectedUsers: socketService.getConnectedUsersCount(),
        activeCouriers: socketService.courierLocations.size
      },
      pushNotifications: {
        registeredDevices: pushService.getDeviceCount(),
        mode: pushService.mode
      }
    };
  }
}

// Export singleton instance
module.exports = new RealtimeEventService();
