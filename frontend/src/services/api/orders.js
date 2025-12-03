/**
 * Orders API Service
 *
 * Handles all order-related API calls:
 * - List orders (admin & user)
 * - Get order details
 * - Update order status
 * - Create new orders
 */

import apiClient from "./client";

/**
 * Get all orders (admin only)
 * @returns {Promise<Array>} Array of orders with full details
 */
export async function getAllOrders() {
  const response = await apiClient.get("/api/order/admin/all");
  return response.data.data;
}

/**
 * Get current user's orders
 * @returns {Promise<Array>} Array of user's orders
 */
export async function getUserOrders() {
  const response = await apiClient.get("/api/order/user");
  return response.data.data;
}

/**
 * Get specific order by ID
 * @param {number} orderId - Order ID
 * @returns {Promise<Object>} Order object
 */
export async function getOrderById(orderId) {
  const response = await apiClient.get(`/api/order/${orderId}`);
  return response.data.data;
}

/**
 * Update order status
 * @param {number} orderId - Order ID
 * @param {string} status - New status (pending, received, confirmed, preparing, ready, picked_up, delivered, cancelled)
 * @returns {Promise<Object>} Updated order
 */
export async function updateOrderStatus(orderId, status) {
  const response = await apiClient.patch(`/api/order/${orderId}/status`, {
    status,
  });
  return response.data.data;
}

/**
 * Create new order
 * @param {Object} orderData - Order data
 * @param {string} orderData.restaurant_slug - Restaurant slug
 * @param {Array} orderData.items - Order items
 * @param {string} orderData.delivery_address - Delivery address
 * @returns {Promise<Object>} Created order
 */
export async function createOrder(orderData) {
  const response = await apiClient.post("/api/order", orderData);
  return response.data.data;
}

/**
 * Get order statistics (admin only)
 * @returns {Promise<Object>} Order statistics
 */
export async function getOrderStats() {
  const response = await apiClient.get("/api/order/admin/stats");
  return response.data.data;
}
