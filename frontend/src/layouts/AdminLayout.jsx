/**
 * AdminLayout Component
 *
 * Provides the main layout structure for admin pages with:
 * - Fixed header at top
 * - Collapsible sidebar on left
 * - Main content area with Outlet for nested routes
 *
 * @component
 */

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import AdminHeader from "../components/admin/layout/AdminHeader";
import AdminSidebar from "../components/admin/layout/AdminSidebar";
import MainContent from "../components/admin/layout/MainContent";
import useAdminLayout from "../hooks/useAdminLayout";

function AdminLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sidebarOpen } = useAdminLayout();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AdminHeader onMenuClick={handleDrawerToggle} />

      <AdminSidebar
        open={isMobile ? mobileOpen : sidebarOpen}
        onClose={() => setMobileOpen(false)}
        isMobile={isMobile}
      />

      <MainContent>
        <Outlet />
      </MainContent>
    </Box>
  );
}

export default AdminLayout;
