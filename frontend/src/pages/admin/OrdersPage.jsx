/**
 * Orders Page
 *
 * Order management with advanced filtering, search, and pagination.
 *
 * @component
 */

import { useState, useEffect } from "react";
import {
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from "@mui/material";
import {
  Visibility,
  Refresh,
  FilterList,
} from "@mui/icons-material";

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page + 1, // Backend uses 1-based pagination
        limit: rowsPerPage,
      });

      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await fetch(
        `http://localhost:3001/api/order/admin/all?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      setOrders(data.data?.orders || data.data || []);
      setTotalOrders(data.data?.total || data.total || 0);
      setError(null);
    } catch (err) {
      console.error("Orders fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, statusFilter]);

  const handleSearch = () => {
    setPage(0); // Reset to first page
    fetchOrders();
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/order/${orderId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setSelectedOrder(data.data || data);
      setDialogOpen(true);
    } catch (err) {
      console.error("Order details fetch error:", err);
      alert("Kunde inte hämta beställningsdetaljer: " + err.message);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3001/api/order/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh orders list
      await fetchOrders();

      // Update selected order if dialog is open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      alert("Status uppdaterad!");
    } catch (err) {
      console.error("Status update error:", err);
      alert("Kunde inte uppdatera status: " + err.message);
    }
  };

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
    const statusTranslations = {
      pending: "Väntande",
      confirmed: "Bekräftad",
      preparing: "Tillagas",
      ready: "Klar",
      picked_up: "Upphämtad",
      delivered: "Levererad",
      cancelled: "Avbruten",
    };
    return statusTranslations[status] || status;
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchOrders} startIcon={<Refresh />}>
          Försök igen
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Beställningar
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterList />
          <Typography variant="h6">Filter</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sök beställning"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Beställnings-ID, kund, restaurang..."
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Alla</MenuItem>
                <MenuItem value="pending">Väntande</MenuItem>
                <MenuItem value="confirmed">Bekräftad</MenuItem>
                <MenuItem value="preparing">Tillagas</MenuItem>
                <MenuItem value="ready">Klar</MenuItem>
                <MenuItem value="picked_up">Upphämtad</MenuItem>
                <MenuItem value="delivered">Levererad</MenuItem>
                <MenuItem value="cancelled">Avbruten</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              sx={{ height: "56px" }}
            >
              Sök
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Restaurant</TableCell>
                <TableCell>Kund</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell align="right">Summa</TableCell>
                <TableCell align="center">Åtgärder</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      Inga beställningar hittades
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{order.restaurant_name || order.restaurantName || "N/A"}</TableCell>
                    <TableCell>{order.customer_name || order.customerName || "Kund"}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatus(order.status)}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDateTime(order.created_at || order.createdAt)}</TableCell>
                    <TableCell align="right">
                      {order.total_pris || order.total} kr
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalOrders}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rader per sida:"
        />
      </Paper>

      {/* Order Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Beställning #{selectedOrder?.id}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Restaurant
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.restaurant_name || selectedOrder.restaurantName || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Kund
                  </Typography>
                  <Typography variant="body1">
                    {selectedOrder.customer_name || selectedOrder.customerName || "N/A"}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Datum
                  </Typography>
                  <Typography variant="body1">
                    {formatDateTime(selectedOrder.created_at || selectedOrder.createdAt)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={formatStatus(selectedOrder.status)}
                      color={getStatusColor(selectedOrder.status)}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Uppdatera Status
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <Select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                >
                  <MenuItem value="pending">Väntande</MenuItem>
                  <MenuItem value="confirmed">Bekräftad</MenuItem>
                  <MenuItem value="preparing">Tillagas</MenuItem>
                  <MenuItem value="ready">Klar</MenuItem>
                  <MenuItem value="picked_up">Upphämtad</MenuItem>
                  <MenuItem value="delivered">Levererad</MenuItem>
                  <MenuItem value="cancelled">Avbruten</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Beställningsdetaljer
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Totalt: <strong>{selectedOrder.total_pris || selectedOrder.total} kr</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default OrdersPage;
