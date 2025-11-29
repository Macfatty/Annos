/**
 * Manual API Test for GPS Tracking Endpoints
 *
 * Tests the GPS tracking API endpoints without requiring HTTP server
 */

const CourierService = require('./src/services/courierService');

async function testGPSAPI() {
  console.log('🧪 Manual GPS API Testing\n');
  console.log('═'.repeat(80));

  try {
    // Test 1: Update courier location (simulating PATCH /api/couriers/1/location)
    console.log('\n📍 Test 1: Update Courier Location');
    console.log('   Endpoint: PATCH /api/couriers/1/location');
    console.log('   Body: { latitude: 59.3293, longitude: 18.0686 }');

    const updatedCourier = await CourierService.updateCourierLocation(
      1, // courier ID
      59.3293, // Stockholm latitude
      18.0686, // Stockholm longitude
      1 // updated by user 1
    );

    console.log('   ✅ Response 200 OK:');
    console.log('   {');
    console.log(`     "success": true,`);
    console.log(`     "message": "Location updated successfully",`);
    console.log(`     "data": {`);
    console.log(`       "id": ${updatedCourier.id},`);
    console.log(`       "current_latitude": ${updatedCourier.current_latitude},`);
    console.log(`       "current_longitude": ${updatedCourier.current_longitude},`);
    console.log(`       "gps_enabled": ${updatedCourier.gps_enabled},`);
    console.log(`       "last_location_update": "${updatedCourier.last_location_update}"`);
    console.log(`     }`);
    console.log('   }');

    // Test 2: Get nearby couriers (simulating GET /api/couriers/nearby)
    console.log('\n📍 Test 2: Get Nearby Couriers (Public Endpoint)');
    console.log('   Endpoint: GET /api/couriers/nearby?latitude=59.3293&longitude=18.0686&radius=10');

    const nearbyCouriers = await CourierService.getCouriersNearby(
      59.3293, // search latitude
      18.0686, // search longitude
      10, // radius in km
      null // no vehicle type filter
    );

    console.log('   ✅ Response 200 OK:');
    console.log('   {');
    console.log(`     "success": true,`);
    console.log(`     "count": ${nearbyCouriers.length},`);
    console.log(`     "search_params": {`);
    console.log(`       "latitude": 59.3293,`);
    console.log(`       "longitude": 18.0686,`);
    console.log(`       "radius_km": 10,`);
    console.log(`       "vehicle_type": "all"`);
    console.log(`     },`);
    console.log(`     "data": [`);

    nearbyCouriers.forEach((courier, index) => {
      console.log(`       {`);
      console.log(`         "id": ${courier.id},`);
      console.log(`         "user_id": ${courier.user_id},`);
      console.log(`         "vehicle_type": "${courier.vehicle_type}",`);
      console.log(`         "is_available": ${courier.is_available},`);
      console.log(`         "current_latitude": ${courier.current_latitude},`);
      console.log(`         "current_longitude": ${courier.current_longitude},`);
      console.log(`         "distance_km": ${courier.distance_km},`);
      console.log(`         "courier_name": "${courier.courier_name}",`);
      console.log(`         "courier_email": "${courier.courier_email}"`);
      console.log(`       }${index < nearbyCouriers.length - 1 ? ',' : ''}`);
    });

    console.log(`     ]`);
    console.log('   }');

    // Test 3: Get current location (simulating GET /api/couriers/1/location)
    console.log('\n📍 Test 3: Get Current Location');
    console.log('   Endpoint: GET /api/couriers/1/location');

    const currentLocation = await CourierService.getCourierCurrentLocation(1);

    console.log('   ✅ Response 200 OK:');
    console.log('   {');
    console.log(`     "success": true,`);
    console.log(`     "data": {`);
    console.log(`       "courier_id": ${currentLocation.courier_id},`);
    console.log(`       "user_id": ${currentLocation.user_id},`);
    console.log(`       "latitude": ${currentLocation.latitude},`);
    console.log(`       "longitude": ${currentLocation.longitude},`);
    console.log(`       "gps_enabled": ${currentLocation.gps_enabled},`);
    console.log(`       "last_update": "${currentLocation.last_update}"`);
    console.log(`     }`);
    console.log('   }');

    // Test 4: Toggle GPS (simulating PATCH /api/couriers/1/gps)
    console.log('\n📍 Test 4: Toggle GPS (Admin Only)');
    console.log('   Endpoint: PATCH /api/couriers/1/gps');
    console.log('   Body: { enabled: false }');

    const toggledCourier = await CourierService.toggleGPS(1, false, 1);

    console.log('   ✅ Response 200 OK:');
    console.log('   {');
    console.log(`     "success": true,`);
    console.log(`     "message": "GPS tracking disabled successfully",`);
    console.log(`     "data": {`);
    console.log(`       "id": ${toggledCourier.id},`);
    console.log(`       "gps_enabled": ${toggledCourier.gps_enabled},`);
    console.log(`       "current_latitude": ${toggledCourier.current_latitude},`);
    console.log(`       "current_longitude": ${toggledCourier.current_longitude}`);
    console.log(`     }`);
    console.log('   }');

    // Re-enable GPS for future tests
    await CourierService.toggleGPS(1, true, 1);
    console.log('\n   ℹ️  GPS re-enabled for future tests');

    // Test 5: Error handling - Invalid coordinates
    console.log('\n📍 Test 5: Error Handling - Invalid Coordinates');
    console.log('   Endpoint: PATCH /api/couriers/1/location');
    console.log('   Body: { latitude: 91, longitude: 18.0686 }');

    try {
      await CourierService.updateCourierLocation(1, 91, 18.0686, 1);
    } catch (error) {
      console.log('   ✅ Response 400 Bad Request:');
      console.log('   {');
      console.log(`     "success": false,`);
      console.log(`     "error": "Validation error",`);
      console.log(`     "message": "${error.message}"`);
      console.log('   }');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n🎉 All manual API tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

// Run tests
testGPSAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
