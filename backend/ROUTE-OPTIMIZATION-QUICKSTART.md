# Route Optimization Quick Start Guide

## Overview
PHASE 3B.2 adds intelligent route optimization to minimize delivery distance and time for couriers with multiple stops.

## Quick Test

Run the test suite to verify everything works:
```bash
cd /home/macfatty/foodie/Annos/backend
node test-route-optimization.js
```

View API examples:
```bash
node test-route-api.js
```

## Basic Usage

### 1. Optimize a Route (Admin)

Calculate the optimal route for a set of delivery stops:

```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stops": [
      {
        "latitude": 59.3293,
        "longitude": 18.0686,
        "address": "Drottninggatan 1, Stockholm"
      },
      {
        "latitude": 59.3333,
        "longitude": 18.0646,
        "address": "Vasagatan 10, Stockholm"
      }
    ],
    "vehicleType": "bike"
  }'
```

### 2. Assign Route to Courier (Admin)

Assign an optimized route to a specific courier:

```bash
curl -X POST http://localhost:3001/api/routes/couriers/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stops": [
      {
        "latitude": 59.3293,
        "longitude": 18.0686,
        "address": "Drottninggatan 1, Stockholm"
      }
    ],
    "optimize": true
  }'
```

### 3. View Your Route (Courier)

Get your current assigned route:

```bash
curl http://localhost:3001/api/routes/couriers/1 \
  -H "Authorization: Bearer YOUR_COURIER_TOKEN"
```

### 4. Update Progress (Courier)

Mark that you've reached a stop:

```bash
curl -X PATCH http://localhost:3001/api/routes/couriers/1/progress \
  -H "Authorization: Bearer YOUR_COURIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentStopIndex": 1
  }'
```

### 5. Clear Route (Admin)

Remove a courier's active route:

```bash
curl -X DELETE http://localhost:3001/api/routes/couriers/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## How It Works

### Nearest Neighbor Algorithm

The system uses a greedy nearest-neighbor algorithm:

1. **Start:** Use courier's GPS location or first stop
2. **Loop:** Find the nearest unvisited stop
3. **Visit:** Move to that stop and mark it visited
4. **Repeat:** Until all stops are visited
5. **Result:** Optimized route with distance and time

### Distance Calculation

Uses the Haversine formula to calculate accurate distances:
- Accounts for Earth's curvature
- Returns distance in kilometers
- Accuracy: ±0.3% for typical delivery distances

### Time Estimation

Based on vehicle type and distance:
- **Walking:** 5 km/h
- **Bike:** 15 km/h
- **Scooter:** 25 km/h
- **Car:** 30 km/h (urban speeds)

## Code Examples

### Using RouteService in Your Code

```javascript
const RouteService = require('./src/services/routeService');

// Define stops
const stops = [
  { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
  { latitude: 59.3333, longitude: 18.0646, address: 'Stop 2' },
  { latitude: 59.3313, longitude: 18.0666, address: 'Stop 3' }
];

// Optimize route
const result = RouteService.calculateOptimalRoute(stops);

console.log('Optimized route:', result.route);
console.log('Total distance:', result.totalDistance, 'km');
console.log('Total stops:', result.totalStops);

// Get delivery time estimate
const time = RouteService.estimateDeliveryTime(result.totalDistance, 'bike');
console.log('Estimated time:', time, 'minutes');

// Generate instructions
const instructions = RouteService.getRouteInstructions(result.route);
instructions.forEach(instruction => {
  console.log(`Step ${instruction.step}: ${instruction.action} ${instruction.address}`);
});
```

### Managing Courier Routes

```javascript
const CourierService = require('./src/services/courierService');
const RouteService = require('./src/services/routeService');

// Assign route to courier
const courierId = 1;
const optimizedRoute = RouteService.calculateOptimalRoute(stops);
optimizedRoute.vehicleType = 'bike';

RouteService.setCourierActiveRoute(courierId, optimizedRoute);

// Get courier's active route
const activeRoute = await CourierService.getCourierActiveRoute(courierId);
console.log('Active route:', activeRoute);

// Update progress
RouteService.updateCourierRouteProgress(courierId, 1);

// Clear when done
RouteService.clearCourierActiveRoute(courierId);
```

## API Endpoints Reference

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/api/routes/optimize` | Admin | Optimize a route |
| GET | `/api/routes/couriers/:id` | Courier/Admin | Get courier's route |
| POST | `/api/routes/couriers/:id` | Admin | Assign route |
| PATCH | `/api/routes/couriers/:id/progress` | Courier/Admin | Update progress |
| DELETE | `/api/routes/couriers/:id` | Admin | Clear route |

## Common Issues

### Issue: "No active route found"
**Solution:** Route hasn't been assigned yet. Use POST /api/routes/couriers/:id to assign.

### Issue: "Courier is not available"
**Solution:** Set courier availability to true before assigning routes.

### Issue: "Latitude must be between -90 and 90"
**Solution:** Check coordinate values. Common mistake: swapping lat/long.

### Issue: "You can only view your own route"
**Solution:** Couriers can only access their own routes. Admins can access any route.

## Performance

- **Small routes (< 10 stops):** < 10ms
- **Medium routes (10-20 stops):** < 100ms
- **Large routes (20-50 stops):** < 500ms

The nearest neighbor algorithm has O(n²) complexity, which is acceptable for typical delivery routes.

## Testing

### Run All Tests
```bash
node test-route-optimization.js
```

### Test Individual Functions
```javascript
const RouteService = require('./src/services/routeService');

// Test Haversine
const distance = RouteService.haversine(
  { latitude: 59.3293, longitude: 18.0686 },
  { latitude: 59.3333, longitude: 18.0646 }
);
console.log('Distance:', distance, 'km');

// Test route optimization
const stops = [
  { latitude: 59.3293, longitude: 18.0686 },
  { latitude: 59.3333, longitude: 18.0646 }
];
const route = RouteService.calculateOptimalRoute(stops);
console.log('Route:', route);
```

## Production Considerations

For production deployment:

1. **Route Storage:** Consider Redis or database instead of in-memory
2. **Real-time Updates:** Implement WebSocket for live route updates
3. **Traffic Data:** Integrate traffic APIs for dynamic time estimates
4. **Route History:** Store completed routes for analytics
5. **Monitoring:** Track route efficiency and courier performance

## Next Steps

1. Test the API endpoints with your authentication tokens
2. Integrate with your frontend application
3. Add real-time tracking visualization
4. Collect metrics on route efficiency
5. Consider advanced features (time windows, vehicle capacity, etc.)

## Support

- **Test Suite:** `test-route-optimization.js` (35 tests)
- **API Examples:** `test-route-api.js`
- **Full Documentation:** `PHASE-3B2-IMPLEMENTATION-SUMMARY.md`
- **Service Code:** `src/services/routeService.js`
- **Controller Code:** `src/controllers/routeController.js`
- **Routes Config:** `src/routes/routes.js`

## Summary

PHASE 3B.2 provides:
- Fast route optimization using nearest neighbor algorithm
- Accurate distance calculation with Haversine formula
- Time estimates based on vehicle type
- Turn-by-turn instructions
- In-memory route storage
- Permission-based API access
- Comprehensive error handling

Ready to optimize your delivery routes!
