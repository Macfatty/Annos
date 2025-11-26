/**
 * Restaurant Routes
 *
 * RESTful API endpoints for restaurant management
 * Follows PHASE 1 permission patterns
 */

const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { verifyJWT } = require('../../authMiddleware');
const { requirePermission } = require('../middleware/requirePermission');

/**
 * Public routes (no authentication required)
 */

// GET /api/restaurants - Get all active restaurants
router.get('/', restaurantController.getAllRestaurants);

// GET /api/restaurants/:slug - Get single restaurant by slug
router.get('/:slug', restaurantController.getRestaurantBySlug);

// GET /api/restaurants/:slug/menu - Get restaurant menu
// Note: This duplicates /api/meny/:slug for consistency
// We keep both endpoints for backward compatibility
router.get('/:slug/menu', restaurantController.getMenu);

/**
 * Admin-only routes (requires admin permission)
 */

// POST /api/restaurants - Create new restaurant
router.post(
  '/',
  verifyJWT,
  requirePermission('restaurant:manage'),
  restaurantController.createRestaurant
);

// PUT /api/restaurants/:slug - Update restaurant metadata
router.put(
  '/:slug',
  verifyJWT,
  requirePermission('restaurant:manage'),
  restaurantController.updateRestaurant
);

// DELETE /api/restaurants/:slug - Delete restaurant (soft delete)
router.delete(
  '/:slug',
  verifyJWT,
  requirePermission('restaurant:manage'),
  restaurantController.deleteRestaurant
);

/**
 * Menu management routes (admin or restaurant owner)
 */

// PUT /api/restaurants/:slug/menu - Update restaurant menu
router.put(
  '/:slug/menu',
  verifyJWT,
  requirePermission('menu:edit'),
  restaurantController.updateMenu
);

// GET /api/restaurants/:slug/menu/versions - Get menu version history
router.get(
  '/:slug/menu/versions',
  verifyJWT,
  requirePermission('menu:edit'),
  restaurantController.getMenuVersions
);

// POST /api/restaurants/:slug/menu/restore/:version - Restore menu version
router.post(
  '/:slug/menu/restore/:version',
  verifyJWT,
  requirePermission('restaurant:manage'),
  restaurantController.restoreMenuVersion
);

module.exports = router;
