/**
 * Simple script to view audit logs
 * Run with: node view-audit-logs.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'asha',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

async function viewAuditLogs() {
  try {
    console.log('\n📋 AUDIT LOGS - Senaste 20 händelserna:\n');
    console.log('=' .repeat(120));

    const result = await pool.query(`
      SELECT
        id,
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        ip_address,
        created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (result.rows.length === 0) {
      console.log('Inga audit logs hittades än.');
      return;
    }

    result.rows.forEach((log, index) => {
      console.log(`\n${index + 1}. [${log.created_at.toISOString()}]`);
      console.log(`   User ID: ${log.user_id || 'N/A'}`);
      console.log(`   Action: ${log.action}`);
      console.log(`   Resource: ${log.resource_type || 'N/A'} #${log.resource_id || 'N/A'}`);
      console.log(`   IP: ${log.ip_address || 'N/A'}`);
      if (log.details) {
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
      }
      console.log('-'.repeat(120));
    });

    console.log(`\n✅ Totalt ${result.rows.length} audit logs visade\n`);

    // Statistics
    const statsResult = await pool.query(`
      SELECT
        action,
        COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
    `);

    console.log('\n📊 Statistik per action:\n');
    statsResult.rows.forEach(stat => {
      console.log(`   ${stat.action}: ${stat.count} gånger`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

viewAuditLogs();
