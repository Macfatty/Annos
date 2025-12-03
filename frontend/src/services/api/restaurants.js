/**
 * Restaurants API Service
 *
 * Handles all restaurant-related API calls:
 * - List restaurants
 * - Get restaurant details
 * - Get restaurant menu
 * - Create/Update/Delete restaurants (admin only)
 */

import apiClient from "./client";

/**
 * Get all active restaurants
 * @returns {Promise<Array>} Array of restaurants
 */
export async function getRestaurants() {
  const response = await apiClient.get("/api/restaurants");
  return response.data.data;
}

/**
 * Get restaurant by slug
 * @param {string} slug - Restaurant slug
 * @returns {Promise<Object>} Restaurant object
 */
export async function getRestaurantBySlug(slug) {
  const response = await apiClient.get(`/api/restaurants/${slug}`);
  return response.data.data;
}

/**
 * Get restaurant menu
 * @param {string} slug - Restaurant slug
 * @returns {Promise<Array>} Menu items
 */
export async function getRestaurantMenu(slug) {
  const response = await apiClient.get(`/api/restaurants/${slug}/menu`);
  return response.data.data;
}

/**
 * Create new restaurant (admin only)
 * @param {Object} restaurantData
 * @param {string} restaurantData.slug - Unique restaurant slug
 * @param {string} restaurantData.namn - Restaurant name
 * @param {string} [restaurantData.beskrivning] - Description in Swedish
 * @param {string} [restaurantData.address] - Address
 * @param {string} [restaurantData.phone] - Phone number
 * @param {string} [restaurantData.email] - Email
 * @returns {Promise<Object>} Created restaurant
 */
export async function createRestaurant(restaurantData) {
  const response = await apiClient.post("/api/restaurants", restaurantData);
  return response.data.data;
}

/**
 * Update restaurant (admin only)
 * @param {string} slug - Restaurant slug
 * @param {Object} restaurantData - Fields to update
 * @returns {Promise<Object>} Updated restaurant
 */
export async function updateRestaurant(slug, restaurantData) {
  const response = await apiClient.put(
    `/api/restaurants/${slug}`,
    restaurantData
  );
  return response.data.data;
}

/**
 * Delete restaurant (soft delete, admin only)
 * @param {string} slug - Restaurant slug
 * @returns {Promise<void>}
 */
export async function deleteRestaurant(slug) {
  const response = await apiClient.delete(`/api/restaurants/${slug}`);
  return response.data;
}
