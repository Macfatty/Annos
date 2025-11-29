/**
 * PHASE 3A Migration: Courier Management System (Core)
 *
 * This migration adds courier profiles and contracts
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
    console.log('🚀 Starting PHASE 3A Migration: Courier Management System\n');

    await client.query('BEGIN');

    // STEP 1: Create courier_profiles table
    console.log('📝 Step 1: Creating courier_profiles table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS courier_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vehicle_type VARCHAR(50) DEFAULT 'bike' CHECK (vehicle_type IN ('bike', 'car', 'scooter', 'walking')),
        is_available BOOLEAN DEFAULT true,
        rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
        total_deliveries INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ courier_profiles table created');

    // STEP 2: Migrate existing courier users
    console.log('\n📝 Step 2: Migrating existing courier users...');

    const migrateResult = await client.query(`
      INSERT INTO courier_profiles (user_id, is_available, total_deliveries, created_at)
      SELECT
        u.id,
        true,
        COALESCE(COUNT(o.id) FILTER (WHERE o.status = 'delivered'), 0),
        COALESCE(MIN(o.created_at), NOW())
      FROM users u
      LEFT JOIN orders o ON o.assigned_courier_id = u.id
      WHERE u.role = 'courier'
      GROUP BY u.id
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    `);

    console.log(`✅ Migrated ${migrateResult.rows.length} existing courier users`);

    // STEP 3: Create courier_contracts table
    console.log('\n📝 Step 3: Creating courier_contracts table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS courier_contracts (
        id SERIAL PRIMARY KEY,
        courier_id INTEGER NOT NULL REFERENCES courier_profiles(id) ON DELETE CASCADE,
        contract_type VARCHAR(50) DEFAULT 'freelance' CHECK (contract_type IN ('employee', 'contractor', 'freelance')),
        start_date DATE NOT NULL,
        end_date DATE,
        delivery_rate DECIMAL(10,2) CHECK (delivery_rate >= 0),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
      )
    `);

    console.log('✅ courier_contracts table created');

    // STEP 4: Create indexes
    console.log('\n📝 Step 4: Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_profiles_user_id
      ON courier_profiles(user_id);

      CREATE INDEX IF NOT EXISTS idx_courier_profiles_available
      ON courier_profiles(is_available) WHERE is_available = true;

      CREATE INDEX IF NOT EXISTS idx_courier_contracts_courier
      ON courier_contracts(courier_id, is_active);

      CREATE INDEX IF NOT EXISTS idx_courier_contracts_active
      ON courier_contracts(is_active) WHERE is_active = true;
    `);

    console.log('✅ Indexes created');

    // STEP 5: Create courier_statistics view
    console.log('\n📝 Step 5: Creating courier_statistics view...');

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

    console.log('✅ courier_statistics view created');

    // STEP 6: Add courier permissions (check if already exist from PHASE 1)
    console.log('\n📝 Step 6: Adding courier permissions...');

    const permCheck = await client.query(
      "SELECT COUNT(*) as count FROM permissions WHERE name LIKE 'courier:%'"
    );

    if (parseInt(permCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO permissions (name, description, category) VALUES
          ('courier:view', 'View courier profiles', 'courier'),
          ('courier:manage', 'Manage courier profiles and contracts', 'courier')
        ON CONFLICT (name) DO NOTHING
      `);

      // Assign to courier role
      await client.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        SELECT 'courier', id FROM permissions WHERE name = 'courier:view'
        ON CONFLICT DO NOTHING
      `);

      // Assign to admin role
      await client.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        SELECT 'admin', id FROM permissions WHERE name IN ('courier:view', 'courier:manage')
        ON CONFLICT DO NOTHING
      `);

      console.log('✅ Permissions added and assigned');
    } else {
      console.log('✅ Courier permissions already exist');
    }

    // STEP 7: Create trigger for updated_at
    console.log('\n📝 Step 7: Creating update timestamp trigger...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_courier_profile_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS courier_profiles_updated_at_trigger ON courier_profiles;

      CREATE TRIGGER courier_profiles_updated_at_trigger
      BEFORE UPDATE ON courier_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_courier_profile_timestamp();
    `);

    console.log('✅ Update timestamp trigger created');

    // STEP 8: Verify migration
    console.log('\n📝 Step 8: Verifying migration...');

    const verifyResult = await client.query(`
      SELECT
        COUNT(*) AS total_couriers,
        COUNT(*) FILTER (WHERE is_available = true) AS available_couriers,
        SUM(total_deliveries) AS total_deliveries
      FROM courier_profiles
    `);

    console.log('✅ Migration verified:');
    console.log(`   - Total couriers: ${verifyResult.rows[0].total_couriers}`);
    console.log(`   - Available: ${verifyResult.rows[0].available_couriers}`);
    console.log(`   - Total deliveries: ${verifyResult.rows[0].total_deliveries || 0}`);

    await client.query('COMMIT');

    console.log('\n🎉 PHASE 3A Migration completed successfully!\n');

    // Show created couriers
    const couriers = await client.query(`
      SELECT
        cp.id,
        u.email,
        cp.vehicle_type,
        cp.is_available,
        cp.total_deliveries
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY cp.created_at
    `);

    console.log('📊 Courier Profiles:');
    console.log('─'.repeat(80));
    couriers.rows.forEach(c => {
      console.log(`  ${c.is_available ? '✅' : '❌'} ${c.email.padEnd(30)} | ${c.vehicle_type.padEnd(10)} | ${c.total_deliveries} deliveries`);
    });
    console.log('─'.repeat(80));

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
    console.log('🔄 Rolling back PHASE 3A Migration...\n');

    await client.query('BEGIN');

    // Drop view
    await client.query('DROP VIEW IF EXISTS courier_statistics CASCADE');
    console.log('✅ Dropped courier_statistics view');

    // Drop tables (CASCADE will handle foreign keys)
    await client.query('DROP TABLE IF EXISTS courier_contracts CASCADE');
    console.log('✅ Dropped courier_contracts table');

    await client.query('DROP TABLE IF EXISTS courier_profiles CASCADE');
    console.log('✅ Dropped courier_profiles table');

    // Drop trigger and function
    await client.query('DROP TRIGGER IF EXISTS courier_profiles_updated_at_trigger ON courier_profiles');
    await client.query('DROP FUNCTION IF EXISTS update_courier_profile_timestamp');
    console.log('✅ Dropped triggers and functions');

    // Remove permissions
    await client.query("DELETE FROM permissions WHERE name LIKE 'courier:%'");
    console.log('✅ Removed courier permissions');

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
