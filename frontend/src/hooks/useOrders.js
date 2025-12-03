/**
 * Order Management Hooks (React Query)
 *
 * Custom hooks for order operations:
 * - useOrders - Get all orders (admin)
 * - useUserOrders - Get current user's orders
 * - useOrderById - Get specific order
 * - useUpdateOrderStatus - Update order status
 * - useCreateOrder - Create new order
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllOrders,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  createOrder,
} from "../services/api";

/**
 * Get all orders (admin only)
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useOrders(options = {}) {
  return useQuery({
    queryKey: ["orders", "all"],
    queryFn: getAllOrders,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Get current user's orders
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useUserOrders(options = {}) {
  return useQuery({
    queryKey: ["orders", "user"],
    queryFn: getUserOrders,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Get order by ID
 * @param {number} orderId - Order ID
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useOrderById(orderId, options = {}) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Update order status mutation
 * @returns {Object} Mutation object
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }) => updateOrderStatus(orderId, status),
    onSuccess: (data, variables) => {
      // Invalidate and refetch orders
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      // Update specific order in cache
      queryClient.setQueryData(["orders", variables.orderId], data);
    },
  });
}

/**
 * Create new order mutation
 * @returns {Object} Mutation object
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      // Invalidate orders to refetch
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
