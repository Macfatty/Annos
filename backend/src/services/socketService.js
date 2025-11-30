/**
 * PHASE 3B.5: WebSocket Service
 *
 * Real-time communication service using Socket.io
 * Handles authentication, room management, and event broadcasting
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.courierLocations = new Map(); // courierId -> { lat, lng, timestamp }
  }

  /**
   * Initialize Socket.io server
   * @param {Server} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    const { Server } = require('socket.io');

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      },
      path: '/socket.io'
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        // Get token from auth or handshake
        const token = socket.handshake.auth.token ||
                      socket.handshake.headers.cookie?.match(/token=([^;]+)/)?.[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.userId || decoded.id;
        socket.userRole = decoded.role;
        socket.userEmail = decoded.email;

        console.log(`🔌 User authenticated: ${socket.userEmail} (${socket.userRole})`);
        next();
      } catch (error) {
        console.error('Socket authentication failed:', error.message);
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id} (User: ${socket.userId})`);

      // Store connected user
      this.connectedUsers.set(socket.userId, socket);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Join role-specific room
      socket.join(`role:${socket.userRole}`);

      // If courier, join courier room
      if (socket.userRole === 'courier') {
        socket.join('couriers');
      }

      // If admin, join admin room
      if (socket.userRole === 'admin') {
        socket.join('admins');
      }

      // Send connection confirmation
      socket.emit('connected', {
        userId: socket.userId,
        role: socket.userRole,
        timestamp: new Date().toISOString()
      });

      // Handle courier location updates
      socket.on('courier:location', (data) => {
        this.handleCourierLocation(socket, data);
      });

      // Handle courier status updates
      socket.on('courier:status', (data) => {
        this.handleCourierStatus(socket, data);
      });

      // Handle order tracking subscription
      socket.on('order:subscribe', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`📦 User ${socket.userId} subscribed to order ${orderId}`);
      });

      // Handle order tracking unsubscription
      socket.on('order:unsubscribe', (orderId) => {
        socket.leave(`order:${orderId}`);
        console.log(`📦 User ${socket.userId} unsubscribed from order ${orderId}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id} (User: ${socket.userId})`);
        this.connectedUsers.delete(socket.userId);

        // If courier, remove location data
        if (socket.userRole === 'courier') {
          this.courierLocations.delete(socket.userId);
        }
      });
    });
  }

  /**
   * Handle courier location updates
   */
  handleCourierLocation(socket, data) {
    if (socket.userRole !== 'courier') {
      socket.emit('error', { message: 'Only couriers can send location updates' });
      return;
    }

    const { latitude, longitude, accuracy, orderId } = data;

    if (!latitude || !longitude) {
      socket.emit('error', { message: 'Invalid location data' });
      return;
    }

    const locationData = {
      courierId: socket.userId,
      latitude,
      longitude,
      accuracy,
      timestamp: new Date().toISOString()
    };

    // Store courier location
    this.courierLocations.set(socket.userId, locationData);

    // Broadcast to admins
    this.io.to('admins').emit('courier:location:update', locationData);

    // If tracking an order, broadcast to that order's subscribers
    if (orderId) {
      this.io.to(`order:${orderId}`).emit('delivery:location', locationData);
    }

    console.log(`📍 Courier ${socket.userId} location: ${latitude}, ${longitude}`);
  }

  /**
   * Handle courier status updates
   */
  handleCourierStatus(socket, data) {
    if (socket.userRole !== 'courier') {
      socket.emit('error', { message: 'Only couriers can update status' });
      return;
    }

    const { status } = data;
    const validStatuses = ['available', 'busy', 'offline'];

    if (!validStatuses.includes(status)) {
      socket.emit('error', { message: 'Invalid status' });
      return;
    }

    const statusUpdate = {
      courierId: socket.userId,
      status,
      timestamp: new Date().toISOString()
    };

    // Broadcast to admins
    this.io.to('admins').emit('courier:status:update', statusUpdate);

    console.log(`📊 Courier ${socket.userId} status: ${status}`);
  }

  /**
   * Broadcast order created event
   */
  broadcastOrderCreated(orderData) {
    if (!this.io) return;

    this.io.to('admins').emit('order:created', orderData);
    this.io.to('couriers').emit('order:new', orderData);

    console.log(`📦 Broadcasted order created: ${orderData.id}`);
  }

  /**
   * Broadcast order status change
   */
  broadcastOrderStatusChanged(orderId, oldStatus, newStatus, orderData) {
    if (!this.io) return;

    const event = {
      orderId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      order: orderData
    };

    // Broadcast to order subscribers (customer)
    this.io.to(`order:${orderId}`).emit('order:status', event);

    // Broadcast to admins
    this.io.to('admins').emit('order:status:change', event);

    // Broadcast to assigned courier if any
    if (orderData.courier_id) {
      this.io.to(`user:${orderData.courier_id}`).emit('order:status', event);
    }

    console.log(`📦 Order ${orderId}: ${oldStatus} -> ${newStatus}`);
  }

  /**
   * Broadcast order assigned to courier
   */
  broadcastOrderAssigned(orderId, courierId, orderData) {
    if (!this.io) return;

    const event = {
      orderId,
      courierId,
      timestamp: new Date().toISOString(),
      order: orderData
    };

    // Notify courier
    this.io.to(`user:${courierId}`).emit('order:assigned', event);

    // Notify order subscribers
    this.io.to(`order:${orderId}`).emit('order:assigned', event);

    // Notify admins
    this.io.to('admins').emit('order:assigned', event);

    console.log(`📦 Order ${orderId} assigned to courier ${courierId}`);
  }

  /**
   * Notify user about specific event
   */
  notifyUser(userId, event, data) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Notified user ${userId}: ${event}`);
  }

  /**
   * Broadcast to all admins
   */
  notifyAdmins(event, data) {
    if (!this.io) return;

    this.io.to('admins').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Notified admins: ${event}`);
  }

  /**
   * Broadcast to all couriers
   */
  notifyCouriers(event, data) {
    if (!this.io) return;

    this.io.to('couriers').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Notified couriers: ${event}`);
  }

  /**
   * Get all courier locations
   */
  getAllCourierLocations() {
    return Array.from(this.courierLocations.values());
  }

  /**
   * Get courier location by ID
   */
  getCourierLocation(courierId) {
    return this.courierLocations.get(courierId);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Export singleton instance
module.exports = new SocketService();
