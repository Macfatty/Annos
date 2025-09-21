const MenuService = require('../services/menuService');

/**
 * Menu Controller
 * Hanterar alla menyrelaterade endpoints
 */
class MenuController {
  /**
   * Get menu for restaurant
   */
  static async getMenu(req, res, next) {
    try {
      const { slug } = req.params;
      const menu = MenuService.getMenu(slug);

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get accessories for restaurant
   */
  static async getAccessories(req, res, next) {
    try {
      const { slug } = req.params;
      const accessories = MenuService.getAccessories(slug);

      res.json({
        success: true,
        data: accessories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all restaurants
   */
  static async getRestaurants(req, res, next) {
    try {
      const restaurants = MenuService.getRestaurants();

      res.json({
        success: true,
        data: restaurants
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search menu items
   */
  static async searchMenu(req, res, next) {
    try {
      const { slug } = req.params;
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const results = MenuService.searchMenu(slug, q);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get menu categories
   */
  static async getCategories(req, res, next) {
    try {
      const { slug } = req.params;
      const categories = MenuService.getCategories(slug);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get menu by category
   */
  static async getMenuByCategory(req, res, next) {
    try {
      const { slug, category } = req.params;
      const menu = MenuService.getMenuByCategory(slug, category);

      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get menu item by ID
   */
  static async getMenuItem(req, res, next) {
    try {
      const { slug, itemId } = req.params;
      const item = MenuService.getMenuItem(slug, itemId);

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get accessories by type
   */
  static async getAccessoriesByType(req, res, next) {
    try {
      const { slug, type } = req.params;
      const accessories = MenuService.getAccessoriesByType(slug, type);

      res.json({
        success: true,
        data: accessories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get grouped accessories
   */
  static async getGroupedAccessories(req, res, next) {
    try {
      const { slug } = req.params;
      const accessories = MenuService.getGroupedAccessories(slug);

      res.json({
        success: true,
        data: accessories
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MenuController;
