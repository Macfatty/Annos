/**
 * Restaurant Controller
 *
 * Handles HTTP requests for restaurant management
 * Follows PHASE 1 patterns for consistency
 */

const RestaurantService = require('../services/restaurantService');
const AuditService = require('../services/auditService');

/**
 * Get all restaurants
 * Public endpoint - returns only active restaurants by default
 * Admin can see all restaurants including inactive
 */
async function getAllRestaurants(req, res) {
  try {
    const includeInactive = req.user?.role === 'admin' && req.query.includeInactive === 'true';

    const restaurants = await RestaurantService.getAllRestaurants(includeInactive);

    res.json({
      success: true,
      data: restaurants,
      count: restaurants.length
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurants',
      message: error.message
    });
  }
}

/**
 * Get single restaurant by slug
 * Public endpoint
 */
async function getRestaurantBySlug(req, res) {
  try {
    const { slug } = req.params;

    const restaurant = await RestaurantService.getRestaurantBySlug(slug);

    res.json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    console.error(`Error fetching restaurant ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch restaurant',
      message: error.message
    });
  }
}

/**
 * Create new restaurant
 * Admin only
 */
async function createRestaurant(req, res) {
  try {
    const restaurantData = req.body;
    const createdBy = req.user?.id;

    // Validate required fields
    if (!restaurantData.slug || !restaurantData.namn) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'slug and namn are required fields'
      });
    }

    const restaurant = await RestaurantService.createRestaurant(restaurantData, createdBy);

    res.status(201).json({
      success: true,
      data: restaurant,
      message: 'Restaurant created successfully'
    });
  } catch (error) {
    console.error('Error creating restaurant:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create restaurant',
      message: error.message
    });
  }
}

/**
 * Update restaurant metadata
 * Admin or restaurant owner
 */
async function updateRestaurant(req, res) {
  try {
    const { slug } = req.params;
    const updateData = req.body;
    const updatedBy = req.user?.id;

    // Prevent slug changes
    if (updateData.slug && updateData.slug !== slug) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Cannot change restaurant slug'
      });
    }

    const restaurant = await RestaurantService.updateRestaurant(slug, updateData, updatedBy);

    res.json({
      success: true,
      data: restaurant,
      message: 'Restaurant updated successfully'
    });
  } catch (error) {
    console.error(`Error updating restaurant ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update restaurant',
      message: error.message
    });
  }
}

/**
 * Delete restaurant (soft delete)
 * Admin only
 */
async function deleteRestaurant(req, res) {
  try {
    const { slug } = req.params;
    const deletedBy = req.user?.id;

    await RestaurantService.deleteRestaurant(slug, deletedBy);

    res.json({
      success: true,
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting restaurant ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete restaurant',
      message: error.message
    });
  }
}

/**
 * Get restaurant menu
 * Public endpoint - uses existing /api/meny/:slug endpoint
 * This is for completeness in the controller
 */
async function getMenu(req, res) {
  try {
    const { slug } = req.params;

    const menu = await RestaurantService.getMenu(slug);

    res.json({
      success: true,
      data: menu,
      count: menu.length
    });
  } catch (error) {
    console.error(`Error fetching menu for ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu',
      message: error.message
    });
  }
}

/**
 * Update restaurant menu
 * Admin or restaurant owner
 */
async function updateMenu(req, res) {
  try {
    const { slug } = req.params;
    const menuData = req.body;
    const updatedBy = req.user?.id;

    // Validate menu data
    if (!Array.isArray(menuData)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Menu must be an array'
      });
    }

    const result = await RestaurantService.updateMenu(slug, menuData, updatedBy);

    res.json({
      success: true,
      data: result,
      message: 'Menu updated successfully'
    });
  } catch (error) {
    console.error(`Error updating menu for ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
        message: error.message
      });
    }

    if (error.message.includes('Duplicate') || error.message.includes('required field')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update menu',
      message: error.message
    });
  }
}

/**
 * Get menu version history
 * Admin or restaurant owner
 */
async function getMenuVersions(req, res) {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const versions = await RestaurantService.getMenuVersions(slug, limit);

    res.json({
      success: true,
      data: versions,
      count: versions.length
    });
  } catch (error) {
    console.error(`Error fetching menu versions for ${req.params.slug}:`, error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu versions',
      message: error.message
    });
  }
}

/**
 * Restore menu from version
 * Admin only
 */
async function restoreMenuVersion(req, res) {
  try {
    const { slug, version } = req.params;
    const restoredBy = req.user?.id;

    const result = await RestaurantService.restoreMenuVersion(
      slug,
      parseInt(version),
      restoredBy
    );

    res.json({
      success: true,
      data: result,
      message: `Menu restored to version ${version}`
    });
  } catch (error) {
    console.error(`Error restoring menu version for ${req.params.slug}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to restore menu version',
      message: error.message
    });
  }
}

module.exports = {
  getAllRestaurants,
  getRestaurantBySlug,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getMenu,
  updateMenu,
  getMenuVersions,
  restoreMenuVersion
};
