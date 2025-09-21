const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/menuController');

/**
 * Menu Routes
 * Alla menyrelaterade endpoints (publika)
 */

// Specific routes first to avoid conflicts
router.get('/restaurants', MenuController.getRestaurants);
router.get('/:slug/search', MenuController.searchMenu);
router.get('/:slug/categories', MenuController.getCategories);
router.get('/:slug/category/:category', MenuController.getMenuByCategory);
router.get('/:slug/item/:itemId', MenuController.getMenuItem);
router.get('/:slug/accessories/type/:type', MenuController.getAccessoriesByType);
router.get('/:slug/accessories/grouped', MenuController.getGroupedAccessories);
router.get('/:slug/accessories', MenuController.getAccessories);
router.get('/:slug', MenuController.getMenu);

module.exports = router;