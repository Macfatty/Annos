const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const { verifyJWT, verifyRole } = require('../middleware/authMiddleware');

/**
 * Order Routes
 * Alla beställningsrelaterade endpoints
 */

// Public routes
router.post('/create', OrderController.createOrder);

// Protected routes - require authentication
router.use(verifyJWT);

// User routes
router.get('/user', OrderController.getUserOrders);
router.get('/:orderId', OrderController.getOrderById);

// Admin routes
router.get('/admin/all', verifyRole(['admin']), OrderController.getAdminOrders);

// Restaurant routes
router.get('/restaurant/orders', verifyRole(['admin', 'restaurant']), OrderController.getRestaurantOrders);
router.patch('/:orderId/status', verifyRole(['admin', 'restaurant']), OrderController.updateOrderStatus);
router.patch('/:orderId/done', verifyRole(['admin', 'restaurant']), OrderController.markOrderAsDone);

// Courier routes
router.get('/courier/orders', verifyRole(['admin', 'courier']), OrderController.getCourierOrders);
router.patch('/:orderId/accept', verifyRole(['admin', 'courier']), OrderController.acceptOrder);
router.patch('/:orderId/delivered', verifyRole(['admin', 'courier']), OrderController.markOrderAsDelivered);

module.exports = router;
