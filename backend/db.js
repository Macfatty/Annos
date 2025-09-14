const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'annos_dev',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'asha',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT) || 5432,
});

// Testa anslutning vid start
pool.on('connect', () => {
  console.log('✅ PostgreSQL ansluten');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL anslutningsfel:', err);
});

module.exports = pool;