/**
 * PHASE 2 Migration: Extend Restaurants Table
 *
 * This migration extends the restaurants table with metadata fields
 * for restaurant management while keeping JSON-based menus.
 *
 * BACKWARD COMPATIBLE: All changes are additive (ADD COLUMN)
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
    console.log('🚀 Starting PHASE 2 Migration: Restaurants Extended\n');

    await client.query('BEGIN');

    // 1. Extend restaurants table (backward compatible - ADD COLUMN only)
    console.log('📝 Step 1: Extending restaurants table...');

    await client.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email VARCHAR(100),
      ADD COLUMN IF NOT EXISTS logo_url TEXT,
      ADD COLUMN IF NOT EXISTS banner_url TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS opening_hours JSONB,
      ADD COLUMN IF NOT EXISTS menu_file_path VARCHAR(255),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);

    console.log('✅ Restaurants table extended');

    // 2. Create indexes for performance
    console.log('\n📝 Step 2: Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_restaurants_slug
      ON restaurants(slug)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_restaurants_is_active
      ON restaurants(is_active)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_restaurants_created_at
      ON restaurants(created_at)
    `);

    console.log('✅ Indexes created');

    // 3. Seed existing restaurants (if they don't exist)
    console.log('\n📝 Step 3: Seeding existing restaurants...');

    await client.query(`
      INSERT INTO restaurants (slug, namn, beskrivning, menu_file_path, is_active, created_at)
      VALUES
        ('campino', 'Campino', 'Italiensk pizza och pasta', 'Data/menyer/campino.json', true, NOW()),
        ('sunsushi', 'SunSushi', 'Japansk sushi och asiatisk mat', 'Data/menyer/sunsushi.json', true, NOW())
      ON CONFLICT (slug) DO UPDATE SET
        menu_file_path = EXCLUDED.menu_file_path,
        updated_at = NOW()
    `);

    console.log('✅ Existing restaurants seeded');

    // 4. Create menu_versions table for version history
    console.log('\n📝 Step 4: Creating menu_versions table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_versions (
        id SERIAL PRIMARY KEY,
        restaurant_slug VARCHAR(100) NOT NULL REFERENCES restaurants(slug) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        menu_json JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_menu_versions_restaurant
      ON menu_versions(restaurant_slug, version DESC)
    `);

    console.log('✅ Menu versions table created');

    // 5. Create trigger for updated_at
    console.log('\n📝 Step 5: Creating update timestamp trigger...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_restaurant_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS restaurants_updated_at_trigger ON restaurants;

      CREATE TRIGGER restaurants_updated_at_trigger
      BEFORE UPDATE ON restaurants
      FOR EACH ROW
      EXECUTE FUNCTION update_restaurant_timestamp();
    `);

    console.log('✅ Update timestamp trigger created');

    await client.query('COMMIT');

    console.log('\n🎉 PHASE 2 Migration completed successfully!\n');

    // Show summary
    const result = await client.query(`
      SELECT
        slug,
        namn,
        menu_file_path,
        is_active,
        created_at
      FROM restaurants
      ORDER BY created_at
    `);

    console.log('📊 Current Restaurants:');
    console.log('─'.repeat(80));
    result.rows.forEach(r => {
      console.log(`  ${r.is_active ? '✅' : '❌'} ${r.slug.padEnd(15)} | ${r.namn.padEnd(20)} | ${r.menu_file_path || 'N/A'}`);
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

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = runMigration;
