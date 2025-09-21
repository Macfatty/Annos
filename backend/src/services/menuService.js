const meny = require('../../Data/menuData.js');
const tillbehor = require('../../Data/tillbehorData.js');

/**
 * Menu Service
 * Hanterar meny-data och tillbehör
 */
class MenuService {
  /**
   * Get menu for restaurant
   */
  static getMenu(restaurantSlug) {
    try {
      const restaurantData = meny[restaurantSlug];
      
      if (!restaurantData) {
        throw new Error('Restaurant not found');
      }

      return restaurantData;
    } catch (error) {
      console.error('Get menu error:', error);
      throw error;
    }
  }

  /**
   * Get accessories for restaurant
   */
  static getAccessories(restaurantSlug) {
    try {
      const accessoriesData = tillbehor[restaurantSlug];
      
      if (!accessoriesData) {
        throw new Error('Accessories not found');
      }

      return accessoriesData;
    } catch (error) {
      console.error('Get accessories error:', error);
      throw error;
    }
  }

  /**
   * Get all available restaurants
   */
  static getRestaurants() {
    try {
      const restaurants = Object.keys(meny).map(slug => ({
        slug,
        name: this.getRestaurantName(slug),
        description: this.getRestaurantDescription(slug)
      }));

      return restaurants;
    } catch (error) {
      console.error('Get restaurants error:', error);
      throw error;
    }
  }

  /**
   * Get restaurant name by slug
   */
  static getRestaurantName(slug) {
    const restaurantNames = {
      'campino': 'Campino',
      'sunsushi': 'SunSushi'
    };

    return restaurantNames[slug] || slug;
  }

  /**
   * Get restaurant description by slug
   */
  static getRestaurantDescription(slug) {
    const descriptions = {
      'campino': 'Italiensk pizza och pasta',
      'sunsushi': 'Japansk sushi och asiatisk mat'
    };

    return descriptions[slug] || 'Restaurang';
  }

  /**
   * Search menu items
   */
  static searchMenu(restaurantSlug, query) {
    try {
      const menu = this.getMenu(restaurantSlug);
      const searchTerm = query.toLowerCase();

      const filteredMenu = menu.filter(item => 
        item.namn.toLowerCase().includes(searchTerm) ||
        item.beskrivning.toLowerCase().includes(searchTerm)
      );

      return filteredMenu;
    } catch (error) {
      console.error('Search menu error:', error);
      throw error;
    }
  }

  /**
   * Get menu categories
   */
  static getCategories(restaurantSlug) {
    try {
      const menu = this.getMenu(restaurantSlug);
      const categories = [...new Set(menu.map(item => item.kategori))];
      
      return categories.filter(Boolean);
    } catch (error) {
      console.error('Get categories error:', error);
      throw error;
    }
  }

  /**
   * Get menu by category
   */
  static getMenuByCategory(restaurantSlug, category) {
    try {
      const menu = this.getMenu(restaurantSlug);
      
      return menu.filter(item => item.kategori === category);
    } catch (error) {
      console.error('Get menu by category error:', error);
      throw error;
    }
  }

  /**
   * Get menu item by ID
   */
  static getMenuItem(restaurantSlug, itemId) {
    try {
      const menu = this.getMenu(restaurantSlug);
      const item = menu.find(item => item.id === parseInt(itemId));
      
      if (!item) {
        throw new Error('Menu item not found');
      }

      return item;
    } catch (error) {
      console.error('Get menu item error:', error);
      throw error;
    }
  }

  /**
   * Get accessories by type
   */
  static getAccessoriesByType(restaurantSlug, type) {
    try {
      const accessories = this.getAccessories(restaurantSlug);
      
      return accessories.filter(item => item.typ === type);
    } catch (error) {
      console.error('Get accessories by type error:', error);
      throw error;
    }
  }

  /**
   * Get grouped accessories
   */
  static getGroupedAccessories(restaurantSlug) {
    try {
      const accessories = this.getAccessories(restaurantSlug);
      
      return accessories.reduce((acc, item) => {
        const type = item.typ || 'other';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(item);
        return acc;
      }, {});
    } catch (error) {
      console.error('Get grouped accessories error:', error);
      throw error;
    }
  }
}

module.exports = MenuService;
