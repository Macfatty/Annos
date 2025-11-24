const pool = require("../db");

/**
 * Migration: Permission System Foundation
 *
 * Creates the permissions and role_permissions tables for granular access control.
 * This migration is 100% backward compatible - it only adds new tables.
 *
 * Features:
 * - Permission-based authorization (not just roles)
 * - Granular permissions (orders:view:all, orders:view:own)
 * - Role-permission mapping
 * - Performance-optimized with indexes
 */

async function up() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Starting permissions system migration...');

    // 1. Create permissions table
    console.log('📝 Creating permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Create role_permissions mapping table
    console.log('📝 Creating role_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_name, permission_id)
      )
    `);

    // 3. Create indexes for performance
    console.log('⚡ Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role
      ON role_permissions(role_name)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_permissions_category
      ON permissions(category)
    `);

    // 4. Seed initial permissions
    console.log('🌱 Seeding initial permissions...');

    // Order permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('orders:view:all', 'View all orders across restaurants', 'orders'),
        ('orders:view:own', 'View only own restaurant/courier orders', 'orders'),
        ('orders:create', 'Create new orders', 'orders'),
        ('orders:update:status', 'Update order status', 'orders'),
        ('orders:cancel', 'Cancel orders', 'orders')
      ON CONFLICT (name) DO NOTHING
    `);

    // Menu permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('menu:view', 'View restaurant menu', 'menu'),
        ('menu:edit', 'Edit restaurant menu', 'menu'),
        ('menu:create', 'Create menu items', 'menu')
      ON CONFLICT (name) DO NOTHING
    `);

    // User permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('users:view', 'View user list', 'users'),
        ('users:manage', 'Manage user accounts and roles', 'users'),
        ('users:delete', 'Delete user accounts', 'users')
      ON CONFLICT (name) DO NOTHING
    `);

    // Restaurant permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('restaurant:view:all', 'View all restaurants', 'restaurant'),
        ('restaurant:view:own', 'View own restaurant', 'restaurant'),
        ('restaurant:manage', 'Manage restaurant settings', 'restaurant')
      ON CONFLICT (name) DO NOTHING
    `);

    // Courier permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('courier:view:all', 'View all couriers', 'courier'),
        ('courier:view:own', 'View own courier profile', 'courier'),
        ('courier:manage', 'Manage courier assignments', 'courier')
      ON CONFLICT (name) DO NOTHING
    `);

    // Support permissions
    await client.query(`
      INSERT INTO permissions (name, description, category) VALUES
        ('support:view', 'View support tickets', 'support'),
        ('support:create', 'Create support tickets', 'support'),
        ('support:manage', 'Manage and respond to support tickets', 'support')
      ON CONFLICT (name) DO NOTHING
    `);

    // 5. Map permissions to roles
    console.log('🔗 Mapping permissions to roles...');

    // Get permission IDs
    const permissionIds = await client.query(`
      SELECT id, name FROM permissions
    `);

    const permMap = {};
    permissionIds.rows.forEach(row => {
      permMap[row.name] = row.id;
    });

    // Admin: All permissions (full access)
    console.log('  👑 Admin role...');
    const adminPermissions = Object.values(permMap);
    for (const permId of adminPermissions) {
      await client.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        VALUES ('admin', $1)
        ON CONFLICT (role_name, permission_id) DO NOTHING
      `, [permId]);
    }

    // Restaurant: Own restaurant orders and menu management
    console.log('  🍕 Restaurant role...');
    const restaurantPermissions = [
      'orders:view:own',
      'orders:update:status',
      'menu:view',
      'menu:edit',
      'menu:create',
      'restaurant:view:own',
      'support:view',
      'support:create'
    ];
    for (const permName of restaurantPermissions) {
      if (permMap[permName]) {
        await client.query(`
          INSERT INTO role_permissions (role_name, permission_id)
          VALUES ('restaurant', $1)
          ON CONFLICT (role_name, permission_id) DO NOTHING
        `, [permMap[permName]]);
      }
    }

    // Courier: Own courier orders
    console.log('  🚴 Courier role...');
    const courierPermissions = [
      'orders:view:own',
      'orders:update:status',
      'courier:view:own',
      'support:view',
      'support:create'
    ];
    for (const permName of courierPermissions) {
      if (permMap[permName]) {
        await client.query(`
          INSERT INTO role_permissions (role_name, permission_id)
          VALUES ('courier', $1)
          ON CONFLICT (role_name, permission_id) DO NOTHING
        `, [permMap[permName]]);
      }
    }

    // Customer: Create orders, view own orders
    console.log('  👤 Customer role...');
    const customerPermissions = [
      'orders:create',
      'orders:view:own',
      'orders:cancel',
      'menu:view',
      'support:view',
      'support:create'
    ];
    for (const permName of customerPermissions) {
      if (permMap[permName]) {
        await client.query(`
          INSERT INTO role_permissions (role_name, permission_id)
          VALUES ('customer', $1)
          ON CONFLICT (role_name, permission_id) DO NOTHING
        `, [permMap[permName]]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Permissions system migration completed successfully!');

    // Summary
    const permCount = await client.query('SELECT COUNT(*) FROM permissions');
    const rolePermCount = await client.query('SELECT COUNT(*) FROM role_permissions');
    console.log(`\n📊 Summary:`);
    console.log(`   - Permissions created: ${permCount.rows[0].count}`);
    console.log(`   - Role-permission mappings: ${rolePermCount.rows[0].count}`);
    console.log(`   - Roles configured: admin, restaurant, courier, customer`);

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

    console.log('⏪ Rolling back permissions system migration...');

    await client.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await client.query('DROP TABLE IF EXISTS permissions CASCADE');

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
