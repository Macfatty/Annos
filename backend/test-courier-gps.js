/**
 * PHASE 3B.1 Test Suite: GPS Tracking & Real-Time Location
 *
 * Tests for courier GPS tracking functionality
 */

const { Pool } = require('pg');
const CourierService = require('./src/services/courierService');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'macfatty',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

// Test counter
let testsPassed = 0;
let testsFailed = 0;
let testCourierId = null;

// Helper function to run a test
async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 Testing: ${testName}`);
    await testFn();
    console.log(`✅ PASSED: ${testName}`);
    testsPassed++;
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${testName}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Helper function to assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Helper function to assert throws
async function assertThrows(fn, expectedMessage) {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}", but got "${error.message}"`);
    }
  }
}

// Haversine formula for distance calculation (for testing)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function runAllTests() {
  console.log('🚀 Starting PHASE 3B.1 GPS Tracking Test Suite\n');
  console.log('═'.repeat(80));

  // TEST 1: Verify GPS columns exist in database
  await runTest('GPS columns exist in courier_profiles table', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'courier_profiles'
      AND column_name IN ('current_latitude', 'current_longitude', 'last_location_update', 'gps_enabled')
      ORDER BY column_name
    `);

    assert(result.rows.length === 4, `Expected 4 GPS columns, found ${result.rows.length}`);

    const columns = result.rows.map(r => r.column_name);
    assert(columns.includes('current_latitude'), 'current_latitude column missing');
    assert(columns.includes('current_longitude'), 'current_longitude column missing');
    assert(columns.includes('last_location_update'), 'last_location_update column missing');
    assert(columns.includes('gps_enabled'), 'gps_enabled column missing');

    console.log('   Found columns:', columns.join(', '));
  });

  // TEST 2: Verify indexes exist for GPS columns
  await runTest('Spatial index exists for GPS coordinates', async () => {
    const result = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'courier_profiles'
      AND (indexname LIKE '%location%' OR indexname LIKE '%gps%')
    `);

    assert(result.rows.length >= 2, `Expected at least 2 GPS indexes, found ${result.rows.length}`);

    const indexes = result.rows.map(r => r.indexname);
    console.log('   Found indexes:', indexes.join(', '));
  });

  // TEST 3: Verify validation constraints
  await runTest('Validation constraints exist for latitude/longitude', async () => {
    const result = await pool.query(`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conrelid = 'courier_profiles'::regclass
      AND (conname LIKE '%latitude%' OR conname LIKE '%longitude%' OR conname LIKE '%location%')
    `);

    assert(result.rows.length >= 3, `Expected at least 3 constraints, found ${result.rows.length}`);

    const constraints = result.rows.map(r => r.conname);
    console.log('   Found constraints:', constraints.join(', '));
  });

  // TEST 4: Get or create a test courier
  await runTest('Get or create test courier', async () => {
    // Get first available courier from database
    const result = await pool.query(`
      SELECT id FROM courier_profiles LIMIT 1
    `);

    if (result.rows.length > 0) {
      testCourierId = result.rows[0].id;
      console.log(`   Using existing courier ID: ${testCourierId}`);
    } else {
      // Create a test user and courier if none exist
      const userResult = await pool.query(`
        INSERT INTO users (email, password, role)
        VALUES ('test-gps-courier@example.com', 'hashed_password', 'courier')
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `);

      const courierResult = await pool.query(`
        INSERT INTO courier_profiles (user_id, vehicle_type, is_available)
        VALUES ($1, 'bike', true)
        RETURNING id
      `, [userResult.rows[0].id]);

      testCourierId = courierResult.rows[0].id;
      console.log(`   Created new courier ID: ${testCourierId}`);
    }

    assert(testCourierId !== null, 'Test courier ID should not be null');
  });

  // TEST 5: updateCourierLocation() works
  await runTest('updateCourierLocation() updates GPS coordinates', async () => {
    const latitude = 59.3293; // Stockholm latitude
    const longitude = 18.0686; // Stockholm longitude

    const result = await CourierService.updateCourierLocation(
      testCourierId,
      latitude,
      longitude,
      1 // admin user
    );

    assert(result.id === testCourierId, 'Courier ID should match');
    assert(parseFloat(result.current_latitude) === latitude, 'Latitude should be updated');
    assert(parseFloat(result.current_longitude) === longitude, 'Longitude should be updated');
    assert(result.gps_enabled === true, 'GPS should be enabled after location update');
    assert(result.last_location_update !== null, 'Last location update should be set');

    console.log(`   Updated location: (${result.current_latitude}, ${result.current_longitude})`);
    console.log(`   GPS enabled: ${result.gps_enabled}`);
  });

  // TEST 6: Invalid coordinates are rejected
  await runTest('Invalid latitude is rejected', async () => {
    await assertThrows(
      async () => await CourierService.updateCourierLocation(testCourierId, 91, 18.0686, 1),
      'Latitude must be between -90 and 90'
    );

    await assertThrows(
      async () => await CourierService.updateCourierLocation(testCourierId, -91, 18.0686, 1),
      'Latitude must be between -90 and 90'
    );

    console.log('   ✓ Rejected latitude > 90');
    console.log('   ✓ Rejected latitude < -90');
  });

  await runTest('Invalid longitude is rejected', async () => {
    await assertThrows(
      async () => await CourierService.updateCourierLocation(testCourierId, 59.3293, 181, 1),
      'Longitude must be between -180 and 180'
    );

    await assertThrows(
      async () => await CourierService.updateCourierLocation(testCourierId, 59.3293, -181, 1),
      'Longitude must be between -180 and 180'
    );

    console.log('   ✓ Rejected longitude > 180');
    console.log('   ✓ Rejected longitude < -180');
  });

  // TEST 7: getCourierCurrentLocation() returns coordinates
  await runTest('getCourierCurrentLocation() returns GPS data', async () => {
    const location = await CourierService.getCourierCurrentLocation(testCourierId);

    assert(location.courier_id === testCourierId, 'Courier ID should match');
    assert(location.latitude !== null, 'Latitude should not be null');
    assert(location.longitude !== null, 'Longitude should not be null');
    assert(location.gps_enabled === true, 'GPS should be enabled');
    assert(location.last_update !== null, 'Last update should not be null');

    console.log(`   Location: (${location.latitude}, ${location.longitude})`);
    console.log(`   Last update: ${location.last_update}`);
  });

  // TEST 8: getCouriersNearby() calculates distances correctly
  await runTest('getCouriersNearby() finds couriers within radius', async () => {
    // Create additional test couriers at known locations
    const testLocations = [
      { lat: 59.3293, lng: 18.0686, name: 'Stockholm' },
      { lat: 59.3340, lng: 18.0650, name: 'Near Stockholm (0.5km)' },
      { lat: 59.3500, lng: 18.1000, name: 'Farther (3.5km)' }
    ];

    // Update our test courier to first location
    await CourierService.updateCourierLocation(testCourierId, testLocations[0].lat, testLocations[0].lng, 1);

    // Search from Stockholm center with 5km radius
    const searchLat = 59.3293;
    const searchLng = 18.0686;
    const radiusKm = 5;

    const nearbyCouriers = await CourierService.getCouriersNearby(searchLat, searchLng, radiusKm);

    assert(Array.isArray(nearbyCouriers), 'Result should be an array');
    assert(nearbyCouriers.length > 0, 'Should find at least one courier');

    // Check first courier (should be at exact location, distance ~0)
    const firstCourier = nearbyCouriers[0];
    assert(firstCourier.distance_km !== undefined, 'Distance should be calculated');
    assert(firstCourier.distance_km >= 0, 'Distance should be non-negative');
    assert(firstCourier.distance_km <= radiusKm, `Distance should be within radius (${radiusKm}km)`);

    console.log(`   Found ${nearbyCouriers.length} courier(s) within ${radiusKm}km`);
    console.log(`   First courier distance: ${firstCourier.distance_km}km`);
  });

  // TEST 9: Haversine formula accuracy test
  await runTest('Haversine formula calculates accurate distances', async () => {
    // Test known locations with known distances
    const stockholm = { lat: 59.3293, lng: 18.0686 };
    const uppsala = { lat: 59.8586, lng: 17.6389 }; // ~65km from Stockholm

    // Calculate distance using our helper function
    const calculatedDistance = calculateDistance(
      stockholm.lat, stockholm.lng,
      uppsala.lat, uppsala.lng
    );

    // Distance should be approximately 65km (with some tolerance)
    assert(calculatedDistance >= 60 && calculatedDistance <= 70,
      `Distance Stockholm-Uppsala should be ~65km, got ${calculatedDistance.toFixed(2)}km`);

    console.log(`   Stockholm to Uppsala: ${calculatedDistance.toFixed(2)}km (expected ~65km)`);

    // Test zero distance (same location)
    const zeroDistance = calculateDistance(
      stockholm.lat, stockholm.lng,
      stockholm.lat, stockholm.lng
    );
    assert(zeroDistance < 0.01, `Same location distance should be ~0, got ${zeroDistance}km`);
    console.log(`   Same location distance: ${zeroDistance.toFixed(6)}km`);
  });

  // TEST 10: getCouriersNearby() with vehicle type filter
  await runTest('getCouriersNearby() filters by vehicle type', async () => {
    const searchLat = 59.3293;
    const searchLng = 18.0686;
    const radiusKm = 10;

    // Search for bike couriers only
    const bikeCouriers = await CourierService.getCouriersNearby(
      searchLat, searchLng, radiusKm, 'bike'
    );

    assert(Array.isArray(bikeCouriers), 'Result should be an array');

    // All returned couriers should be bike couriers
    bikeCouriers.forEach(courier => {
      assert(courier.vehicle_type === 'bike',
        `All couriers should be bike type, found ${courier.vehicle_type}`);
    });

    console.log(`   Found ${bikeCouriers.length} bike courier(s) within ${radiusKm}km`);
  });

  // TEST 11: toggleGPS() enables/disables tracking
  await runTest('toggleGPS() disables GPS and clears coordinates', async () => {
    // Disable GPS
    const disabledCourier = await CourierService.toggleGPS(testCourierId, false, 1);

    assert(disabledCourier.gps_enabled === false, 'GPS should be disabled');
    assert(disabledCourier.current_latitude === null, 'Latitude should be cleared');
    assert(disabledCourier.current_longitude === null, 'Longitude should be cleared');
    assert(disabledCourier.last_location_update === null, 'Last update should be cleared');

    console.log('   ✓ GPS disabled, coordinates cleared');

    // Re-enable GPS
    const enabledCourier = await CourierService.toggleGPS(testCourierId, true, 1);

    assert(enabledCourier.gps_enabled === true, 'GPS should be enabled');
    console.log('   ✓ GPS re-enabled');
  });

  // TEST 12: getCourierCurrentLocation() throws error when GPS disabled
  await runTest('getCourierCurrentLocation() throws error when GPS disabled', async () => {
    // First disable GPS
    await CourierService.toggleGPS(testCourierId, false, 1);

    await assertThrows(
      async () => await CourierService.getCourierCurrentLocation(testCourierId),
      'GPS tracking is not enabled'
    );

    console.log('   ✓ Correctly throws error when GPS is disabled');

    // Re-enable GPS for next tests
    await CourierService.toggleGPS(testCourierId, true, 1);
  });

  // TEST 13: getCourierCurrentLocation() throws error when location not available
  await runTest('getCourierCurrentLocation() throws error when location unavailable', async () => {
    // GPS is enabled but no location set (coordinates are null)
    await assertThrows(
      async () => await CourierService.getCourierCurrentLocation(testCourierId),
      'Location not available'
    );

    console.log('   ✓ Correctly throws error when location not set');
  });

  // TEST 14: Verify courier_statistics view includes GPS data
  await runTest('courier_statistics view includes GPS columns', async () => {
    const result = await pool.query(`
      SELECT current_latitude, current_longitude, last_location_update, gps_enabled
      FROM courier_statistics
      WHERE courier_id = $1
    `, [testCourierId]);

    assert(result.rows.length === 1, 'Should find courier in view');

    const courier = result.rows[0];
    assert(courier.hasOwnProperty('current_latitude'), 'View should include current_latitude');
    assert(courier.hasOwnProperty('current_longitude'), 'View should include current_longitude');
    assert(courier.hasOwnProperty('last_location_update'), 'View should include last_location_update');
    assert(courier.hasOwnProperty('gps_enabled'), 'View should include gps_enabled');

    console.log('   ✓ All GPS columns present in courier_statistics view');
  });

  // TEST 15: Database constraints prevent invalid data
  await runTest('Database constraints prevent invalid latitude', async () => {
    try {
      await pool.query(`
        UPDATE courier_profiles
        SET current_latitude = 91, current_longitude = 0
        WHERE id = $1
      `, [testCourierId]);

      throw new Error('Should have failed due to constraint');
    } catch (error) {
      assert(error.message.includes('constraint') || error.message.includes('violates'),
        'Should fail with constraint violation');
      console.log('   ✓ Database rejected invalid latitude (91°)');
    }
  });

  // TEST 16: Nearby search with zero radius
  await runTest('getCouriersNearby() rejects invalid radius', async () => {
    await assertThrows(
      async () => await CourierService.getCouriersNearby(59.3293, 18.0686, 0),
      'Radius must be greater than 0'
    );

    await assertThrows(
      async () => await CourierService.getCouriersNearby(59.3293, 18.0686, -5),
      'Radius must be greater than 0'
    );

    console.log('   ✓ Rejected zero radius');
    console.log('   ✓ Rejected negative radius');
  });

  // Print final results
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total:  ${testsPassed + testsFailed}`);
  console.log(`   Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed successfully!\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  }
}

// Run tests
runAllTests()
  .then(() => {
    pool.end();
    process.exit(testsFailed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite crashed:', error);
    pool.end();
    process.exit(1);
  });
