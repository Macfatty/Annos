const pool = require('../../db');

/**
 * Audit Service
 *
 * Handles audit logging for security and GDPR compliance.
 * Tracks sensitive operations and user actions.
 *
 * Features:
 * - log: Log any action with custom details
 * - logFromRequest: Automatic logging from Express request
 * - getLogs: Query audit logs with filters
 * - getStats: Get audit log statistics
 *
 * Common Actions:
 * - auth:login, auth:logout, auth:failed
 * - user:create, user:update, user:delete, user:view
 * - order:create, order:update, order:cancel
 * - menu:create, menu:update, menu:delete
 * - permission:grant, permission:revoke
 * - data:export, data:delete (GDPR)
 */
class AuditService {
  /**
   * Log an action
   *
   * @param {Object} params - Log parameters
   * @param {Number} params.userId - User ID who performed the action
   * @param {String} params.action - Action performed (e.g., 'user:delete')
   * @param {String} params.resourceType - Type of resource affected (e.g., 'user', 'order')
   * @param {Number} params.resourceId - ID of affected resource
   * @param {Object} params.details - Additional details (will be stored as JSONB)
   * @param {String} params.ipAddress - IP address of requester
   * @param {String} params.userAgent - User agent string
   * @returns {Promise<Object>} - Created audit log entry
   */
  static async log({
    userId,
    action,
    resourceType = null,
    resourceId = null,
    details = {},
    ipAddress = null,
    userAgent = null
  }) {
    try {
      const result = await pool.query(`
        INSERT INTO audit_logs (
          user_id,
          action,
          resource_type,
          resource_id,
          details,
          ip_address,
          user_agent,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't throw - audit logging should not break the app
      return null;
    }
  }

  /**
   * Log action from Express request (convenience method)
   *
   * @param {Object} req - Express request object
   * @param {String} action - Action performed
   * @param {String} resourceType - Type of resource
   * @param {Number} resourceId - ID of resource
   * @param {Object} details - Additional details
   * @returns {Promise<Object>} - Created audit log entry
   */
  static async logFromRequest(req, action, resourceType = null, resourceId = null, details = {}) {
    const userId = req.user?.id || req.user?.userId || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    return await this.log({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent
    });
  }

  /**
   * Get audit logs with filters
   *
   * @param {Object} filters - Filter options
   * @param {Number} filters.userId - Filter by user ID
   * @param {String} filters.action - Filter by action
   * @param {String} filters.resourceType - Filter by resource type
   * @param {Number} filters.resourceId - Filter by resource ID
   * @param {Date} filters.startDate - Filter from date
   * @param {Date} filters.endDate - Filter to date
   * @param {Number} filters.limit - Max number of results (default 100)
   * @param {Number} filters.offset - Offset for pagination (default 0)
   * @returns {Promise<Array>} - Array of audit log entries
   */
  static async getLogs({
    userId = null,
    action = null,
    resourceType = null,
    resourceId = null,
    startDate = null,
    endDate = null,
    limit = 100,
    offset = 0
  } = {}) {
    try {
      let query = `
        SELECT
          al.*,
          u.email as user_email,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (userId) {
        query += ` AND al.user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }

      if (action) {
        query += ` AND al.action = $${paramCount}`;
        params.push(action);
        paramCount++;
      }

      if (resourceType) {
        query += ` AND al.resource_type = $${paramCount}`;
        params.push(resourceType);
        paramCount++;
      }

      if (resourceId) {
        query += ` AND al.resource_id = $${paramCount}`;
        params.push(resourceId);
        paramCount++;
      }

      if (startDate) {
        query += ` AND al.created_at >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND al.created_at <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit log statistics
   *
   * @param {Object} filters - Filter options
   * @param {Date} filters.startDate - From date
   * @param {Date} filters.endDate - To date
   * @returns {Promise<Object>} - Statistics object
   */
  static async getStats({ startDate = null, endDate = null } = {}) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_logs,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT action) as unique_actions
        FROM audit_logs
        WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (startDate) {
        query += ` AND created_at >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }

      const result = await pool.query(query, params);

      // Get action breakdown
      let actionQuery = `
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE 1=1
      `;

      const actionParams = [];
      let actionParamCount = 1;

      if (startDate) {
        actionQuery += ` AND created_at >= $${actionParamCount}`;
        actionParams.push(startDate);
        actionParamCount++;
      }

      if (endDate) {
        actionQuery += ` AND created_at <= $${actionParamCount}`;
        actionParams.push(endDate);
        actionParamCount++;
      }

      actionQuery += ` GROUP BY action ORDER BY count DESC LIMIT 10`;

      const actionResult = await pool.query(actionQuery, actionParams);

      return {
        ...result.rows[0],
        top_actions: actionResult.rows
      };
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      throw error;
    }
  }

  /**
   * Delete old audit logs (for data retention policy)
   *
   * @param {Number} daysToKeep - Number of days to keep logs (default 90)
   * @returns {Promise<Number>} - Number of logs deleted
   */
  static async deleteOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await pool.query(`
        DELETE FROM audit_logs
        WHERE created_at < $1
      `, [cutoffDate]);

      console.log(`Deleted ${result.rowCount} old audit logs (older than ${daysToKeep} days)`);
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting old audit logs:', error);
      throw error;
    }
  }

  /**
   * Get user activity summary
   *
   * @param {Number} userId - User ID
   * @param {Number} limit - Max number of recent actions (default 20)
   * @returns {Promise<Array>} - User's recent actions
   */
  static async getUserActivity(userId, limit = 20) {
    try {
      const result = await pool.query(`
        SELECT
          action,
          resource_type,
          resource_id,
          details,
          created_at
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }
}

module.exports = AuditService;
