/**
 * PHASE 3B.3: Analytics Routes
 *
 * Routes for analytics and performance metrics
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyJWT, checkPermission } = require('../middleware/authMiddleware');

/**
 * GET /api/analytics/courier/:id
 * Get performance metrics for a specific courier
 * Auth: Courier (own stats only) or Admin (all stats)
 */
router.get(
  '/courier/:id',
  verifyJWT,
  checkPermission('courier:view'),
  analyticsController.getCourierPerformance
);

/**
 * GET /api/analytics/system
 * Get system-wide statistics
 * Auth: Admin only
 */
router.get(
  '/system',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.getSystemStatistics
);

/**
 * GET /api/analytics/activity
 * Get hourly activity statistics
 * Auth: Admin only
 */
router.get(
  '/activity',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.getActivityByHour
);

/**
 * GET /api/analytics/revenue
 * Get daily revenue metrics
 * Auth: Admin only
 */
router.get(
  '/revenue',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.getRevenueMetrics
);

/**
 * GET /api/analytics/leaderboard
 * Get top performing couriers
 * Auth: Admin only (can be made public if desired)
 */
router.get(
  '/leaderboard',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.getLeaderboard
);

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard summary
 * Auth: Admin only
 */
router.get(
  '/dashboard',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.getDashboardSummary
);

/**
 * POST /api/analytics/refresh
 * Refresh all analytics materialized views
 * Auth: Admin only
 */
router.post(
  '/refresh',
  verifyJWT,
  checkPermission('admin'),
  analyticsController.refreshAnalytics
);

module.exports = router;
