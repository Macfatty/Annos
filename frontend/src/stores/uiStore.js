/**
 * UI Store (Zustand)
 *
 * Manages UI preferences and temporary state
 * - Dark mode toggle
 * - Sidebar collapsed state
 * - Loading states
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      // State
      darkMode: false,
      sidebarCollapsed: false,
      loading: false,

      // Actions
      toggleDarkMode: () =>
        set((state) => ({
          darkMode: !state.darkMode,
        })),

      setDarkMode: (darkMode) =>
        set({ darkMode }),

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),

      setLoading: (loading) =>
        set({ loading }),
    }),
    {
      name: 'ui-storage', // LocalStorage key
    }
  )
);
