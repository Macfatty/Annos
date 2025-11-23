import { apiRequest } from "../apiClient";

/**
 * Orderservice
 * Hanterar beställningar, orderstatus och orderhantering
 */
export class OrderService {
  /**
   * Skapa ny beställning
   */
  static async createOrder(orderData) {
    try {
      const res = await apiRequest("/api/order", {
        method: "POST",
        body: JSON.stringify(orderData),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Beställning misslyckades");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid skapande av beställning:", error);
      throw error;
    }
  }

  /**
   * Hämta användarens beställningar
   */
  static async fetchUserOrders() {
    try {
      const res = await apiRequest("/api/orders");
      if (!res.ok) {
        const err = new Error(`Orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av beställningar:", error);
      throw error;
    }
  }

  /**
   * Hämta användarens beställningshistorik
   * @returns {Promise<Array>} - Array med användarens tidigare beställningar
   */
  static async fetchMyOrders() {
    try {
      const res = await apiRequest("/api/my-orders");
      if (!res.ok) {
        const err = new Error(`My orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av mina beställningar:", error);
      throw error;
    }
  }

  /**
   * Hämta admin-beställningar
   * @param {string|null} restaurantSlug - Restaurangens slug (valfritt)
   * @param {string|null} status - Filtrera på orderstatus (valfritt)
   * @returns {Promise<Array>} - Array med beställningar
   */
  static async fetchAdminOrders(restaurantSlug = null, status = null) {
    try {
      const params = new URLSearchParams();
      if (restaurantSlug) {params.append("slug", restaurantSlug);}
      if (status) {params.append("status", status);}

      const queryString = params.toString();
      const url = queryString
        ? `/api/admin/orders?${queryString}`
        : "/api/admin/orders";

      const res = await apiRequest(url);
      if (!res.ok) {
        const err = new Error(`Admin orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av admin-beställningar:", error);
      throw error;
    }
  }

  /**
   * Hämta dagens beställningar för en restaurang
   * @param {string} restaurantSlug - Restaurangens slug
   * @returns {Promise<Array>} - Array med dagens beställningar
   */
  static async fetchTodaysOrders(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/admin/orders/today?slug=${restaurantSlug}`);
      if (!res.ok) {
        const err = new Error(`Today's orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av dagens beställningar:", error);
      throw error;
    }
  }

  /**
   * Hämta restaurang-beställningar
   */
  static async fetchRestaurantOrders(restaurantSlug) {
    try {
      const res = await apiRequest(`/api/restaurant/orders?slug=${restaurantSlug}`);
      if (!res.ok) {
        const err = new Error(`Restaurant orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av restaurang-beställningar:", error);
      throw error;
    }
  }

  /**
   * Hämta kurir-beställningar
   * @param {string|null} status - Filtrera på orderstatus (valfritt)
   * @returns {Promise<Array>} - Array med beställningar för kuriren
   */
  static async fetchCourierOrders(status = null) {
    try {
      const url = status
        ? `/api/courier/orders?status=${status}`
        : "/api/courier/orders";

      const res = await apiRequest(url);
      if (!res.ok) {
        const err = new Error(`Courier orders ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av kurir-beställningar:", error);
      throw error;
    }
  }

  /**
   * Markera order som klar (restaurang)
   */
  static async markOrderAsDone(orderId) {
    try {
      const res = await apiRequest(`/api/order/${orderId}/done`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte markera order som klar");
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid markering av order som klar:", error);
      throw error;
    }
  }

  /**
   * Markera order som klar via admin endpoint
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} - Uppdaterad order
   */
  static async markOrderAsReady(orderId) {
    try {
      const res = await apiRequest(`/api/admin/orders/${orderId}/klart`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte markera order som klar");
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid markering av order som klar:", error);
      throw error;
    }
  }

  /**
   * Acceptera order (kurir)
   */
  static async acceptOrder(orderId) {
    try {
      const res = await apiRequest(`/api/courier/orders/${orderId}/accept`, {
        method: "PATCH",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte acceptera order");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid accept av order:", error);
      throw error;
    }
  }

  /**
   * Markera order som levererad (kurir)
   */
  static async markOrderAsDelivered(orderId) {
    try {
      const res = await apiRequest(`/api/courier/orders/${orderId}/delivered`, {
        method: "PATCH",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte markera order som levererad");
      }
      
      return res.json();
    } catch (error) {
      console.error("Fel vid markering av order som levererad:", error);
      throw error;
    }
  }

  /**
   * Uppdatera orderstatus
   */
  static async updateOrderStatus(orderId, status) {
    try {
      const res = await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte uppdatera orderstatus");
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid uppdatering av orderstatus:", error);
      throw error;
    }
  }

  /**
   * Uppdatera orderstatus via admin endpoint
   * @param {number} orderId - Order ID
   * @param {string} status - Ny status
   * @returns {Promise<Object>} - Uppdaterad order
   */
  static async updateAdminOrderStatus(orderId, status) {
    try {
      const res = await apiRequest(`/api/order/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Kunde inte uppdatera orderstatus");
      }

      return res.json();
    } catch (error) {
      console.error("Fel vid uppdatering av admin orderstatus:", error);
      throw error;
    }
  }

  /**
   * Hämta orderdetaljer
   */
  static async fetchOrderDetails(orderId) {
    try {
      const res = await apiRequest(`/api/orders/${orderId}`);
      if (!res.ok) {
        const err = new Error(`Order details ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    } catch (error) {
      console.error("Fel vid hämtning av orderdetaljer:", error);
      throw error;
    }
  }
}

// Export för bakåtkompatibilitet
export const createOrder = OrderService.createOrder;
export const fetchUserOrders = OrderService.fetchUserOrders;
export const fetchMyOrders = OrderService.fetchMyOrders;
export const fetchAdminOrders = OrderService.fetchAdminOrders;
export const fetchTodaysOrders = OrderService.fetchTodaysOrders;
export const fetchRestaurantOrders = OrderService.fetchRestaurantOrders;
export const fetchCourierOrders = OrderService.fetchCourierOrders;
export const markOrderAsDone = OrderService.markOrderAsDone;
export const markOrderAsReady = OrderService.markOrderAsReady;
export const acceptOrder = OrderService.acceptOrder;
export const markOrderAsDelivered = OrderService.markOrderAsDelivered;
export const updateOrderStatus = OrderService.updateOrderStatus;
export const updateAdminOrderStatus = OrderService.updateAdminOrderStatus;
export const fetchOrderDetails = OrderService.fetchOrderDetails;
