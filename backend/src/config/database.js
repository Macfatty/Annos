const { Pool } = require("pg");
require("dotenv").config();

/**
 * Database configuration
 * Centraliserad databaskonfiguration för PostgreSQL
 */
const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || "postgres",
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || "asha",
  host: process.env.DB_HOST || process.env.PGHOST || "localhost",
  database: process.env.DB_NAME || process.env.PGDATABASE || "annos",
  port: parseInt(process.env.DB_PORT || process.env.PGPORT, 10) || 5432,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return an error after 2 seconds if connection could not be established
});

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
let reconnectTimer = null;

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      const client = await pool.connect();
      client.release();
      reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
      console.log("🔄 PostgreSQL pool recovered after transient error");
    } catch (error) {
      console.error("❌ PostgreSQL reconnection attempt failed:", error);
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
      scheduleReconnect();
    }
  }, reconnectDelayMs);
}

// Test database connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  scheduleReconnect();
});

module.exports = pool;
