/**
 * PHASE 3B.2: Route Optimization API Test Examples
 *
 * This file demonstrates example API requests and responses
 * for the route optimization endpoints
 */

console.log('\n================================================================================');
console.log('PHASE 3B.2: Route Optimization API Examples');
console.log('================================================================================\n');

console.log('1. POST /api/routes/optimize - Optimize a route given multiple addresses');
console.log('   Permission: Admin (courier:manage)');
console.log('   Description: Calculate optimal delivery route using nearest neighbor algorithm\n');

console.log('   Example Request:');
console.log('   POST http://localhost:3001/api/routes/optimize');
console.log('   Headers: { Authorization: "Bearer <admin_token>" }');
console.log('   Body:');
console.log(JSON.stringify({
  stops: [
    {
      id: 'order-123',
      latitude: 59.3293,
      longitude: 18.0686,
      address: 'Drottninggatan 1, Stockholm',
      type: 'pickup'
    },
    {
      id: 'order-124',
      latitude: 59.3333,
      longitude: 18.0646,
      address: 'Vasagatan 10, Stockholm',
      type: 'dropoff'
    },
    {
      id: 'order-125',
      latitude: 59.3313,
      longitude: 18.0666,
      address: 'Kungsgatan 5, Stockholm',
      type: 'dropoff'
    }
  ],
  start: {
    latitude: 59.3283,
    longitude: 18.0696,
    address: 'Courier current location'
  },
  vehicleType: 'bike'
}, null, 2));

console.log('\n   Example Response (200 OK):');
console.log(JSON.stringify({
  success: true,
  data: {
    route: [
      {
        id: 'order-123',
        latitude: 59.3293,
        longitude: 18.0686,
        address: 'Drottninggatan 1, Stockholm',
        type: 'pickup'
      },
      {
        id: 'order-125',
        latitude: 59.3313,
        longitude: 18.0666,
        address: 'Kungsgatan 5, Stockholm',
        type: 'dropoff'
      },
      {
        id: 'order-124',
        latitude: 59.3333,
        longitude: 18.0646,
        address: 'Vasagatan 10, Stockholm',
        type: 'dropoff'
      }
    ],
    totalDistance: 0.67,
    totalStops: 3,
    estimatedTime: 3,
    vehicleType: 'bike',
    instructions: [
      {
        step: 1,
        type: 'pickup',
        address: 'Drottninggatan 1, Stockholm',
        latitude: 59.3293,
        longitude: 18.0686,
        action: 'Start at',
        distanceToNext: 0.25
      },
      {
        step: 2,
        type: 'dropoff',
        address: 'Kungsgatan 5, Stockholm',
        latitude: 59.3313,
        longitude: 18.0666,
        action: 'Proceed to',
        distanceToNext: 0.42
      },
      {
        step: 3,
        type: 'dropoff',
        address: 'Vasagatan 10, Stockholm',
        latitude: 59.3333,
        longitude: 18.0646,
        action: 'Proceed to'
      }
    ]
  },
  message: 'Route optimized successfully'
}, null, 2));

console.log('\n\n================================================================================\n');

console.log('2. GET /api/routes/couriers/:id - Get courier\'s optimized route');
console.log('   Permission: Courier (courier:view) - own route only, Admin can view any');
console.log('   Description: Retrieve courier\'s current active delivery route\n');

console.log('   Example Request:');
console.log('   GET http://localhost:3001/api/routes/couriers/1');
console.log('   Headers: { Authorization: "Bearer <courier_token>" }\n');

