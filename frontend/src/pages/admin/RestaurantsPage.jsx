/**
 * Restaurants Page
 *
 * Restaurant management with CRUD operations.
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
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Restaurant as RestaurantIcon,
  Refresh,
} from "@mui/icons-material";

function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    slug: "",
  });

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/api/admin/restaurants", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch restaurants");
      }

      const data = await response.json();
      setRestaurants(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Restaurants fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleOpenDialog = (restaurant = null) => {
    if (restaurant) {
      setEditMode(true);
      setSelectedRestaurant(restaurant);
      setFormData({
        name: restaurant.name || restaurant.namn || "",
        address: restaurant.address || restaurant.adress || "",
        phone: restaurant.phone || restaurant.telefon || "",
        slug: restaurant.slug || "",
      });
    } else {
      setEditMode(false);
      setSelectedRestaurant(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        slug: "",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedRestaurant(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      slug: "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug from name if creating new restaurant
    if (name === "name" && !editMode) {
      const slug = value
        .toLowerCase()
        .replace(/[åä]/g, "a")
        .replace(/ö/g, "o")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setFormData((prev) => ({
        ...prev,
        slug,
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      const url = editMode
        ? `http://localhost:3001/api/admin/restaurants/${selectedRestaurant.id}`
        : "http://localhost:3001/api/admin/restaurants";

      const method = editMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Operation failed");
      }

      await fetchRestaurants();
      handleCloseDialog();
      alert(editMode ? "Restaurang uppdaterad!" : "Restaurang skapad!");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Fel: " + err.message);
    }
  };

  const handleDelete = async (restaurantId) => {
    if (!window.confirm("Är du säker på att du vill radera denna restaurang?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/admin/restaurants/${restaurantId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete restaurant");
      }

      await fetchRestaurants();
      alert("Restaurang raderad!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Kunde inte radera restaurang: " + err.message);
    }
  };

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchRestaurants} startIcon={<Refresh />}>
          Försök igen
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Restauranger</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Lägg till restaurang
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : restaurants.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <RestaurantIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Inga restauranger ännu
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Kom igång genom att lägga till din första restaurang
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Lägg till restaurang
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {restaurants.map((restaurant) => (
            <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <RestaurantIcon color="primary" />
                    <Typography variant="h6" component="div">
                      {restaurant.name || restaurant.namn}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {restaurant.address || restaurant.adress || "Ingen adress"}
                  </Typography>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {restaurant.phone || restaurant.telefon || "Ingen telefon"}
                  </Typography>

                  <Chip
                    label={restaurant.slug}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>

                <CardActions>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(restaurant)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(restaurant.id)}
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? "Redigera restaurang" : "Lägg till restaurang"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Restaurangnamn"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />

            <TextField
              fullWidth
              label="Adress"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
            />

            <TextField
              fullWidth
              label="Telefon"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
            />

            <TextField
              fullWidth
              label="Slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              helperText="URL-vänligt namn (t.ex. pizza-palace)"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.name || !formData.slug}
          >
            {editMode ? "Uppdatera" : "Skapa"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RestaurantsPage;
