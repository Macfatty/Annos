const { Pool } = require('pg');
require('dotenv').config();

function getEnv(key, fallbackKey) {
  return process.env[key] || (fallbackKey ? process.env[fallbackKey] : undefined);
}

const required = [
  ['DB_USER', 'PGUSER'],
  ['DB_PASSWORD', 'PGPASSWORD'],
  ['DB_HOST', 'PGHOST'],
  ['DB_NAME', 'PGDATABASE'],
  ['DB_PORT', 'PGPORT'],
];

for (const [k, alt] of required) {
  if (!getEnv(k, alt)) {
    throw new Error(`Missing required environment variable: ${k} (or ${alt})`);
  }
}

const pool = new Pool({
  user: getEnv('DB_USER', 'PGUSER'),
  host: getEnv('DB_HOST', 'PGHOST'),
  database: getEnv('DB_NAME', 'PGDATABASE'),
  password: getEnv('DB_PASSWORD', 'PGPASSWORD'),
  port: parseInt(getEnv('DB_PORT', 'PGPORT')),
});

// Testa anslutning vid start
pool.on('connect', () => {
  console.log('✅ PostgreSQL ansluten');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL anslutningsfel:', err);
});

module.exports = pool;