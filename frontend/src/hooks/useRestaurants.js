/**
 * Restaurant Management Hooks (React Query)
 *
 * Custom hooks for restaurant operations:
 * - useRestaurants - Get all restaurants
 * - useRestaurant - Get single restaurant
 * - useRestaurantMenu - Get restaurant menu
 * - useCreateRestaurant - Create new restaurant
 * - useUpdateRestaurant - Update restaurant
 * - useDeleteRestaurant - Delete restaurant
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRestaurants,
  getRestaurantBySlug,
  getRestaurantMenu,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../services/api";

/**
 * Get all restaurants
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useRestaurants(options = {}) {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: getRestaurants,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get restaurant by slug
 * @param {string} slug - Restaurant slug
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useRestaurant(slug, options = {}) {
  return useQuery({
    queryKey: ["restaurants", slug],
    queryFn: () => getRestaurantBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Get restaurant menu
 * @param {string} slug - Restaurant slug
 * @param {Object} options - React Query options
 * @returns {Object} Query object
 */
export function useRestaurantMenu(slug, options = {}) {
  return useQuery({
    queryKey: ["restaurants", slug, "menu"],
    queryFn: () => getRestaurantMenu(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Create restaurant mutation
 * @returns {Object} Mutation object
 */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRestaurant,
    onSuccess: () => {
      // Invalidate restaurants list
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });
}

/**
 * Update restaurant mutation
 * @returns {Object} Mutation object
 */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, data }) => updateRestaurant(slug, data),
    onSuccess: (data, variables) => {
      // Invalidate restaurants list
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });

      // Update specific restaurant in cache
      queryClient.setQueryData(["restaurants", variables.slug], data);
    },
  });
}

/**
 * Delete restaurant mutation (soft delete)
 * @returns {Object} Mutation object
 */
export function useDeleteRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRestaurant,
    onSuccess: () => {
      // Invalidate restaurants list to refetch
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    },
  });
}
