/**
 * Authentication API Service
 *
 * Handles all authentication-related API calls:
 * - Login
 * - Logout
 * - Profile fetching
 * - Token refresh
 */

import apiClient from "./client";

/**
 * Login user with email and password
 * @param {Object} credentials
 * @param {string} credentials.email - User email
 * @param {string} credentials.password - User password
 * @returns {Promise<{user: Object, token: string}>}
 */
export async function login(credentials) {
  const response = await apiClient.post("/api/auth/login", credentials);
  return response.data.data;
}

/**
 * Logout current user
 * @returns {Promise<void>}
 */
export async function logout() {
  const response = await apiClient.post("/api/auth/logout");
  return response.data;
}

/**
 * Get current user profile
 * @returns {Promise<Object>} User object
 */
export async function getProfile() {
  const response = await apiClient.get("/api/auth/profile");
  return response.data.data;
}

/**
 * Refresh access token using refresh token
 * @returns {Promise<boolean>}
 */
export async function refreshToken() {
  try {
    const response = await apiClient.post("/api/auth/refresh");
    return response.data.success === true;
  } catch {
    return false;
  }
}
