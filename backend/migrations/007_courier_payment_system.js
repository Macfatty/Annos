/**
 * PHASE 3B.4: Courier Payment System Migration
 *
 * Creates tables and functions for managing courier payments and invoices
 *
 * Tables:
 * - courier_payments: Track payment calculations and status for courier work periods
 * - invoices: Store generated invoices for payments
 *
 * Features:
 * - Payment calculation and tracking
 * - Commission calculations (15% platform fee)
 * - Invoice generation
 * - Payment status workflow (pending → approved → paid)
 * - Audit trail with timestamps
 */

exports.up = async (client) => {
  console.log('Running migration 007: Courier Payment System...');

  await client.query('BEGIN');

  try {
    // ============================================
    // TABLE: courier_payments
    // ============================================
    // Tracks payment calculations for courier work periods
    await client.query(`
      CREATE TABLE IF NOT EXISTS courier_payments (
        id SERIAL PRIMARY KEY,
        courier_id INTEGER NOT NULL REFERENCES courier_profiles(id) ON DELETE CASCADE,

        -- Payment period
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,

        -- Delivery statistics for this period
        total_deliveries INTEGER NOT NULL DEFAULT 0,
        completed_deliveries INTEGER NOT NULL DEFAULT 0,

        -- Financial calculations (in SEK)
        base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Total before commission
        commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.00,  -- Platform commission %
        commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Commission in SEK
        net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,  -- Amount to pay courier

        -- Payment details
        payment_method VARCHAR(50),  -- 'swish', 'bank_transfer', 'stripe', etc.
        payment_reference VARCHAR(255),  -- External payment ID/reference
        payment_notes TEXT,

        -- Status workflow: pending → approved → paid (or rejected)
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        -- Status values: 'pending', 'approved', 'paid', 'rejected', 'failed'

        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        paid_at TIMESTAMP,
        rejected_at TIMESTAMP,

        -- Audit fields
        approved_by INTEGER REFERENCES users(id),  -- Admin who approved
        rejected_by INTEGER REFERENCES users(id),  -- Admin who rejected
        rejection_reason TEXT,

        -- Constraints
        CONSTRAINT valid_period CHECK (period_end > period_start),
        CONSTRAINT valid_deliveries CHECK (completed_deliveries <= total_deliveries),
        CONSTRAINT valid_amounts CHECK (
          base_amount >= 0 AND
          commission_amount >= 0 AND
          net_amount >= 0 AND
          commission_percentage >= 0 AND
          commission_percentage <= 100
        ),
        CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'failed'))
      );
    `);

    console.log('  ✓ Created table: courier_payments');

    // ============================================
    // TABLE: invoices
    // ============================================
    // Stores generated invoices for payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES courier_payments(id) ON DELETE CASCADE,
        courier_id INTEGER NOT NULL REFERENCES courier_profiles(id) ON DELETE CASCADE,

        -- Invoice identification
        invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "INV-2025-001234"
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,

        -- Invoice details (JSON for flexibility)
        invoice_data JSONB NOT NULL,
        -- Structure: {
        --   courier: { name, email, phone, address },
        --   company: { name, address, org_number, vat },
        --   period: { start, end },
        --   lineItems: [{ description, quantity, rate, amount }],
        --   totals: { subtotal, commission, net, vat, total },
        --   notes: "Payment terms and notes"
        -- }

        -- File information (for future PDF generation)
        file_path VARCHAR(500),  -- Path to generated PDF (if any)
        file_format VARCHAR(20) DEFAULT 'json',  -- 'json', 'pdf', 'html'

        -- Status
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        -- Status values: 'draft', 'sent', 'paid', 'cancelled'

        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP,
        paid_at TIMESTAMP,
        cancelled_at TIMESTAMP,

        CONSTRAINT valid_invoice_status CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
      );
    `);

    console.log('  ✓ Created table: invoices');

    // ============================================
    // INDEXES
    // ============================================

    // courier_payments indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_payments_courier_id
      ON courier_payments(courier_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_payments_status
      ON courier_payments(status);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_payments_period
      ON courier_payments(period_start, period_end);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_courier_payments_created_at
      ON courier_payments(created_at DESC);
    `);

    console.log('  ✓ Created indexes on courier_payments');

    // invoices indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_payment_id
      ON invoices(payment_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_courier_id
      ON invoices(courier_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number
      ON invoices(invoice_number);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status
      ON invoices(status);
    `);

    console.log('  ✓ Created indexes on invoices');

    // ============================================
    // FUNCTION: calculate_courier_payment
    // ============================================
    // Helper function to calculate payment for a courier in a date range
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_courier_payment(
        p_courier_id INTEGER,
        p_period_start TIMESTAMP,
        p_period_end TIMESTAMP,
        p_commission_percentage DECIMAL DEFAULT 15.00,
        p_base_rate DECIMAL DEFAULT 35.00
      )
      RETURNS TABLE(
        total_deliveries BIGINT,
        completed_deliveries BIGINT,
        base_amount DECIMAL,
        commission_amount DECIMAL,
        net_amount DECIMAL
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_total_deliveries BIGINT;
        v_completed_deliveries BIGINT;
        v_base_amount DECIMAL;
        v_commission_amount DECIMAL;
        v_net_amount DECIMAL;
      BEGIN
        -- Get courier's delivery stats for period
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE o.status = 'delivered') AS completed
        INTO v_total_deliveries, v_completed_deliveries
        FROM orders o
        JOIN courier_profiles cp ON o.assigned_courier_id = cp.user_id
        WHERE cp.id = p_courier_id
          AND o.created_at >= p_period_start
          AND o.created_at <= p_period_end;

        -- Calculate amounts
        v_base_amount := v_completed_deliveries * p_base_rate;
        v_commission_amount := ROUND(v_base_amount * (p_commission_percentage / 100.0), 2);
        v_net_amount := v_base_amount - v_commission_amount;

        -- Return results
        RETURN QUERY SELECT
          v_total_deliveries,
          v_completed_deliveries,
          v_base_amount,
          v_commission_amount,
          v_net_amount;
      END;
      $$;
    `);

    console.log('  ✓ Created function: calculate_courier_payment');

    // ============================================
    // FUNCTION: generate_invoice_number
    // ============================================
    // Generate unique invoice number with format: INV-YYYY-NNNNNN
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_invoice_number()
      RETURNS VARCHAR(50)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_year VARCHAR(4);
        v_sequence INTEGER;
        v_invoice_number VARCHAR(50);
      BEGIN
        -- Get current year
        v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

        -- Get next sequence number for this year
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)
        ), 0) + 1
        INTO v_sequence
        FROM invoices
        WHERE invoice_number LIKE 'INV-' || v_year || '-%';

        -- Generate invoice number: INV-2025-000001
        v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

        RETURN v_invoice_number;
      END;
      $$;
    `);

    console.log('  ✓ Created function: generate_invoice_number');

    await client.query('COMMIT');
    console.log('✅ Migration 007 completed successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 007 failed:', error.message);
    throw error;
  }
};

exports.down = async (client) => {
  console.log('Rolling back migration 007: Courier Payment System...');

  await client.query('BEGIN');

  try {
    // Drop functions
    await client.query('DROP FUNCTION IF EXISTS generate_invoice_number()');
    await client.query('DROP FUNCTION IF EXISTS calculate_courier_payment(INTEGER, TIMESTAMP, TIMESTAMP, DECIMAL, DECIMAL)');

    // Drop tables (CASCADE will drop foreign key constraints)
    await client.query('DROP TABLE IF EXISTS invoices CASCADE');
    await client.query('DROP TABLE IF EXISTS courier_payments CASCADE');

    await client.query('COMMIT');
    console.log('✅ Migration 007 rollback completed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 007 rollback failed:', error.message);
    throw error;
  }
};
