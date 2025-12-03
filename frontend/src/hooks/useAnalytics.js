/**
 * Analytics Hooks (React Query)
 *
 * Custom hooks for analytics and performance data:
 * - useDashboardAnalytics - Get dashboard metrics
 * - useSystemStats - Get system statistics
 * - useActivityData - Get activity data
 * - usePerformanceDashboard - Get performance metrics
 * - usePerformanceAlerts - Get active alerts
 */

import { useQuery } from "@tanstack/react-query";
import {
  getDashboardAnalytics,
  getSystemStats,
  getActivityData,
  getPerformanceDashboard,
  getPerformanceAlerts,
} from "../services/api";

/**
 * Get dashboard analytics
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useDashboardAnalytics(options = {}) {
  return useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: getDashboardAnalytics,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Auto-refetch every minute
    ...options,
  });
}

/**
 * Get system statistics
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useSystemStats(options = {}) {
  return useQuery({
    queryKey: ["analytics", "system"],
    queryFn: getSystemStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get activity data (hourly)
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useActivityData(options = {}) {
  return useQuery({
    queryKey: ["analytics", "activity"],
    queryFn: getActivityData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get performance dashboard
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function usePerformanceDashboard(options = {}) {
  return useQuery({
    queryKey: ["performance", "dashboard"],
    queryFn: getPerformanceDashboard,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // Auto-refetch every minute
    ...options,
  });
}

/**
 * Get performance alerts
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function usePerformanceAlerts(options = {}) {
  return useQuery({
    queryKey: ["performance", "alerts"],
    queryFn: getPerformanceAlerts,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refetch every minute
    ...options,
  });
}
