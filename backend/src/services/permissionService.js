const pool = require('../../db');

/**
 * Permission Service
 *
 * Handles all permission-related operations with caching for performance.
 * Supports role-based and permission-based access control.
 *
 * Features:
 * - getUserPermissions: Get all permissions for a user
 * - checkPermission: Check if user has a specific permission
 * - hasPermission: Check without admin override (raw permission check)
 * - grantPermission: Grant a permission to a role
 * - revokePermission: Revoke a permission from a role
 * - Performance-optimized with in-memory caching
 */
class PermissionService {
  // In-memory cache for permissions (avoid DB queries on every request)
  static permissionCache = new Map(); // userId -> Set<permissionNames>
  static rolePermissionCache = new Map(); // roleName -> Set<permissionNames>
  static cacheExpiry = 5 * 60 * 1000; // 5 minutes
  static cacheTimestamps = new Map();

  /**
   * Clear permission cache for a user or role
   */
  static clearCache(identifier) {
    if (!identifier) {
      // Clear all caches
      this.permissionCache.clear();
      this.rolePermissionCache.clear();
      this.cacheTimestamps.clear();
      return;
    }

    // Clear specific cache
    this.permissionCache.delete(identifier);
    this.rolePermissionCache.delete(identifier);
    this.cacheTimestamps.delete(identifier);
  }

  /**
   * Check if cache is expired
   */
  static isCacheExpired(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > this.cacheExpiry;
  }

  /**
   * Get all permissions for a role (cached)
   */
  static async getRolePermissions(roleName) {
    // Check cache first
    if (!this.isCacheExpired(`role_${roleName}`) && this.rolePermissionCache.has(roleName)) {
      return Array.from(this.rolePermissionCache.get(roleName));
    }

    try {
      const result = await pool.query(`
        SELECT p.name
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_name = $1
      `, [roleName]);

      const permissions = result.rows.map(row => row.name);

      // Update cache
      this.rolePermissionCache.set(roleName, new Set(permissions));
      this.cacheTimestamps.set(`role_${roleName}`, Date.now());

      return permissions;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw error;
    }
  }

  /**
   * Get all permissions for a user (based on their role)
   */
  static async getUserPermissions(userId) {
    // Check cache first
    if (!this.isCacheExpired(`user_${userId}`) && this.permissionCache.has(userId)) {
      return Array.from(this.permissionCache.get(userId));
    }

    try {
      // Get user's role
      const userResult = await pool.query(`
        SELECT role FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return [];
      }

      const role = userResult.rows[0].role;
      const permissions = await this.getRolePermissions(role);

      // Update cache
      this.permissionCache.set(userId, new Set(permissions));
      this.cacheTimestamps.set(`user_${userId}`, Date.now());

      return permissions;
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  /**
   * Check if a user has a specific permission
   *
   * @param {Object} user - User object with role and id/userId
   * @param {String} permissionName - Permission name (e.g., 'orders:view:all')
   * @returns {Boolean} - True if user has permission
   */
  static async checkPermission(user, permissionName) {
    if (!user) {
      return false;
    }

    // Admin override: admin always has all permissions
    if (user.role === 'admin') {
      return true;
    }

    try {
      const userId = user.id || user.userId;
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permissionName);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has a permission (without admin override)
   * Useful for testing or when you need exact permission match
   */
  static async hasPermission(userId, permissionName) {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permissionName);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has ANY of the specified permissions
   */
  static async checkAnyPermission(user, permissionNames) {
    if (!user) {
      return false;
    }

    // Admin override
    if (user.role === 'admin') {
      return true;
    }

    try {
      const userId = user.id || user.userId;
      const permissions = await this.getUserPermissions(userId);

      return permissionNames.some(permName => permissions.includes(permName));
    } catch (error) {
      console.error('Error checking any permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has ALL of the specified permissions
   */
  static async checkAllPermissions(user, permissionNames) {
    if (!user) {
      return false;
    }

    // Admin override
    if (user.role === 'admin') {
      return true;
    }

    try {
      const userId = user.id || user.userId;
      const permissions = await this.getUserPermissions(userId);

      return permissionNames.every(permName => permissions.includes(permName));
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }

  /**
   * Grant a permission to a role
   */
  static async grantPermission(roleName, permissionName) {
    try {
      // Get permission ID
      const permResult = await pool.query(`
        SELECT id FROM permissions WHERE name = $1
      `, [permissionName]);

      if (permResult.rows.length === 0) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      const permissionId = permResult.rows[0].id;

      // Grant permission
      await pool.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        VALUES ($1, $2)
        ON CONFLICT (role_name, permission_id) DO NOTHING
      `, [roleName, permissionId]);

      // Clear cache
      this.clearCache(roleName);

      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      throw error;
    }
  }

  /**
   * Revoke a permission from a role
   */
  static async revokePermission(roleName, permissionName) {
    try {
      // Get permission ID
      const permResult = await pool.query(`
        SELECT id FROM permissions WHERE name = $1
      `, [permissionName]);

      if (permResult.rows.length === 0) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      const permissionId = permResult.rows[0].id;

      // Revoke permission
      await pool.query(`
        DELETE FROM role_permissions
        WHERE role_name = $1 AND permission_id = $2
      `, [roleName, permissionId]);

      // Clear cache
      this.clearCache(roleName);

      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }

  /**
   * Get all permissions (for admin UI)
   */
  static async getAllPermissions() {
    try {
      const result = await pool.query(`
        SELECT id, name, description, category
        FROM permissions
        ORDER BY category, name
      `);

      return result.rows;
    } catch (error) {
      console.error('Error fetching all permissions:', error);
      throw error;
    }
  }

  /**
   * Get all role-permission mappings (for admin UI)
   */
  static async getAllRolePermissions() {
    try {
      const result = await pool.query(`
        SELECT
          rp.role_name,
          p.name as permission_name,
          p.description,
          p.category
        FROM role_permissions rp
        INNER JOIN permissions p ON p.id = rp.permission_id
        ORDER BY rp.role_name, p.category, p.name
      `);

      return result.rows;
    } catch (error) {
      console.error('Error fetching all role permissions:', error);
      throw error;
    }
  }

  /**
   * Get permission statistics (for monitoring)
   */
  static getStats() {
    return {
      userCacheSize: this.permissionCache.size,
      roleCacheSize: this.rolePermissionCache.size,
      cacheExpiry: this.cacheExpiry,
      cachedItems: Array.from(this.cacheTimestamps.keys())
    };
  }
}

module.exports = PermissionService;
