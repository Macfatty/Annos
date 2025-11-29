# 📋 PHASE 3 - UPDATED PLAN: Courier Management System

**Version:** 2.0 (Updated with improvements from analysis)
**Date:** 2025-11-26
**Status:** Ready for Implementation
**Branch:** `feature/phase3a-courier-core`

---

## 🎯 Overview

PHASE 3 implementerar ett komplett Courier Management System med profiler, kontrakt, och förbättrad order-hantering. Baserat på grundlig analys är planen uppdaterad för att:
- Undvika duplicerad kod
- Förenkla initial implementation
- Säkerställa backward compatibility
- Följa PHASE 1/2 patterns

---

## 📊 Changes from Original Plan

### ✅ **Improvements Added:**

1. **Refaktorering av befintlig kod först**
   - Flytta `hamtaKurirOrdrar()` → `OrderService.getCourierOrders()`
   - Flytta `tilldelaOrderTillKurir()` → `OrderService.assignCourierToOrder()`
   - Standardisera naming till engelska

2. **Förenklad courier_profiles tabell**
   - Börja med essentials (vehicle_type, is_available)
   - License och registration kan läggas till senare

3. **Förenklad courier_contracts tabell**
   - Börja med basic info (start_date, end_date, delivery_rate)
   - Insurance och emergency contact kan läggas till senare

4. **Database view för statistics**
   - Beräkna statistik i databasen istället för JavaScript
   - Bättre performance och enklare kod

5. **Split i PHASE 3A och PHASE 3B**
   - 3A: Core functionality (måste göras)
   - 3B: Extended features (kan vänta)

---

## 🔄 PHASE 3A: Core Implementation

**Estimat:** 5-6 timmar
**Mål:** Grundläggande courier management med backward compatibility

### Task 3A.1: Refaktorera Befintlig Courier-kod (1h)

**Mål:** Flytta befintlig courier-funktionalitet till OrderService

**Filer att ändra:**
- `backend/src/services/orderService.js`
- `backend/orderDB.js` (deprecate functions)
- `backend/migrateDatabase.js` (deprecate functions)
- `backend/server.js` (uppdatera anrop)

**Implementation:**

