/**
 * PHASE 3A Test Suite: Courier Management System
 *
 * Tests courier profiles, contracts, and statistics
 */

const pool = require('./db');
const CourierService = require('./src/services/courierService');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

// Helper function to run tests
async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 Test: ${testName}`);
    await testFn();
    console.log(`✅ PASSED: ${testName}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3A TEST SUITE: Courier Management System');
  console.log('='.repeat(80));

  // TEST 1: Database tables exist
  await runTest('Database has courier_profiles table', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'courier_profiles'
      )
    `);

    if (!result.rows[0].exists) {
      throw new Error('courier_profiles table does not exist');
    }
  });

  // TEST 2: Database has courier_contracts table
  await runTest('Database has courier_contracts table', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'courier_contracts'
      )
    `);

    if (!result.rows[0].exists) {
      throw new Error('courier_contracts table does not exist');
    }
  });

  // TEST 3: Database has courier_statistics view
  await runTest('Database has courier_statistics view', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_name = 'courier_statistics'
      )
    `);

    if (!result.rows[0].exists) {
      throw new Error('courier_statistics view does not exist');
    }
  });

  // TEST 4: Courier permissions exist
  await runTest('Courier permissions exist in database', async () => {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM permissions
      WHERE name LIKE 'courier:%'
    `);

    const count = parseInt(result.rows[0].count);
    if (count < 2) {
      throw new Error(`Expected at least 2 courier permissions, found ${count}`);
    }
  });

  // TEST 5: CourierService.getAllCouriers() returns array
  await runTest('CourierService.getAllCouriers() returns array', async () => {
    const couriers = await CourierService.getAllCouriers();

    if (!Array.isArray(couriers)) {
      throw new Error('getAllCouriers() did not return an array');
    }

    console.log(`   Found ${couriers.length} courier(s)`);
  });

  // TEST 6: CourierService.getCourierByUserId() returns courier
  await runTest('CourierService.getCourierByUserId() returns correct courier', async () => {
    // Get first courier from database
    const courierResult = await pool.query('SELECT user_id FROM courier_profiles LIMIT 1');

    if (courierResult.rows.length === 0) {
      throw new Error('No couriers found in database');
    }

    const userId = courierResult.rows[0].user_id;
    const courier = await CourierService.getCourierByUserId(userId);

    if (!courier) {
      throw new Error('getCourierByUserId() returned null');
    }

    if (courier.user_id !== userId) {
      throw new Error(`Expected user_id ${userId}, got ${courier.user_id}`);
    }

    console.log(`   Courier: ${courier.courier_email}`);
  });

  // TEST 7: CourierService.getAvailableCouriers() filters by availability
  await runTest('CourierService.getAvailableCouriers() filters correctly', async () => {
    const available = await CourierService.getAvailableCouriers();

    if (!Array.isArray(available)) {
      throw new Error('getAvailableCouriers() did not return an array');
    }

    // Verify all returned couriers are available
    for (const courier of available) {
      if (!courier.is_available) {
        throw new Error(`Found unavailable courier in results: ${courier.courier_id}`);
      }
    }

    console.log(`   Found ${available.length} available courier(s)`);
  });

  // TEST 8: CourierService.getCourierStats() returns statistics
  await runTest('CourierService.getCourierStats() returns statistics', async () => {
    // Get first courier
    const courierResult = await pool.query('SELECT id FROM courier_profiles LIMIT 1');

    if (courierResult.rows.length === 0) {
      throw new Error('No couriers found in database');
    }

    const courierId = courierResult.rows[0].id;
    const stats = await CourierService.getCourierStats(courierId);

    if (!stats) {
      throw new Error('getCourierStats() returned null');
    }

    // Verify stats structure
    const requiredFields = ['courier_id', 'user_id', 'vehicle_type', 'is_available', 'total_deliveries'];
    for (const field of requiredFields) {
      if (stats[field] === undefined) {
        throw new Error(`Missing field in stats: ${field}`);
      }
    }

    console.log(`   Stats: ${stats.total_deliveries} deliveries, rating: ${stats.rating}`);
  });

  // TEST 9: CourierService.getGlobalStats() returns system statistics
  await runTest('CourierService.getGlobalStats() returns global statistics', async () => {
    const globalStats = await CourierService.getGlobalStats();

    if (!globalStats) {
      throw new Error('getGlobalStats() returned null');
    }

    // Verify structure
    if (globalStats.total_couriers === undefined) {
      throw new Error('Missing total_couriers in global stats');
    }

    console.log(`   Total couriers: ${globalStats.total_couriers}, Available: ${globalStats.available_couriers}`);
  });

  // TEST 10: Database indexes exist for performance
  await runTest('Database indexes exist for courier tables', async () => {
    const indexes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('courier_profiles', 'courier_contracts')
      AND indexname LIKE 'idx_courier%'
    `);

    if (indexes.rows.length < 4) {
      throw new Error(`Expected at least 4 courier indexes, found ${indexes.rows.length}`);
    }

    console.log(`   Found ${indexes.rows.length} courier indexes`);
  });

  // TEST 11: Error handling for non-existent courier
  await runTest('CourierService.getCourierById() throws error for non-existent courier', async () => {
    try {
      await CourierService.getCourierById(999999);
      throw new Error('Expected error for non-existent courier, but none was thrown');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw new Error(`Unexpected error message: ${error.message}`);
      }
    }
  });

  // TEST 12: Verify courier_statistics view has correct columns
  await runTest('courier_statistics view has all required columns', async () => {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'courier_statistics'
    `);

    const columns = result.rows.map(row => row.column_name);
    const requiredColumns = [
      'courier_id',
      'user_id',
      'courier_name',
      'courier_email',
      'vehicle_type',
      'is_available',
      'rating',
      'total_deliveries',
      'lifetime_orders',
      'completed_orders',
      'cancelled_orders',
      'avg_delivery_time_minutes',
      'last_delivery_at'
    ];

    for (const col of requiredColumns) {
      if (!columns.includes(col)) {
        throw new Error(`Missing column in courier_statistics view: ${col}`);
      }
    }

    console.log(`   View has all ${requiredColumns.length} required columns`);
  });

  // TEST 13: Verify migration data integrity
  await runTest('Migration correctly migrated existing courier users', async () => {
    // Count courier users
    const userCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'courier'
    `);

    // Count courier profiles
    const profileCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM courier_profiles
    `);

    if (userCount.rows[0].count !== profileCount.rows[0].count) {
      throw new Error(
        `Mismatch: ${userCount.rows[0].count} courier users but ${profileCount.rows[0].count} profiles`
      );
    }

    console.log(`   ${profileCount.rows[0].count} courier user(s) correctly migrated`);
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log(`📊 Total tests: ${testsPassed + testsFailed}`);
  console.log('='.repeat(80));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! PHASE 3A implementation is complete.\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite crashed:', error);
    pool.end();
    process.exit(1);
  });
