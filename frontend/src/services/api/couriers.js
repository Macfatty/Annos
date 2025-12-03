/**
 * Couriers API Service
 *
 * Handles all courier-related API calls:
 * - List couriers
 * - Get courier details
 * - Create/Update couriers (admin only)
 * - Update courier availability
 */

import apiClient from "./client";

/**
 * Get all couriers with metrics
 * @returns {Promise<Array>} Array of couriers
 */
export async function getCouriers() {
  const response = await apiClient.get("/api/couriers");
  return response.data.data;
}

/**
 * Get courier by ID
 * @param {number} courierId - Courier ID
 * @returns {Promise<Object>} Courier object
 */
export async function getCourierById(courierId) {
  const response = await apiClient.get(`/api/couriers/${courierId}`);
  return response.data.data;
}

/**
 * Create courier profile (admin only)
 * @param {Object} courierData
 * @param {number} courierData.userId - User ID to create courier profile for
 * @param {string} courierData.vehicleType - Vehicle type: bike, car, scooter, walking
 * @returns {Promise<Object>} Created courier
 */
export async function createCourier(courierData) {
  const response = await apiClient.post("/api/couriers", courierData);
  return response.data.data;
}

/**
 * Update courier (admin only)
 * @param {number} courierId - Courier ID
 * @param {Object} courierData - Fields to update
 * @param {string} [courierData.vehicleType] - Vehicle type
 * @param {boolean} [courierData.isAvailable] - Availability status
 * @param {boolean} [courierData.gpsEnabled] - GPS tracking enabled
 * @returns {Promise<Object>} Updated courier
 */
export async function updateCourier(courierId, courierData) {
  const response = await apiClient.put(
    `/api/couriers/${courierId}`,
    courierData
  );
  return response.data.data;
}

/**
 * Toggle courier availability
 * @param {number} courierId - Courier ID
 * @param {boolean} isAvailable - New availability status
 * @returns {Promise<Object>} Updated courier
 */
export async function toggleCourierAvailability(courierId, isAvailable) {
  return updateCourier(courierId, { isAvailable });
}
