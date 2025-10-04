import { apiRequest } from "../apiClient";

/**
 * Menyservice
 * Hanterar meny-data, tillbehör och restauranginformation
 */
export class MenuService {
  /**
   * Hämta meny för specifik restaurang
   */
  static async fetchMenu(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}`);
      if (!res.ok) {
        const err = new Error(`Menu ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av meny:", error);
      throw error;
    }
  }

  /**
   * Hämta tillbehör för specifik restaurang
   */
  static async fetchAccessories(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/accessories`);
      if (!res.ok) {
        const err = new Error(`Accessories ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av tillbehör:", error);
      throw error;
    }
  }

  /**
   * Hämta alla tillgängliga restauranger
   */
  static async fetchRestaurants() {
    try {
      const res = await apiRequest("/api/menu/restaurants");
      if (!res.ok) {
        const err = new Error(`Restaurants ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av restauranger:", error);
      throw error;
    }
  }

  /**
   * Hämta restauranginformation
   */
  static async fetchRestaurantInfo(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/restaurants/${restaurantSlug}`);
      if (!res.ok) {
        const err = new Error(`Restaurant info ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av restauranginformation:", error);
      throw error;
    }
  }

  /**
   * Sök i meny
   */
  static async searchMenu(restaurantSlug, query) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const err = new Error(`Menu search ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid meny-sökning:", error);
      throw error;
    }
  }

  /**
   * Hämta kategorier för restaurang
   */
  static async fetchCategories(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/categories`);
      if (!res.ok) {
        const err = new Error(`Categories ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av kategorier:", error);
      throw error;
    }
  }

  /**
   * Hämta meny för kategori
   */
  static async fetchMenuByCategory(restaurantSlug, category) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/category/${encodeURIComponent(category)}`);
      if (!res.ok) {
        const err = new Error(`Menu by category ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av meny för kategori:", error);
      throw error;
    }
  }

  /**
   * Hämta specifik meny-item
   */
  static async fetchMenuItem(restaurantSlug, itemId) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/item/${itemId}`);
      if (!res.ok) {
        const err = new Error(`Menu item ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av meny-item:", error);
      throw error;
    }
  }

  /**
   * Hämta tillbehör efter typ
   */
  static async fetchAccessoriesByType(restaurantSlug, type) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/accessories/type/${type}`);
      if (!res.ok) {
        const err = new Error(`Accessories by type ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av tillbehör efter typ:", error);
      throw error;
    }
  }

  /**
   * Hämta grupperade tillbehör
   */
  static async fetchGroupedAccessories(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/menu/${restaurantSlug}/accessories/grouped`);
      if (!res.ok) {
        const err = new Error(`Grouped accessories ${res.status}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      return data.success ? data.data : data; // Hantera både nya och gamla format
    } catch (error) {
      console.error("Fel vid hämtning av grupperade tillbehör:", error);
      throw error;
    }
  }
}

// Export för bakåtkompatibilitet
export const fetchMenu = MenuService.fetchMenu;
export const fetchAccessories = MenuService.fetchAccessories;
export const fetchRestaurants = MenuService.fetchRestaurants;
export const fetchRestaurantInfo = MenuService.fetchRestaurantInfo;
export const searchMenu = MenuService.searchMenu;
export const fetchCategories = MenuService.fetchCategories;
export const fetchMenuByCategory = MenuService.fetchMenuByCategory;
export const fetchMenuItem = MenuService.fetchMenuItem;
export const fetchAccessoriesByType = MenuService.fetchAccessoriesByType;
export const fetchGroupedAccessories = MenuService.fetchGroupedAccessories;
