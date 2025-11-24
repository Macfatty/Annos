const AuditService = require('./src/services/auditService');
const pool = require('./db');

/**
 * Test script for AuditService
 */

async function testAuditService() {
  console.log('🧪 Testing AuditService...\n');

  try {
    // Test 1: Log a simple action
    console.log('Test 1: Log a simple action');
    const log1 = await AuditService.log({
      userId: 1,
      action: 'auth:login',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test Browser',
      details: { method: 'email', success: true }
    });
    console.log('✅ Logged auth:login:', log1.id);
    console.log();

    // Test 2: Log an action with resource
    console.log('Test 2: Log action with resource');
    const log2 = await AuditService.log({
      userId: 1,
      action: 'user:delete',
      resourceType: 'user',
      resourceId: 999,
      ipAddress: '192.168.1.100',
      details: { reason: 'GDPR request', email: 'deleted@example.com' }
    });
    console.log('✅ Logged user:delete:', log2.id);
    console.log();

    // Test 3: Log multiple actions
    console.log('Test 3: Log multiple actions');
    await AuditService.log({
      userId: 1,
      action: 'order:create',
      resourceType: 'order',
      resourceId: 123,
      details: { total: 299, items: 3 }
    });
    await AuditService.log({
      userId: 1,
      action: 'order:update',
      resourceType: 'order',
      resourceId: 123,
      details: { status: 'received' }
    });
    await AuditService.log({
      userId: 1,
      action: 'menu:edit',
      resourceType: 'menu',
      resourceId: 5,
      details: { field: 'price', oldValue: 125, newValue: 135 }
    });
    console.log('✅ Logged 3 more actions');
    console.log();

    // Test 4: Get all logs
    console.log('Test 4: Get all logs');
    const allLogs = await AuditService.getLogs({ limit: 10 });
    console.log(`✅ Retrieved ${allLogs.length} logs`);
    console.log('   Latest log:', {
      action: allLogs[0].action,
      user_email: allLogs[0].user_email,
      resource: `${allLogs[0].resource_type}:${allLogs[0].resource_id}`
    });
    console.log();

    // Test 5: Get logs filtered by action
    console.log('Test 5: Get logs filtered by action');
    const loginLogs = await AuditService.getLogs({ action: 'auth:login' });
    console.log(`✅ Found ${loginLogs.length} auth:login logs`);
    console.log();

    // Test 6: Get logs filtered by user
    console.log('Test 6: Get logs filtered by user');
    const userLogs = await AuditService.getLogs({ userId: 1 });
    console.log(`✅ Found ${userLogs.length} logs for user 1`);
    console.log();

    // Test 7: Get logs filtered by resource
    console.log('Test 7: Get logs filtered by resource');
    const orderLogs = await AuditService.getLogs({
      resourceType: 'order',
      resourceId: 123
    });
    console.log(`✅ Found ${orderLogs.length} logs for order:123`);
    console.log();

    // Test 8: Get audit stats
    console.log('Test 8: Get audit statistics');
    const stats = await AuditService.getStats();
    console.log('✅ Statistics:', {
      total_logs: stats.total_logs,
      unique_users: stats.unique_users,
      unique_actions: stats.unique_actions
    });
    console.log('   Top actions:', stats.top_actions.map(a => `${a.action} (${a.count})`).join(', '));
    console.log();

    // Test 9: Get user activity
    console.log('Test 9: Get user activity');
    const activity = await AuditService.getUserActivity(1, 5);
    console.log(`✅ User 1 recent activity (${activity.length} actions):`);
    activity.forEach((act, i) => {
      console.log(`   ${i + 1}. ${act.action} - ${act.resource_type || 'N/A'}:${act.resource_id || 'N/A'}`);
    });
    console.log();

    console.log('🎉 All tests passed!\n');

    // Display sample logs
    console.log('📋 Sample audit logs:');
    const samples = await AuditService.getLogs({ limit: 3 });
    samples.forEach((log, i) => {
      console.log(`\n${i + 1}. [${log.created_at.toISOString()}]`);
      console.log(`   User: ${log.user_email} (${log.user_role})`);
      console.log(`   Action: ${log.action}`);
      if (log.resource_type) {
        console.log(`   Resource: ${log.resource_type}:${log.resource_id}`);
      }
      console.log(`   IP: ${log.ip_address || 'N/A'}`);
      if (log.details) {
        console.log(`   Details:`, log.details);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testAuditService()
    .then(() => {
      console.log('\n✨ Test script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAuditService };
