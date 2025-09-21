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
   * Hämta admin-beställningar
   */
  static async fetchAdminOrders(restaurantSlug = null) {
    try {
      const url = restaurantSlug 
        ? `/api/admin/orders?slug=${restaurantSlug}`
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
   */
  static async fetchCourierOrders() {
    try {
      const res = await apiRequest("/api/courier/orders");
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
      const res = await apiRequest(`/api/restaurant/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ready" }),
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
export const fetchAdminOrders = OrderService.fetchAdminOrders;
export const fetchRestaurantOrders = OrderService.fetchRestaurantOrders;
export const fetchCourierOrders = OrderService.fetchCourierOrders;
export const markOrderAsDone = OrderService.markOrderAsDone;
export const acceptOrder = OrderService.acceptOrder;
export const markOrderAsDelivered = OrderService.markOrderAsDelivered;
export const updateOrderStatus = OrderService.updateOrderStatus;
export const fetchOrderDetails = OrderService.fetchOrderDetails;
