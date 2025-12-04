/**
 * Dashboard Page
 *
 * Admin dashboard overview with metrics and quick access.
 *
 * @component
 */

import { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  ShoppingCart,
  AttachMoney,
  LocalShipping,
  TrendingUp,
  Warning,
} from "@mui/icons-material";

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch analytics dashboard
        const analyticsRes = await fetch("http://localhost:3001/api/analytics/dashboard", {
          credentials: "include",
        });

        if (!analyticsRes.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const analyticsData = await analyticsRes.json();

        // Fetch recent orders
        const ordersRes = await fetch("http://localhost:3001/api/order/admin/all?limit=5", {
          credentials: "include",
        });

        if (!ordersRes.ok) {
          throw new Error("Failed to fetch orders");
        }

        const ordersData = await ordersRes.json();

        // Normalize analytics data from snake_case to camelCase
        const normalizedMetrics = {
          todayOrders: parseInt(analyticsData.data?.today?.orders_today || analyticsData.data?.system?.orders_today || 0),
          todayRevenue: parseFloat(analyticsData.data?.today?.revenue_today || 0),
          activeCouriers: parseInt(analyticsData.data?.system?.active_couriers || 0),
          avgDeliveryTime: parseFloat(analyticsData.data?.system?.avg_delivery_time_minutes || 0),
        };

        setMetrics(normalizedMetrics);
        setRecentOrders(ordersData.data?.orders || ordersData.data || []);
        setError(null);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status) => {
    const statusColors = {
      pending: "warning",
      confirmed: "info",
      preparing: "primary",
      ready: "success",
      picked_up: "secondary",
      delivered: "success",
      cancelled: "error",
    };
    return statusColors[status] || "default";
  };

  const formatStatus = (status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("sv-SE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Dagens beställningar
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.todayOrders || 0}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 40, color: "primary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Dagens intäkter
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.todayRevenue ? `${Math.round(metrics.todayRevenue)} kr` : "0 kr"}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Aktiva kurirer
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.activeCouriers || 0}
                  </Typography>
                </Box>
                <LocalShipping sx={{ fontSize: 40, color: "info.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2">
                    Genomsnittlig tid
                  </Typography>
                  <Typography variant="h4">
                    {metrics?.avgDeliveryTime ? `${Math.round(metrics.avgDeliveryTime)} min` : "N/A"}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: "secondary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Senaste beställningar</Typography>
          <Button variant="outlined" size="small" href="/admin/orders">
            Visa alla
          </Button>
        </Box>

        {recentOrders.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Beställnings-ID</TableCell>
                  <TableCell>Restaurant</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tid</TableCell>
                  <TableCell align="right">Summa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{order.restaurant_name || order.restaurantName || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatus(order.status)}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatTime(order.created_at || order.createdAt)}</TableCell>
                    <TableCell align="right">{order.total_pris || order.total} kr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="textSecondary">Inga beställningar ännu</Typography>
        )}
      </Paper>

      {/* Active Alerts */}
      {metrics?.avgDeliveryTime > 30 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          <AlertTitle>Hög leveranstid</AlertTitle>
          Genomsnittlig leveranstid är {Math.round(metrics.avgDeliveryTime)} minuter. Överväg att
          lägga till fler kurirer.
        </Alert>
      )}

      {metrics?.todayOrders > 50 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Hög beställningsvolym</AlertTitle>
          {metrics.todayOrders} beställningar idag. Systemet hanterar hög belastning.
        </Alert>
      )}
    </Box>
  );
}

export default Dashboard;
