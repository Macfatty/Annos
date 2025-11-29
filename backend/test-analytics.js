/**
 * PHASE 3B.3: Analytics Service Test Suite
 */

const { Pool } = require('pg');
const AnalyticsService = require('./src/services/analyticsService');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'macfatty',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, testName) {
  if (condition) {
    testResults.passed++;
    testResults.tests.push({ name: testName, status: 'PASSED' });
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    testResults.tests.push({ name: testName, status: 'FAILED' });
    console.log(`❌ ${testName}`);
  }
}

async function runTests() {
  console.log('🧪 Starting PHASE 3B.3 Analytics Test Suite\n');
  console.log('═'.repeat(70));

  // TEST 1: Materialized views exist
  console.log('\n📝 Database Tests');
  console.log('─'.repeat(70));

  const client = await pool.connect();

  try {
    const viewsResult = await client.query(`
      SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
      AND matviewname IN ('courier_performance_metrics', 'system_wide_statistics', 'hourly_activity_stats', 'daily_revenue_stats')
    `);

    assert(viewsResult.rows.length === 4, 'All 4 materialized views exist');

    // TEST 2: Refresh function exists
    const functionResult = await client.query(`
      SELECT proname FROM pg_proc WHERE proname = 'refresh_analytics_views'
    `);

    assert(functionResult.rows.length > 0, 'Refresh function exists');

    // TEST 3: Indexes exist
    const indexesResult = await client.query(`
      SELECT COUNT(*) as count FROM pg_indexes
      WHERE tablename IN ('courier_performance_metrics', 'hourly_activity_stats', 'daily_revenue_stats')
    `);

    assert(parseInt(indexesResult.rows[0].count) >= 6, 'At least 6 indexes created');

  } finally {
    client.release();
  }

  // TEST 4-10: AnalyticsService methods
  console.log('\n📝 Service Layer Tests');
  console.log('─'.repeat(70));

  try {
    // TEST 4: Get system statistics
    const systemStats = await AnalyticsService.getSystemStatistics();
    assert(systemStats && typeof systemStats === 'object', 'Get system statistics returns object');
    assert(systemStats.hasOwnProperty('total_orders'), 'System stats has total_orders');

    // TEST 5: Get courier performance (using courier ID 1)
    const courierPerf = await AnalyticsService.getCourierPerformance(1);
    assert(courierPerf && typeof courierPerf === 'object', 'Get courier performance returns object');
    assert(courierPerf.courier_id === 1, 'Courier performance has correct courier_id');

    // TEST 6: Get hourly activity
    const hourlyActivity = await AnalyticsService.getActivityByHour();
    assert(Array.isArray(hourlyActivity), 'Get hourly activity returns array');

    // TEST 7: Get revenue metrics
    const revenueMetrics = await AnalyticsService.getRevenueMetrics();
    assert(Array.isArray(revenueMetrics), 'Get revenue metrics returns array');

    // TEST 8: Get top performers
    const topPerformers = await AnalyticsService.getTopPerformers(5, 'deliveries');
    assert(Array.isArray(topPerformers), 'Get top performers returns array');
    assert(topPerformers.length <= 5, 'Top performers respects limit');

    // TEST 9: Get dashboard summary
    const dashboard = await AnalyticsService.getDashboardSummary();
    assert(dashboard && typeof dashboard === 'object', 'Get dashboard summary returns object');
    assert(dashboard.hasOwnProperty('system'), 'Dashboard has system data');
    assert(dashboard.hasOwnProperty('today'), 'Dashboard has today data');
    assert(dashboard.hasOwnProperty('topCouriers'), 'Dashboard has top couriers');

    // TEST 10: Refresh analytics views
    const refreshResult = await AnalyticsService.refreshAnalytics();
    assert(refreshResult.success === true, 'Refresh analytics succeeds');
    assert(typeof refreshResult.duration_ms === 'number', 'Refresh returns duration');

  } catch (error) {
    console.error('Service test error:', error.message);
    assert(false, `Service tests failed: ${error.message}`);
  }

  // TEST 11-15: Date range filtering
  console.log('\n📝 Date Range Tests');
  console.log('─'.repeat(70));

  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // TEST 11: System stats with date range
    const statsWithRange = await AnalyticsService.getSystemStatistics({
      startDate: yesterday,
      endDate: today
    });
    assert(statsWithRange && typeof statsWithRange === 'object', 'System stats with date range works');

    // TEST 12: Hourly activity with date range
    const activityWithRange = await AnalyticsService.getActivityByHour({
      startDate: yesterday,
      endDate: today
    });
    assert(Array.isArray(activityWithRange), 'Hourly activity with date range works');

    // TEST 13: Revenue with date range
    const revenueWithRange = await AnalyticsService.getRevenueMetrics({
      startDate: yesterday,
      endDate: today
    });
    assert(Array.isArray(revenueWithRange), 'Revenue metrics with date range works');

    // TEST 14: Invalid date range (end before start) should fail
    try {
      await AnalyticsService.getSystemStatistics({
        startDate: today,
        endDate: yesterday
      });
      assert(false, 'Invalid date range should throw error');
    } catch (error) {
      assert(error.message.includes('Start date'), 'Invalid date range throws correct error');
    }

    // TEST 15: Future end date should fail
    const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    try {
      await AnalyticsService.getSystemStatistics({
        startDate: today,
        endDate: futureDate
      });
      assert(false, 'Future date range should throw error');
    } catch (error) {
      assert(error.message.includes('future'), 'Future date throws correct error');
    }

  } catch (error) {
    console.error('Date range test error:', error.message);
  }

  // TEST 16-20: Edge cases and validation
  console.log('\n📝 Validation Tests');
  console.log('─'.repeat(70));

  try {
    // TEST 16: Invalid courier ID
    try {
      await AnalyticsService.getCourierPerformance(999999);
      assert(false, 'Invalid courier ID should throw error');
    } catch (error) {
      assert(error.message.includes('not found'), 'Invalid courier ID throws correct error');
    }

    // TEST 17: Top performers with invalid metric
    try {
      await AnalyticsService.getTopPerformers(10, 'invalid_metric');
      assert(false, 'Invalid metric should throw error');
    } catch (error) {
      assert(error.message.includes('Invalid metric'), 'Invalid metric throws correct error');
    }

    // TEST 18: Top performers with limit too high
    try {
      await AnalyticsService.getTopPerformers(1000, 'deliveries');
      assert(false, 'Limit too high should throw error');
    } catch (error) {
      assert(error.message.includes('between 1 and 100'), 'Limit validation works');
    }

    // TEST 19: Top performers with different metrics
    const byRating = await AnalyticsService.getTopPerformers(3, 'rating');
    assert(Array.isArray(byRating), 'Top performers by rating works');

    const byEarnings = await AnalyticsService.getTopPerformers(3, 'earnings');
    assert(Array.isArray(byEarnings), 'Top performers by earnings works');

  } catch (error) {
    console.error('Validation test error:', error.message);
  }

  // Print summary
  console.log('\n═'.repeat(70));
  console.log('📊 Test Summary');
  console.log('═'.repeat(70));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`  - ${t.name}`));
  }

  console.log('\n' + '═'.repeat(70));

  await pool.end();

  return testResults.failed === 0;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
