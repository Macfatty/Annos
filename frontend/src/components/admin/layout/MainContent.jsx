/**
 * MainContent Component
 *
 * Wraps the main content area with proper padding and spacing.
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.children - Page content
 */

import PropTypes from "prop-types";
import { Box } from "@mui/material";
import useAdminLayout from "../../../hooks/useAdminLayout";

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

function MainContent({ children }) {
  const { sidebarOpen } = useAdminLayout();

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        mt: 8, // Toolbar height
        ml: {
          xs: 0,
          md: sidebarOpen ? `${DRAWER_WIDTH}px` : `${DRAWER_WIDTH_COLLAPSED}px`,
        },
        transition: "margin 0.3s",
      }}
    >
      {children}
    </Box>
  );
}

MainContent.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainContent;
