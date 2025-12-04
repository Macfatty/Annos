/**
 * NotificationButton Component
 *
 * Shows notification count and dropdown.
 * Note: This is a placeholder for Phase 1.
 *
 * @component
 */

import { useState } from "react";
import { IconButton, Badge, Popover, Box, Typography, List } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";

function NotificationButton() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications] = useState([]); // TODO: Replace with real data in future phase

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          {notifications.length === 0 ? (
            <Typography>No notifications</Typography>
          ) : (
            <List>
              {/* Notifications will be rendered here in future */}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default NotificationButton;
