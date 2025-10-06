const { Pool } = require("pg");
require("dotenv").config();

/**
 * Database configuration
 * Centraliserad databaskonfiguration för PostgreSQL
 */

// Validera nödvändiga miljövariabler (acceptera PG* som alternativ)
function getEnv(key, fallbackKey) {
  return process.env[key] || (fallbackKey ? process.env[fallbackKey] : undefined);
}

const requiredKeys = [
  ["DB_USER", "PGUSER"],
  ["DB_PASSWORD", "PGPASSWORD"],
  ["DB_HOST", "PGHOST"],
  ["DB_NAME", "PGDATABASE"],
  ["DB_PORT", "PGPORT"],
];

for (const [primary, alt] of requiredKeys) {
  if (!getEnv(primary, alt)) {
    throw new Error(`Missing required environment variable: ${primary} (or ${alt})`);
  }
}

const pool = new Pool({
  user: getEnv("DB_USER", "PGUSER"),
  password: getEnv("DB_PASSWORD", "PGPASSWORD"),
  host: getEnv("DB_HOST", "PGHOST"),
  database: getEnv("DB_NAME", "PGDATABASE"),
  port: parseInt(getEnv("DB_PORT", "PGPORT"), 10),
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
