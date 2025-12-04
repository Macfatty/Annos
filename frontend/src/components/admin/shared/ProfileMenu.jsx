/**
 * ProfileMenu Component
 *
 * User profile dropdown menu.
 *
 * @component
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Divider,
  ListItemIcon,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuthStore } from "../../../stores/authStore";

function ProfileMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleClose();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {user?.email?.[0]?.toUpperCase() || "A"}
        </Avatar>
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem disabled>
          <Typography variant="body2">{user?.email || "Admin"}</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            navigate("/profil");
            handleClose();
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}

export default ProfileMenu;
