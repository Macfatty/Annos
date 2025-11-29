/**
 * Final Verification Script
 * Checks that all PHASE 3B.2 components are properly integrated
 */

console.log('\n=== PHASE 3B.2 Final Verification ===\n');

let errors = [];
let warnings = [];

// 1. Check RouteService exists and has required methods
console.log('1. Checking RouteService...');
try {
  const RouteService = require('./src/services/routeService');
  const requiredMethods = [
    'haversine',
    'calculateOptimalRoute',
    'calculateRouteDistance',
    'estimateDeliveryTime',
    'getRouteInstructions',
    'getCourierActiveRoute',
    'setCourierActiveRoute',
    'clearCourierActiveRoute',
    'updateCourierRouteProgress'
  ];
  
  for (const method of requiredMethods) {
    if (typeof RouteService[method] !== 'function') {
      errors.push(`RouteService.${method} is not a function`);
    }
  }
  console.log('   ✓ RouteService loaded with all required methods\n');
} catch (error) {
  errors.push(`Failed to load RouteService: ${error.message}`);
}

// 2. Check CourierService has new methods
console.log('2. Checking CourierService updates...');
try {
  const CourierService = require('./src/services/courierService');
  const newMethods = ['assignMultipleOrders', 'getCourierActiveRoute'];
  
  for (const method of newMethods) {
    if (typeof CourierService[method] !== 'function') {
      errors.push(`CourierService.${method} is not a function`);
    }
  }
  console.log('   ✓ CourierService has new route methods\n');
} catch (error) {
  errors.push(`Failed to load CourierService: ${error.message}`);
}

// 3. Check RouteController exists and has required functions
console.log('3. Checking RouteController...');
try {
  const routeController = require('./src/controllers/routeController');
  const requiredFunctions = [
    'optimizeRoute',
    'getCourierRoute',
    'assignRouteTocourier',
    'updateRouteProgress',
    'clearCourierRoute'
  ];
  
  for (const func of requiredFunctions) {
    if (typeof routeController[func] !== 'function') {
      errors.push(`routeController.${func} is not a function`);
    }
  }
  console.log('   ✓ RouteController loaded with all required functions\n');
} catch (error) {
  errors.push(`Failed to load RouteController: ${error.message}`);
}

// 4. Check routes are configured
console.log('4. Checking route configuration...');
try {
  const routeRoutes = require('./src/routes/routes');
  console.log('   ✓ Route routes loaded successfully\n');
} catch (error) {
  errors.push(`Failed to load route routes: ${error.message}`);
}

// 5. Check app.js integration
console.log('5. Checking app.js integration...');
try {
  const fs = require('fs');
  const appContent = fs.readFileSync('./src/app.js', 'utf8');
  
  if (!appContent.includes('routeRoutes')) {
    errors.push('app.js does not import routeRoutes');
  }
  if (!appContent.includes('app.use("/api/routes", routeRoutes)')) {
    errors.push('app.js does not register /api/routes');
  }
  console.log('   ✓ app.js properly configured\n');
} catch (error) {
  errors.push(`Failed to check app.js: ${error.message}`);
}

// 6. Test basic route optimization
console.log('6. Testing route optimization algorithm...');
try {
  const RouteService = require('./src/services/routeService');
  
  const stops = [
    { latitude: 59.3293, longitude: 18.0686, address: 'Stop 1' },
    { latitude: 59.3333, longitude: 18.0646, address: 'Stop 2' },
    { latitude: 59.3313, longitude: 18.0666, address: 'Stop 3' }
  ];
  
  const result = RouteService.calculateOptimalRoute(stops);
  
  if (!result.route || result.route.length !== 3) {
    errors.push('Route optimization returned incorrect number of stops');
  }
  if (typeof result.totalDistance !== 'number') {
    errors.push('Route optimization did not return totalDistance');
  }
  if (typeof result.totalStops !== 'number') {
    errors.push('Route optimization did not return totalStops');
  }
  
  console.log('   ✓ Route optimization algorithm working correctly\n');
} catch (error) {
  errors.push(`Route optimization test failed: ${error.message}`);
}

// 7. Test in-memory storage
console.log('7. Testing in-memory route storage...');
try {
  const RouteService = require('./src/services/routeService');
  
  const testRoute = {
    route: [{ latitude: 59.3293, longitude: 18.0686, address: 'Test' }],
    totalDistance: 0,
    totalStops: 1,
    vehicleType: 'bike'
  };
  
  RouteService.setCourierActiveRoute(12345, testRoute);
  const retrieved = RouteService.getCourierActiveRoute(12345);
  
  if (!retrieved || retrieved.courierId !== 12345) {
    errors.push('In-memory storage not working correctly');
  }
  
  RouteService.clearCourierActiveRoute(12345);
  const cleared = RouteService.getCourierActiveRoute(12345);
  
  if (cleared !== null) {
    errors.push('Route clearing not working correctly');
  }
  
  console.log('   ✓ In-memory route storage working correctly\n');
} catch (error) {
  errors.push(`In-memory storage test failed: ${error.message}`);
}

// 8. Check file sizes
console.log('8. Checking file sizes...');
try {
  const fs = require('fs');
  const files = [
    './src/services/routeService.js',
    './src/controllers/routeController.js',
    './src/routes/routes.js',
    './test-route-optimization.js',
    './test-route-api.js'
  ];
  
  for (const file of files) {
    const stats = fs.statSync(file);
    if (stats.size === 0) {
      errors.push(`${file} is empty`);
    }
  }
  console.log('   ✓ All files have content\n');
} catch (error) {
  errors.push(`File size check failed: ${error.message}`);
}

// Summary
console.log('=== Verification Summary ===\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ SUCCESS! All checks passed.\n');
  console.log('PHASE 3B.2: Route Optimization is fully implemented and integrated.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:\n');
    errors.forEach(err => console.log(`   - ${err}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(warn => console.log(`   - ${warn}`));
    console.log('');
  }
  
  process.exit(errors.length > 0 ? 1 : 0);
}
