/**
 * Route Routes
 *
 * RESTful API endpoints for route optimization and management
 * Follows PHASE 3 permission patterns
 */

const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { verifyJWT } = require('../../authMiddleware');
const { requirePermission } = require('../middleware/requirePermission');

/**
 * Public routes (none for route optimization)
 */

/**
 * Courier routes (requires authentication + courier:view permission)
 */

// GET /api/routes/couriers/:id - Get courier's current route
// Couriers can view their own route
router.get(
  '/couriers/:id',
  verifyJWT,
  requirePermission('courier:view'),
  routeController.getCourierRoute
);

// PATCH /api/routes/couriers/:id/progress - Update route progress
// Couriers can update their own progress
router.patch(
  '/couriers/:id/progress',
  verifyJWT,
  requirePermission('courier:view'),
  routeController.updateRouteProgress
);

/**
 * Admin routes (requires authentication + courier:manage permission)
 */

// POST /api/routes/optimize - Optimize a route given multiple addresses
// Admin only
router.post(
  '/optimize',
  verifyJWT,
  requirePermission('courier:manage'),
  routeController.optimizeRoute
);

// POST /api/routes/couriers/:id - Assign optimized route to courier
// Admin only
router.post(
  '/couriers/:id',
  verifyJWT,
  requirePermission('courier:manage'),
  routeController.assignRouteTocourier
);

// DELETE /api/routes/couriers/:id - Clear courier's active route
// Admin only
router.delete(
  '/couriers/:id',
  verifyJWT,
  requirePermission('courier:manage'),
  routeController.clearCourierRoute
);

module.exports = router;
