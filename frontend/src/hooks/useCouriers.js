/**
 * Courier Management Hooks (React Query)
 *
 * Custom hooks for courier operations:
 * - useCouriers - Get all couriers
 * - useCourier - Get single courier
 * - useCreateCourier - Create courier profile
 * - useUpdateCourier - Update courier
 * - useToggleCourierAvailability - Toggle availability
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCouriers,
  getCourierById,
  createCourier,
  updateCourier,
  toggleCourierAvailability,
} from "../services/api";

/**
 * Get all couriers
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useCouriers(options = {}) {
  return useQuery({
    queryKey: ["couriers"],
    queryFn: getCouriers,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Get courier by ID
 * @param {number} courierId - Courier ID
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useCourier(courierId, options = {}) {
  return useQuery({
    queryKey: ["couriers", courierId],
    queryFn: () => getCourierById(courierId),
    enabled: !!courierId,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Create courier mutation
 * @returns {Object} Mutation object
 */
export function useCreateCourier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourier,
    onSuccess: () => {
      // Invalidate couriers list
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
    },
  });
}

/**
 * Update courier mutation
 * @returns {Object} Mutation object
 */
export function useUpdateCourier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courierId, data }) => updateCourier(courierId, data),
    onSuccess: (data, variables) => {
      // Invalidate couriers list
      queryClient.invalidateQueries({ queryKey: ["couriers"] });

      // Update specific courier in cache
      queryClient.setQueryData(["couriers", variables.courierId], data);
    },
  });
}

/**
 * Toggle courier availability mutation
 * @returns {Object} Mutation object
 */
export function useToggleCourierAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courierId, isAvailable }) =>
      toggleCourierAvailability(courierId, isAvailable),
    onSuccess: (data, variables) => {
      // Invalidate couriers list
      queryClient.invalidateQueries({ queryKey: ["couriers"] });

      // Update specific courier in cache
      queryClient.setQueryData(["couriers", variables.courierId], data);
    },
  });
}
