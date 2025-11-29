const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("./config/cors");
const { securityHeaders } = require("./config/security");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth_new");
const orderRoutes = require("./routes/orders");
const menuRoutes = require("./routes/menu_simple");
const courierRoutes = require("./routes/couriers");
const routeRoutes = require("./routes/routes");
const analyticsRoutes = require("./routes/analytics");
const paymentRoutes = require("./routes/payments");
const legacyApp = require("../server");

/**
 * Express Application
 * Huvudapplikation med alla middleware och routes
 */
const app = express();

// Security middleware
app.use(securityHeaders);

// CORS
app.use(cors);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/couriers", courierRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payments", paymentRoutes);

// Legacy application routes for backward compatibility
// This includes profile endpoints (GET/PUT /api/profile) that read from database
app.use(legacyApp);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found"
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
