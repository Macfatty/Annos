const pool = require("../db");

/**
 * Migration: Audit Logs System
 *
 * Creates the audit_logs table for tracking sensitive operations.
 * Essential for GDPR compliance and security auditing.
 *
 * Features:
 * - Tracks user actions (who, what, when, where)
 * - Stores action details in JSONB for flexibility
 * - IP address logging
 * - Efficient querying with indexes
 */

async function up() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Starting audit logs migration...');

    // Create audit_logs table
    console.log('📝 Creating audit_logs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for common queries
    console.log('⚡ Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON audit_logs(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs(action)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
      ON audit_logs(resource_type, resource_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON audit_logs(created_at DESC)
    `);

    // JSONB index for faster detail queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_details
      ON audit_logs USING gin(details)
    `);

    await client.query('COMMIT');
    console.log('✅ Audit logs migration completed successfully!');

    // Summary
    const count = await client.query('SELECT COUNT(*) FROM audit_logs');
    console.log(`\n📊 Summary:`);
    console.log(`   - audit_logs table created`);
    console.log(`   - 5 indexes created for performance`);
    console.log(`   - Current log count: ${count.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('⏪ Rolling back audit logs migration...');

    await client.query('DROP TABLE IF EXISTS audit_logs CASCADE');

    await client.query('COMMIT');
    console.log('✅ Rollback completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('\n✨ Migration script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
