/**
 * PHASE 3B.3: Analytics Controller
 *
 * HTTP handlers for analytics and performance metrics endpoints
 */

const AnalyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/courier/:id
 * Get performance metrics for a specific courier
 * Auth: Courier can view own stats, admin can view all
 */
exports.getCourierPerformance = async (req, res) => {
  try {
    const courierId = parseInt(req.params.id, 10);

    if (isNaN(courierId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid courier ID'
      });
    }

    // Permission check: courier can only view own stats, admin can view all
    if (req.user.role !== 'admin') {
      // Check if courier is viewing their own stats
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== courierId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own performance metrics'
        });
      }
    }

    // Parse date range if provided
    let dateRange = null;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
    }

    const performance = await AnalyticsService.getCourierPerformance(courierId, dateRange);

    return res.status(200).json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error getting courier performance:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('date')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courier performance metrics'
    });
  }
};

/**
 * GET /api/analytics/system
 * Get system-wide statistics
 * Auth: Admin only
 */
exports.getSystemStatistics = async (req, res) => {
  try {
    // Parse date range if provided
    let dateRange = null;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
    }

    const statistics = await AnalyticsService.getSystemStatistics(dateRange);

    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting system statistics:', error);

    if (error.message.includes('date')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    });
  }
};

/**
 * GET /api/analytics/activity
 * Get hourly activity statistics
 * Auth: Admin only
 */
exports.getActivityByHour = async (req, res) => {
  try {
    // Parse date range if provided
    let dateRange = null;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
    }

    const activity = await AnalyticsService.getActivityByHour(dateRange);

    return res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error getting activity by hour:', error);

    if (error.message.includes('date')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve hourly activity statistics'
    });
  }
};

/**
 * GET /api/analytics/revenue
 * Get daily revenue metrics
 * Auth: Admin only
 */
exports.getRevenueMetrics = async (req, res) => {
  try {
    // Parse date range if provided
    let dateRange = null;
    if (req.query.startDate && req.query.endDate) {
      dateRange = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };
    }

    const revenue = await AnalyticsService.getRevenueMetrics(dateRange);

    return res.status(200).json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Error getting revenue metrics:', error);

    if (error.message.includes('date')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve revenue metrics'
    });
  }
};

/**
 * GET /api/analytics/leaderboard
 * Get top performing couriers
 * Auth: Admin only (or public if we want to show leaderboard to couriers)
 */
exports.getLeaderboard = async (req, res) => {
  try {
    // Parse limit (default: 10, max: 100)
    let limit = parseInt(req.query.limit, 10) || 10;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Parse metric (default: 'deliveries')
    const metric = req.query.metric || 'deliveries';

    const leaderboard = await AnalyticsService.getTopPerformers(limit, metric);

    return res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);

    if (error.message.includes('Invalid metric')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve leaderboard'
    });
  }
};

/**
 * POST /api/analytics/refresh
 * Refresh all analytics materialized views
 * Auth: Admin only
 */
exports.refreshAnalytics = async (req, res) => {
  try {
    const result = await AnalyticsService.refreshAnalytics();

    return res.status(200).json({
      success: true,
      data: result,
      message: `Analytics views refreshed successfully in ${result.duration_ms}ms`
    });
  } catch (error) {
    console.error('Error refreshing analytics:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to refresh analytics views'
    });
  }
};

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard summary
 * Auth: Admin only
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const dashboard = await AnalyticsService.getDashboardSummary();

    return res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard summary'
    });
  }
};
