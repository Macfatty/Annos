/**
 * Orders Management Example Component
 *
 * Demonstrates the new architecture:
 * - React Query hooks for data fetching
 * - Zustand for global state
 * - MUI components for UI
 * - Axios API client for HTTP requests
 *
 * This is an example component showing best practices.
 * Use this as a template for building other admin components.
 */

import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useOrders, useUpdateOrderStatus } from "../../hooks/useOrders";
import { useAuthStore } from "../../stores/authStore";

// Order status color mapping
const STATUS_COLORS = {
  pending: "default",
  received: "info",
  confirmed: "primary",
  preparing: "warning",
  ready: "success",
  picked_up: "secondary",
  delivered: "success",
  cancelled: "error",
};

// Available status transitions
const STATUS_OPTIONS = [
  "pending",
  "received",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
];

export default function OrdersManagementExample() {
  const user = useAuthStore((state) => state.user);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  // Fetch orders using React Query
  const {
    data: orders,
    isLoading,
    isError,
    error,
  } = useOrders({
    // Only fetch if user is admin
    enabled: user?.role === "admin",
  });

  // Update order status mutation
  const updateStatus = useUpdateOrderStatus();

  // Handle status change
  const handleStatusChange = (orderId, currentStatus) => {
    setEditingOrderId(orderId);
    setNewStatus(currentStatus);
  };

  // Handle save
  const handleSave = async (orderId) => {
    try {
      await updateStatus.mutateAsync({
        orderId,
        status: newStatus,
      });
      setEditingOrderId(null);
      setNewStatus("");
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingOrderId(null);
    setNewStatus("");
  };

  // Loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert severity="error">
        Failed to load orders: {error?.message || "Unknown error"}
      </Alert>
    );
  }

  // No orders
  if (!orders || orders.length === 0) {
    return (
      <Alert severity="info">No orders found in the system.</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Orders Management
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This is an example component demonstrating the new architecture with
        React Query, Zustand, and MUI.
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Restaurant</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.restaurant_slug}</TableCell>
                <TableCell>{order.customer_name || "N/A"}</TableCell>
                <TableCell>{order.grand_total} SEK</TableCell>
                <TableCell>
                  {editingOrderId === order.id ? (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        label="Status"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <Chip
                      label={order.status}
                      color={STATUS_COLORS[order.status] || "default"}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {editingOrderId === order.id ? (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSave(order.id)}
                        disabled={updateStatus.isPending}
                        sx={{ mr: 1 }}
                      >
                        {updateStatus.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={updateStatus.isPending}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleStatusChange(order.id, order.status)}
                    >
                      Edit Status
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {updateStatus.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to update order: {updateStatus.error?.message}
        </Alert>
      )}
    </Box>
  );
}
