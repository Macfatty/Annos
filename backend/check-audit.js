// Quick audit log check using the same connection as the running server
const AuditService = require('./src/services/auditService');

async function check() {
  try {
    const logs = await AuditService.getLogs({ limit: 10 });

    console.log('\n📋 SENASTE 10 AUDIT LOGS:\n');
    console.log('='.repeat(100));

    if (logs.length === 0) {
      console.log('Inga audit logs finns än. Loggar skapas när du:');
      console.log('  - Loggar ut (auth:logout)');
      console.log('  - Skapar beställningar (order:create)');
      console.log('  - Uppdaterar orderstatus (order:update)');
      console.log('  - Uppdaterar profil (user:update)');
    } else {
      logs.forEach((log, i) => {
        console.log(`\n${i+1}. [${log.created_at}]`);
        console.log(`   User: ${log.user_id || 'N/A'}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Resource: ${log.resource_type || 'N/A'} #${log.resource_id || 'N/A'}`);
        console.log(`   IP: ${log.ip_address || 'N/A'}`);
        if (log.details) {
          console.log(`   Details:`, log.details);
        }
        console.log('-'.repeat(100));
      });
    }

    // Stats
    const stats = await AuditService.getStats();
    console.log('\n📊 STATISTIK:\n');
    console.log(`   Totalt antal logs: ${stats.total_logs}`);
    console.log(`   Unika användare: ${stats.unique_users}`);
    console.log(`   Unika actions: ${stats.unique_actions}`);

    if (stats.top_actions && stats.top_actions.length > 0) {
      console.log('\n   Top actions:');
      stats.top_actions.forEach(a => {
        console.log(`     - ${a.action}: ${a.count}x`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

check();
