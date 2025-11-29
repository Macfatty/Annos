/**
 * Courier Service
 *
 * Handles courier profile management, contracts, and delivery operations
 * Follows PHASE 1/2 patterns: Service layer, transactions, audit logging, error handling
 */

const pool = require('../config/database');
const AuditService = require('./auditService');

class CourierService {
  /**
   * Get all couriers from courier_statistics view
   *
   * @param {boolean} includeUnavailable - Include unavailable couriers (default: false)
   * @returns {Promise<Array>} Array of couriers with statistics
   */
  static async getAllCouriers(includeUnavailable = false) {
    try {
      const query = includeUnavailable
        ? 'SELECT * FROM courier_statistics ORDER BY courier_id DESC'
        : 'SELECT * FROM courier_statistics WHERE is_available = true ORDER BY courier_id DESC';

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Get all couriers error:', error);
      throw error;
    }
  }

  /**
   * Get courier by user_id
   *
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Courier profile from courier_statistics view
   */
  static async getCourierByUserId(userId) {
    try {
      const result = await pool.query(
        'SELECT * FROM courier_statistics WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found for user_id: ${userId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get courier by user_id error:', error);
      throw error;
    }
  }

  /**
   * Get courier by courier_id
   *
   * @param {number} courierId - Courier ID
   * @returns {Promise<Object>} Courier profile from courier_statistics view
   */
  static async getCourierById(courierId) {
    try {
      const result = await pool.query(
        'SELECT * FROM courier_statistics WHERE courier_id = $1',
        [courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get courier by id error:', error);
      throw error;
    }
  }

  /**
   * Create new courier profile
   *
   * @param {Object} data - Courier data
   * @param {number} data.userId - User ID to associate with courier profile
   * @param {string} data.vehicleType - Vehicle type (bike, car, scooter, etc.)
   * @param {number} createdBy - User ID who created the profile (for audit)
   * @returns {Promise<Object>} Created courier profile
   */
  static async createCourierProfile(data, createdBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create courier profile
      const result = await client.query(`
        INSERT INTO courier_profiles (
          user_id, vehicle_type, is_available, total_deliveries, rating
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.userId,
        data.vehicleType || 'bike',
        data.isAvailable !== undefined ? data.isAvailable : true,
        0, // initial deliveries
        5.0 // initial rating
      ]);

      const courier = result.rows[0];

      // 2. Audit log
      try {
        if (createdBy) {
          await AuditService.log({
            userId: createdBy,
            action: 'courier:create',
            resourceType: 'courier',
            resourceId: courier.id,
            details: {
              user_id: courier.user_id,
              vehicle_type: courier.vehicle_type
            }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return courier;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create courier profile error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update courier profile
   *
   * @param {number} courierId - Courier ID
   * @param {Object} data - Update data
   * @param {string} data.vehicleType - Vehicle type
   * @param {boolean} data.isAvailable - Availability status
   * @param {number} data.rating - Rating (1-5)
   * @param {number} updatedBy - User ID who updated the profile (for audit)
   * @returns {Promise<Object>} Updated courier profile
   */
  static async updateCourierProfile(courierId, data, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic UPDATE query
      const updates = [];
      const values = [];
      let paramCounter = 1;

      const allowedFields = ['vehicle_type', 'is_available', 'rating'];

      for (const field of allowedFields) {
        const camelCaseField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (data[camelCaseField] !== undefined) {
          updates.push(`${field} = $${paramCounter}`);
          values.push(data[camelCaseField]);
          paramCounter++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at timestamp
      updates.push(`updated_at = NOW()`);

      // Add courier_id as final parameter
      values.push(courierId);

      const query = `
        UPDATE courier_profiles
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      const courier = result.rows[0];

      // Audit log
      try {
        if (updatedBy) {
          await AuditService.log({
            userId: updatedBy,
            action: 'courier:update',
            resourceType: 'courier',
            resourceId: courierId,
            details: { updates: data }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return courier;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update courier profile error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle courier availability
   *
   * @param {number} courierId - Courier ID
   * @param {boolean} isAvailable - New availability status
   * @param {number} updatedBy - User ID who toggled availability (for audit)
   * @returns {Promise<Object>} Updated courier profile
   */
  static async toggleAvailability(courierId, isAvailable, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE courier_profiles
         SET is_available = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [isAvailable, courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      const courier = result.rows[0];

      // Audit log
      try {
        if (updatedBy) {
          await AuditService.log({
            userId: updatedBy,
            action: 'courier:toggle_availability',
            resourceType: 'courier',
            resourceId: courierId,
            details: { is_available: isAvailable }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return courier;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Toggle courier availability error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Increment delivery count for a courier
   *
   * @param {number} courierId - Courier ID
   * @returns {Promise<Object>} Updated courier profile
   */
  static async incrementDeliveryCount(courierId) {
    try {
      const result = await pool.query(
        `UPDATE courier_profiles
         SET total_deliveries = total_deliveries + 1, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Increment delivery count error:', error);
      throw error;
    }
  }

  /**
   * Get courier contracts
   *
   * @param {number} courierId - Courier ID
   * @param {boolean} includeInactive - Include inactive contracts (default: false)
   * @returns {Promise<Array>} Array of courier contracts
   */
  static async getCourierContracts(courierId, includeInactive = false) {
    try {
      const query = includeInactive
        ? `SELECT * FROM courier_contracts WHERE courier_id = $1 ORDER BY start_date DESC`
        : `SELECT * FROM courier_contracts WHERE courier_id = $1 AND is_active = true ORDER BY start_date DESC`;

      const result = await pool.query(query, [courierId]);
      return result.rows;
    } catch (error) {
      console.error('Get courier contracts error:', error);
      throw error;
    }
  }

  /**
   * Create courier contract
   *
   * @param {Object} data - Contract data
   * @param {number} data.courierId - Courier ID
   * @param {string} data.contractType - Contract type (full_time, part_time, freelance)
   * @param {Date} data.startDate - Contract start date
   * @param {Date} data.endDate - Contract end date (optional)
   * @param {number} data.deliveryRate - Payment per delivery
   * @param {number} createdBy - User ID who created the contract (for audit)
   * @returns {Promise<Object>} Created contract
   */
  static async createCourierContract(data, createdBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create contract
      const result = await client.query(`
        INSERT INTO courier_contracts (
          courier_id, contract_type, start_date, end_date,
          delivery_rate, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        data.courierId,
        data.contractType || 'freelance',
        data.startDate,
        data.endDate || null,
        data.deliveryRate || 0,
        true
      ]);

      const contract = result.rows[0];

      // 2. Audit log
      try {
        if (createdBy) {
          await AuditService.log({
            userId: createdBy,
            action: 'courier:create_contract',
            resourceType: 'courier_contract',
            resourceId: contract.id,
            details: {
              courier_id: contract.courier_id,
              contract_type: contract.contract_type,
              delivery_rate: contract.delivery_rate
            }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return contract;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create courier contract error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate contract
   *
   * @param {number} contractId - Contract ID
   * @param {number} deactivatedBy - User ID who deactivated the contract (for audit)
   * @returns {Promise<Object>} Updated contract
   */
  static async deactivateContract(contractId, deactivatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE courier_contracts
         SET is_active = false, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [contractId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      const contract = result.rows[0];

      // Audit log
      try {
        if (deactivatedBy) {
          await AuditService.log({
            userId: deactivatedBy,
            action: 'courier:deactivate_contract',
            resourceType: 'courier_contract',
            resourceId: contractId,
            details: { courier_id: contract.courier_id }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return contract;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Deactivate contract error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get available couriers
   *
   * @param {string} vehicleType - Optional vehicle type filter
   * @returns {Promise<Array>} Array of available couriers
   */
  static async getAvailableCouriers(vehicleType = null) {
    try {
      let query = 'SELECT * FROM courier_statistics WHERE is_available = true';
      const params = [];

      if (vehicleType) {
        query += ' AND vehicle_type = $1';
        params.push(vehicleType);
      }

      query += ' ORDER BY total_deliveries ASC, rating DESC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get available couriers error:', error);
      throw error;
    }
  }

  /**
   * Get courier statistics
   *
   * @param {number} courierId - Courier ID
   * @returns {Promise<Object>} Courier statistics from courier_statistics view
   */
  static async getCourierStats(courierId) {
    try {
      const result = await pool.query(
        'SELECT * FROM courier_statistics WHERE courier_id = $1',
        [courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier stats not found: ${courierId}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get courier stats error:', error);
      throw error;
    }
  }

  /**
   * Get global courier statistics
   *
   * @returns {Promise<Object>} Global statistics
   */
  static async getGlobalStats() {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_couriers,
          COUNT(*) FILTER (WHERE is_available = true) as available_couriers,
          COUNT(*) FILTER (WHERE is_available = false) as unavailable_couriers,
          SUM(total_deliveries) as total_deliveries,
          AVG(rating) as average_rating,
          COUNT(DISTINCT vehicle_type) as vehicle_types
        FROM courier_profiles
      `);

      const vehicleTypeStats = await pool.query(`
        SELECT
          vehicle_type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE is_available = true) as available_count
        FROM courier_profiles
        GROUP BY vehicle_type
        ORDER BY count DESC
      `);

      return {
        ...result.rows[0],
        vehicle_type_breakdown: vehicleTypeStats.rows
      };
    } catch (error) {
      console.error('Get global stats error:', error);
      throw error;
    }
  }

  /**
   * Update courier GPS location
   *
   * @param {number} courierId - Courier ID
   * @param {number} latitude - Latitude (-90 to 90)
   * @param {number} longitude - Longitude (-180 to 180)
   * @param {number} updatedBy - User ID who updated the location (for audit)
   * @returns {Promise<Object>} Updated courier profile
   */
  static async updateCourierLocation(courierId, latitude, longitude, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate latitude range
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }

      // Validate longitude range
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      // Update location
      const result = await client.query(
        `UPDATE courier_profiles
         SET current_latitude = $1,
             current_longitude = $2,
             last_location_update = NOW(),
             gps_enabled = true,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [latitude, longitude, courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      const courier = result.rows[0];

      // Audit log
      try {
        if (updatedBy) {
          await AuditService.log({
            userId: updatedBy,
            action: 'courier:update_location',
            resourceType: 'courier',
            resourceId: courierId,
            details: {
              latitude,
              longitude,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return courier;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update courier location error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get couriers nearby a location
   * Uses Haversine formula to calculate distance
   *
   * @param {number} latitude - Search center latitude
   * @param {number} longitude - Search center longitude
   * @param {number} radiusKm - Search radius in kilometers (default: 5)
   * @param {string} vehicleType - Optional vehicle type filter
   * @returns {Promise<Array>} Array of nearby couriers with distance
   */
  static async getCouriersNearby(latitude, longitude, radiusKm = 5, vehicleType = null) {
    try {
      // Validate latitude range
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90 degrees');
      }

      // Validate longitude range
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180 degrees');
      }

      // Validate radius
      if (radiusKm <= 0) {
        throw new Error('Radius must be greater than 0');
      }

      // Build query with Haversine formula in subquery
      let query = `
        SELECT *
        FROM (
          SELECT
            cp.*,
            u.email AS courier_email,
            COALESCE(u.namn, u.email) AS courier_name,
            (
              6371 * acos(
                cos(radians($1)) *
                cos(radians(cp.current_latitude)) *
                cos(radians(cp.current_longitude) - radians($2)) +
                sin(radians($1)) *
                sin(radians(cp.current_latitude))
              )
            ) AS distance_km
          FROM courier_profiles cp
          JOIN users u ON cp.user_id = u.id
          WHERE cp.is_available = true
            AND cp.gps_enabled = true
            AND cp.current_latitude IS NOT NULL
            AND cp.current_longitude IS NOT NULL
      `;

      const params = [latitude, longitude];
      let paramCounter = 3;

      // Add vehicle type filter if specified
      if (vehicleType) {
        query += ` AND cp.vehicle_type = $${paramCounter}`;
        params.push(vehicleType);
        paramCounter++;
      }

      // Close subquery and add WHERE clause for radius filter and ordering
      query += `
        ) AS nearby_couriers
        WHERE distance_km <= $${paramCounter}
        ORDER BY distance_km ASC
      `;
      params.push(radiusKm);

      const result = await pool.query(query, params);

      // Round distance to 2 decimal places
      return result.rows.map(courier => ({
        ...courier,
        distance_km: Math.round(courier.distance_km * 100) / 100
      }));
    } catch (error) {
      console.error('Get couriers nearby error:', error);
      throw error;
    }
  }

  /**
   * Get courier's current GPS location
   *
   * @param {number} courierId - Courier ID
   * @returns {Promise<Object>} Current location data
   */
  static async getCourierCurrentLocation(courierId) {
    try {
      const result = await pool.query(
        `SELECT
           id,
           user_id,
           current_latitude,
           current_longitude,
           last_location_update,
           gps_enabled
         FROM courier_profiles
         WHERE id = $1`,
        [courierId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      const courier = result.rows[0];

      // Check if GPS is enabled
      if (!courier.gps_enabled) {
        throw new Error('GPS tracking is not enabled for this courier');
      }

      // Check if location is available
      if (courier.current_latitude === null || courier.current_longitude === null) {
        throw new Error('Location not available for this courier');
      }

      return {
        courier_id: courier.id,
        user_id: courier.user_id,
        latitude: courier.current_latitude,
        longitude: courier.current_longitude,
        last_update: courier.last_location_update,
        gps_enabled: courier.gps_enabled
      };
    } catch (error) {
      console.error('Get courier location error:', error);
      throw error;
    }
  }

  /**
   * Toggle GPS tracking for a courier
   *
   * @param {number} courierId - Courier ID
   * @param {boolean} enabled - Enable or disable GPS
   * @param {number} updatedBy - User ID who toggled GPS (for audit)
   * @returns {Promise<Object>} Updated courier profile
   */
  static async toggleGPS(courierId, enabled, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If disabling, clear coordinates
      let query;
      let params;

      if (!enabled) {
        query = `
          UPDATE courier_profiles
          SET gps_enabled = $1,
              current_latitude = NULL,
              current_longitude = NULL,
              last_location_update = NULL,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;
        params = [enabled, courierId];
      } else {
        query = `
          UPDATE courier_profiles
          SET gps_enabled = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;
        params = [enabled, courierId];
      }

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new Error(`Courier not found: ${courierId}`);
      }

      const courier = result.rows[0];

      // Audit log
      try {
        if (updatedBy) {
          await AuditService.log({
            userId: updatedBy,
            action: 'courier:toggle_gps',
            resourceType: 'courier',
            resourceId: courierId,
            details: {
              gps_enabled: enabled,
              coordinates_cleared: !enabled
            }
          });
        }
      } catch (auditError) {
        console.error('Audit logging failed (non-critical):', auditError);
      }

      await client.query('COMMIT');

      return courier;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Toggle GPS error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = CourierService;
