/**
 * API Services - Centralized Export
 *
 * All API services exported from a single location for easy imports
 *
 * Usage:
 * import { login, getRestaurants, getAllOrders } from '@/services/api'
 */

// Export API client
export { default as apiClient } from "./client";

// Export auth services
export * from "./auth";

// Export order services
export * from "./orders";

// Export restaurant services
export * from "./restaurants";

// Export courier services
export * from "./couriers";

// Export analytics services
export * from "./analytics";
