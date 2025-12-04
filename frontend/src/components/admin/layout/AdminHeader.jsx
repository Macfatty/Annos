/**
 * AdminHeader Component
 *
 * Fixed header bar at the top of admin pages.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.onMenuClick - Callback when mobile menu button is clicked
 */

import PropTypes from "prop-types";
import { AppBar, Toolbar, IconButton, Typography, Box } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchBar from "../shared/SearchBar";
import ThemeToggle from "../shared/ThemeToggle";
import NotificationButton from "../shared/NotificationButton";
import ProfileMenu from "../shared/ProfileMenu";

function AdminHeader({ onMenuClick }) {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
        boxShadow: 1,
      }}
    >
      <Toolbar>
        {/* Mobile menu button (visible on xs-sm) */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Typography variant="h6" component="div" sx={{ mr: 4 }}>
          Annos Admin
        </Typography>

        {/* Search bar (hidden on xs) */}
        <Box sx={{ flexGrow: 1, display: { xs: "none", sm: "block" }, mr: 2 }}>
          <SearchBar />
        </Box>

        {/* Right side actions */}
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <ThemeToggle />
          <NotificationButton />
          <ProfileMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

AdminHeader.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default AdminHeader;
