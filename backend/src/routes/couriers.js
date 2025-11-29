/**
 * Courier Routes
 *
 * RESTful API endpoints for courier management
 * Follows PHASE 2 permission patterns
 */

const express = require('express');
const router = express.Router();
const courierController = require('../controllers/courierController');
const { verifyJWT } = require('../../authMiddleware');
const { requirePermission } = require('../middleware/requirePermission');

/**
 * Public routes (no authentication required)
 */

// GET /api/couriers/available - Get all available couriers
router.get('/available', courierController.getAvailableCouriers);

// GET /api/couriers/nearby - Get nearby couriers (GPS-based)
router.get('/nearby', courierController.getNearby);

/**
 * Courier routes (requires authentication + courier:view permission)
 */

// GET /api/couriers/user/:userId - Get courier profile by user ID
// Couriers can view their own profile
router.get(
  '/user/:userId',
  verifyJWT,
  requirePermission('courier:view'),
  courierController.getCourierByUserId
);

// GET /api/couriers/:id/contracts - Get courier contracts
// Couriers can view their own contracts
router.get(
  '/:id/contracts',
  verifyJWT,
  requirePermission('courier:view'),
  courierController.getCourierContracts
);

// GET /api/couriers/:id/stats - Get courier statistics
// Couriers can view their own stats
router.get(
  '/:id/stats',
  verifyJWT,
  requirePermission('courier:view'),
  courierController.getCourierStats
);

// PATCH /api/couriers/:id/location - Update courier GPS location
// Couriers can update their own location
router.patch(
  '/:id/location',
  verifyJWT,
  requirePermission('courier:view'),
  courierController.updateLocation
);

// GET /api/couriers/:id/location - Get courier current GPS location
// Couriers can view their own location
router.get(
  '/:id/location',
  verifyJWT,
  requirePermission('courier:view'),
  courierController.getCurrentLocation
);

/**
 * Admin routes (requires authentication + courier:manage permission)
 */

// GET /api/couriers - Get all couriers
router.get(
  '/',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.getAllCouriers
);

// GET /api/couriers/:id - Get single courier by ID
router.get(
  '/:id',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.getCourierById
);

// POST /api/couriers - Create new courier profile
router.post(
  '/',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.createCourierProfile
);

// PUT /api/couriers/:id - Update courier profile
router.put(
  '/:id',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.updateCourierProfile
);

// PATCH /api/couriers/:id/availability - Toggle courier availability
router.patch(
  '/:id/availability',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.toggleAvailability
);

// POST /api/couriers/:id/contracts - Create new contract for courier
router.post(
  '/:id/contracts',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.createCourierContract
);

// DELETE /api/couriers/:id/contracts/:contractId - Deactivate contract
router.delete(
  '/:id/contracts/:contractId',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.deactivateContract
);

// GET /api/couriers/stats/global - Get global courier statistics
router.get(
  '/stats/global',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.getGlobalStats
);

// PATCH /api/couriers/:id/gps - Toggle GPS tracking
// Admin only
router.patch(
  '/:id/gps',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.toggleGPS
);

module.exports = router;
