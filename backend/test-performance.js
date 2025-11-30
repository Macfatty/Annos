/**
 * PHASE 3B.6: Performance Monitoring Test Suite
 *
 * Comprehensive tests for performance tracking and alerts system
 */

require('dotenv').config();
const pool = require('./src/config/database');
const PerformanceService = require('./src/services/performanceService');
const assert = require('assert');

let client;
let testSnapshotId;
let testAlertId;
let testAlertHistoryId;

async function setup() {
  console.log('📋 Setting up test environment...\n');

  client = await pool.connect();

  try {
    // Create some test data for snapshots (orders and couriers)
    // Create test orders with various statuses
    for (let i = 0; i < 10; i++) {
      await client.query(`
        INSERT INTO orders (
          restaurant_slug, customer_name, customer_email, customer_phone, customer_address,
          status, items_total, delivery_fee, discount_total, grand_total, created_at
        ) VALUES (
          'test-restaurant', 'Test Customer', 'customer@test.com', '1234567890', 'Test Address',
          $1, 10000, 5000, 0, 15000, NOW()
        )
      `, [i < 5 ? 'delivered' : 'pending']);
    }

    console.log('✅ Created test data for performance monitoring\n');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    // Clean up test data
    await client.query("DELETE FROM performance_alert_history WHERE alert_id IN (SELECT id FROM performance_alerts WHERE alert_name LIKE 'Test%')");
    await client.query("DELETE FROM performance_alerts WHERE alert_name LIKE 'Test%'");
    await client.query("DELETE FROM performance_snapshots WHERE id > 0");
    await client.query("DELETE FROM orders WHERE restaurant_slug = 'test-restaurant'");

    console.log('✅ Cleanup completed\n');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

async function runTests() {
  console.log('🧪 PHASE 3B.6: Performance Monitoring System Tests\n');
  console.log('================================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // TEST 1: Capture performance snapshot
    console.log('TEST 1: Capture performance snapshot');
    try {
      const snapshot = await PerformanceService.captureSnapshot();
      assert(snapshot.snapshot_id !== undefined, 'Snapshot should have an ID');
      assert(snapshot.total_orders >= 10, 'Should have at least 10 orders');
      assert(snapshot.orders_delivered >= 5, 'Should have at least 5 delivered orders');
      testSnapshotId = snapshot.snapshot_id;
      console.log('  ✅ TEST 1: Snapshot captured successfully');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 1 FAILED:', error.message);
      failed++;
    }

    // TEST 2: Get latest snapshot
    console.log('\nTEST 2: Get latest snapshot');
    try {
      const latest = await PerformanceService.getLatestSnapshot();
      assert(latest !== null, 'Latest snapshot should exist');
      assert(latest.id === testSnapshotId, 'Latest snapshot ID should match');
      console.log('  ✅ TEST 2: Latest snapshot retrieved');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 2 FAILED:', error.message);
      failed++;
    }

    // TEST 3: Get snapshots with limit
    console.log('\nTEST 3: Get snapshots with limit');
    try {
      const snapshots = await PerformanceService.getSnapshots({ limit: 5 });
      assert(Array.isArray(snapshots), 'Snapshots should be an array');
      assert(snapshots.length <= 5, 'Should respect limit');
      console.log(`  ✅ TEST 3: Retrieved ${snapshots.length} snapshots`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 3 FAILED:', error.message);
      failed++;
    }

    // TEST 4: Get snapshots with date range
    console.log('\nTEST 4: Get snapshots with date range');
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const snapshots = await PerformanceService.getSnapshots({
        startDate: yesterday.toISOString(),
        endDate: now.toISOString()
      });
      assert(Array.isArray(snapshots), 'Snapshots should be an array');
      console.log(`  ✅ TEST 4: Retrieved ${snapshots.length} snapshots in date range`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 4 FAILED:', error.message);
      failed++;
    }

    // TEST 5: Get performance trends
    console.log('\nTEST 5: Get performance trends');
    try {
      const trends = await PerformanceService.getTrends(24);
      assert(trends !== undefined, 'Trends should be defined');
      console.log('  ✅ TEST 5: Trends calculated');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 5 FAILED:', error.message);
      failed++;
    }

    // TEST 6: Get default alerts
    console.log('\nTEST 6: Get default alerts');
    try {
      const alerts = await PerformanceService.getAlerts();
      assert(Array.isArray(alerts), 'Alerts should be an array');
      assert(alerts.length >= 4, 'Should have at least 4 default alerts');
      console.log(`  ✅ TEST 6: Retrieved ${alerts.length} alerts`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 6 FAILED:', error.message);
      failed++;
    }

    // TEST 7: Get enabled alerts only
    console.log('\nTEST 7: Get enabled alerts only');
    try {
      const alerts = await PerformanceService.getAlerts(true);
      assert(Array.isArray(alerts), 'Alerts should be an array');
      assert(alerts.every(a => a.is_enabled === true), 'All alerts should be enabled');
      console.log(`  ✅ TEST 7: Retrieved ${alerts.length} enabled alerts`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 7 FAILED:', error.message);
      failed++;
    }

    // TEST 8: Create new alert
    console.log('\nTEST 8: Create new alert');
    try {
      const newAlert = await PerformanceService.createAlert({
        alert_name: 'Test High Orders',
        description: 'Test alert for high order count',
        metric_name: 'total_orders',
        threshold_value: 100,
        comparison_operator: '>',
        severity: 'info'
      });
      assert(newAlert.id !== undefined, 'Alert should have an ID');
      assert(newAlert.alert_name === 'Test High Orders', 'Alert name should match');
      testAlertId = newAlert.id;
      console.log('  ✅ TEST 8: Alert created');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 8 FAILED:', error.message);
      failed++;
    }

    // TEST 9: Duplicate alert name should fail
    console.log('\nTEST 9: Duplicate alert name should fail');
    try {
      await PerformanceService.createAlert({
        alert_name: 'Test High Orders',
        metric_name: 'total_orders',
        threshold_value: 100,
        comparison_operator: '>'
      });
      console.error('  ❌ TEST 9 FAILED: Should have thrown error');
      failed++;
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ✅ TEST 9: Duplicate alert correctly rejected');
        passed++;
      } else {
        console.error('  ❌ TEST 9 FAILED:', error.message);
        failed++;
      }
    }

    // TEST 10: Update alert
    console.log('\nTEST 10: Update alert');
    try {
      const updated = await PerformanceService.updateAlert(testAlertId, {
        threshold_value: 200,
        severity: 'warning'
      });
      assert(updated.threshold_value === '200.00', 'Threshold should be updated');
      assert(updated.severity === 'warning', 'Severity should be updated');
      console.log('  ✅ TEST 10: Alert updated');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 10 FAILED:', error.message);
      failed++;
    }

    // TEST 11: Check alerts
    console.log('\nTEST 11: Check alerts');
    try {
      const result = await PerformanceService.checkAlerts();
      assert(result.alerts_triggered !== undefined, 'Should return triggered count');
      assert(result.checked_at !== undefined, 'Should return check timestamp');
      console.log(`  ✅ TEST 11: Checked alerts (triggered: ${result.alerts_triggered})`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 11 FAILED:', error.message);
      failed++;
    }

    // TEST 12: Get alert history
    console.log('\nTEST 12: Get alert history');
    try {
      const history = await PerformanceService.getAlertHistory({ limit: 10 });
      assert(Array.isArray(history), 'History should be an array');
      if (history.length > 0) {
        testAlertHistoryId = history[0].id;
      }
      console.log(`  ✅ TEST 12: Retrieved ${history.length} alert history entries`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 12 FAILED:', error.message);
      failed++;
    }

    // TEST 13: Get unresolved alert history
    console.log('\nTEST 13: Get unresolved alert history');
    try {
      const unresolved = await PerformanceService.getAlertHistory({ resolved: false });
      assert(Array.isArray(unresolved), 'Unresolved history should be an array');
      assert(unresolved.every(h => h.resolved === false), 'All should be unresolved');
      console.log(`  ✅ TEST 13: Retrieved ${unresolved.length} unresolved alerts`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 13 FAILED:', error.message);
      failed++;
    }

    // TEST 14: Resolve alert (if we have one)
    if (testAlertHistoryId) {
      console.log('\nTEST 14: Resolve alert');
      try {
        const resolved = await PerformanceService.resolveAlert(
          testAlertHistoryId,
          1,
          'Test resolution'
        );
        assert(resolved.resolved === true, 'Alert should be resolved');
        assert(resolved.resolution_notes === 'Test resolution', 'Notes should match');
        console.log('  ✅ TEST 14: Alert resolved');
        passed++;
      } catch (error) {
        console.error('  ❌ TEST 14 FAILED:', error.message);
        failed++;
      }
    } else {
      console.log('\nTEST 14: SKIPPED (no alert history to resolve)');
    }

    // TEST 15: Get dashboard summary
    console.log('\nTEST 15: Get dashboard summary');
    try {
      const summary = await PerformanceService.getDashboardSummary();
      assert(summary.current !== undefined, 'Should have current snapshot');
      assert(summary.trends !== undefined, 'Should have trends');
      assert(summary.active_alerts !== undefined, 'Should have active alerts');
      assert(summary.active_alerts_count !== undefined, 'Should have alert count');
      console.log('  ✅ TEST 15: Dashboard summary retrieved');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 15 FAILED:', error.message);
      failed++;
    }

    // TEST 16: Delete alert
    console.log('\nTEST 16: Delete alert');
    try {
      const success = await PerformanceService.deleteAlert(testAlertId);
      assert(success === true, 'Delete should return true');
      console.log('  ✅ TEST 16: Alert deleted');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 16 FAILED:', error.message);
      failed++;
    }

    // TEST 17: Delete non-existent alert should fail
    console.log('\nTEST 17: Delete non-existent alert should return false');
    try {
      const success = await PerformanceService.deleteAlert(99999);
      assert(success === false, 'Delete should return false for non-existent alert');
      console.log('  ✅ TEST 17: Non-existent alert correctly handled');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 17 FAILED:', error.message);
      failed++;
    }

    // Final summary
    console.log('\n================================================');
    console.log('📊 TEST RESULTS');
    console.log('================================================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total:  ${passed + failed}`);
    console.log('================================================\n');

    return { passed, failed };

  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    throw error;
  }
}

async function main() {
  try {
    await setup();
    const results = await runTests();
    await cleanup();

    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();
