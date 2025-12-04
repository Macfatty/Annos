/**
 * Couriers Page
 *
 * Courier fleet management with list view and availability status.
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
  Chip,
  CircularProgress,
  Alert,
  Button,
  Avatar,
} from "@mui/material";
import {
  Refresh,
  LocalShipping,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";

function CouriersPage() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCouriers = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/api/couriers", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch couriers");
      }

      const data = await response.json();
      setCouriers(data.data || data || []);
      setError(null);
    } catch (err) {
      console.error("Couriers fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();
  }, []);

  const getStatusColor = (isAvailable) => {
    return isAvailable ? "success" : "default";
  };

  const getStatusIcon = (isAvailable) => {
    return isAvailable ? <CheckCircle /> : <Cancel />;
  };

  const getStatusText = (isAvailable) => {
    return isAvailable ? "Tillgänglig" : "Ej tillgänglig";
  };

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchCouriers} startIcon={<Refresh />}>
          Försök igen
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Kurirer</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchCouriers}
        >
          Uppdatera
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : couriers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <LocalShipping sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Inga kurirer registrerade
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Kurirer måste registreras via backend API
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Kurir</TableCell>
                  <TableCell>Namn</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Leveranser</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {couriers.map((courier) => (
                  <TableRow key={courier.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <LocalShipping />
                        </Avatar>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">
                        {courier.namn || courier.name || "N/A"}
                      </Typography>
                    </TableCell>
                    <TableCell>{courier.email || "N/A"}</TableCell>
                    <TableCell>{courier.telefon || courier.phone || "N/A"}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(courier.is_available ?? courier.isAvailable)}
                        label={getStatusText(courier.is_available ?? courier.isAvailable)}
                        color={getStatusColor(courier.is_available ?? courier.isAvailable)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="textSecondary">
                        {courier.delivery_count ?? courier.deliveryCount ?? 0}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Summary Stats */}
      {couriers.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sammanfattning
          </Typography>
          <Box display="flex" gap={4}>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Totalt antal kurirer
              </Typography>
              <Typography variant="h5">{couriers.length}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Tillgängliga kurirer
              </Typography>
              <Typography variant="h5" color="success.main">
                {couriers.filter((c) => c.is_available ?? c.isAvailable).length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="textSecondary">
                Totala leveranser
              </Typography>
              <Typography variant="h5">
                {couriers.reduce(
                  (sum, c) => sum + (c.delivery_count ?? c.deliveryCount ?? 0),
                  0
                )}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default CouriersPage;
