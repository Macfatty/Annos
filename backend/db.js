const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'annos_dev',
  password: process.env.DB_PASSWORD || 'asha',
  port: parseInt(process.env.DB_PORT) || 5432,
});

// Testa anslutning vid start
pool.on('connect', () => {
  console.log('✅ PostgreSQL ansluten');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL anslutningsfel:', err);
});

module.exports = pool;