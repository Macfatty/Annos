/**
 * PHASE 3B.6: Performance Monitoring Controller
 */

const PerformanceService = require('../services/performanceService');

// Capture new snapshot
exports.captureSnapshot = async (req, res) => {
  try {
    const snapshot = await PerformanceService.captureSnapshot();
    return res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    console.error('Error capturing snapshot:', error);
    return res.status(500).json({ success: false, error: 'Failed to capture snapshot' });
  }
};

// Get recent snapshots
exports.getSnapshots = async (req, res) => {
  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 24,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const snapshots = await PerformanceService.getSnapshots(options);
    return res.status(200).json({ success: true, data: snapshots, count: snapshots.length });
  } catch (error) {
    console.error('Error getting snapshots:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve snapshots' });
  }
};

// Get latest snapshot
exports.getLatestSnapshot = async (req, res) => {
  try {
    const snapshot = await PerformanceService.getLatestSnapshot();
    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'No snapshots available' });
    }
    return res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    console.error('Error getting latest snapshot:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve latest snapshot' });
  }
};

// Get trends
exports.getTrends = async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours, 10) : 24;
    const trends = await PerformanceService.getTrends(hours);
    return res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error('Error getting trends:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve trends' });
  }
};

// Check alerts
exports.checkAlerts = async (req, res) => {
  try {
    const result = await PerformanceService.checkAlerts();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error checking alerts:', error);
    return res.status(500).json({ success: false, error: 'Failed to check alerts' });
  }
};

// Get alerts
exports.getAlerts = async (req, res) => {
  try {
    const enabledOnly = req.query.enabled === 'true';
    const alerts = await PerformanceService.getAlerts(enabledOnly);
    return res.status(200).json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    console.error('Error getting alerts:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve alerts' });
  }
};

// Create alert
exports.createAlert = async (req, res) => {
  try {
    const alert = await PerformanceService.createAlert(req.body);
    return res.status(201).json({ success: true, data: alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
};

// Update alert
exports.updateAlert = async (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    const alert = await PerformanceService.updateAlert(alertId, req.body);
    return res.status(200).json({ success: true, data: alert });
  } catch (error) {
    console.error('Error updating alert:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
};

// Delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    const success = await PerformanceService.deleteAlert(alertId);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    return res.status(200).json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete alert' });
  }
};

// Get alert history
exports.getAlertHistory = async (req, res) => {
  try {
    const filters = {
      alertId: req.query.alertId ? parseInt(req.query.alertId, 10) : undefined,
      resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
    };

    const history = await PerformanceService.getAlertHistory(filters);
    return res.status(200).json({ success: true, data: history, count: history.length });
  } catch (error) {
    console.error('Error getting alert history:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve alert history' });
  }
};

// Resolve alert
exports.resolveAlert = async (req, res) => {
  try {
    const historyId = parseInt(req.params.id, 10);
    const { notes } = req.body;

    const result = await PerformanceService.resolveAlert(historyId, req.user.id, notes || '');
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Error resolving alert:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
};

// Get dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const summary = await PerformanceService.getDashboardSummary();
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve dashboard summary' });
  }
};
