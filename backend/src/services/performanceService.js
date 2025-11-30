/**
 * PHASE 3B.6: Performance Monitoring Service
 *
 * Provides KPI tracking, snapshots, and alert management
 */

const pool = require('../config/database');

class PerformanceService {
  /**
   * Capture a performance snapshot of current system state
   * @returns {Promise<object>} Performance snapshot
   */
  static async captureSnapshot() {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT * FROM capture_performance_snapshot()');
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get recent performance snapshots
   * @param {object} options - { limit, offset, startDate, endDate }
   * @returns {Promise<Array>} Array of snapshots
   */
  static async getSnapshots(options = {}) {
    const client = await pool.connect();

    try {
      let query = 'SELECT * FROM performance_snapshots WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (options.startDate) {
        query += ` AND snapshot_at >= $${paramIndex}`;
        params.push(options.startDate);
        paramIndex++;
      }

      if (options.endDate) {
        query += ` AND snapshot_at <= $${paramIndex}`;
        params.push(options.endDate);
        paramIndex++;
      }

      query += ' ORDER BY snapshot_at DESC';

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
        paramIndex++;
      }

      if (options.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get latest snapshot
   * @returns {Promise<object>} Latest snapshot
   */
  static async getLatestSnapshot() {
    const snapshots = await this.getSnapshots({ limit: 1 });
    return snapshots[0] || null;
  }

  /**
   * Get performance trends (comparison between snapshots)
   * @param {number} hours - Number of hours to analyze
   * @returns {Promise<object>} Trend analysis
   */
  static async getTrends(hours = 24) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        WITH latest AS (
          SELECT * FROM performance_snapshots
          ORDER BY snapshot_at DESC LIMIT 1
        ),
        previous AS (
          SELECT * FROM performance_snapshots
          WHERE snapshot_at <= NOW() - INTERVAL '${hours} hours'
          ORDER BY snapshot_at DESC LIMIT 1
        )
        SELECT
          latest.total_orders - COALESCE(previous.total_orders, 0) AS orders_change,
          latest.orders_delivered - COALESCE(previous.orders_delivered, 0) AS deliveries_change,
          latest.available_couriers - COALESCE(previous.available_couriers, 0) AS couriers_change,
          latest.avg_delivery_time_minutes - COALESCE(previous.avg_delivery_time_minutes, 0) AS delivery_time_change,
          latest.success_rate_percentage - COALESCE(previous.success_rate_percentage, 0) AS success_rate_change,
          latest.daily_revenue_sek - COALESCE(previous.daily_revenue_sek, 0) AS revenue_change
        FROM latest, previous
      `);

      return result.rows[0] || {};
    } finally {
      client.release();
    }
  }

  /**
   * Check all alerts against latest snapshot
   * @returns {Promise<object>} Alert check results
   */
  static async checkAlerts() {
    const client = await pool.connect();

    try {
      const result = await client.query('SELECT check_performance_alerts() AS triggered_count');
      return {
        alerts_triggered: result.rows[0].triggered_count,
        checked_at: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get all alert definitions
   * @param {boolean} enabledOnly - Only return enabled alerts
   * @returns {Promise<Array>} Alert definitions
   */
  static async getAlerts(enabledOnly = false) {
    const client = await pool.connect();

    try {
      let query = 'SELECT * FROM performance_alerts';

      if (enabledOnly) {
        query += ' WHERE is_enabled = true';
      }

      query += ' ORDER BY severity DESC, alert_name';

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new alert definition
   * @param {object} alertData - Alert configuration
   * @returns {Promise<object>} Created alert
   */
  static async createAlert(alertData) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        INSERT INTO performance_alerts (
          alert_name, description, alert_type, metric_name,
          threshold_value, comparison_operator, severity,
          is_enabled, notify_email, notify_slack
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        alertData.alert_name,
        alertData.description || '',
        alertData.alert_type || 'threshold',
        alertData.metric_name,
        alertData.threshold_value,
        alertData.comparison_operator,
        alertData.severity || 'warning',
        alertData.is_enabled !== false,
        alertData.notify_email || null,
        alertData.notify_slack || null
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`Alert with name '${alertData.alert_name}' already exists`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update alert definition
   * @param {number} alertId - Alert ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>} Updated alert
   */
  static async updateAlert(alertId, updates) {
    const client = await pool.connect();

    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = [
        'description', 'threshold_value', 'comparison_operator',
        'severity', 'is_enabled', 'notify_email', 'notify_slack'
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          params.push(updates[field]);
          paramIndex++;
        }
      });

      fields.push('updated_at = NOW()');

      if (fields.length === 1) {
        throw new Error('No valid fields to update');
      }

      params.push(alertId);

      const result = await client.query(`
        UPDATE performance_alerts
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        throw new Error(`Alert with ID ${alertId} not found`);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Delete alert definition
   * @param {number} alertId - Alert ID
   * @returns {Promise<boolean>} Success
   */
  static async deleteAlert(alertId) {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'DELETE FROM performance_alerts WHERE id = $1',
        [alertId]
      );

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get alert trigger history
   * @param {object} filters - { alertId, resolved, limit, offset }
   * @returns {Promise<Array>} Alert history
   */
  static async getAlertHistory(filters = {}) {
    const client = await pool.connect();

    try {
      let query = `
        SELECT ah.*, pa.alert_name, pa.severity AS alert_severity
        FROM performance_alert_history ah
        JOIN performance_alerts pa ON ah.alert_id = pa.id
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (filters.alertId) {
        query += ` AND ah.alert_id = $${paramIndex}`;
        params.push(filters.alertId);
        paramIndex++;
      }

      if (filters.resolved !== undefined) {
        query += ` AND ah.resolved = $${paramIndex}`;
        params.push(filters.resolved);
        paramIndex++;
      }

      query += ' ORDER BY ah.triggered_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Resolve an alert
   * @param {number} historyId - Alert history ID
   * @param {number} resolvedBy - User ID
   * @param {string} notes - Resolution notes
   * @returns {Promise<object>} Updated history entry
   */
  static async resolveAlert(historyId, resolvedBy, notes) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE performance_alert_history
        SET resolved = true,
            resolved_at = NOW(),
            resolved_by = $2,
            resolution_notes = $3
        WHERE id = $1
        RETURNING *
      `, [historyId, resolvedBy, notes]);

      if (result.rows.length === 0) {
        throw new Error(`Alert history with ID ${historyId} not found`);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get dashboard summary (KPIs + active alerts)
   * @returns {Promise<object>} Dashboard data
   */
  static async getDashboardSummary() {
    const client = await pool.connect();

    try {
      const latest = await this.getLatestSnapshot();
      const activeAlerts = await this.getAlertHistory({
        resolved: false,
        limit: 10
      });
      const trends = await this.getTrends(24);

      return {
        current: latest,
        trends: trends,
        active_alerts: activeAlerts,
        active_alerts_count: activeAlerts.length
      };
    } finally {
      client.release();
    }
  }
}

module.exports = PerformanceService;
