/**
 * PHASE 3B.2: Route Optimization Test Suite
 *
 * Comprehensive tests for route optimization functionality
 * Tests: Nearest neighbor algorithm, route distance, delivery time, edge cases
 */

const RouteService = require('./src/services/routeService');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test counter
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Test helper function
 */
function test(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    return true;
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}✗${colors.reset} ${description}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Assert helper function
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.bold}${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}PHASE 3B.2: Route Optimization Tests${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}========================================${colors.reset}\n`);

  // Test 1: Haversine Formula
  console.log(`${colors.bold}Test Group 1: Haversine Distance Calculation${colors.reset}`);

  test('Calculate distance between Stockholm and Gothenburg (~400km)', () => {
    const stockholm = { latitude: 59.3293, longitude: 18.0686 };
    const gothenburg = { latitude: 57.7089, longitude: 11.9746 };
    const distance = RouteService.haversine(stockholm, gothenburg);

    // Should be approximately 400km (allowing 10km margin)
    assert(distance > 390 && distance < 410, `Expected ~400km, got ${distance}km`);
  });

  test('Calculate distance between same point (should be 0)', () => {
    const point = { latitude: 59.3293, longitude: 18.0686 };
    const distance = RouteService.haversine(point, point);

    assert(distance === 0, `Expected 0km, got ${distance}km`);
  });

  test('Calculate short distance (~1km) accurately', () => {
    const point1 = { latitude: 59.3293, longitude: 18.0686 };
    const point2 = { latitude: 59.3383, longitude: 18.0686 }; // ~1km north
    const distance = RouteService.haversine(point1, point2);

    assert(distance > 0.9 && distance < 1.1, `Expected ~1km, got ${distance}km`);
  });

  // Test 2: Route Distance Calculation
  console.log(`\n${colors.bold}Test Group 2: Route Distance Calculation${colors.reset}`);

  test('Calculate total distance for multi-stop route', () => {
    const stops = [
      { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
      { latitude: 59.3383, longitude: 18.0686, address: 'Stop 2' },
      { latitude: 59.3383, longitude: 18.0786, address: 'Stop 3' }
    ];

    const totalDistance = RouteService.calculateRouteDistance(stops);
    assert(totalDistance > 0, 'Total distance should be greater than 0');
    assert(typeof totalDistance === 'number', 'Distance should be a number');
  });

  test('Empty route should return 0 distance', () => {
    const distance = RouteService.calculateRouteDistance([]);
    assert(distance === 0, `Expected 0km, got ${distance}km`);
  });

  test('Single stop route should return 0 distance', () => {
    const stops = [{ latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' }];
    const distance = RouteService.calculateRouteDistance(stops);
    assert(distance === 0, `Expected 0km, got ${distance}km`);
  });

  // Test 3: Delivery Time Estimation
  console.log(`\n${colors.bold}Test Group 3: Delivery Time Estimation${colors.reset}`);

  test('Estimate delivery time for bike (15 km at 15 km/h = 60 min)', () => {
    const time = RouteService.estimateDeliveryTime(15, 'bike');
    assert(time === 60, `Expected 60 minutes, got ${time} minutes`);
  });

  test('Estimate delivery time for car (30 km at 30 km/h = 60 min)', () => {
    const time = RouteService.estimateDeliveryTime(30, 'car');
    assert(time === 60, `Expected 60 minutes, got ${time} minutes`);
  });

  test('Estimate delivery time for scooter (25 km at 25 km/h = 60 min)', () => {
    const time = RouteService.estimateDeliveryTime(25, 'scooter');
    assert(time === 60, `Expected 60 minutes, got ${time} minutes`);
  });

  test('Estimate delivery time for walking (5 km at 5 km/h = 60 min)', () => {
    const time = RouteService.estimateDeliveryTime(5, 'walking');
    assert(time === 60, `Expected 60 minutes, got ${time} minutes`);
  });

  test('Default to bike speed for unknown vehicle type', () => {
    const time1 = RouteService.estimateDeliveryTime(15, 'bike');
    const time2 = RouteService.estimateDeliveryTime(15, 'unknown');
    assert(time1 === time2, 'Unknown vehicle should default to bike speed');
  });

  test('Zero distance should return 0 time', () => {
    const time = RouteService.estimateDeliveryTime(0, 'bike');
    assert(time === 0, `Expected 0 minutes, got ${time} minutes`);
  });

  // Test 4: Route Optimization - Nearest Neighbor Algorithm
  console.log(`\n${colors.bold}Test Group 4: Route Optimization (Nearest Neighbor)${colors.reset}`);

  test('Optimize route with 3 stops', () => {
    const stops = [
      { latitude: 59.3293, longitude: 18.0686, address: 'Stop A' },
      { latitude: 59.3383, longitude: 18.0786, address: 'Stop B' },
      { latitude: 59.3343, longitude: 18.0736, address: 'Stop C' }
    ];

    const result = RouteService.calculateOptimalRoute(stops);

    assert(result.route, 'Should return a route');
    assert(result.route.length === 3, `Expected 3 stops, got ${result.route.length}`);
    assert(typeof result.totalDistance === 'number', 'Total distance should be a number');
    assert(result.totalDistance >= 0, 'Total distance should be non-negative');
    assert(result.totalStops === 3, `Expected 3 total stops, got ${result.totalStops}`);
  });

  test('Optimize route with start point', () => {
    const start = { latitude: 59.3293, longitude: 18.0686, address: 'Start' };
    const stops = [
      { latitude: 59.3383, longitude: 18.0786, address: 'Stop 1' },
      { latitude: 59.3343, longitude: 18.0736, address: 'Stop 2' }
    ];

    const result = RouteService.calculateOptimalRoute(stops, start);

    assert(result.route.length === 2, `Expected 2 stops in route, got ${result.route.length}`);
    assert(result.totalDistance > 0, 'Should have calculated distance from start');
  });

  test('Single stop should return as-is with 0 distance', () => {
    const stops = [{ latitude: 59.3293, longitude: 18.0686, address: 'Only Stop' }];
    const result = RouteService.calculateOptimalRoute(stops);

    assert(result.route.length === 1, 'Should return single stop');
    assert(result.totalDistance === 0, 'Distance should be 0');
  });

  test('Empty stops array should return empty route', () => {
    const result = RouteService.calculateOptimalRoute([]);

    assert(result.route.length === 0, 'Should return empty route');
    assert(result.totalDistance === 0, 'Distance should be 0');
    assert(result.estimatedTime === 0, 'Time should be 0');
  });

  test('Nearest neighbor should pick closest stop first', () => {
    const stops = [
      { latitude: 59.3293, longitude: 18.0686, address: 'Start (Stop 1)' },
      { latitude: 59.4293, longitude: 18.0686, address: 'Far Stop' },
      { latitude: 59.3303, longitude: 18.0686, address: 'Near Stop' }
    ];

    const result = RouteService.calculateOptimalRoute(stops);

    // Second stop should be the nearest one
    assert(result.route[1].address === 'Near Stop', 'Should pick nearest stop second');
  });

  test('Optimize route with 5 stops', () => {
    const stops = [
      { latitude: 59.3293, longitude: 18.0686, address: 'A' },
      { latitude: 59.3393, longitude: 18.0686, address: 'B' },
      { latitude: 59.3293, longitude: 18.0786, address: 'C' },
      { latitude: 59.3393, longitude: 18.0786, address: 'D' },
      { latitude: 59.3343, longitude: 18.0736, address: 'E' }
    ];

    const result = RouteService.calculateOptimalRoute(stops);

    assert(result.route.length === 5, `Expected 5 stops, got ${result.route.length}`);
    assert(result.totalDistance > 0, 'Should have calculated total distance');

    // All original stops should be in the route
    const addresses = result.route.map(s => s.address);
    assert(addresses.includes('A'), 'Route should include stop A');
    assert(addresses.includes('B'), 'Route should include stop B');
    assert(addresses.includes('C'), 'Route should include stop C');
    assert(addresses.includes('D'), 'Route should include stop D');
    assert(addresses.includes('E'), 'Route should include stop E');
  });

  // Test 5: Route Instructions
  console.log(`\n${colors.bold}Test Group 5: Route Instructions${colors.reset}`);

  test('Generate instructions for 3-stop route', () => {
    const stops = [
      { latitude: 59.3293, longitude: 18.0686, address: 'First Stop', type: 'pickup' },
      { latitude: 59.3383, longitude: 18.0686, address: 'Second Stop', type: 'dropoff' },
      { latitude: 59.3383, longitude: 18.0786, address: 'Third Stop', type: 'dropoff' }
    ];

    const instructions = RouteService.getRouteInstructions(stops);

    assert(instructions.length === 3, `Expected 3 instructions, got ${instructions.length}`);
    assert(instructions[0].step === 1, 'First instruction should be step 1');
    assert(instructions[0].action === 'Start at', 'First instruction should be "Start at"');
    assert(instructions[1].action === 'Proceed to', 'Second instruction should be "Proceed to"');
    assert(instructions[0].distanceToNext !== undefined, 'Should have distance to next stop');
    assert(instructions[2].distanceToNext === undefined, 'Last stop should not have distance to next');
  });

  test('Empty stops should return empty instructions', () => {
    const instructions = RouteService.getRouteInstructions([]);
    assert(instructions.length === 0, 'Should return empty instructions');
  });

  test('Single stop should have no distance to next', () => {
    const stops = [{ latitude: 59.3293, longitude: 18.0686, address: 'Only Stop' }];
    const instructions = RouteService.getRouteInstructions(stops);

    assert(instructions.length === 1, 'Should have one instruction');
    assert(instructions[0].distanceToNext === undefined, 'Should have no distance to next');
  });

  // Test 6: Edge Cases and Validation
  console.log(`\n${colors.bold}Test Group 6: Edge Cases and Validation${colors.reset}`);

  test('Validate latitude range (should reject > 90)', () => {
    const stops = [{ latitude: 91, longitude: 18.0686, address: 'Invalid' }];

    try {
      RouteService.calculateOptimalRoute(stops);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('Latitude'), 'Should throw latitude validation error');
    }
  });

  test('Validate latitude range (should reject < -90)', () => {
    const stops = [{ latitude: -91, longitude: 18.0686, address: 'Invalid' }];

    try {
      RouteService.calculateOptimalRoute(stops);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('Latitude'), 'Should throw latitude validation error');
    }
  });

  test('Validate longitude range (should reject > 180)', () => {
    const stops = [{ latitude: 59.3293, longitude: 181, address: 'Invalid' }];

    try {
      RouteService.calculateOptimalRoute(stops);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('Longitude'), 'Should throw longitude validation error');
    }
  });

  test('Validate longitude range (should reject < -180)', () => {
    const stops = [{ latitude: 59.3293, longitude: -181, address: 'Invalid' }];

    try {
      RouteService.calculateOptimalRoute(stops);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('Longitude'), 'Should throw longitude validation error');
    }
  });

  test('Validate stops is an array', () => {
    try {
      RouteService.calculateOptimalRoute('not an array');
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('array'), 'Should throw array validation error');
    }
  });

  test('Validate stop has latitude and longitude', () => {
    const stops = [{ address: 'Missing coordinates' }];

    try {
      RouteService.calculateOptimalRoute(stops);
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('latitude'), 'Should throw coordinate validation error');
    }
  });

  test('Validate negative distance throws error', () => {
    try {
      RouteService.estimateDeliveryTime(-10, 'bike');
      throw new Error('Should have thrown validation error');
    } catch (error) {
      assert(error.message.includes('non-negative'), 'Should throw negative distance error');
    }
  });

  // Test 7: In-Memory Route Storage
  console.log(`\n${colors.bold}Test Group 7: In-Memory Route Storage${colors.reset}`);

  test('Store and retrieve courier route', () => {
    const courierId = 999;
    const route = {
      route: [
        { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
        { latitude: 59.3383, longitude: 18.0686, address: 'Stop 2' }
      ],
      totalDistance: 1.0,
      totalStops: 2,
      vehicleType: 'bike'
    };

    const stored = RouteService.setCourierActiveRoute(courierId, route);
    const retrieved = RouteService.getCourierActiveRoute(courierId);

    assert(retrieved !== null, 'Should retrieve stored route');
    assert(retrieved.courierId === courierId, 'Should have correct courier ID');
    assert(retrieved.route.length === 2, 'Should have 2 stops');
    assert(retrieved.status === 'active', 'Should have active status');
  });

  test('Clear courier route', () => {
    const courierId = 998;
    const route = {
      route: [{ latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' }],
      totalDistance: 0,
      totalStops: 1,
      vehicleType: 'bike'
    };

    RouteService.setCourierActiveRoute(courierId, route);
    const cleared = RouteService.clearCourierActiveRoute(courierId);
    const retrieved = RouteService.getCourierActiveRoute(courierId);

    assert(cleared === true, 'Should return true when clearing existing route');
    assert(retrieved === null, 'Should return null after clearing');
  });

  test('Update route progress', () => {
    const courierId = 997;
    const route = {
      route: [
        { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
        { latitude: 59.3383, longitude: 18.0686, address: 'Stop 2' },
        { latitude: 59.3383, longitude: 18.0786, address: 'Stop 3' }
      ],
      totalDistance: 2.0,
      totalStops: 3,
      vehicleType: 'bike'
    };

    RouteService.setCourierActiveRoute(courierId, route);
    const updated = RouteService.updateCourierRouteProgress(courierId, 1);

    assert(updated.currentStopIndex === 1, 'Should update stop index');
    assert(updated.status === 'active', 'Should remain active');
  });

  test('Mark route as completed when reaching last stop', () => {
    const courierId = 996;
    const route = {
      route: [
        { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
        { latitude: 59.3383, longitude: 18.0686, address: 'Stop 2' }
      ],
      totalDistance: 1.0,
      totalStops: 2,
      vehicleType: 'bike'
    };

    RouteService.setCourierActiveRoute(courierId, route);
    const updated = RouteService.updateCourierRouteProgress(courierId, 1);

    assert(updated.currentStopIndex === 1, 'Should be at last stop');
    assert(updated.status === 'completed', 'Should be marked as completed');
  });

  test('Get null for non-existent courier route', () => {
    const retrieved = RouteService.getCourierActiveRoute(99999);
    assert(retrieved === null, 'Should return null for non-existent route');
  });

  // Test 8: Performance and Large Routes
  console.log(`\n${colors.bold}Test Group 8: Performance and Large Routes${colors.reset}`);

  test('Optimize route with 10 stops', () => {
    const stops = [];
    for (let i = 0; i < 10; i++) {
      stops.push({
        latitude: 59.3293 + (Math.random() * 0.1),
        longitude: 18.0686 + (Math.random() * 0.1),
        address: `Stop ${i + 1}`
      });
    }

    const startTime = Date.now();
    const result = RouteService.calculateOptimalRoute(stops);
    const duration = Date.now() - startTime;

    assert(result.route.length === 10, `Expected 10 stops, got ${result.route.length}`);
    assert(duration < 1000, `Optimization took ${duration}ms, should be < 1000ms`);
  });

  test('Optimize route with 20 stops', () => {
    const stops = [];
    for (let i = 0; i < 20; i++) {
      stops.push({
        latitude: 59.3293 + (Math.random() * 0.2),
        longitude: 18.0686 + (Math.random() * 0.2),
        address: `Stop ${i + 1}`
      });
    }

    const startTime = Date.now();
    const result = RouteService.calculateOptimalRoute(stops);
    const duration = Date.now() - startTime;

    assert(result.route.length === 20, `Expected 20 stops, got ${result.route.length}`);
    assert(duration < 2000, `Optimization took ${duration}ms, should be < 2000ms`);
  });

  // Print summary
  console.log(`\n${colors.bold}${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.bold}Test Summary${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}========================================${colors.reset}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.bold}${colors.green}✓ All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bold}${colors.red}✗ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite error:${colors.reset}`, error);
  process.exit(1);
});
