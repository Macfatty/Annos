const PermissionService = require('../services/permissionService');

/**
 * requirePermission Middleware
 *
 * Permission-based authorization middleware that checks if the authenticated user
 * has the required permission(s) to access a route.
 *
 * Features:
 * - requirePermission: Single permission check
 * - requireAnyPermission: Any of multiple permissions
 * - requireAllPermissions: All of multiple permissions
 * - Admin override: Admin role automatically passes all checks
 *
 * Usage:
 *   app.get('/api/orders', verifyJWT, requirePermission('orders:view:all'), handler)
 *   app.post('/api/menu', verifyJWT, requireAnyPermission(['menu:create', 'menu:edit']), handler)
 */

/**
 * Check if user has a specific permission
 *
 * @param {String} permissionName - Permission to check (e.g., 'orders:view:all')
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/orders',
 *   verifyJWT,
 *   requirePermission('orders:view:all'),
 *   async (req, res) => { ... }
 * );
 */
function requirePermission(permissionName) {
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    try {
      // Check permission
      const hasPermission = await PermissionService.checkPermission(req.user, permissionName);

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to perform this action',
          required_permission: permissionName,
          your_role: req.user.role
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions'
      });
    }
  };
}

/**
 * Check if user has ANY of the specified permissions
 *
 * @param {Array<String>} permissionNames - Array of permissions to check
 * @returns {Function} Express middleware function
 *
 * @example
 * router.post('/menu',
 *   verifyJWT,
 *   requireAnyPermission(['menu:create', 'menu:edit']),
 *   async (req, res) => { ... }
 * );
 */
function requireAnyPermission(permissionNames) {
  if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
    throw new Error('requireAnyPermission requires an array of permission names');
  }

  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    try {
      // Check if user has ANY of the permissions
      const hasAnyPermission = await PermissionService.checkAnyPermission(
        req.user,
        permissionNames
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to perform this action',
          required_permissions: {
            type: 'any',
            permissions: permissionNames
          },
          your_role: req.user.role
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions'
      });
    }
  };
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @param {Array<String>} permissionNames - Array of permissions to check
 * @returns {Function} Express middleware function
 *
 * @example
 * router.delete('/user/:id',
 *   verifyJWT,
 *   requireAllPermissions(['users:view', 'users:delete']),
 *   async (req, res) => { ... }
 * );
 */
function requireAllPermissions(permissionNames) {
  if (!Array.isArray(permissionNames) || permissionNames.length === 0) {
    throw new Error('requireAllPermissions requires an array of permission names');
  }

  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    try {
      // Check if user has ALL of the permissions
      const hasAllPermissions = await PermissionService.checkAllPermissions(
        req.user,
        permissionNames
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have all required permissions to perform this action',
          required_permissions: {
            type: 'all',
            permissions: permissionNames
          },
          your_role: req.user.role
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions'
      });
    }
  };
}

/**
 * Optional permission check - continues even if permission is denied
 * but adds hasPermission flag to req object
 *
 * Useful for optional features that should degrade gracefully
 *
 * @param {String} permissionName - Permission to check
 * @returns {Function} Express middleware function
 *
 * @example
 * router.get('/dashboard',
 *   verifyJWT,
 *   optionalPermission('analytics:view'),
 *   async (req, res) => {
 *     const showAnalytics = req.hasPermission; // true or false
 *     ...
 *   }
 * );
 */
function optionalPermission(permissionName) {
  return async (req, res, next) => {
    req.hasPermission = false;

    if (!req.user) {
      return next();
    }

    try {
      req.hasPermission = await PermissionService.checkPermission(req.user, permissionName);
    } catch (error) {
      console.error('Error checking optional permission:', error);
    }

    next();
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  optionalPermission
};
