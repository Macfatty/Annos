/**
 * PHASE 3B.1 Migration: GPS Tracking & Real-Time Location
 *
 * This migration adds GPS tracking capabilities to courier profiles
 * BACKWARD COMPATIBLE: All changes are additive
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'macfatty',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting PHASE 3B.1 Migration: GPS Tracking & Real-Time Location\n');

    await client.query('BEGIN');

    // STEP 1: Add GPS columns to courier_profiles table
    console.log('📝 Step 1: Adding GPS tracking columns to courier_profiles...');

    await client.query(`
      ALTER TABLE courier_profiles
      ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11,8),
      ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP,
      ADD COLUMN IF NOT EXISTS gps_enabled BOOLEAN DEFAULT false
    `);

    console.log('✅ GPS tracking columns added');

    // STEP 2: Add validation constraints
    console.log('\n📝 Step 2: Adding validation constraints...');

    await client.query(`
      DO $$
      BEGIN
        -- Add latitude constraint (must be between -90 and 90)
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'courier_profiles_latitude_range'
        ) THEN
          ALTER TABLE courier_profiles
          ADD CONSTRAINT courier_profiles_latitude_range
          CHECK (current_latitude IS NULL OR (current_latitude >= -90 AND current_latitude <= 90));
        END IF;

        -- Add longitude constraint (must be between -180 and 180)
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'courier_profiles_longitude_range'
        ) THEN
          ALTER TABLE courier_profiles
          ADD CONSTRAINT courier_profiles_longitude_range
          CHECK (current_longitude IS NULL OR (current_longitude >= -180 AND current_longitude <= 180));
        END IF;

        -- Add constraint: both lat/lng must be set together or both null
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'courier_profiles_location_complete'
        ) THEN
          ALTER TABLE courier_profiles
          ADD CONSTRAINT courier_profiles_location_complete
          CHECK (
            (current_latitude IS NULL AND current_longitude IS NULL) OR
            (current_latitude IS NOT NULL AND current_longitude IS NOT NULL)
          );
        END IF;
      END
      $$;
    `);

    console.log('✅ Validation constraints added');

    // STEP 3: Create spatial index for nearby courier searches
    console.log('\n📝 Step 3: Creating spatial index for GPS coordinates...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_profiles_location
      ON courier_profiles(current_latitude, current_longitude)
      WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL AND gps_enabled = true;
    `);

    console.log('✅ Spatial index created');

    // STEP 4: Create index for GPS-enabled couriers
    console.log('\n📝 Step 4: Creating index for GPS-enabled couriers...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_profiles_gps_enabled
      ON courier_profiles(gps_enabled, is_available)
      WHERE gps_enabled = true AND is_available = true;
    `);

    console.log('✅ GPS-enabled index created');

    // STEP 5: Update courier_statistics view to include GPS data
    console.log('\n📝 Step 5: Updating courier_statistics view with GPS data...');

    // Drop and recreate the view (ALTER VIEW doesn't work for adding columns)
    await client.query('DROP VIEW IF EXISTS courier_statistics');

    await client.query(`
      CREATE VIEW courier_statistics AS
      SELECT
        cp.id AS courier_id,
        cp.user_id,
        COALESCE(u.namn, u.email) AS courier_name,
        u.email AS courier_email,
        cp.vehicle_type,
        cp.is_available,
        cp.rating,
        cp.total_deliveries,
        cp.current_latitude,
        cp.current_longitude,
        cp.last_location_update,
        cp.gps_enabled,
        COUNT(o.id) AS lifetime_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS completed_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60)::numeric, 2) AS avg_delivery_time_minutes,
        MAX(o.delivered_at) AS last_delivery_at
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN orders o ON o.assigned_courier_id = u.id
      GROUP BY cp.id, cp.user_id, u.namn, u.email, cp.vehicle_type, cp.is_available, cp.rating, cp.total_deliveries,
               cp.current_latitude, cp.current_longitude, cp.last_location_update, cp.gps_enabled
    `);

    console.log('✅ courier_statistics view updated');

    // STEP 6: Verify migration
    console.log('\n📝 Step 6: Verifying migration...');

    // Check columns exist
    const columnsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'courier_profiles'
      AND column_name IN ('current_latitude', 'current_longitude', 'last_location_update', 'gps_enabled')
      ORDER BY column_name
    `);

    console.log('✅ Migration verified:');
    console.log(`   - GPS columns added: ${columnsCheck.rows.length}/4`);
    columnsCheck.rows.forEach(col => {
      console.log(`     • ${col.column_name} (${col.data_type})`);
    });

    // Check constraints
    const constraintsCheck = await client.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'courier_profiles'::regclass
      AND conname LIKE '%latitude%' OR conname LIKE '%longitude%' OR conname LIKE '%location%'
    `);

    console.log(`   - Constraints added: ${constraintsCheck.rows.length}/3`);
    constraintsCheck.rows.forEach(con => {
      console.log(`     • ${con.conname}`);
    });

    // Check indexes
    const indexesCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'courier_profiles'
      AND (indexname LIKE '%location%' OR indexname LIKE '%gps%')
    `);

    console.log(`   - Indexes created: ${indexesCheck.rows.length}/2`);
    indexesCheck.rows.forEach(idx => {
      console.log(`     • ${idx.indexname}`);
    });

    await client.query('COMMIT');

    console.log('\n🎉 PHASE 3B.1 Migration completed successfully!\n');

    // Show courier GPS status
    const couriers = await client.query(`
      SELECT
        cp.id,
        u.email,
        cp.gps_enabled,
        cp.current_latitude,
        cp.current_longitude,
        cp.last_location_update
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY cp.id
    `);

    console.log('📊 Courier GPS Status:');
    console.log('─'.repeat(100));
    console.log('  ID | Email                          | GPS Enabled | Latitude   | Longitude  | Last Update');
    console.log('─'.repeat(100));
    couriers.rows.forEach(c => {
      const gps = c.gps_enabled ? '✅' : '❌';
      const lat = c.current_latitude ? c.current_latitude.toString().padEnd(10) : 'N/A'.padEnd(10);
      const lng = c.current_longitude ? c.current_longitude.toString().padEnd(10) : 'N/A'.padEnd(10);
      const lastUpdate = c.last_location_update
        ? new Date(c.last_location_update).toLocaleString()
        : 'Never';
      console.log(`  ${c.id.toString().padStart(2)} | ${c.email.padEnd(30)} | ${gps.padEnd(11)} | ${lat} | ${lng} | ${lastUpdate}`);
    });
    console.log('─'.repeat(100));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Rollback script (for documentation)
async function rollback() {
  const client = await pool.connect();

  try {
    console.log('🔄 Rolling back PHASE 3B.1 Migration...\n');

    await client.query('BEGIN');

    // Drop indexes
    console.log('📝 Dropping indexes...');
    await client.query('DROP INDEX IF EXISTS idx_courier_profiles_location');
    await client.query('DROP INDEX IF EXISTS idx_courier_profiles_gps_enabled');
    console.log('✅ Indexes dropped');

    // Drop constraints
    console.log('\n📝 Dropping constraints...');
    await client.query('ALTER TABLE courier_profiles DROP CONSTRAINT IF EXISTS courier_profiles_latitude_range');
    await client.query('ALTER TABLE courier_profiles DROP CONSTRAINT IF EXISTS courier_profiles_longitude_range');
    await client.query('ALTER TABLE courier_profiles DROP CONSTRAINT IF EXISTS courier_profiles_location_complete');
    console.log('✅ Constraints dropped');

    // Drop columns
    console.log('\n📝 Dropping GPS columns...');
    await client.query(`
      ALTER TABLE courier_profiles
      DROP COLUMN IF EXISTS current_latitude,
      DROP COLUMN IF EXISTS current_longitude,
      DROP COLUMN IF EXISTS last_location_update,
      DROP COLUMN IF EXISTS gps_enabled
    `);
    console.log('✅ GPS columns dropped');

    // Restore old courier_statistics view
    console.log('\n📝 Restoring courier_statistics view...');
    await client.query(`
      CREATE OR REPLACE VIEW courier_statistics AS
      SELECT
        cp.id AS courier_id,
        cp.user_id,
        COALESCE(u.namn, u.email) AS courier_name,
        u.email AS courier_email,
        cp.vehicle_type,
        cp.is_available,
        cp.rating,
        cp.total_deliveries,
        COUNT(o.id) AS lifetime_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS completed_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60)::numeric, 2) AS avg_delivery_time_minutes,
        MAX(o.delivered_at) AS last_delivery_at
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN orders o ON o.assigned_courier_id = u.id
      GROUP BY cp.id, cp.user_id, u.namn, u.email, cp.vehicle_type, cp.is_available, cp.rating, cp.total_deliveries
    `);
    console.log('✅ View restored');

    await client.query('COMMIT');

    console.log('\n🎉 Rollback completed successfully!\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Rollback failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  // Check for rollback flag
  if (process.argv.includes('--rollback')) {
    rollback()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    runMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = { runMigration, rollback };