```javascript
// backend/src/services/orderService.js

class OrderService {
  // ... existing methods ...

  /**
   * Get orders for courier
   * Moved from hamtaKurirOrdrar() in orderDB.js
   */
  static async getCourierOrders(courierId) {
    const pending = await pool.query(
      `SELECT o.*, r.namn as restaurant_namn
       FROM orders o
       JOIN restaurants r ON o.restaurant_slug = r.slug
       WHERE o.status = 'ready' AND o.assigned_courier_id IS NULL
       ORDER BY o.created_at ASC`
    );

    const accepted = await pool.query(
      `SELECT o.*, r.namn as restaurant_namn
       FROM orders o
       JOIN restaurants r ON o.restaurant_slug = r.slug
       WHERE o.assigned_courier_id = $1 AND o.status IN ('out_for_delivery', 'ready')
       ORDER BY o.created_at ASC`,
      [courierId]
    );

    return {
      pending: pending.rows,
      accepted: accepted.rows
    };
  }

  /**
   * Assign order to courier
   * Moved from tilldelaOrderTillKurir() in migrateDatabase.js
   */
  static async assignCourierToOrder(orderId, courierId, assignedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update order
      const result = await client.query(
        `UPDATE orders
         SET assigned_courier_id = $1, status = 'out_for_delivery', updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [courierId, orderId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Audit log
      if (assignedBy) {
        await AuditService.log({
          userId: assignedBy,
          action: 'order:assign',
          resourceType: 'orders',
          resourceId: orderId,
          details: { courierId, status: 'out_for_delivery' }
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark order as delivered
   */
  static async markOrderAsDelivered(orderId, courierId, deliveredBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify courier owns this order
      const order = await client.query(
        'SELECT assigned_courier_id FROM orders WHERE id = $1',
        [orderId]
      );

      if (order.rows.length === 0) {
        throw new Error(`Order not found: ${orderId}`);
      }

      if (order.rows[0].assigned_courier_id !== courierId) {
        throw new Error('Courier does not own this order');
      }

      // Update order
      const result = await client.query(
        `UPDATE orders
         SET status = 'delivered', delivered_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [orderId]
      );

      // Audit log
      if (deliveredBy) {
        await AuditService.log({
          userId: deliveredBy,
          action: 'order:update',
          resourceType: 'orders',
          resourceId: orderId,
          details: { action: 'delivered', status: 'delivered' }
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

**Uppdatera server.js:**
```javascript
// backend/server.js

// Old (deprecate):
const { hamtaKurirOrdrar, tilldelaOrderTillKurir } = require('./orderDB');

// New:
const OrderService = require('./src/services/orderService');

// Update endpoints:
app.get("/api/courier/orders", verifyJWT, requirePermission('orders:view:own'), async (req, res) => {
  try {
    const orders = await OrderService.getCourierOrders(req.user.userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/courier/orders/:id/accept", verifyJWT, requirePermission('orders:update:status'), async (req, res) => {
  try {
    const order = await OrderService.assignCourierToOrder(
      parseInt(req.params.id),
      req.user.userId,
      req.user.userId
    );
    res.json({ message: "Order accepterad", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/courier/orders/:id/delivered", verifyJWT, requirePermission('orders:update:status'), async (req, res) => {
  try {
    const order = await OrderService.markOrderAsDelivered(
      parseInt(req.params.id),
      req.user.userId,
      req.user.userId
    );
    res.json({ message: "Order levererad", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Deprecate old functions:**
```javascript
// backend/orderDB.js

// Add deprecation warnings
function hamtaKurirOrdrar() {
  console.warn('DEPRECATED: Use OrderService.getCourierOrders() instead');
  // ... existing code for backward compatibility
}

function tilldelaOrderTillKurir() {
  console.warn('DEPRECATED: Use OrderService.assignCourierToOrder() instead');
  // ... existing code for backward compatibility
}
```

---

### Task 3A.2: Database Migration (1h)

**Mål:** Skapa courier_profiles, courier_contracts, och migrera befintliga couriers

**Fil:** `backend/migrations/004_courier_management.js`

```javascript
/**
 * PHASE 3A Migration: Courier Management System (Core)
 *
 * This migration adds courier profiles and contracts
 * BACKWARD COMPATIBLE: All changes are additive
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'macfatty',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting PHASE 3A Migration: Courier Management System\n');

    await client.query('BEGIN');

    // STEP 1: Create courier_profiles table
    console.log('📝 Step 1: Creating courier_profiles table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS courier_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vehicle_type VARCHAR(50) DEFAULT 'bike' CHECK (vehicle_type IN ('bike', 'car', 'scooter')),
        is_available BOOLEAN DEFAULT true,
        rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
        total_deliveries INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ courier_profiles table created');

    // STEP 2: Migrate existing courier users
    console.log('\n📝 Step 2: Migrating existing courier users...');

    const migrateResult = await client.query(`
      INSERT INTO courier_profiles (user_id, is_available, total_deliveries, created_at)
      SELECT
        u.id,
        true,
        COALESCE(COUNT(o.id), 0),
        COALESCE(MIN(o.created_at), NOW())
      FROM users u
      LEFT JOIN orders o ON o.assigned_courier_id = u.id AND o.status = 'delivered'
      WHERE u.role = 'courier'
      GROUP BY u.id
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    `);

    console.log(`✅ Migrated ${migrateResult.rows.length} existing courier users`);

    // STEP 3: Create courier_contracts table
    console.log('\n📝 Step 3: Creating courier_contracts table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS courier_contracts (
        id SERIAL PRIMARY KEY,
        courier_id INTEGER NOT NULL REFERENCES courier_profiles(id) ON DELETE CASCADE,
        contract_type VARCHAR(50) DEFAULT 'freelance' CHECK (contract_type IN ('employee', 'freelance')),
        start_date DATE NOT NULL,
        end_date DATE,
        delivery_rate INTEGER CHECK (delivery_rate >= 0),
        contract_pdf_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
      )
    `);

    console.log('✅ courier_contracts table created');

    // STEP 4: Create indexes
    console.log('\n📝 Step 4: Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_profiles_user_id
      ON courier_profiles(user_id);

      CREATE INDEX IF NOT EXISTS idx_courier_profiles_available
      ON courier_profiles(is_available) WHERE is_available = true;

      CREATE INDEX IF NOT EXISTS idx_courier_contracts_courier
      ON courier_contracts(courier_id, is_active);

      CREATE INDEX IF NOT EXISTS idx_courier_contracts_active
      ON courier_contracts(is_active) WHERE is_active = true;
    `);

    console.log('✅ Indexes created');

    // STEP 5: Create courier_statistics view
    console.log('\n📝 Step 5: Creating courier_statistics view...');

    await client.query(`
      CREATE OR REPLACE VIEW courier_statistics AS
      SELECT
        cp.id AS courier_id,
        cp.user_id,
        u.email AS courier_email,
        cp.vehicle_type,
        cp.is_available,
        cp.rating,
        cp.total_deliveries,
        COUNT(o.id) AS lifetime_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS completed_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'cancelled') AS cancelled_orders,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.created_at))) / 60, 2) AS avg_delivery_time_minutes,
        MAX(o.delivered_at) AS last_delivery_at
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN orders o ON o.assigned_courier_id = u.id
      GROUP BY cp.id, cp.user_id, u.email, cp.vehicle_type, cp.is_available, cp.rating, cp.total_deliveries
    `);

    console.log('✅ courier_statistics view created');

    // STEP 6: Add courier permissions (check if already exist from PHASE 1)
    console.log('\n📝 Step 6: Adding courier permissions...');

    const permCheck = await client.query(
      "SELECT COUNT(*) as count FROM permissions WHERE name LIKE 'courier:%'"
    );

    if (parseInt(permCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO permissions (name, description, category) VALUES
          ('courier:view:own', 'View own courier profile', 'courier'),
          ('courier:view:all', 'View all courier profiles', 'courier'),
          ('courier:manage', 'Manage courier profiles and contracts', 'courier')
      `);

      // Assign to courier role
      await client.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        SELECT 'courier', id FROM permissions WHERE name = 'courier:view:own'
        ON CONFLICT DO NOTHING
      `);

      // Assign to admin role
      await client.query(`
        INSERT INTO role_permissions (role_name, permission_id)
        SELECT 'admin', id FROM permissions WHERE name IN ('courier:view:all', 'courier:manage')
        ON CONFLICT DO NOTHING
      `);

      console.log('✅ Permissions added and assigned');
    } else {
      console.log('✅ Courier permissions already exist');
    }

    // STEP 7: Create trigger for updated_at
    console.log('\n📝 Step 7: Creating update timestamp trigger...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_courier_profile_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS courier_profiles_updated_at_trigger ON courier_profiles;

      CREATE TRIGGER courier_profiles_updated_at_trigger
      BEFORE UPDATE ON courier_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_courier_profile_timestamp();
    `);

    console.log('✅ Update timestamp trigger created');

    // STEP 8: Verify migration
    console.log('\n📝 Step 8: Verifying migration...');

    const verifyResult = await client.query(`
      SELECT
        COUNT(*) AS total_couriers,
        COUNT(*) FILTER (WHERE is_available = true) AS available_couriers,
        SUM(total_deliveries) AS total_deliveries
      FROM courier_profiles
    `);

    console.log('✅ Migration verified:');
    console.log(`   - Total couriers: ${verifyResult.rows[0].total_couriers}`);
    console.log(`   - Available: ${verifyResult.rows[0].available_couriers}`);
    console.log(`   - Total deliveries: ${verifyResult.rows[0].total_deliveries || 0}`);

    await client.query('COMMIT');

    console.log('\n🎉 PHASE 3A Migration completed successfully!\n');

    // Show created couriers
    const couriers = await client.query(`
      SELECT
        cp.id,
        u.email,
        cp.vehicle_type,
        cp.is_available,
        cp.total_deliveries
      FROM courier_profiles cp
      JOIN users u ON cp.user_id = u.id
      ORDER BY cp.created_at
    `);

    console.log('📊 Courier Profiles:');
    console.log('─'.repeat(80));
    couriers.rows.forEach(c => {
      console.log(`  ${c.is_available ? '✅' : '❌'} ${c.email.padEnd(30)} | ${c.vehicle_type.padEnd(10)} | ${c.total_deliveries} deliveries`);
    });
    console.log('─'.repeat(80));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = runMigration;
```

---

### Task 3A.3: CourierService (2h)

**Mål:** Skapa service layer för courier management

**Fil:** `backend/src/services/courierService.js`

```javascript
/**
 * CourierService - Business logic for courier management
 *
 * Follows PHASE 1/2 patterns:
 * - Static methods
 * - Transaction support
 * - Audit logging
 * - Error handling
 */

const pool = require('../../db');
const AuditService = require('./auditService');

class CourierService {
  /**
   * Get all courier profiles
   * Admin only - returns all couriers with stats
   */
  static async getAllCouriers(includeInactive = false) {
    const query = includeInactive
      ? 'SELECT * FROM courier_statistics ORDER BY courier_id'
      : 'SELECT * FROM courier_statistics WHERE is_available = true ORDER BY courier_id';

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get courier profile by user_id
   */
  static async getCourierByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM courier_statistics WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Courier profile not found for user: ${userId}`);
    }

    return result.rows[0];
  }

  /**
   * Get courier profile by courier_id
   */
  static async getCourierById(courierId) {
    const result = await pool.query(
      'SELECT * FROM courier_statistics WHERE courier_id = $1',
      [courierId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Courier not found: ${courierId}`);
    }

    return result.rows[0];
  }

  /**
   * Create courier profile
   * Usually called when a user is assigned courier role
   */
  static async createCourierProfile(userId, vehicleType = 'bike', createdBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if profile already exists
      const existing = await client.query(
        'SELECT id FROM courier_profiles WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length > 0) {
        throw new Error(`Courier profile already exists for user ${userId}`);
      }

      // Create profile
      const result = await client.query(
        `INSERT INTO courier_profiles (user_id, vehicle_type, is_available, total_deliveries)
         VALUES ($1, $2, true, 0)
         RETURNING *`,
        [userId, vehicleType]
      );

      // Audit log
      if (createdBy) {
        await AuditService.log({
          userId: createdBy,
          action: 'courier:create',
          resourceType: 'courier_profiles',
          resourceId: result.rows[0].id,
          details: { userId, vehicleType }
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update courier profile
   */
  static async updateCourierProfile(userId, updateData, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get courier_id
      const courierResult = await client.query(
        'SELECT id FROM courier_profiles WHERE user_id = $1',
        [userId]
      );

      if (courierResult.rows.length === 0) {
        throw new Error(`Courier profile not found for user: ${userId}`);
      }

      const courierId = courierResult.rows[0].id;

      // Build dynamic UPDATE query
      const allowedFields = ['vehicle_type', 'is_available', 'rating'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add user_id to values
      values.push(userId);

      // Execute update
      const result = await client.query(
        `UPDATE courier_profiles
         SET ${updates.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      // Audit log
      if (updatedBy) {
        await AuditService.log({
          userId: updatedBy,
          action: 'courier:update',
          resourceType: 'courier_profiles',
          resourceId: courierId,
          details: updateData
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle courier availability
   */
  static async toggleAvailability(userId, isAvailable, updatedBy = null) {
    return this.updateCourierProfile(userId, { is_available: isAvailable }, updatedBy);
  }

  /**
   * Increment delivery count
   * Called automatically when order is delivered
   */
  static async incrementDeliveryCount(userId) {
    await pool.query(
      `UPDATE courier_profiles
       SET total_deliveries = total_deliveries + 1
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Get courier contracts
   */
  static async getCourierContracts(courierId) {
    const result = await pool.query(
      `SELECT * FROM courier_contracts
       WHERE courier_id = $1
       ORDER BY created_at DESC`,
      [courierId]
    );

    return result.rows;
  }

  /**
   * Create courier contract
   */
  static async createCourierContract(contractData, createdBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate required fields
      if (!contractData.courier_id || !contractData.start_date) {
        throw new Error('courier_id and start_date are required');
      }

      // Check if courier exists
      const courierCheck = await client.query(
        'SELECT id FROM courier_profiles WHERE id = $1',
        [contractData.courier_id]
      );

      if (courierCheck.rows.length === 0) {
        throw new Error(`Courier not found: ${contractData.courier_id}`);
      }

      // Create contract
      const result = await client.query(
        `INSERT INTO courier_contracts
         (courier_id, contract_type, start_date, end_date, delivery_rate, contract_pdf_url, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING *`,
        [
          contractData.courier_id,
          contractData.contract_type || 'freelance',
          contractData.start_date,
          contractData.end_date || null,
          contractData.delivery_rate || null,
          contractData.contract_pdf_url || null,
          createdBy
        ]
      );

      // Audit log
      if (createdBy) {
        await AuditService.log({
          userId: createdBy,
          action: 'courier:contract:create',
          resourceType: 'courier_contracts',
          resourceId: result.rows[0].id,
          details: { courierId: contractData.courier_id }
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate courier contract
   */
  static async deactivateContract(contractId, deactivatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE courier_contracts
         SET is_active = false
         WHERE id = $1
         RETURNING *`,
        [contractId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      // Audit log
      if (deactivatedBy) {
        await AuditService.log({
          userId: deactivatedBy,
          action: 'courier:contract:deactivate',
          resourceType: 'courier_contracts',
          resourceId: contractId
        });
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get available couriers
   * For order assignment
   */
  static async getAvailableCouriers() {
    const result = await pool.query(
      `SELECT * FROM courier_statistics
       WHERE is_available = true
       ORDER BY total_deliveries ASC, rating DESC`
    );

    return result.rows;
  }

  /**
   * Get courier statistics
   */
  static async getCourierStats(courierId) {
    const result = await pool.query(
      'SELECT * FROM courier_statistics WHERE courier_id = $1',
      [courierId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Courier not found: ${courierId}`);
    }

    return result.rows[0];
  }

  /**
   * Get global courier statistics
   * Admin dashboard
   */
  static async getGlobalStats() {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_couriers,
        COUNT(*) FILTER (WHERE is_available = true) AS available_couriers,
        SUM(total_deliveries) AS total_deliveries,
        ROUND(AVG(rating), 2) AS avg_rating,
        ROUND(AVG(avg_delivery_time_minutes), 2) AS avg_delivery_time
      FROM courier_statistics
    `);

    return result.rows[0];
  }
}

module.exports = CourierService;
```

---

### Task 3A.4: CourierController (1h)

**Mål:** Skapa controller layer för HTTP request handling

**Fil:** `backend/src/controllers/courierController.js`

```javascript
/**
 * Courier Controller
 *
 * Handles HTTP requests for courier management
 * Follows PHASE 1/2 patterns for consistency
 */

const CourierService = require('../services/courierService');

/**
 * Get all couriers (Admin)
 */
async function getAllCouriers(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const couriers = await CourierService.getAllCouriers(includeInactive);

    res.json({
      success: true,
      data: couriers,
      count: couriers.length
    });
  } catch (error) {
    console.error('Error fetching couriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch couriers',
      message: error.message
    });
  }
}

/**
 * Get own courier profile
 */
async function getOwnProfile(req, res) {
  try {
    const courier = await CourierService.getCourierByUserId(req.user.userId);

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    console.error('Error fetching courier profile:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier profile not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier profile',
      message: error.message
    });
  }
}

/**
 * Get courier by ID (Admin)
 */
async function getCourierById(req, res) {
  try {
    const { id } = req.params;
    const courier = await CourierService.getCourierById(parseInt(id));

    res.json({
      success: true,
      data: courier
    });
  } catch (error) {
    console.error(`Error fetching courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch courier',
      message: error.message
    });
  }
}

/**
 * Update own courier profile
 */
async function updateOwnProfile(req, res) {
  try {
    const updateData = req.body;
    const courier = await CourierService.updateCourierProfile(
      req.user.userId,
      updateData,
      req.user.userId
    );

    res.json({
      success: true,
      data: courier,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating courier profile:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier profile not found',
        message: error.message
      });
    }

    if (error.message.includes('No valid fields')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: error.message
    });
  }
}

/**
 * Toggle courier availability
 */
async function toggleAvailability(req, res) {
  try {
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'is_available must be a boolean'
      });
    }

    const courier = await CourierService.toggleAvailability(
      req.user.userId,
      is_available,
      req.user.userId
    );

    res.json({
      success: true,
      data: courier,
      message: `Availability set to ${is_available ? 'available' : 'unavailable'}`
    });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle availability',
      message: error.message
    });
  }
}

/**
 * Get courier contracts
 */
async function getCourierContracts(req, res) {
  try {
    const { id } = req.params;
    const contracts = await CourierService.getCourierContracts(parseInt(id));

    res.json({
      success: true,
      data: contracts,
      count: contracts.length
    });
  } catch (error) {
    console.error(`Error fetching contracts for courier ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contracts',
      message: error.message
    });
  }
}

/**
 * Create courier contract (Admin)
 */
async function createCourierContract(req, res) {
  try {
    const contractData = req.body;
    const contract = await CourierService.createCourierContract(
      contractData,
      req.user.userId
    );

    res.status(201).json({
      success: true,
      data: contract,
      message: 'Contract created successfully'
    });
  } catch (error) {
    console.error('Error creating contract:', error);

    if (error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create contract',
      message: error.message
    });
  }
}

/**
 * Deactivate contract (Admin)
 */
async function deactivateContract(req, res) {
  try {
    const { contractId } = req.params;
    const contract = await CourierService.deactivateContract(
      parseInt(contractId),
      req.user.userId
    );

    res.json({
      success: true,
      data: contract,
      message: 'Contract deactivated successfully'
    });
  } catch (error) {
    console.error(`Error deactivating contract ${req.params.contractId}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to deactivate contract',
      message: error.message
    });
  }
}

/**
 * Get available couriers (Admin)
 */
async function getAvailableCouriers(req, res) {
  try {
    const couriers = await CourierService.getAvailableCouriers();

    res.json({
      success: true,
      data: couriers,
      count: couriers.length
    });
  } catch (error) {
    console.error('Error fetching available couriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available couriers',
      message: error.message
    });
  }
}

/**
 * Get courier statistics
 */
async function getCourierStats(req, res) {
  try {
    const { id } = req.params;
    const stats = await CourierService.getCourierStats(parseInt(id));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error(`Error fetching stats for courier ${req.params.id}:`, error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Courier not found',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
}

/**
 * Get global courier statistics (Admin)
 */
async function getGlobalStats(req, res) {
  try {
    const stats = await CourierService.getGlobalStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching global courier stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
}

module.exports = {
  getAllCouriers,
  getOwnProfile,
  getCourierById,
  updateOwnProfile,
  toggleAvailability,
  getCourierContracts,
  createCourierContract,
  deactivateContract,
  getAvailableCouriers,
  getCourierStats,
  getGlobalStats
};
```

---

### Task 3A.5: API Routes (1h)

**Mål:** Skapa RESTful routes för courier management

**Fil:** `backend/src/routes/couriers.js`

```javascript
/**
 * Courier Routes
 *
 * RESTful API endpoints for courier management
 * Follows PHASE 1 permission patterns
 */

const express = require('express');
const router = express.Router();
const courierController = require('../controllers/courierController');
const { verifyJWT } = require('../../authMiddleware');
const { requirePermission } = require('../middleware/requirePermission');

/**
 * Courier Profile Routes
 */

// GET /api/couriers/profile - Get own courier profile
router.get('/profile',
  verifyJWT,
  requirePermission('courier:view:own'),
  courierController.getOwnProfile
);

// PUT /api/couriers/profile - Update own courier profile
router.put('/profile',
  verifyJWT,
  requirePermission('courier:view:own'),
  courierController.updateOwnProfile
);

// POST /api/couriers/profile/availability - Toggle availability
router.post('/profile/availability',
  verifyJWT,
  requirePermission('courier:view:own'),
  courierController.toggleAvailability
);

/**
 * Admin Routes - All Couriers
 */

// GET /api/couriers - Get all couriers (Admin)
router.get('/',
  verifyJWT,
  requirePermission('courier:view:all'),
  courierController.getAllCouriers
);

// GET /api/couriers/available - Get available couriers (Admin)
router.get('/available',
  verifyJWT,
  requirePermission('courier:view:all'),
  courierController.getAvailableCouriers
);

// GET /api/couriers/stats - Get global courier statistics (Admin)
router.get('/stats',
  verifyJWT,
  requirePermission('courier:view:all'),
  courierController.getGlobalStats
);

// GET /api/couriers/:id - Get courier by ID (Admin)
router.get('/:id',
  verifyJWT,
  requirePermission('courier:view:all'),
  courierController.getCourierById
);

// GET /api/couriers/:id/stats - Get courier statistics
router.get('/:id/stats',
  verifyJWT,
  requirePermission('courier:view:all'),
  courierController.getCourierStats
);

/**
 * Contract Routes
 */

// GET /api/couriers/:id/contracts - Get courier contracts
router.get('/:id/contracts',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.getCourierContracts
);

// POST /api/couriers/:id/contracts - Create courier contract (Admin)
router.post('/:id/contracts',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.createCourierContract
);

// DELETE /api/couriers/contracts/:contractId - Deactivate contract (Admin)
router.delete('/contracts/:contractId',
  verifyJWT,
  requirePermission('courier:manage'),
  courierController.deactivateContract
);

module.exports = router;
```

---

### Task 3A.6: Integration i server.js (30 min)

**Mål:** Integrera nya routes i server.js

```javascript
// backend/server.js

// Add import
const courierRouter = require('./src/routes/couriers');

// Add route (efter restaurant router)
app.use("/api/couriers", courierRouter);
```

---

### Task 3A.7: Tests (1h)

**Mål:** Skapa test suite för PHASE 3A

**Fil:** `backend/test-courier-service.js`

```javascript
/**
 * PHASE 3A Test Suite - Courier Service
 *
 * Tests the CourierService functionality
 * Run: node test-courier-service.js
 */

const CourierService = require('./src/services/courierService');
const OrderService = require('./src/services/orderService');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function success(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
  passed++;
}

function fail(message, error) {
  console.log(`${RED}✗${RESET} ${message}`);
  if (error) console.log(`  ${RED}Error:${RESET} ${error.message}`);
  failed++;
}

function info(message) {
  console.log(`${BLUE}ℹ${RESET} ${message}`);
}

async function runTests() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  PHASE 3A Test Suite - Courier Service${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  try {
    // Test 1: Get all couriers
    info('Test 1: Get all couriers');
    try {
      const couriers = await CourierService.getAllCouriers();
      if (Array.isArray(couriers)) {
        success('getAllCouriers() returns array');
        info(`  Found ${couriers.length} couriers`);
      } else {
        fail('getAllCouriers() did not return array');
      }
    } catch (error) {
      fail('getAllCouriers() threw error', error);
    }

    // Test 2: Database tables exist
    info('\nTest 2: Check database tables');
    try {
      const pool = require('./db');

      const profilesCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'courier_profiles'
        );
      `);

      const contractsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'courier_contracts'
        );
      `);

      const viewCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views
          WHERE table_name = 'courier_statistics'
        );
      `);

      if (profilesCheck.rows[0].exists) {
        success('courier_profiles table exists');
      } else {
        fail('courier_profiles table does not exist');
      }

      if (contractsCheck.rows[0].exists) {
        success('courier_contracts table exists');
      } else {
        fail('courier_contracts table does not exist');
      }

      if (viewCheck.rows[0].exists) {
        success('courier_statistics view exists');
      } else {
        fail('courier_statistics view does not exist');
      }
    } catch (error) {
      fail('Database check failed', error);
    }

    // Test 3: Permissions exist
    info('\nTest 3: Check courier permissions');
    try {
      const pool = require('./db');
      const result = await pool.query(`
        SELECT name FROM permissions
        WHERE name LIKE 'courier:%'
        ORDER BY name
      `);

      const expectedPerms = ['courier:manage', 'courier:view:all', 'courier:view:own'];
      const actualPerms = result.rows.map(r => r.name);

      const allExist = expectedPerms.every(p => actualPerms.includes(p));

      if (allExist) {
        success(`All courier permissions exist (${actualPerms.length})`);
      } else {
        fail('Some courier permissions are missing');
      }
    } catch (error) {
      fail('Permission check failed', error);
    }

    // Test 4: Get available couriers
    info('\nTest 4: Get available couriers');
    try {
      const available = await CourierService.getAvailableCouriers();
      if (Array.isArray(available)) {
        success('getAvailableCouriers() returns array');
        info(`  Found ${available.length} available couriers`);
      } else {
        fail('getAvailableCouriers() did not return array');
      }
    } catch (error) {
      fail('getAvailableCouriers() threw error', error);
    }

    // Test 5: Get global stats
    info('\nTest 5: Get global courier statistics');
    try {
      const stats = await CourierService.getGlobalStats();
      if (stats && typeof stats.total_couriers === 'string') {
        success('getGlobalStats() returns statistics');
        info(`  Total couriers: ${stats.total_couriers}`);
        info(`  Available: ${stats.available_couriers}`);
        info(`  Total deliveries: ${stats.total_deliveries || 0}`);
      } else {
        fail('getGlobalStats() returned unexpected data');
      }
    } catch (error) {
      fail('getGlobalStats() threw error', error);
    }

    // Test 6: OrderService methods exist
    info('\nTest 6: Check OrderService courier methods');
    try {
      if (typeof OrderService.getCourierOrders === 'function') {
        success('OrderService.getCourierOrders() exists');
      } else {
        fail('OrderService.getCourierOrders() does not exist');
      }

      if (typeof OrderService.assignCourierToOrder === 'function') {
        success('OrderService.assignCourierToOrder() exists');
      } else {
        fail('OrderService.assignCourierToOrder() does not exist');
      }

      if (typeof OrderService.markOrderAsDelivered === 'function') {
        success('OrderService.markOrderAsDelivered() exists');
      } else {
        fail('OrderService.markOrderAsDelivered() does not exist');
      }
    } catch (error) {
      fail('OrderService method check failed', error);
    }

    // Test 7: Indexes exist
    info('\nTest 7: Check database indexes');
    try {
      const pool = require('./db');
      const result = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename IN ('courier_profiles', 'courier_contracts')
        ORDER BY indexname
      `);

      const indexes = result.rows.map(r => r.indexname);
      const expectedIndexes = [
        'idx_courier_profiles_user_id',
        'idx_courier_profiles_available',
        'idx_courier_contracts_courier',
        'idx_courier_contracts_active'
      ];

      const allExist = expectedIndexes.every(idx =>
        indexes.some(i => i === idx)
      );

      if (allExist) {
        success(`All courier indexes exist (${indexes.length} total)`);
      } else {
        fail('Some courier indexes are missing');
      }
    } catch (error) {
      fail('Index check failed', error);
    }

  } catch (error) {
    console.error(`\n${RED}Unexpected error during tests:${RESET}`, error);
  }

  // Summary
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Test Results${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}Passed:${RESET} ${passed}`);
  console.log(`${RED}Failed:${RESET} ${failed}`);
  console.log(`${BLUE}Total:${RESET}  ${passed + failed}`);

  if (failed === 0) {
    console.log(`\n${GREEN}✓ All tests passed!${RESET}\n`);
  } else {
    console.log(`\n${RED}✗ Some tests failed${RESET}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
```

---

## 🔄 PHASE 3B: Extended Features (För senare)

**Estimat:** 3-4 timmar
**Kan väntas** till efter PHASE 3A är i produktion

### Features i PHASE 3B:

1. **Admin UI för courier management**
   - Lista alla couriers med stats
   - Edit courier profiles
   - Manage contracts

2. **Courier Dashboard**
   - View own statistics
   - Order history
   - Earnings calculator

3. **Rating System**
   - Customer feedback integration
   - Automatic rating calculation
   - Rating display

4. **Advanced Contract Features**
   - Insurance info
   - Emergency contact
   - Contract document upload
   - E-signature integration

5. **Vehicle Management**
   - License verification
   - Vehicle registration
   - Insurance documents

---

## ✅ Implementation Checklist

**BEFORE Starting:**
- [ ] Läs denna plan noggrant
- [ ] Backup databas
- [ ] Skapa feature branch `feature/phase3a-courier-core`

**During Implementation:**
- [ ] Task 3A.1: Refaktorera befintlig courier-kod
- [ ] Task 3A.2: Kör migration
- [ ] Task 3A.3: Skapa CourierService
- [ ] Task 3A.4: Skapa CourierController
- [ ] Task 3A.5: Skapa API routes
- [ ] Task 3A.6: Integrera i server.js
- [ ] Task 3A.7: Kör tester

**After Implementation:**
- [ ] Testa backward compatibility
- [ ] Verifiera att befintliga courier-users kan logga in
- [ ] Verifiera att courier kan se sina orders
- [ ] Skapa PHASE3A_COMPLETE_SUMMARY.md
- [ ] Commit och push

---

## 🎯 Success Criteria

**PHASE 3A är klar när:**

1. ✅ Alla 7 tasks är implementerade
2. ✅ Migration körd framgångsrikt
3. ✅ Alla tester passerar (7/7)
4. ✅ Befintliga courier-users har profiles
5. ✅ Backward compatibility verifierad:
   - Courier kan logga in
   - Courier kan se orders
   - Courier kan acceptera orders
   - Courier kan leverera orders
6. ✅ Nya endpoints fungerar:
   - GET /api/couriers (Admin)
   - GET /api/couriers/profile (Courier)
   - PUT /api/couriers/profile (Courier)
   - POST /api/couriers/profile/availability (Courier)
7. ✅ Audit logging fungerar för nya actions
8. ✅ Permissions fungerar korrekt
9. ✅ Dokumentation skapad

---

## 🚨 Risk Mitigation

### Risk 1: Migration bryter befintlig courier-funktionalitet

**Mitigation:**
- Migration skapar auto profiles för alla courier-users
- Befintliga endpoints uppdateras men bevarar backward compatibility
- Rollback-plan finns tillgänglig

### Risk 2: Performance problem med statistics view

**Mitigation:**
- View använder indexes för snabba queries
- Statistics cachas i frontend
- Kan lägga till materialized view senare om behövs

### Risk 3: Duplicerad kod mellan gamla och nya funktioner

**Mitigation:**
- Task 3A.1 refaktorerar befintlig kod FÖRST
- Gamla funktioner får deprecation warnings
- Plan finns för att ta bort gamla funktioner efter PHASE 3A

---

## 📊 Estimated Timeline

| Task | Time | Dependencies |
|------|------|--------------|
| 3A.1: Refactor existing code | 1h | None |
| 3A.2: Database migration | 1h | 3A.1 |
| 3A.3: CourierService | 2h | 3A.2 |
| 3A.4: CourierController | 1h | 3A.3 |
| 3A.5: API Routes | 1h | 3A.4 |
| 3A.6: Server integration | 30min | 3A.5 |
| 3A.7: Tests | 1h | All above |
| **Total** | **7.5h** | |

---

## 🔗 Related Documentation

- **PHASE 1 Complete:** `backend/PHASE1_COMPLETE_SUMMARY.md`
- **PHASE 2 Complete:** `backend/PHASE2_COMPLETE_SUMMARY.md`
- **PHASE 3 Analysis:** Task output from Explore agent
- **Implementation Roadmap:** `.claude/IMPLEMENTATION_ROADMAP.md`

---

## ✅ Approval & Sign-off

**Status:** ⏳ **WAITING FOR APPROVAL**

**Väntar på godkännande innan implementation börjar.**

När planen är godkänd, fortsätt med Task 3A.1.

---

**Created:** 2025-11-26
**Version:** 2.0 (Updated Plan)
**Ready for:** Implementation
