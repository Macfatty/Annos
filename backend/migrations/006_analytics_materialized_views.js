/**
 * PHASE 3B.3 Migration: Analytics Dashboard with Materialized Views
 *
 * This migration creates materialized views for fast analytics queries
 * BACKWARD COMPATIBLE: All changes are additive (only views)
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
    console.log('🚀 Starting PHASE 3B.3 Migration: Analytics Dashboard\n');

    await client.query('BEGIN');

    // STEP 1: Create courier_performance_metrics materialized view
    console.log('📝 Step 1: Creating courier_performance_metrics view...');

    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS courier_performance_metrics CASCADE;

      CREATE MATERIALIZED VIEW courier_performance_metrics AS
      SELECT
        cp.id AS courier_id,
        cp.user_id,
        COALESCE(u.namn, u.email) AS courier_name,
        u.email AS courier_email,
        cp.vehicle_type,
        cp.is_available,
        cp.gps_enabled,
        cp.rating,
        cp.total_deliveries,

        -- Order statistics
        COUNT(o.id) AS lifetime_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS completed_deliveries,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_deliveries,
        COUNT(o.id) FILTER (WHERE o.status = 'pending') AS pending_deliveries,
        COUNT(o.id) FILTER (WHERE o.status IN ('preparing', 'ready', 'picked_up')) AS active_deliveries,

        -- Performance metrics
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,
        ROUND(MIN(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS fastest_delivery_minutes,
        ROUND(MAX(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS slowest_delivery_minutes,

        -- Financial metrics (using estimated base rate)
        ROUND(COUNT(o.id) FILTER (WHERE o.status = 'delivered') * 35.0::numeric, 2) AS estimated_earnings_sek,

        -- Recent activity
        MAX(o.delivered_at) AS last_delivery_at,
        MAX(o.created_at) AS last_order_at,
        cp.last_location_update,

        -- Success rate
        ROUND(
          (COUNT(o.id) FILTER (WHERE o.status = 'delivered')::numeric /
           NULLIF(COUNT(o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0) * 100),
          2
        ) AS success_rate_percentage,

        -- Current status
        CASE
          WHEN cp.is_available AND cp.gps_enabled THEN 'active'
          WHEN cp.is_available AND NOT cp.gps_enabled THEN 'available_no_gps'
          ELSE 'offline'
        END AS current_status,

        NOW() AS last_updated

      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN orders o ON o.assigned_courier_id = u.id
      GROUP BY cp.id, cp.user_id, u.namn, u.email, cp.vehicle_type, cp.is_available,
               cp.gps_enabled, cp.rating, cp.total_deliveries, cp.last_location_update
    `);

    console.log('✅ courier_performance_metrics view created');

    // STEP 2: Create system_wide_statistics materialized view
    console.log('\n📝 Step 2: Creating system_wide_statistics view...');

    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS system_wide_statistics CASCADE;

      CREATE MATERIALIZED VIEW system_wide_statistics AS
      SELECT
        -- Order metrics
        COUNT(o.id) AS total_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS total_delivered,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS total_cancelled,
        COUNT(o.id) FILTER (WHERE o.status = 'pending') AS total_pending,
        COUNT(o.id) FILTER (WHERE o.status IN ('preparing', 'ready', 'picked_up')) AS total_in_progress,

        -- Courier metrics
        COUNT(DISTINCT cp.id) AS total_couriers,
        COUNT(DISTINCT cp.id) FILTER (WHERE cp.is_available = true) AS active_couriers,
        COUNT(DISTINCT cp.id) FILTER (WHERE cp.gps_enabled = true) AS gps_enabled_couriers,

        -- Performance metrics
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,
        ROUND(AVG(cp.rating)::numeric, 2) AS avg_courier_rating,

        -- Success rate
        ROUND(
          (COUNT(o.id) FILTER (WHERE o.status = 'delivered')::numeric /
           NULLIF(COUNT(o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0) * 100),
          2
        ) AS overall_success_rate,

        -- Revenue estimate (35 SEK per delivery)
        ROUND(COUNT(o.id) FILTER (WHERE o.status = 'delivered') * 35.0::numeric, 2) AS estimated_total_revenue_sek,

        -- Customer metrics
        COUNT(DISTINCT o.customer_email) AS total_customers,

        -- Recent activity
        MAX(o.created_at) AS last_order_time,
        MAX(o.delivered_at) AS last_delivery_time,

        -- Today's stats
        COUNT(o.id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE) AS orders_today,
        COUNT(o.id) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE AND o.status = 'delivered') AS deliveries_today,

        NOW() AS last_updated

      FROM orders o
      CROSS JOIN courier_profiles cp
      GROUP BY 1=1
    `);

    console.log('✅ system_wide_statistics view created');

    // STEP 3: Create hourly_activity_stats materialized view
    console.log('\n📝 Step 3: Creating hourly_activity_stats view...');

    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS hourly_activity_stats CASCADE;

      CREATE MATERIALIZED VIEW hourly_activity_stats AS
      SELECT
        EXTRACT(HOUR FROM created_at) AS hour_of_day,
        DATE(created_at) AS activity_date,

        -- Order counts
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders,

        -- Performance
        ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60) FILTER (WHERE status = 'delivered')::numeric, 2) AS avg_delivery_time_minutes,

        -- Success rate for this hour
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
           NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'cancelled')), 0) * 100),
          2
        ) AS success_rate,

        NOW() AS last_updated

      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at), DATE(created_at)
      ORDER BY activity_date DESC, hour_of_day
    `);

    console.log('✅ hourly_activity_stats view created');

    // STEP 4: Create daily_revenue_stats materialized view
    console.log('\n📝 Step 4: Creating daily_revenue_stats view...');

    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS daily_revenue_stats CASCADE;

      CREATE MATERIALIZED VIEW daily_revenue_stats AS
      SELECT
        DATE(o.created_at) AS activity_date,

        -- Order metrics
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE o.status = 'delivered') AS delivered_orders,

        -- Revenue (35 SEK per delivery)
        ROUND(COUNT(*) FILTER (WHERE o.status = 'delivered') * 35.0::numeric, 2) AS daily_revenue_sek,

        -- Unique customers and couriers
        COUNT(DISTINCT o.customer_email) AS unique_customers,
        COUNT(DISTINCT o.assigned_courier_id) AS active_couriers,

        -- Performance
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at)) / 60) FILTER (WHERE o.status = 'delivered')::numeric, 2) AS avg_delivery_time,

        NOW() AS last_updated

      FROM orders o
      WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY DATE(o.created_at)
      ORDER BY activity_date DESC
    `);

    console.log('✅ daily_revenue_stats view created');

    // STEP 5: Create indexes on materialized views
    console.log('\n📝 Step 5: Creating indexes on materialized views...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_performance_courier_id
      ON courier_performance_metrics(courier_id);

      CREATE INDEX IF NOT EXISTS idx_courier_performance_status
      ON courier_performance_metrics(current_status);

      CREATE INDEX IF NOT EXISTS idx_courier_performance_rating
      ON courier_performance_metrics(rating DESC);

      CREATE INDEX IF NOT EXISTS idx_hourly_activity_date
      ON hourly_activity_stats(activity_date DESC);

      CREATE INDEX IF NOT EXISTS idx_hourly_activity_hour
      ON hourly_activity_stats(hour_of_day);

      CREATE INDEX IF NOT EXISTS idx_daily_revenue_date
      ON daily_revenue_stats(activity_date DESC);
    `);

    console.log('✅ Indexes created on materialized views');

    // STEP 6: Create refresh function for all analytics views
    console.log('\n📝 Step 6: Creating refresh function...');

    await client.query(`
      CREATE OR REPLACE FUNCTION refresh_analytics_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW courier_performance_metrics;
        REFRESH MATERIALIZED VIEW system_wide_statistics;
        REFRESH MATERIALIZED VIEW hourly_activity_stats;
        REFRESH MATERIALIZED VIEW daily_revenue_stats;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Refresh function created');

    // STEP 7: Initial refresh of all views
    console.log('\n📝 Step 7: Performing initial refresh of all views...');

    await client.query('SELECT refresh_analytics_views()');

    console.log('✅ All views refreshed with current data');

    // STEP 8: Verify migration
    console.log('\n📝 Step 8: Verifying migration...');

    // Check materialized views exist
    const viewsCheck = await client.query(`
      SELECT matviewname
      FROM pg_matviews
      WHERE schemaname = 'public'
      AND matviewname LIKE '%performance%' OR matviewname LIKE '%statistics%' OR matviewname LIKE '%activity%' OR matviewname LIKE '%revenue%'
      ORDER BY matviewname
    `);

    console.log('✅ Migration verified:');
    console.log(`   - Materialized views created: ${viewsCheck.rows.length}/4`);
    viewsCheck.rows.forEach(view => {
      console.log(`     • ${view.matviewname}`);
    });

    // Check indexes
    const indexesCheck = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('courier_performance_metrics', 'hourly_activity_stats', 'daily_revenue_stats')
      ORDER BY indexname
    `);

    console.log(`   - Indexes created: ${indexesCheck.rows.length}/6`);
    indexesCheck.rows.forEach(idx => {
      console.log(`     • ${idx.indexname}`);
    });

    // Check refresh function
    const functionCheck = await client.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname = 'refresh_analytics_views'
    `);

    console.log(`   - Refresh function: ${functionCheck.rows.length > 0 ? '✅' : '❌'}`);

    await client.query('COMMIT');

    console.log('\n🎉 PHASE 3B.3 Migration completed successfully!\n');

    // Show sample analytics data
    console.log('📊 Sample Analytics Data:\n');

    // System stats
    const systemStats = await client.query('SELECT * FROM system_wide_statistics');
    if (systemStats.rows.length > 0) {
      const stats = systemStats.rows[0];
      console.log('🌍 System-Wide Statistics:');
      console.log('─'.repeat(60));
      console.log(`  Total Orders:         ${stats.total_orders}`);
      console.log(`  Total Delivered:      ${stats.total_delivered}`);
      console.log(`  Total Couriers:       ${stats.total_couriers}`);
      console.log(`  Active Couriers:      ${stats.active_couriers}`);
      console.log(`  Avg Delivery Time:    ${stats.avg_delivery_time_minutes || 'N/A'} minutes`);
      console.log(`  Avg Courier Rating:   ${stats.avg_courier_rating || 'N/A'}/5.0`);
      console.log(`  Success Rate:         ${stats.overall_success_rate || 'N/A'}%`);
      console.log(`  Est. Total Revenue:   ${stats.estimated_total_revenue_sek} SEK`);
      console.log('─'.repeat(60));
    }

    // Top performers
    const topCouriers = await client.query(`
      SELECT courier_name, completed_deliveries, rating, estimated_earnings_sek, success_rate_percentage
      FROM courier_performance_metrics
      WHERE completed_deliveries > 0
      ORDER BY completed_deliveries DESC
      LIMIT 5
    `);

    if (topCouriers.rows.length > 0) {
      console.log('\n🏆 Top Performing Couriers:');
      console.log('─'.repeat(80));
      console.log('  Name                 | Deliveries | Rating | Earnings  | Success Rate');
      console.log('─'.repeat(80));
      topCouriers.rows.forEach(c => {
        console.log(`  ${c.courier_name.padEnd(20)} | ${c.completed_deliveries.toString().padStart(10)} | ${(c.rating || 'N/A').toString().padStart(6)} | ${c.estimated_earnings_sek.toString().padStart(9)} | ${(c.success_rate_percentage || 'N/A').toString().padStart(12)}%`);
      });
      console.log('─'.repeat(80));
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Rollback script
async function rollback() {
  const client = await pool.connect();

  try {
    console.log('🔄 Rolling back PHASE 3B.3 Migration...\n');

    await client.query('BEGIN');

    // Drop function
    console.log('📝 Dropping refresh function...');
    await client.query('DROP FUNCTION IF EXISTS refresh_analytics_views()');
    console.log('✅ Function dropped');

    // Drop materialized views
    console.log('\n📝 Dropping materialized views...');
    await client.query('DROP MATERIALIZED VIEW IF EXISTS daily_revenue_stats CASCADE');
    await client.query('DROP MATERIALIZED VIEW IF EXISTS hourly_activity_stats CASCADE');
    await client.query('DROP MATERIALIZED VIEW IF EXISTS system_wide_statistics CASCADE');
    await client.query('DROP MATERIALIZED VIEW IF EXISTS courier_performance_metrics CASCADE');
    console.log('✅ Materialized views dropped');

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
