/**
 * PHASE 3B.6: Performance Monitoring Migration
 *
 * Creates tables and functions for tracking system performance metrics and alerts
 *
 * Tables:
 * - performance_snapshots: Periodic snapshots of key performance indicators (KPIs)
 * - performance_alerts: Alert definitions with thresholds
 * - performance_alert_history: Triggered alert events log
 *
 * Features:
 * - Automated KPI snapshot collection
 * - Threshold-based alerting system
 * - Performance trend analysis
 * - Alert management and resolution tracking
 * - Dashboard metrics aggregation
 */

exports.up = async (client) => {
  console.log('Running migration 008: Performance Monitoring...');

  await client.query('BEGIN');

  try {
    // ============================================
    // TABLE: performance_snapshots
    // ============================================
    // Stores periodic snapshots of system KPIs
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_snapshots (
        id SERIAL PRIMARY KEY,

        -- Timestamp for this snapshot
        snapshot_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Order metrics
        total_orders INTEGER NOT NULL DEFAULT 0,
        orders_pending INTEGER NOT NULL DEFAULT 0,
        orders_preparing INTEGER NOT NULL DEFAULT 0,
        orders_ready INTEGER NOT NULL DEFAULT 0,
        orders_in_transit INTEGER NOT NULL DEFAULT 0,
        orders_delivered INTEGER NOT NULL DEFAULT 0,
        orders_cancelled INTEGER NOT NULL DEFAULT 0,

        -- Courier metrics
        total_couriers INTEGER NOT NULL DEFAULT 0,
        available_couriers INTEGER NOT NULL DEFAULT 0,
        busy_couriers INTEGER NOT NULL DEFAULT 0,
        offline_couriers INTEGER NOT NULL DEFAULT 0,

        -- Performance metrics
        avg_delivery_time_minutes DECIMAL(10, 2) DEFAULT 0.00,
        avg_preparation_time_minutes DECIMAL(10, 2) DEFAULT 0.00,
        success_rate_percentage DECIMAL(5, 2) DEFAULT 0.00,

        -- Revenue metrics (in SEK)
        daily_revenue_sek DECIMAL(10, 2) DEFAULT 0.00,
        total_revenue_sek DECIMAL(10, 2) DEFAULT 0.00,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),

        -- Constraints
        CONSTRAINT valid_order_counts CHECK (
          total_orders >= 0 AND
          orders_pending >= 0 AND
          orders_preparing >= 0 AND
          orders_ready >= 0 AND
          orders_in_transit >= 0 AND
          orders_delivered >= 0 AND
          orders_cancelled >= 0
        ),
        CONSTRAINT valid_courier_counts CHECK (
          total_couriers >= 0 AND
          available_couriers >= 0 AND
          busy_couriers >= 0 AND
          offline_couriers >= 0
        ),
        CONSTRAINT valid_percentages CHECK (
          success_rate_percentage >= 0 AND
          success_rate_percentage <= 100
        ),
        CONSTRAINT valid_times CHECK (
          avg_delivery_time_minutes >= 0 AND
          avg_preparation_time_minutes >= 0
        ),
        CONSTRAINT valid_revenue CHECK (
          daily_revenue_sek >= 0 AND
          total_revenue_sek >= 0
        )
      );
    `);

    console.log('  ✓ Created table: performance_snapshots');

    // ============================================
    // TABLE: performance_alerts
    // ============================================
    // Defines alert rules with thresholds
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id SERIAL PRIMARY KEY,

        -- Alert identification
        alert_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,

        -- Alert type and target metric
        alert_type VARCHAR(50) NOT NULL DEFAULT 'threshold',
        -- Types: 'threshold', 'trend', 'anomaly'
        metric_name VARCHAR(100) NOT NULL,
        -- Metric names match columns in performance_snapshots

        -- Threshold configuration
        threshold_value DECIMAL(10, 2) NOT NULL,
        comparison_operator VARCHAR(10) NOT NULL,
        -- Operators: '>', '<', '>=', '<=', '=', '!='

        -- Alert severity
        severity VARCHAR(20) NOT NULL DEFAULT 'warning',
        -- Severity levels: 'info', 'warning', 'critical'

        -- Alert status
        is_enabled BOOLEAN NOT NULL DEFAULT true,

        -- Notification settings
        notify_email VARCHAR(255),
        notify_slack VARCHAR(255),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        -- Constraints
        CONSTRAINT valid_alert_type CHECK (alert_type IN ('threshold', 'trend', 'anomaly')),
        CONSTRAINT valid_comparison CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=', '!=')),
        CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
      );
    `);

    console.log('  ✓ Created table: performance_alerts');

    // ============================================
    // TABLE: performance_alert_history
    // ============================================
    // Tracks triggered alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_alert_history (
        id SERIAL PRIMARY KEY,

        -- Alert reference
        alert_id INTEGER NOT NULL REFERENCES performance_alerts(id) ON DELETE CASCADE,
        snapshot_id INTEGER REFERENCES performance_snapshots(id) ON DELETE SET NULL,

        -- Alert details at trigger time
        metric_value DECIMAL(10, 2) NOT NULL,
        threshold_value DECIMAL(10, 2) NOT NULL,
        message TEXT,

        -- Resolution tracking
        resolved BOOLEAN NOT NULL DEFAULT false,
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id),
        resolution_notes TEXT,

        -- Timestamps
        triggered_at TIMESTAMP DEFAULT NOW(),

        -- Constraints
        CONSTRAINT resolved_requires_time CHECK (
          (resolved = false) OR
          (resolved = true AND resolved_at IS NOT NULL)
        )
      );
    `);

    console.log('  ✓ Created table: performance_alert_history');

    // ============================================
    // INDEXES
    // ============================================

    // performance_snapshots indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_snapshots_time
      ON performance_snapshots(snapshot_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_snapshots_created
      ON performance_snapshots(created_at DESC);
    `);

    console.log('  ✓ Created indexes on performance_snapshots');

    // performance_alerts indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_enabled
      ON performance_alerts(is_enabled)
      WHERE is_enabled = true;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_metric
      ON performance_alerts(metric_name);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity
      ON performance_alerts(severity);
    `);

    console.log('  ✓ Created indexes on performance_alerts');

    // performance_alert_history indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id
      ON performance_alert_history(alert_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_resolved
      ON performance_alert_history(resolved);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alert_history_triggered_at
      ON performance_alert_history(triggered_at DESC);
    `);

    console.log('  ✓ Created indexes on performance_alert_history');

    // ============================================
    // FUNCTION: capture_performance_snapshot
    // ============================================
    // Captures current system state into a performance snapshot
    await client.query(`
      CREATE OR REPLACE FUNCTION capture_performance_snapshot()
      RETURNS TABLE(
        snapshot_id INTEGER,
        total_orders INTEGER,
        orders_delivered INTEGER,
        available_couriers INTEGER,
        avg_delivery_time_minutes DECIMAL,
        success_rate_percentage DECIMAL,
        daily_revenue_sek DECIMAL
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_snapshot_id INTEGER;
        v_total_orders INTEGER;
        v_orders_pending INTEGER;
        v_orders_preparing INTEGER;
        v_orders_ready INTEGER;
        v_orders_in_transit INTEGER;
        v_orders_delivered INTEGER;
        v_orders_cancelled INTEGER;
        v_total_couriers INTEGER;
        v_available_couriers INTEGER;
        v_busy_couriers INTEGER;
        v_offline_couriers INTEGER;
        v_avg_delivery_time DECIMAL;
        v_avg_preparation_time DECIMAL;
        v_success_rate DECIMAL;
        v_daily_revenue DECIMAL;
        v_total_revenue DECIMAL;
      BEGIN
        -- Count orders by status
        SELECT COUNT(*) INTO v_total_orders FROM orders;
        SELECT COUNT(*) INTO v_orders_pending FROM orders WHERE status = 'pending';
        SELECT COUNT(*) INTO v_orders_preparing FROM orders WHERE status = 'preparing';
        SELECT COUNT(*) INTO v_orders_ready FROM orders WHERE status = 'ready';
        SELECT COUNT(*) INTO v_orders_in_transit FROM orders WHERE status = 'in_transit';
        SELECT COUNT(*) INTO v_orders_delivered FROM orders WHERE status = 'delivered';
        SELECT COUNT(*) INTO v_orders_cancelled FROM orders WHERE status = 'cancelled';

        -- Count couriers by status
        SELECT COUNT(*) INTO v_total_couriers FROM courier_profiles;
        SELECT COUNT(*) INTO v_available_couriers
        FROM courier_profiles
        WHERE status = 'available';

        SELECT COUNT(*) INTO v_busy_couriers
        FROM courier_profiles
        WHERE status = 'busy';

        SELECT COUNT(*) INTO v_offline_couriers
        FROM courier_profiles
        WHERE status = 'offline';

        -- Calculate average delivery time (in minutes) for delivered orders
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60.0)::DECIMAL(10, 2),
          0.00
        )
        INTO v_avg_delivery_time
        FROM orders
        WHERE status = 'delivered' AND delivered_at IS NOT NULL;

        -- Calculate average preparation time (created to ready status)
        -- Note: This is an approximation since we don't track individual status change times
        SELECT COALESCE(
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60.0)::DECIMAL(10, 2),
          0.00
        )
        INTO v_avg_preparation_time
        FROM orders
        WHERE status IN ('ready', 'in_transit', 'delivered');

        -- Calculate success rate (delivered / total non-cancelled orders)
        SELECT CASE
          WHEN COUNT(*) FILTER (WHERE status != 'cancelled') = 0 THEN 0.00
          ELSE (COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL /
                COUNT(*) FILTER (WHERE status != 'cancelled')::DECIMAL * 100.0)::DECIMAL(5, 2)
        END
        INTO v_success_rate
        FROM orders;

        -- Calculate today's revenue
        SELECT COALESCE(SUM(grand_total / 100.0), 0.00)::DECIMAL(10, 2)
        INTO v_daily_revenue
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
          AND status = 'delivered';

        -- Calculate total revenue
        SELECT COALESCE(SUM(grand_total / 100.0), 0.00)::DECIMAL(10, 2)
        INTO v_total_revenue
        FROM orders
        WHERE status = 'delivered';

        -- Insert snapshot
        INSERT INTO performance_snapshots (
          snapshot_at,
          total_orders, orders_pending, orders_preparing, orders_ready,
          orders_in_transit, orders_delivered, orders_cancelled,
          total_couriers, available_couriers, busy_couriers, offline_couriers,
          avg_delivery_time_minutes, avg_preparation_time_minutes,
          success_rate_percentage, daily_revenue_sek, total_revenue_sek
        ) VALUES (
          NOW(),
          v_total_orders, v_orders_pending, v_orders_preparing, v_orders_ready,
          v_orders_in_transit, v_orders_delivered, v_orders_cancelled,
          v_total_couriers, v_available_couriers, v_busy_couriers, v_offline_couriers,
          v_avg_delivery_time, v_avg_preparation_time,
          v_success_rate, v_daily_revenue, v_total_revenue
        )
        RETURNING id INTO v_snapshot_id;

        -- Return snapshot summary
        RETURN QUERY SELECT
          v_snapshot_id,
          v_total_orders,
          v_orders_delivered,
          v_available_couriers,
          v_avg_delivery_time,
          v_success_rate,
          v_daily_revenue;
      END;
      $$;
    `);

    console.log('  ✓ Created function: capture_performance_snapshot');

    // ============================================
    // FUNCTION: check_performance_alerts
    // ============================================
    // Checks all enabled alerts against the latest snapshot
    await client.query(`
      CREATE OR REPLACE FUNCTION check_performance_alerts()
      RETURNS INTEGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_alert RECORD;
        v_snapshot RECORD;
        v_metric_value DECIMAL;
        v_triggered_count INTEGER := 0;
        v_should_trigger BOOLEAN;
      BEGIN
        -- Get latest snapshot
        SELECT * INTO v_snapshot
        FROM performance_snapshots
        ORDER BY snapshot_at DESC
        LIMIT 1;

        IF v_snapshot IS NULL THEN
          RETURN 0;
        END IF;

        -- Loop through all enabled alerts
        FOR v_alert IN
          SELECT * FROM performance_alerts WHERE is_enabled = true
        LOOP
          -- Get metric value from snapshot based on alert's metric_name
          EXECUTE format('SELECT $1.%I', v_alert.metric_name)
          INTO v_metric_value
          USING v_snapshot;

          -- Skip if metric value is NULL
          IF v_metric_value IS NULL THEN
            CONTINUE;
          END IF;

          -- Check if alert should trigger based on comparison operator
          v_should_trigger := false;

          CASE v_alert.comparison_operator
            WHEN '>' THEN
              v_should_trigger := v_metric_value > v_alert.threshold_value;
            WHEN '<' THEN
              v_should_trigger := v_metric_value < v_alert.threshold_value;
            WHEN '>=' THEN
              v_should_trigger := v_metric_value >= v_alert.threshold_value;
            WHEN '<=' THEN
              v_should_trigger := v_metric_value <= v_alert.threshold_value;
            WHEN '=' THEN
              v_should_trigger := v_metric_value = v_alert.threshold_value;
            WHEN '!=' THEN
              v_should_trigger := v_metric_value != v_alert.threshold_value;
          END CASE;

          -- If alert triggered, log it
          IF v_should_trigger THEN
            INSERT INTO performance_alert_history (
              alert_id,
              snapshot_id,
              metric_value,
              threshold_value,
              message,
              triggered_at
            ) VALUES (
              v_alert.id,
              v_snapshot.id,
              v_metric_value,
              v_alert.threshold_value,
              format(
                'Alert "%s": %s is %s (threshold: %s %s)',
                v_alert.alert_name,
                v_alert.metric_name,
                v_metric_value,
                v_alert.comparison_operator,
                v_alert.threshold_value
              ),
              NOW()
            );

            v_triggered_count := v_triggered_count + 1;
          END IF;
        END LOOP;

        RETURN v_triggered_count;
      END;
      $$;
    `);

    console.log('  ✓ Created function: check_performance_alerts');

    // ============================================
    // SEED DATA: Default alerts
    // ============================================
    // Create some default alert definitions
    await client.query(`
      INSERT INTO performance_alerts (
        alert_name, description, alert_type, metric_name,
        threshold_value, comparison_operator, severity, is_enabled
      ) VALUES
      (
        'High Pending Orders',
        'Alert when pending orders exceed threshold',
        'threshold',
        'orders_pending',
        10.00,
        '>',
        'warning',
        true
      ),
      (
        'Low Available Couriers',
        'Alert when available couriers drop below threshold',
        'threshold',
        'available_couriers',
        2.00,
        '<',
        'critical',
        true
      ),
      (
        'Long Delivery Time',
        'Alert when average delivery time exceeds acceptable limit',
        'threshold',
        'avg_delivery_time_minutes',
        60.00,
        '>',
        'warning',
        true
      ),
      (
        'Low Success Rate',
        'Alert when delivery success rate falls below target',
        'threshold',
        'success_rate_percentage',
        80.00,
        '<',
        'critical',
        true
      )
      ON CONFLICT (alert_name) DO NOTHING;
    `);

    console.log('  ✓ Created default alert definitions');

    await client.query('COMMIT');
    console.log('✅ Migration 008 completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 008 failed:', error.message);
    throw error;
  }
};

exports.down = async (client) => {
  console.log('Rolling back migration 008: Performance Monitoring...');

  await client.query('BEGIN');

  try {
    // Drop functions
    await client.query('DROP FUNCTION IF EXISTS check_performance_alerts()');
    await client.query('DROP FUNCTION IF EXISTS capture_performance_snapshot()');

    // Drop tables (CASCADE will drop foreign key constraints and indexes)
    await client.query('DROP TABLE IF EXISTS performance_alert_history CASCADE');
    await client.query('DROP TABLE IF EXISTS performance_alerts CASCADE');
    await client.query('DROP TABLE IF EXISTS performance_snapshots CASCADE');

    await client.query('COMMIT');
    console.log('✅ Migration 008 rollback completed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 008 rollback failed:', error.message);
    throw error;
  }
};
