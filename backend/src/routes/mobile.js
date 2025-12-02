/**
 * PHASE 3B.5: Mobile API Routes
 */

const express = require('express');
const router = express.Router();
const mobileController = require('../controllers/mobileController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/requirePermission');

// All routes require authentication
router.use(verifyJWT);

// Push Notification Registration
router.post('/device/register', mobileController.registerDevice);
router.post('/device/unregister', mobileController.unregisterDevice);

// WebSocket Info
router.get('/websocket/info', mobileController.getWebSocketInfo);

// Courier Location Tracking
router.get('/courier/:courierId/location', mobileController.getCourierLocation);
router.get('/couriers/locations', requirePermission('admin'), mobileController.getAllCourierLocations);

// Order Tracking
router.get('/order/:orderId/tracking', mobileController.getOrderTracking);

// Courier-specific
router.get('/courier/deliveries', mobileController.getCourierActiveDeliveries);

// Real-time Stats (admin only)
router.get('/stats/realtime', requirePermission('admin'), mobileController.getRealtimeStats);

// Testing endpoints
router.post('/test/notification', mobileController.sendTestNotification);
router.get('/test/notification/history', requirePermission('admin'), mobileController.getNotificationHistory);

// System announcements (admin only)
router.post('/announcement', requirePermission('admin'), mobileController.broadcastAnnouncement);

module.exports = router;
