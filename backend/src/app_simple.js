const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('./config/cors');
const { securityHeaders } = require('./config/security');
const errorHandler = require('./middleware/errorHandler');

/**
 * Simple Express Application
 * Enkel version för att testa grundfunktionaliteten
 */
const app = express();

// Security middleware
app.use(securityHeaders);

// CORS
app.use(cors);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    data: { test: 'success' }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
