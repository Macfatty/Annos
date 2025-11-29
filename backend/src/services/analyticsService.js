/**
 * PHASE 3B.3: Analytics Service
 *
 * Provides analytics and performance metrics for the courier platform
 * Uses materialized views for fast query performance
 */

const pool = require('../config/database');

class AnalyticsService {
  /**
   * Get performance metrics for a specific courier
   * @param {number} courierId - Courier ID
   * @param {object} dateRange - Optional date range {startDate, endDate}
   * @returns {Promise<object>} Courier performance data
   */
  static async getCourierPerformance(courierId, dateRange = null) {
    const client = await pool.connect();

    try {
      // If no date range, get from materialized view (fast)
      if (!dateRange) {
        const result = await client.query(
          `SELECT * FROM courier_performance_metrics WHERE courier_id = $1`,
          [courierId]
        );

        if (result.rows.length === 0) {
          throw new Error(`Courier with ID ${courierId} not found`);
        }

        return result.rows[0];
      }

      // With date range, calculate real-time
      const { startDate, endDate } = dateRange;

      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date must be before or equal to end date');
      }

      if (new Date(endDate) > new Date()) {
        throw new Error('End date cannot be in the future');
      }

      const result = await client.query(
        `
        SELECT
          cp.id AS courier_id,
          cp.user_id,
          COALESCE(u.namn, u.email) AS courier_name,
          u.email AS courier_email,
          cp.vehicle_type,
          cp.is_available,
          cp.gps_enabled,
          cp.rating,

          -- Order statistics for date range
          COUNT(o.id) AS total_orders,
          COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS completed_deliveries,
          COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_deliveries,

          -- Performance metrics
          ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,
          ROUND(MIN(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS fastest_delivery_minutes,
          ROUND(MAX(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS slowest_delivery_minutes,

          -- Earnings estimate
          ROUND(COUNT(o.id) FILTER (WHERE o.status = 'delivered') * 35.0::numeric, 2) AS estimated_earnings_sek,

          -- Success rate
          ROUND(
            (COUNT(o.id) FILTER (WHERE o.status = 'delivered')::numeric /
             NULLIF(COUNT(o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0) * 100),
            2
          ) AS success_rate_percentage,

          MAX(o.delivered_at) AS last_delivery_at,
          MAX(o.created_at) AS last_order_at

        FROM courier_profiles cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN orders o ON o.assigned_courier_id = u.id
          AND o.created_at >= $2
          AND o.created_at <= $3
        WHERE cp.id = $1
        GROUP BY cp.id, cp.user_id, u.namn, u.email, cp.vehicle_type, cp.is_available, cp.gps_enabled, cp.rating
        `,
        [courierId, startDate, endDate]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier with ID ${courierId} not found`);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get system-wide statistics
   * @param {object} dateRange - Optional date range {startDate, endDate}
   * @returns {Promise<object>} System statistics
   */
  static async getSystemStatistics(dateRange = null) {
    const client = await pool.connect();

    try {
      // If no date range, use materialized view
      if (!dateRange) {
        const result = await client.query('SELECT * FROM system_wide_statistics');
        return result.rows[0] || {};
      }

      // With date range, calculate real-time
      const { startDate, endDate } = dateRange;

      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date must be before or equal to end date');
      }

      if (new Date(endDate) > new Date()) {
        throw new Error('End date cannot be in the future');
      }

      const result = await client.query(
        `
        SELECT
          -- Order metrics
          COUNT(o.id) AS total_orders,
          COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS total_delivered,
          COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS total_cancelled,
          COUNT(o.id) FILTER (WHERE o.status = 'pending') AS total_pending,

          -- Courier metrics (current state, not time-bound)
          (SELECT COUNT(DISTINCT id) FROM courier_profiles) AS total_couriers,
          (SELECT COUNT(DISTINCT id) FROM courier_profiles WHERE is_available = true) AS active_couriers,
          (SELECT COUNT(DISTINCT id) FROM courier_profiles WHERE gps_enabled = true) AS gps_enabled_couriers,

          -- Performance metrics
          ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,
          (SELECT ROUND(AVG(rating)::numeric, 2) FROM courier_profiles) AS avg_courier_rating,

          -- Success rate
          ROUND(
            (COUNT(o.id) FILTER (WHERE o.status = 'delivered')::numeric /
             NULLIF(COUNT(o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0) * 100),
            2
          ) AS overall_success_rate,

          -- Revenue
          ROUND(COUNT(o.id) FILTER (WHERE o.status = 'delivered') * 35.0::numeric, 2) AS estimated_total_revenue_sek,

          -- Customer metrics
          COUNT(DISTINCT o.customer_email) AS unique_customers,

          MAX(o.created_at) AS last_order_time,
          MAX(o.delivered_at) AS last_delivery_time

        FROM orders o
        WHERE o.created_at >= $1 AND o.created_at <= $2
        `,
        [startDate, endDate]
      );

      return result.rows[0] || {};
    } finally {
      client.release();
    }
  }

  /**
   * Get activity statistics by hour of day
   * @param {object} dateRange - Optional date range {startDate, endDate}
   * @returns {Promise<Array>} Array of hourly activity data
   */
  static async getActivityByHour(dateRange = null) {
    const client = await pool.connect();

    try {
      // If no date range, use materialized view (last 30 days)
      if (!dateRange) {
        const result = await client.query(`
          SELECT
            hour_of_day,
            SUM(total_orders) AS total_orders,
            SUM(delivered_orders) AS delivered_orders,
            SUM(cancelled_orders) AS cancelled_orders,
            ROUND(AVG(avg_delivery_time_minutes)::numeric, 2) AS avg_delivery_time_minutes,
            ROUND(AVG(success_rate)::numeric, 2) AS avg_success_rate
          FROM hourly_activity_stats
          GROUP BY hour_of_day
          ORDER BY hour_of_day
        `);

        return result.rows;
      }

      // With date range, calculate real-time
      const { startDate, endDate } = dateRange;

      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date must be before or equal to end date');
      }

      if (new Date(endDate) > new Date()) {
        throw new Error('End date cannot be in the future');
      }

      const result = await client.query(
        `
        SELECT
          EXTRACT(HOUR FROM created_at) AS hour_of_day,

          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,

          ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (WHERE status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,

          ROUND(
            (COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
             NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'cancelled')), 0) * 100),
            2
          ) AS success_rate

        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour_of_day
        `,
        [startDate, endDate]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get daily revenue metrics
   * @param {object} dateRange - Optional date range {startDate, endDate}
   * @returns {Promise<Array>} Array of daily revenue data
   */
  static async getRevenueMetrics(dateRange = null) {
    const client = await pool.connect();

    try {
      // If no date range, use materialized view (last 90 days)
      if (!dateRange) {
        const result = await client.query(`
          SELECT *
          FROM daily_revenue_stats
          ORDER BY activity_date DESC
          LIMIT 90
        `);

        return result.rows;
      }

      // With date range, calculate real-time
      const { startDate, endDate } = dateRange;

      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date must be before or equal to end date');
      }

      if (new Date(endDate) > new Date()) {
        throw new Error('End date cannot be in the future');
      }

      const result = await client.query(
        `
        SELECT
          DATE(created_at) AS activity_date,

          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,

          ROUND(COUNT(*) FILTER (WHERE status = 'delivered') * 35.0::numeric, 2) AS daily_revenue_sek,

          COUNT(DISTINCT customer_email) AS unique_customers,
          COUNT(DISTINCT assigned_courier_id) AS active_couriers,

          ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (WHERE status = 'delivered')::numeric, 2) AS avg_delivery_time

        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY DATE(created_at)
        ORDER BY activity_date DESC
        `,
        [startDate, endDate]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get top performing couriers (leaderboard)
   * @param {number} limit - Number of couriers to return (default: 10)
   * @param {string} metric - Metric to sort by: 'deliveries', 'rating', 'earnings' (default: 'deliveries')
   * @returns {Promise<Array>} Array of top performers
   */
  static async getTopPerformers(limit = 10, metric = 'deliveries') {
    const client = await pool.connect();

    try {
      // Validate limit
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      // Validate metric
      const validMetrics = ['deliveries', 'rating', 'earnings'];
      if (!validMetrics.includes(metric)) {
        throw new Error(`Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
      }

      // Determine sort column
      let sortColumn;
      switch (metric) {
        case 'deliveries':
          sortColumn = 'completed_deliveries';
          break;
        case 'rating':
          sortColumn = 'rating';
          break;
        case 'earnings':
          sortColumn = 'estimated_earnings_sek';
          break;
        default:
          sortColumn = 'completed_deliveries';
      }

      const result = await client.query(
        `
        SELECT
          courier_id,
          courier_name,
          courier_email,
          vehicle_type,
          completed_deliveries,
          rating,
          estimated_earnings_sek,
          avg_delivery_time_minutes,
          success_rate_percentage,
          current_status,
          last_delivery_at
        FROM courier_performance_metrics
        WHERE completed_deliveries > 0
        ORDER BY ${sortColumn} DESC, courier_id
        LIMIT $1
        `,
        [limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Refresh all analytics materialized views
   * This should be called periodically (e.g., via cron job)
   * @returns {Promise<object>} Refresh status
   */
  static async refreshAnalytics() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const startTime = Date.now();

      // Call the refresh function
      await client.query('SELECT refresh_analytics_views()');

      const endTime = Date.now();
      const duration = endTime - startTime;

      await client.query('COMMIT');

      return {
        success: true,
        duration_ms: duration,
        refreshed_at: new Date().toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get analytics summary for dashboard
   * Combines multiple metrics into a single response
   * @returns {Promise<object>} Dashboard data
   */
  static async getDashboardSummary() {
    const client = await pool.connect();

    try {
      // Get system stats
      const systemStats = await this.getSystemStatistics();

      // Get today's performance
      const today = new Date().toISOString().split('T')[0];
      const todayStats = await client.query(
        `
        SELECT
          COUNT(*) AS orders_today,
          COUNT(*) FILTER (WHERE status = 'delivered') AS deliveries_today,
          COUNT(*) FILTER (WHERE status IN ('preparing', 'ready', 'picked_up')) AS in_progress,
          ROUND(COUNT(*) FILTER (WHERE status = 'delivered') * 35.0::numeric, 2) AS revenue_today
        FROM orders
        WHERE DATE(created_at) = $1
        `,
        [today]
      );

      // Get top 5 couriers
      const topCouriers = await this.getTopPerformers(5, 'deliveries');

      // Get hourly activity for today
      const hourlyActivity = await client.query(
        `
        SELECT
          EXTRACT(HOUR FROM created_at) AS hour,
          COUNT(*) AS orders
        FROM orders
        WHERE DATE(created_at) = $1
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
        `,
        [today]
      );

      return {
        system: systemStats,
        today: todayStats.rows[0] || {},
        topCouriers: topCouriers,
        hourlyActivity: hourlyActivity.rows
      };
    } finally {
      client.release();
    }
  }
}

module.exports = AnalyticsService;
