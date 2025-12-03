/**
 * Analytics API Service
 *
 * Handles all analytics-related API calls:
 * - Dashboard metrics
 * - System statistics
 * - Activity data
 * - Performance monitoring
 */

import apiClient from "./client";

/**
 * Get dashboard analytics
 * @returns {Promise<Object>} Dashboard metrics
 */
export async function getDashboardAnalytics() {
  const response = await apiClient.get("/api/analytics/dashboard");
  return response.data.data;
}

/**
 * Get system statistics
 * @returns {Promise<Object>} System statistics
 */
export async function getSystemStats() {
  const response = await apiClient.get("/api/analytics/system");
  return response.data.data;
}

/**
 * Get activity data (hourly)
 * @returns {Promise<Array>} Activity data by hour
 */
export async function getActivityData() {
  const response = await apiClient.get("/api/analytics/activity");
  return response.data.data;
}

/**
 * Get performance dashboard
 * @returns {Promise<Object>} Performance metrics
 */
export async function getPerformanceDashboard() {
  const response = await apiClient.get("/api/performance/dashboard");
  return response.data.data;
}

/**
 * Get active performance alerts
 * @returns {Promise<Array>} Active alerts
 */
export async function getPerformanceAlerts() {
  const response = await apiClient.get("/api/performance/alerts");
  return response.data.data;
}
