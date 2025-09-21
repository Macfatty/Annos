/**
 * CORS configuration
 * Centraliserad CORS-konfiguration för säkerhet
 */
const cors = require('cors');
require('dotenv').config();

const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
