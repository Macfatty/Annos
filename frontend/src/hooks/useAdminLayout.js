/**
 * useAdminLayout Hook
 *
 * Manages admin layout state (sidebar open/close).
 *
 * @returns {Object} Layout state and actions
 * @returns {boolean} sidebarOpen - Whether sidebar is open
 * @returns {Function} toggleSidebar - Toggle sidebar state
 * @returns {Function} setSidebarOpen - Set sidebar state directly
 */

import { useUIStore } from "../stores/uiStore";

function useAdminLayout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  return {
    sidebarOpen: !sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    setSidebarOpen: (open) => setSidebarCollapsed(!open),
  };
}

export default useAdminLayout;
