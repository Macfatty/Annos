import { useRole } from "../contexts/RoleContext";

/**
 * usePermissions - Convenience hook for permission checks
 *
 * Re-exports useRole with a more descriptive name
 * Makes it clear that this hook is for permission-related functionality
 *
 * Usage:
 *   const { hasPermission, isAdmin } = usePermissions();
 *
 *   if (hasPermission('orders:create')) {
 *     // Show create order button
 *   }
 */
export function usePermissions() {
  return useRole();
}
