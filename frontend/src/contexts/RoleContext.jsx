import { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * RoleContext - Centralized permission management for frontend
 *
 * Integrates with backend permission system to provide:
 * - Permission checks (hasPermission, hasAnyPermission, hasAllPermissions)
 * - Role-based access control
 * - Admin override (admin has all permissions)
 *
 * Usage:
 *   const { hasPermission, isAdmin } = useRole();
 *   if (hasPermission('orders:create')) { ... }
 */

const RoleContext = createContext(null);

// Permission mappings - mirrors backend permissions
const PERMISSION_MAP = {
  admin: [
    "orders:view:all", "orders:view:own", "orders:create", "orders:update:status", "orders:cancel",
    "menu:view", "menu:edit", "menu:create",
    "users:view", "users:manage", "users:delete",
    "restaurant:view:all", "restaurant:view:own", "restaurant:manage",
    "courier:view:all", "courier:view:own", "courier:manage",
    "support:view", "support:create", "support:manage"
  ],
  restaurant: [
    "orders:view:own", "orders:update:status",
    "menu:view", "menu:edit", "menu:create",
    "restaurant:view:own", "restaurant:manage",
    "support:create"
  ],
  courier: [
    "orders:view:own", "orders:update:status",
    "courier:view:own",
    "support:create"
  ],
  customer: [
    "orders:view:own", "orders:create", "orders:cancel",
    "menu:view",
    "support:create"
  ]
};

export function RoleProvider({ children, role = "", profil = null }) {
  const [permissions, setPermissions] = useState([]);

  // Get user's permissions based on role
  useEffect(() => {
    if (role) {
      const userPermissions = PERMISSION_MAP[role] || PERMISSION_MAP.customer;
      setPermissions(userPermissions);
    } else {
      setPermissions([]);
    }
  }, [role]);

  /**
   * Check if user has a specific permission
   * Admin always has all permissions
   */
  const hasPermission = useCallback((permissionName) => {
    if (!permissionName) {return false;}
    if (role === "admin") {return true;} // Admin override
    return permissions.includes(permissionName);
  }, [role, permissions]);

  /**
   * Check if user has ANY of the specified permissions
   */
  const hasAnyPermission = useCallback((permissionNames) => {
    if (!Array.isArray(permissionNames)) {return false;}
    if (role === "admin") {return true;} // Admin override
    return permissionNames.some(permission => permissions.includes(permission));
  }, [role, permissions]);

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAllPermissions = useCallback((permissionNames) => {
    if (!Array.isArray(permissionNames)) {return false;}
    if (role === "admin") {return true;} // Admin override
    return permissionNames.every(permission => permissions.includes(permission));
  }, [role, permissions]);

  /**
   * Check if user can access a specific resource
   * Useful for restaurant slug validation, etc.
   */
  const canAccessResource = useCallback((resourceType, resourceId) => {
    if (role === "admin") {return true;} // Admin can access all

    // Restaurant users can only access their own restaurant
    if (resourceType === "restaurant" && profil?.restaurant_slug) {
      return profil.restaurant_slug === resourceId;
    }

    // Courier users can only access orders assigned to them
    if (resourceType === "courier_order" && profil?.id) {
      return true; // Let backend handle validation
    }

    return false;
  }, [role, profil]);

  // Role checks
  const isAdmin = role === "admin";
  const isRestaurant = role === "restaurant";
  const isCourier = role === "courier";
  const isCustomer = role === "customer" || (!isAdmin && !isRestaurant && !isCourier);

  const value = {
    // State
    role,
    permissions,
    profil,

    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessResource,

    // Role checks
    isAdmin,
    isRestaurant,
    isCourier,
    isCustomer,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

/**
 * Custom hook to use RoleContext
 * Must be used within a RoleProvider
 */
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
