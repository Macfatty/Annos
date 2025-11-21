const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("./config/cors");
const { securityHeaders } = require("./config/security");
const errorHandler = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth_new");
const orderRoutes = require("./routes/orders");
const menuRoutes = require("./routes/menu_simple");
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

// Profile endpoint (must be before legacyApp to override)
app.get(
  "/api/profile",
  require("./middleware/authMiddleware").verifyJWT,
  (req, res) => {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        namn: req.user.namn || "",
        telefon: req.user.telefon || "",
        adress: req.user.adress || "",
        role: req.user.role
      }
    });
  }
);

// Legacy application routes for backward compatibility
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
