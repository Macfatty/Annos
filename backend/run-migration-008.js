/**
 * Run migration 008 - Performance Monitoring
 */

require('dotenv').config();
const pool = require('./src/config/database');
const migration = require('./migrations/008_performance_monitoring');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('========================================');
    console.log('Running Migration 008: Performance Monitoring');
    console.log('========================================\n');

    await migration.up(client);

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
