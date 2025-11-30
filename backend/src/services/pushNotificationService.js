/**
 * PHASE 3B.5: Push Notification Service
 *
 * Mock service for push notifications
 * In production, integrate with FCM (Firebase Cloud Messaging) for Android
 * and APNs (Apple Push Notification service) for iOS
 */

class PushNotificationService {
  constructor() {
    this.mode = process.env.PUSH_MODE || 'mock'; // 'mock' or 'production'
    this.deviceTokens = new Map(); // userId -> { platform, token }
    this.notificationHistory = [];
  }

  /**
   * Initialize push notification service
   */
  async initialize() {
    if (this.mode === 'production') {
      console.log('⚠️  Production push notifications not configured yet');
      console.log('💡 Set FCM_SERVER_KEY and APNS_KEY_ID in .env for production mode');
      this.mode = 'mock';
    }

    console.log(`✅ Push Notification Service initialized (mode: ${this.mode})`);
  }

  /**
   * Register device token for push notifications
   * @param {number} userId - User ID
   * @param {string} token - Device FCM/APNs token
   * @param {string} platform - 'android' or 'ios'
   */
  registerDevice(userId, token, platform) {
    if (!['android', 'ios'].includes(platform)) {
      throw new Error('Invalid platform. Must be "android" or "ios"');
    }

    this.deviceTokens.set(userId, { platform, token, registeredAt: new Date() });
    console.log(`📱 Device registered for user ${userId}: ${platform}`);

    return {
      success: true,
      userId,
      platform,
      registeredAt: new Date().toISOString()
    };
  }

  /**
   * Unregister device token
   * @param {number} userId - User ID
   */
  unregisterDevice(userId) {
    const existed = this.deviceTokens.delete(userId);

    if (existed) {
      console.log(`📱 Device unregistered for user ${userId}`);
    }

    return { success: existed };
  }

  /**
   * Send push notification to user
   * @param {number} userId - User ID
   * @param {object} notification - Notification data
   */
  async sendToUser(userId, notification) {
    const device = this.deviceTokens.get(userId);

    if (!device) {
      console.log(`⚠️  No device registered for user ${userId}`);
      return { success: false, error: 'No device registered' };
    }

    const payload = {
      userId,
      platform: device.platform,
      token: device.token,
      ...notification,
      sentAt: new Date().toISOString()
    };

    if (this.mode === 'mock') {
      return this.mockSend(payload);
    } else {
      return this.productionSend(payload);
    }
  }

  /**
   * Send push notification to multiple users
   * @param {array} userIds - Array of user IDs
   * @param {object} notification - Notification data
   */
  async sendToMultiple(userIds, notification) {
    const results = await Promise.all(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📤 Sent to ${successful}/${userIds.length} users (${failed} failed)`);

    return {
      total: userIds.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Mock send (for development)
   */
  mockSend(payload) {
    console.log('\n📬 MOCK PUSH NOTIFICATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: User ${payload.userId} (${payload.platform})`);
    console.log(`Title: ${payload.title}`);
    console.log(`Body: ${payload.body}`);
    if (payload.data) {
      console.log(`Data:`, payload.data);
    }
    console.log(`Sent at: ${payload.sentAt}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Store in history
    this.notificationHistory.push(payload);

    return {
      success: true,
      mode: 'mock',
      userId: payload.userId,
      sentAt: payload.sentAt
    };
  }

  /**
   * Production send (FCM/APNs)
   * TODO: Implement when FCM/APNs credentials are available
   */
  async productionSend(payload) {
    console.log('⚠️  Production push not implemented yet');

    if (payload.platform === 'android') {
      // TODO: Implement FCM send
      return { success: false, error: 'FCM not configured' };
    } else if (payload.platform === 'ios') {
      // TODO: Implement APNs send
      return { success: false, error: 'APNs not configured' };
    }

    return { success: false, error: 'Unknown platform' };
  }

  /**
   * Send order status notification
   */
  async notifyOrderStatus(userId, orderId, status, message) {
    const statusEmojis = {
      pending: '⏳',
      preparing: '👨‍🍳',
      ready: '✅',
      in_transit: '🚚',
      delivered: '🎉',
      cancelled: '❌'
    };

    const emoji = statusEmojis[status] || '📦';

    return this.sendToUser(userId, {
      title: `${emoji} Order #${orderId}`,
      body: message || `Your order is now ${status}`,
      data: {
        type: 'order_status',
        orderId,
        status
      }
    });
  }

  /**
   * Send order assigned notification to courier
   */
  async notifyCourierOrderAssigned(courierId, orderId, orderDetails) {
    return this.sendToUser(courierId, {
      title: '🚚 New Delivery Assigned',
      body: `You have been assigned order #${orderId}`,
      data: {
        type: 'order_assigned',
        orderId,
        orderDetails
      }
    });
  }

  /**
   * Send courier nearby notification to customer
   */
  async notifyCourierNearby(userId, orderId, estimatedMinutes) {
    return this.sendToUser(userId, {
      title: '🚚 Courier Nearby!',
      body: `Your courier will arrive in approximately ${estimatedMinutes} minutes`,
      data: {
        type: 'courier_nearby',
        orderId,
        estimatedMinutes
      }
    });
  }

  /**
   * Send delivery completed notification
   */
  async notifyDeliveryCompleted(userId, orderId) {
    return this.sendToUser(userId, {
      title: '🎉 Delivery Completed!',
      body: `Your order #${orderId} has been delivered. Enjoy your meal!`,
      data: {
        type: 'delivery_completed',
        orderId
      }
    });
  }

  /**
   * Get notification history
   */
  getHistory(limit = 50) {
    return this.notificationHistory.slice(-limit).reverse();
  }

  /**
   * Get registered devices count
   */
  getDeviceCount() {
    return this.deviceTokens.size;
  }

  /**
   * Get all registered devices
   */
  getAllDevices() {
    return Array.from(this.deviceTokens.entries()).map(([userId, device]) => ({
      userId,
      ...device
    }));
  }
}

// Export singleton instance
module.exports = new PushNotificationService();