console.log('   Example Response (200 OK):');
console.log(JSON.stringify({
  success: true,
  data: {
    courierId: 1,
    route: [
      {
        latitude: 59.3293,
        longitude: 18.0686,
        address: 'Drottninggatan 1, Stockholm'
      },
      {
        latitude: 59.3313,
        longitude: 18.0666,
        address: 'Kungsgatan 5, Stockholm'
      }
    ],
    totalDistance: 0.25,
    totalStops: 2,
    currentStopIndex: 0,
    status: 'active',
    createdAt: '2025-01-15T10:30:00.000Z',
    vehicleType: 'bike',
    instructions: [
      {
        step: 1,
        type: 'delivery',
        address: 'Drottninggatan 1, Stockholm',
        latitude: 59.3293,
        longitude: 18.0686,
        action: 'Start at',
        distanceToNext: 0.25
      },
      {
        step: 2,
        type: 'delivery',
        address: 'Kungsgatan 5, Stockholm',
        latitude: 59.3313,
        longitude: 18.0666,
        action: 'Proceed to'
      }
    ],
    remainingDistance: 0.25,
    estimatedTimeRemaining: 1
  }
}, null, 2));

console.log('\n   Example Response (404 Not Found):');
console.log(JSON.stringify({
  success: false,
  error: 'No active route',
  message: 'No active route found for this courier'
}, null, 2));

console.log('\n\n================================================================================\n');

console.log('3. POST /api/routes/couriers/:id - Assign optimized route to courier');
console.log('   Permission: Admin (courier:manage)');
console.log('   Description: Calculate and assign optimized route to a courier\n');

console.log('   Example Request:');
console.log('   POST http://localhost:3001/api/routes/couriers/1');
console.log('   Headers: { Authorization: "Bearer <admin_token>" }');
console.log('   Body:');
console.log(JSON.stringify({
  stops: [
    {
      latitude: 59.3293,
      longitude: 18.0686,
      address: 'Drottninggatan 1, Stockholm',
      type: 'pickup'
    },
    {
      latitude: 59.3333,
      longitude: 18.0646,
      address: 'Vasagatan 10, Stockholm',
      type: 'dropoff'
    },
    {
      latitude: 59.3313,
      longitude: 18.0666,
      address: 'Kungsgatan 5, Stockholm',
      type: 'dropoff'
    }
  ],
  optimize: true
}, null, 2));

console.log('\n   Example Response (201 Created):');
console.log(JSON.stringify({
  success: true,
  data: {
    courierId: 1,
    route: [
      {
        latitude: 59.3293,
        longitude: 18.0686,
        address: 'Drottninggatan 1, Stockholm',
        type: 'pickup'
      },
      {
        latitude: 59.3313,
        longitude: 18.0666,
        address: 'Kungsgatan 5, Stockholm',
        type: 'dropoff'
      },
      {
        latitude: 59.3333,
        longitude: 18.0646,
        address: 'Vasagatan 10, Stockholm',
        type: 'dropoff'
      }
    ],
    totalDistance: 0.67,
    totalStops: 3,
    currentStopIndex: 0,
    status: 'active',
    createdAt: '2025-01-15T10:35:00.000Z',
    vehicleType: 'bike',
    estimatedTime: 3,
    instructions: [
      {
        step: 1,
        type: 'pickup',
        address: 'Drottninggatan 1, Stockholm',
        latitude: 59.3293,
        longitude: 18.0686,
        action: 'Start at',
        distanceToNext: 0.25
      },
      {
        step: 2,
        type: 'dropoff',
        address: 'Kungsgatan 5, Stockholm',
        latitude: 59.3313,
        longitude: 18.0666,
        action: 'Proceed to',
        distanceToNext: 0.42
      },
      {
        step: 3,
        type: 'dropoff',
        address: 'Vasagatan 10, Stockholm',
        latitude: 59.3333,
        longitude: 18.0646,
        action: 'Proceed to'
      }
    ]
  },
  message: 'Route assigned successfully'
}, null, 2));

console.log('\n   Example Response (400 Bad Request - Courier unavailable):');
console.log(JSON.stringify({
  success: false,
  error: 'Courier unavailable',
  message: 'Courier is not available for route assignment'
}, null, 2));

console.log('\n\n================================================================================\n');

console.log('4. PATCH /api/routes/couriers/:id/progress - Update route progress');
console.log('   Permission: Courier (courier:view) - own progress only');
console.log('   Description: Update courier\'s current stop in the delivery route\n');

