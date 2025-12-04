/**
 * Dashboard Page
 *
 * Admin dashboard overview with metrics and quick access.
 * This is a placeholder for Phase 2 implementation.
 *
 * @component
 */

import { Typography, Paper, Box } from "@mui/material";

function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Welcome to the Annos Admin Dashboard!
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          This is a placeholder page. Phase 2 will implement:
        </Typography>
        <ul>
          <li>Metric cards (Orders, Revenue, Restaurants, Couriers)</li>
          <li>Recent orders table</li>
          <li>Activity charts</li>
          <li>Quick actions</li>
          <li>System status indicators</li>
        </ul>
      </Paper>
    </Box>
  );
}

export default Dashboard;
