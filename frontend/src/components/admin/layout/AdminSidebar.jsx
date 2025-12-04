/**
 * AdminSidebar Component
 *
 * Collapsible sidebar with navigation menu.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Whether sidebar is open
 * @param {Function} props.onClose - Called when sidebar should close (mobile)
 * @param {boolean} props.isMobile - Whether in mobile mode
 */

import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Badge,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useAdminLayout from "../../../hooks/useAdminLayout";

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

// Navigation items configuration
const navigationItems = [
  {
    path: "/admin/dashboard",
    icon: DashboardIcon,
    text: "Dashboard",
    badge: null,
  },
  {
    path: "/admin/orders",
    icon: ShoppingCartIcon,
    text: "Orders",
    badge: null, // Can be populated with pending count
  },
  {
    path: "/admin/restaurants",
    icon: RestaurantIcon,
    text: "Restaurants",
    badge: null,
  },
  {
    path: "/admin/couriers",
    icon: LocalShippingIcon,
    text: "Couriers",
    badge: null,
  },
  {
    path: "/admin/analytics",
    icon: BarChartIcon,
    text: "Analytics",
    badge: null,
  },
];

/**
 * NavigationItem Component
 *
 * Single navigation item in sidebar.
 */
function NavigationItem({ to, icon: Icon, text, active, badge }) {
  const navigate = useNavigate();

  return (
    <ListItem
      button
      onClick={() => navigate(to)}
      selected={active}
      sx={{
        borderLeft: active ? "3px solid" : "none",
        borderLeftColor: "primary.main",
        backgroundColor: active ? "action.selected" : "transparent",
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
    >
      <ListItemIcon>
        <Badge badgeContent={badge} color="error">
          <Icon />
        </Badge>
      </ListItemIcon>
      <ListItemText primary={text} />
    </ListItem>
  );
}

NavigationItem.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  text: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  badge: PropTypes.number,
};

/**
 * SidebarContent Component
 *
 * Content of the sidebar (navigation items).
 */
function SidebarContent({ isMobile }) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAdminLayout();

  return (
    <>
      <Toolbar /> {/* Spacer for header */}
      <List>
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            text={item.text}
            active={location.pathname.startsWith(item.path)}
            badge={item.badge}
          />
        ))}
      </List>

      <Divider />

      {/* Collapse button (desktop only) */}
      {!isMobile && (
        <List>
          <ListItem button onClick={toggleSidebar}>
            <ListItemIcon>
              {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </ListItemIcon>
            {sidebarOpen && <ListItemText primary="Collapse" />}
          </ListItem>
        </List>
      )}
    </>
  );
}

SidebarContent.propTypes = {
  isMobile: PropTypes.bool.isRequired,
};

function AdminSidebar({ open, onClose, isMobile }) {
  return isMobile ? (
    // Mobile: Temporary drawer (overlay)
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }} // Better mobile performance
      sx={{
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
    >
      <SidebarContent isMobile={isMobile} />
    </Drawer>
  ) : (
    // Desktop: Permanent drawer
    <Drawer
      variant="permanent"
      open
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: "border-box",
          transition: "width 0.3s",
          overflowX: "hidden",
        },
      }}
    >
      <SidebarContent isMobile={isMobile} />
    </Drawer>
  );
}

AdminSidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default AdminSidebar;
