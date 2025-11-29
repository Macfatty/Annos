/**
 * Run migration 007 - Courier Payment System
 */

require('dotenv').config();
const pool = require('./src/config/database');
const migration = require('./migrations/007_courier_payment_system');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('========================================');
    console.log('Running Migration 007: Courier Payment System');
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
