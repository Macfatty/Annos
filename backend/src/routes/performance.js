/**
 * PHASE 3B.6: Performance Monitoring Routes
 */

const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const { verifyJWT, checkPermission } = require('../middleware/authMiddleware');

// All routes require admin permission
router.use(verifyJWT, checkPermission('admin'));

// Snapshots
router.post('/snapshot', performanceController.captureSnapshot);
router.get('/snapshots', performanceController.getSnapshots);
router.get('/snapshots/latest', performanceController.getLatestSnapshot);
router.get('/trends', performanceController.getTrends);

// Alerts
router.post('/alerts/check', performanceController.checkAlerts);
router.get('/alerts', performanceController.getAlerts);
router.post('/alerts', performanceController.createAlert);
router.put('/alerts/:id', performanceController.updateAlert);
router.delete('/alerts/:id', performanceController.deleteAlert);

// Alert History
router.get('/alerts/history', performanceController.getAlertHistory);
router.post('/alerts/history/:id/resolve', performanceController.resolveAlert);

// Dashboard
router.get('/dashboard', performanceController.getDashboardSummary);

module.exports = router;
