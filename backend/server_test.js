const app = require('./src/app_express5');
require('dotenv').config();

/**
 * Test Server Entry Point
 * Startar Express-servern utan databas-anslutning för testning
 */
const PORT = process.env.PORT || 3001;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Test Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend origin: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}`);
  console.log(`📁 Using organized backend structure`);
  console.log(`⚠️  Database connection disabled for testing`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = server;
