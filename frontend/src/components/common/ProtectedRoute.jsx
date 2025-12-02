import { Navigate } from "react-router-dom";
import { useRole } from "../../contexts/RoleContext";

/**
 * ProtectedRoute - Route guard component for permission-based access control
 *
 * Usage:
 *   <ProtectedRoute permission="orders:create">
 *     <Kundvagn />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute requireAny={["menu:edit", "menu:create"]}>
 *     <MenuEditor />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute requireAll={["orders:view:all", "users:manage"]}>
 *     <AdminPanel />
 *   </ProtectedRoute>
 */

export function ProtectedRoute({
  children,
  permission = null,
  requireAny = null,
  requireAll = null,
  fallbackPath = "/login",
  fallbackMessage = "Du har inte behörighet att se denna sida",
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, role } = useRole();

  // Not logged in at all
  if (!role) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    console.warn(`Access denied: Missing permission "${permission}"`);
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>🔒 Åtkomst nekad</h2>
        <p>{fallbackMessage}</p>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Saknar behörighet: {permission}
        </p>
      </div>
    );
  }

  // Check if user has ANY of the required permissions
  if (requireAny && !hasAnyPermission(requireAny)) {
    console.warn("Access denied: Missing any of permissions", requireAny);
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>🔒 Åtkomst nekad</h2>
        <p>{fallbackMessage}</p>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Saknar någon av behörigheterna: {requireAny.join(", ")}
        </p>
      </div>
    );
  }

  // Check if user has ALL of the required permissions
  if (requireAll && !hasAllPermissions(requireAll)) {
    console.warn("Access denied: Missing all of permissions", requireAll);
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>🔒 Åtkomst nekad</h2>
        <p>{fallbackMessage}</p>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          Saknar alla behörigheter: {requireAll.join(", ")}
        </p>
      </div>
    );
  }

  // User has required permissions
  return children;
}

/**
 * PermissionGate - Conditional rendering based on permissions
 * Use this for hiding/showing UI elements within a page
 *
 * Usage:
 *   <PermissionGate permission="orders:create">
 *     <button>Create Order</button>
 *   </PermissionGate>
 *
 *   <PermissionGate requireAny={["menu:edit", "menu:create"]}>
 *     <MenuEditor />
 *   </PermissionGate>
 */
export function PermissionGate({
  children,
  permission = null,
  requireAny = null,
  requireAll = null,
  fallback = null,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRole();

  let hasAccess = true;

  if (permission && !hasPermission(permission)) {
    hasAccess = false;
  }

  if (requireAny && !hasAnyPermission(requireAny)) {
    hasAccess = false;
  }

  if (requireAll && !hasAllPermissions(requireAll)) {
    hasAccess = false;
  }

  return hasAccess ? children : fallback;
}