console.log('   Example Request:');
console.log('   PATCH http://localhost:3001/api/routes/couriers/1/progress');
console.log('   Headers: { Authorization: "Bearer <courier_token>" }');
console.log('   Body:');
console.log(JSON.stringify({
  currentStopIndex: 1
}, null, 2));

console.log('\n   Example Response (200 OK):');
console.log(JSON.stringify({
  success: true,
  data: {
    courierId: 1,
    route: [
      {
        latitude: 59.3293,
        longitude: 18.0686,
        address: 'Drottninggatan 1, Stockholm'
      },
      {
        latitude: 59.3313,
        longitude: 18.0666,
        address: 'Kungsgatan 5, Stockholm'
      }
    ],
    totalDistance: 0.25,
    totalStops: 2,
    currentStopIndex: 1,
    status: 'completed',
    createdAt: '2025-01-15T10:30:00.000Z',
    vehicleType: 'bike'
  },
  message: 'Route progress updated successfully'
}, null, 2));

console.log('\n\n================================================================================\n');

console.log('5. DELETE /api/routes/couriers/:id - Clear courier\'s active route');
console.log('   Permission: Admin (courier:manage)');
console.log('   Description: Remove courier\'s current active route\n');

console.log('   Example Request:');
console.log('   DELETE http://localhost:3001/api/routes/couriers/1');
console.log('   Headers: { Authorization: "Bearer <admin_token>" }\n');

console.log('   Example Response (200 OK):');
console.log(JSON.stringify({
  success: true,
  message: 'Route cleared successfully'
}, null, 2));

console.log('\n   Example Response (404 Not Found):');
console.log(JSON.stringify({
  success: false,
  error: 'No active route',
  message: 'No active route found for this courier'
}, null, 2));

console.log('\n\n================================================================================\n');

console.log('ROUTE OPTIMIZATION ALGORITHM DETAILS:');
console.log('================================================================================\n');

console.log('Nearest Neighbor (Greedy) Algorithm:');
console.log('1. Start from courier\'s current location (or first stop if no GPS)');
console.log('2. Find the nearest unvisited stop using Haversine distance formula');
console.log('3. Move to that stop and mark it as visited');
console.log('4. Repeat steps 2-3 until all stops are visited');
console.log('5. Return optimized route with total distance and time estimate\n');

console.log('Speed Estimates by Vehicle Type:');
console.log('- walking: 5 km/h');
console.log('- bike: 15 km/h');
console.log('- scooter: 25 km/h');
console.log('- car: 30 km/h (urban)\n');

console.log('Haversine Formula:');
console.log('Calculates great-circle distance between two points on Earth');
console.log('Accounts for Earth\'s curvature for accurate distance calculation');
console.log('Formula: d = 2r × arcsin(√(sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)))\n');

console.log('================================================================================\n');

console.log('ERROR RESPONSES:');
console.log('================================================================================\n');

console.log('400 Bad Request - Invalid coordinates:');
console.log(JSON.stringify({
  success: false,
  error: 'Validation error',
  message: 'Latitude must be between -90 and 90 degrees'
}, null, 2));

console.log('\n401 Unauthorized - Missing or invalid token:');
console.log(JSON.stringify({
  success: false,
  error: 'Unauthorized',
  message: 'Authentication required'
}, null, 2));

console.log('\n403 Forbidden - Insufficient permissions:');
console.log(JSON.stringify({
  success: false,
  error: 'Forbidden',
  message: 'You can only view your own route'
}, null, 2));

console.log('\n404 Not Found - Courier not found:');
console.log(JSON.stringify({
  success: false,
  error: 'Courier not found',
  message: 'Courier not found: 999'
}, null, 2));

console.log('\n500 Internal Server Error:');
console.log(JSON.stringify({
  success: false,
  error: 'Failed to optimize route',
  message: 'Internal server error'
}, null, 2));

console.log('\n================================================================================\n');
