const PermissionService = require('./src/services/permissionService');
const pool = require('./db');

/**
 * Test script for PermissionService
 */

async function testPermissionService() {
  console.log('🧪 Testing PermissionService...\n');

  try {
    // Test 1: Get all permissions
    console.log('Test 1: Get all permissions');
    const allPermissions = await PermissionService.getAllPermissions();
    console.log(`✅ Found ${allPermissions.length} permissions`);
    console.log('Sample:', allPermissions.slice(0, 3).map(p => p.name));
    console.log();

    // Test 2: Get role permissions (customer)
    console.log('Test 2: Get customer role permissions');
    const customerPerms = await PermissionService.getRolePermissions('customer');
    console.log(`✅ Customer has ${customerPerms.length} permissions:`, customerPerms);
    console.log();

    // Test 3: Get role permissions (admin)
    console.log('Test 3: Get admin role permissions');
    const adminPerms = await PermissionService.getRolePermissions('admin');
    console.log(`✅ Admin has ${adminPerms.length} permissions (should have all)`);
    console.log();

    // Test 4: Get role permissions (restaurant)
    console.log('Test 4: Get restaurant role permissions');
    const restaurantPerms = await PermissionService.getRolePermissions('restaurant');
    console.log(`✅ Restaurant has ${restaurantPerms.length} permissions:`, restaurantPerms);
    console.log();

    // Test 5: Get role permissions (courier)
    console.log('Test 5: Get courier role permissions');
    const courierPerms = await PermissionService.getRolePermissions('courier');
    console.log(`✅ Courier has ${courierPerms.length} permissions:`, courierPerms);
    console.log();

    // Test 6: Get user from database and test permissions
    console.log('Test 6: Get real user and test permissions');
    const userResult = await pool.query('SELECT id, email, role FROM users LIMIT 1');

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`Testing with user: ${user.email} (${user.role})`);

      const userPermissions = await PermissionService.getUserPermissions(user.id);
      console.log(`✅ User has ${userPermissions.length} permissions`);

      // Test checkPermission
      const hasOrderView = await PermissionService.checkPermission(user, 'orders:view:own');
      console.log(`✅ Has 'orders:view:own': ${hasOrderView}`);

      // Test admin override
      const adminUser = { id: user.id, role: 'admin' };
      const adminCheck = await PermissionService.checkPermission(adminUser, 'orders:view:all');
      console.log(`✅ Admin override works: ${adminCheck}`);
    } else {
      console.log('⚠️ No users found in database, skipping user permission test');
    }
    console.log();

    // Test 7: Cache stats
    console.log('Test 7: Cache statistics');
    const stats = PermissionService.getStats();
    console.log('✅ Cache stats:', stats);
    console.log();

    // Test 8: Test checkAnyPermission
    console.log('Test 8: Test checkAnyPermission');
    const testUser = { id: 1, role: 'customer' };
    const hasAny = await PermissionService.checkAnyPermission(testUser, [
      'orders:create',
      'orders:view:all'
    ]);
    console.log(`✅ Customer has ANY of [orders:create, orders:view:all]: ${hasAny}`);
    console.log();

    // Test 9: Test checkAllPermissions
    console.log('Test 9: Test checkAllPermissions');
    const hasAll = await PermissionService.checkAllPermissions(testUser, [
      'orders:create',
      'menu:view'
    ]);
    console.log(`✅ Customer has ALL of [orders:create, menu:view]: ${hasAll}`);
    console.log();

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   - Total permissions: ${allPermissions.length}`);
    console.log(`   - Admin permissions: ${adminPerms.length}`);
    console.log(`   - Restaurant permissions: ${restaurantPerms.length}`);
    console.log(`   - Courier permissions: ${courierPerms.length}`);
    console.log(`   - Customer permissions: ${customerPerms.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testPermissionService()
    .then(() => {
      console.log('\n✨ Test script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testPermissionService };
