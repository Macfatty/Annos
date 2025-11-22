/**
 * Centraliserad export av alla services
 * Gör det enkelt att importera services från en plats
 */

// API Client
export { apiRequest, checkBackendHealth, handleApiResponse, createQueryString } from "./apiClient";

// Auth Service
export * from "./auth/authService";

// Order Service
export * from "./orders/orderService";

// Bakåtkompatibilitet - exportera gamla API-funktioner
export {
  fetchProfile,
  updateProfile, 
  logout, 
  createOrder, 
  fetchAdminOrders, 
  markOrderAsDone 
} from "./api";
