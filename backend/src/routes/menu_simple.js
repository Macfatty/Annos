const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/menuController');

/**
 * Menu Routes - Simplified
 * Alla menyrelaterade endpoints (publika)
 */

// Basic routes
router.get('/restaurants', MenuController.getRestaurants);
router.get('/:slug', MenuController.getMenu);

module.exports = router;
