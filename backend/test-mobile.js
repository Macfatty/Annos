/**
 * PHASE 3B.5: Mobile App Integration Test Suite
 *
 * Tests for WebSocket, Push Notifications, and Mobile API
 */

require('dotenv').config();
const assert = require('assert');

// Services
const pushService = require('./src/services/pushNotificationService');
const realtimeService = require('./src/services/realtimeEventService');

console.log('🧪 PHASE 3B.5: Mobile App Integration Tests\n');
console.log('================================================\n');

let passed = 0;
let failed = 0;

async function runTests() {
  try {
    // Initialize services
    await realtimeService.initialize();

    // TEST 1: Push Notification Service - Register Device
    console.log('TEST 1: Register device for push notifications');
    try {
      const result = pushService.registerDevice(1, 'test_token_123', 'android');
      assert(result.success === true, 'Device registration should succeed');
      assert(result.userId === 1, 'User ID should match');
      assert(result.platform === 'android', 'Platform should be android');
      console.log('  ✅ TEST 1: Device registered successfully');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 1 FAILED:', error.message);
      failed++;
    }

    // TEST 2: Push Notification Service - Invalid Platform
    console.log('\nTEST 2: Register device with invalid platform');
    try {
      pushService.registerDevice(2, 'test_token_456', 'windows');
      console.error('  ❌ TEST 2 FAILED: Should have thrown error');
      failed++;
    } catch (error) {
      if (error.message.includes('Invalid platform')) {
        console.log('  ✅ TEST 2: Invalid platform correctly rejected');
        passed++;
      } else {
        console.error('  ❌ TEST 2 FAILED:', error.message);
        failed++;
      }
    }

    // TEST 3: Push Notification Service - Send Notification
    console.log('\nTEST 3: Send push notification');
    try {
      const result = await pushService.sendToUser(1, {
        title: 'Test Notification',
        body: 'This is a test',
        data: { type: 'test' }
      });
      assert(result.success === true, 'Notification should be sent');
      assert(result.mode === 'mock', 'Should be in mock mode');
      console.log('  ✅ TEST 3: Notification sent successfully');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 3 FAILED:', error.message);
      failed++;
    }

    // TEST 4: Push Notification Service - Send to Unregistered User
    console.log('\nTEST 4: Send notification to unregistered user');
    try {
      const result = await pushService.sendToUser(999, {
        title: 'Test',
        body: 'Test'
      });
      assert(result.success === false, 'Should fail for unregistered user');
      console.log('  ✅ TEST 4: Correctly handled unregistered user');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 4 FAILED:', error.message);
      failed++;
    }

    // TEST 5: Push Notification Service - Send to Multiple Users
    console.log('\nTEST 5: Send notification to multiple users');
    try {
      // Register another device
      pushService.registerDevice(2, 'test_token_789', 'ios');

      const result = await pushService.sendToMultiple([1, 2, 999], {
        title: 'Batch Test',
        body: 'Batch notification'
      });
      assert(result.total === 3, 'Total should be 3');
      assert(result.successful === 2, 'Should succeed for 2 users');
      assert(result.failed === 1, 'Should fail for 1 user');
      console.log('  ✅ TEST 5: Batch notification sent correctly');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 5 FAILED:', error.message);
      failed++;
    }

    // TEST 6: Push Notification Service - Order Status Notification
    console.log('\nTEST 6: Send order status notification');
    try {
      const result = await pushService.notifyOrderStatus(1, 123, 'in_transit', 'Your order is on the way!');
      assert(result.success === true, 'Order status notification should succeed');
      console.log('  ✅ TEST 6: Order status notification sent');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 6 FAILED:', error.message);
      failed++;
    }

    // TEST 7: Push Notification Service - Courier Assignment Notification
    console.log('\nTEST 7: Send courier assignment notification');
    try {
      const result = await pushService.notifyCourierOrderAssigned(2, 123, {
        restaurant: 'test-restaurant',
        items: 3
      });
      assert(result.success === true, 'Courier assignment notification should succeed');
      console.log('  ✅ TEST 7: Courier assignment notification sent');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 7 FAILED:', error.message);
      failed++;
    }

    // TEST 8: Push Notification Service - Get History
    console.log('\nTEST 8: Get notification history');
    try {
      const history = pushService.getHistory(10);
      assert(Array.isArray(history), 'History should be an array');
      assert(history.length > 0, 'History should contain notifications');
      console.log(`  ✅ TEST 8: Retrieved ${history.length} notifications from history`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 8 FAILED:', error.message);
      failed++;
    }

    // TEST 9: Push Notification Service - Get Device Count
    console.log('\nTEST 9: Get registered device count');
    try {
      const count = pushService.getDeviceCount();
      assert(count === 2, 'Should have 2 registered devices');
      console.log(`  ✅ TEST 9: Device count: ${count}`);
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 9 FAILED:', error.message);
      failed++;
    }

    // TEST 10: Push Notification Service - Get All Devices
    console.log('\nTEST 10: Get all registered devices');
    try {
      const devices = pushService.getAllDevices();
      assert(Array.isArray(devices), 'Devices should be an array');
      assert(devices.length === 2, 'Should have 2 devices');
      assert(devices.some(d => d.platform === 'android'), 'Should have android device');
      assert(devices.some(d => d.platform === 'ios'), 'Should have ios device');
      console.log('  ✅ TEST 10: Retrieved all devices');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 10 FAILED:', error.message);
      failed++;
    }

    // TEST 11: Push Notification Service - Unregister Device
    console.log('\nTEST 11: Unregister device');
    try {
      const result = pushService.unregisterDevice(1);
      assert(result.success === true, 'Unregister should succeed');
      const count = pushService.getDeviceCount();
      assert(count === 1, 'Should have 1 device after unregistering');
      console.log('  ✅ TEST 11: Device unregistered successfully');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 11 FAILED:', error.message);
      failed++;
    }

    // TEST 12: Real-time Event Service - Get Statistics
    console.log('\nTEST 12: Get real-time statistics');
    try {
      const stats = realtimeService.getStatistics();
      assert(stats.websocket !== undefined, 'Should have WebSocket stats');
      assert(stats.pushNotifications !== undefined, 'Should have push notification stats');
      assert(stats.pushNotifications.mode === 'mock', 'Should be in mock mode');
      console.log('  ✅ TEST 12: Retrieved real-time statistics');
      passed++;
    } catch (error) {
      console.error('  ❌ TEST 12 FAILED:', error.message);
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

    if (failed > 0) {
      console.log('⚠️  Some tests failed. Note: WebSocket tests require server running.\n');
    }

    return { passed, failed };

  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    throw error;
  }
}

async function main() {
  try {
    const results = await runTests();

    if (results.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();
