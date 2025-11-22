import { apiRequest } from "../apiClient";

/**
 * MenuService
 * Hanterar meny- och restaurangdata
 */
export class MenuService {
  /**
   * Hämta meny för en specifik restaurang
   * @param {string} restaurantSlug - Restaurangens slug (t.ex. "campino", "sunsushi")
   * @returns {Promise<Array>} - Array med menyrätter
   */
  static async fetchMenu(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/meny?restaurang=${restaurantSlug}`);

      if (!res.ok) {
        const err = new Error(`Menu fetch failed: ${res.status}`);
        err.status = res.status;
        throw err;
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av meny:", error);
      throw error;
    }
  }

  /**
   * Hämta alla tillgängliga restauranger
   * @returns {Promise<Array>} - Array med restauranger
   */
  static async fetchRestaurants() {
    try {
      const res = await apiRequest("/api/restaurants");

      if (!res.ok) {
        const err = new Error(`Restaurants fetch failed: ${res.status}`);
        err.status = res.status;
        throw err;
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av restauranger:", error);
      throw error;
    }
  }

  /**
   * Hämta restaurangdetaljer
   * @param {string} restaurantSlug - Restaurangens slug
   * @returns {Promise<Object>} - Restaurangdata
   */
  static async fetchRestaurantDetails(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/restaurants/${restaurantSlug}`);

      if (!res.ok) {
        const err = new Error(`Restaurant details fetch failed: ${res.status}`);
        err.status = res.status;
        throw err;
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av restaurangdetaljer:", error);
      throw error;
    }
  }
}

// Export för bakåtkompatibilitet
export const fetchMenu = MenuService.fetchMenu;
export const fetchRestaurants = MenuService.fetchRestaurants;
export const fetchRestaurantDetails = MenuService.fetchRestaurantDetails;
