/**
 * PHASE 3B.4: Payment Service
 *
 * Manages courier payments, invoices, and commission calculations
 */

const pool = require('../config/database');

class PaymentService {
  /**
   * Calculate payment for a courier in a date range
   * @param {number} courierId - Courier ID
   * @param {string} periodStart - Start date (ISO format)
   * @param {string} periodEnd - End date (ISO format)
   * @param {object} options - Optional { commissionPercentage, baseRate }
   * @returns {Promise<object>} Payment calculation
   */
  static async calculatePayment(courierId, periodStart, periodEnd, options = {}) {
    const client = await pool.connect();

    try {
      const commissionPercentage = options.commissionPercentage || 15.00;
      const baseRate = options.baseRate || 35.00;

      // Validate dates
      if (new Date(periodStart) >= new Date(periodEnd)) {
        throw new Error('Period start must be before period end');
      }

      if (new Date(periodEnd) > new Date()) {
        throw new Error('Period end cannot be in the future');
      }

      // Use database function to calculate payment
      const result = await client.query(
        `SELECT * FROM calculate_courier_payment($1, $2, $3, $4, $5)`,
        [courierId, periodStart, periodEnd, commissionPercentage, baseRate]
      );

      if (result.rows.length === 0) {
        throw new Error(`Courier with ID ${courierId} not found`);
      }

      const calculation = result.rows[0];

      return {
        courier_id: courierId,
        period_start: periodStart,
        period_end: periodEnd,
        total_deliveries: parseInt(calculation.total_deliveries),
        completed_deliveries: parseInt(calculation.completed_deliveries),
        base_amount: parseFloat(calculation.base_amount),
        commission_percentage: parseFloat(commissionPercentage),
        commission_amount: parseFloat(calculation.commission_amount),
        net_amount: parseFloat(calculation.net_amount),
        base_rate: parseFloat(baseRate)
      };

    } finally {
      client.release();
    }
  }

  /**
   * Create a payment record for a courier
   * @param {number} courierId - Courier ID
   * @param {string} periodStart - Start date
   * @param {string} periodEnd - End date
   * @param {object} options - Optional payment options
   * @returns {Promise<object>} Created payment record
   */
  static async createPayment(courierId, periodStart, periodEnd, options = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate payment first
      const calculation = await this.calculatePayment(courierId, periodStart, periodEnd, options);

      // Check if payment already exists for this period
      const existingPayment = await client.query(
        `SELECT id FROM courier_payments
         WHERE courier_id = $1 AND period_start = $2 AND period_end = $3`,
        [courierId, periodStart, periodEnd]
      );

      if (existingPayment.rows.length > 0) {
        throw new Error('Payment already exists for this courier and period');
      }

      // Create payment record
      const result = await client.query(
        `INSERT INTO courier_payments (
          courier_id, period_start, period_end,
          total_deliveries, completed_deliveries,
          base_amount, commission_percentage, commission_amount, net_amount,
          payment_method, payment_notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          courierId,
          periodStart,
          periodEnd,
          calculation.total_deliveries,
          calculation.completed_deliveries,
          calculation.base_amount,
          calculation.commission_percentage,
          calculation.commission_amount,
          calculation.net_amount,
          options.paymentMethod || null,
          options.paymentNotes || null,
          'pending'
        ]
      );

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
   * Get payment by ID
   * @param {number} paymentId - Payment ID
   * @returns {Promise<object>} Payment record
   */
  static async getPaymentById(paymentId) {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT
          cp.*,
          u.namn AS courier_name,
          u.email AS courier_email
         FROM courier_payments cp
         JOIN courier_profiles c ON cp.courier_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE cp.id = $1`,
        [paymentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get all payments for a courier
   * @param {number} courierId - Courier ID
   * @param {object} filters - Optional filters { status, limit, offset }
   * @returns {Promise<Array>} List of payments
   */
  static async getCourierPayments(courierId, filters = {}) {
    const client = await pool.connect();

    try {
      let query = `
        SELECT
          cp.*,
          u.namn AS courier_name,
          u.email AS courier_email
        FROM courier_payments cp
        JOIN courier_profiles c ON cp.courier_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE cp.courier_id = $1
      `;

      const params = [courierId];
      let paramIndex = 2;

      // Filter by status
      if (filters.status) {
        query += ` AND cp.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      // Order by created date
      query += ` ORDER BY cp.created_at DESC`;

      // Limit and offset
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Approve a payment (admin only)
   * @param {number} paymentId - Payment ID
   * @param {number} adminUserId - Admin user ID
   * @returns {Promise<object>} Updated payment
   */
  static async approvePayment(paymentId, adminUserId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check payment exists and is pending
      const payment = await client.query(
        `SELECT * FROM courier_payments WHERE id = $1`,
        [paymentId]
      );

      if (payment.rows.length === 0) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }

      if (payment.rows[0].status !== 'pending') {
        throw new Error(`Payment is not in pending status (current: ${payment.rows[0].status})`);
      }

      // Update payment to approved
      const result = await client.query(
        `UPDATE courier_payments
         SET status = 'approved',
             approved_at = NOW(),
             approved_by = $2
         WHERE id = $1
         RETURNING *`,
        [paymentId, adminUserId]
      );

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
   * Reject a payment (admin only)
   * @param {number} paymentId - Payment ID
   * @param {number} adminUserId - Admin user ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<object>} Updated payment
   */
  static async rejectPayment(paymentId, adminUserId, reason) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check payment exists and is pending
      const payment = await client.query(
        `SELECT * FROM courier_payments WHERE id = $1`,
        [paymentId]
      );

      if (payment.rows.length === 0) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }

      if (payment.rows[0].status !== 'pending') {
        throw new Error(`Payment is not in pending status (current: ${payment.rows[0].status})`);
      }

      // Update payment to rejected
      const result = await client.query(
        `UPDATE courier_payments
         SET status = 'rejected',
             rejected_at = NOW(),
             rejected_by = $2,
             rejection_reason = $3
         WHERE id = $1
         RETURNING *`,
        [paymentId, adminUserId, reason]
      );

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
   * Mark payment as paid and generate invoice
   * @param {number} paymentId - Payment ID
   * @param {object} paymentDetails - { paymentMethod, paymentReference }
   * @returns {Promise<object>} Updated payment and invoice
   */
  static async markAsPaid(paymentId, paymentDetails = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check payment exists and is approved
      const payment = await client.query(
        `SELECT cp.*, u.namn AS courier_name, u.email AS courier_email
         FROM courier_payments cp
         JOIN courier_profiles c ON cp.courier_id = c.id
         JOIN users u ON c.user_id = u.id
         WHERE cp.id = $1`,
        [paymentId]
      );

      if (payment.rows.length === 0) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }

      if (payment.rows[0].status !== 'approved') {
        throw new Error(`Payment must be approved before marking as paid (current: ${payment.rows[0].status})`);
      }

      // Update payment to paid
      const updatedPayment = await client.query(
        `UPDATE courier_payments
         SET status = 'paid',
             paid_at = NOW(),
             payment_method = $2,
             payment_reference = $3
         WHERE id = $1
         RETURNING *`,
        [paymentId, paymentDetails.paymentMethod || 'manual', paymentDetails.paymentReference || null]
      );

      // Generate invoice
      const invoice = await this._generateInvoice(client, updatedPayment.rows[0], payment.rows[0]);

      await client.query('COMMIT');

      return {
        payment: updatedPayment.rows[0],
        invoice: invoice
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate invoice for a payment (internal helper)
   * @param {object} client - Database client
   * @param {object} payment - Payment record
   * @param {object} courierDetails - Courier details
   * @returns {Promise<object>} Generated invoice
   */
  static async _generateInvoice(client, payment, courierDetails) {
    // Generate invoice number
    const invoiceNumberResult = await client.query('SELECT generate_invoice_number() AS number');
    const invoiceNumber = invoiceNumberResult.rows[0].number;

    // Build invoice data (JSON format for MVP)
    const invoiceData = {
      courier: {
        name: courierDetails.courier_name || 'Unknown',
        email: courierDetails.courier_email || '',
        address: ''
      },
      company: {
        name: 'Foodie Platform AB',
        address: 'Platform Street 123, Stockholm',
        org_number: '556XXX-XXXX',
        vat: 'SE556XXXXXXX01'
      },
      period: {
        start: payment.period_start,
        end: payment.period_end
      },
      lineItems: [
        {
          description: `Courier services - ${payment.completed_deliveries} deliveries`,
          quantity: payment.completed_deliveries,
          rate: payment.base_amount / payment.completed_deliveries,
          amount: payment.base_amount
        },
        {
          description: `Platform commission (${payment.commission_percentage}%)`,
          quantity: 1,
          rate: -payment.commission_amount,
          amount: -payment.commission_amount
        }
      ],
      totals: {
        subtotal: payment.base_amount,
        commission: payment.commission_amount,
        net: payment.net_amount,
        vat: 0,
        total: payment.net_amount
      },
      notes: 'Payment due within 30 days. Thank you for your service!'
    };

    // Insert invoice
    const result = await client.query(
      `INSERT INTO invoices (
        payment_id, courier_id, invoice_number, invoice_date,
        due_date, invoice_data, file_format, status
      ) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $4, 'json', 'sent')
      RETURNING *`,
      [payment.id, payment.courier_id, invoiceNumber, JSON.stringify(invoiceData)]
    );

    return result.rows[0];
  }

  /**
   * Get invoice by ID
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<object>} Invoice record
   */
  static async getInvoiceById(invoiceId) {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM invoices WHERE id = $1`,
        [invoiceId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Invoice with ID ${invoiceId} not found`);
      }

      return result.rows[0];

    } finally {
      client.release();
    }
  }

  /**
   * Get invoices for a courier
   * @param {number} courierId - Courier ID
   * @param {object} filters - Optional filters { status, limit, offset }
   * @returns {Promise<Array>} List of invoices
   */
  static async getCourierInvoices(courierId, filters = {}) {
    const client = await pool.connect();

    try {
      let query = `
        SELECT * FROM invoices
        WHERE courier_id = $1
      `;

      const params = [courierId];
      let paramIndex = 2;

      // Filter by status
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      // Order by created date
      query += ` ORDER BY created_at DESC`;

      // Limit and offset
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await client.query(query, params);

      return result.rows;

    } finally {
      client.release();
    }
  }
}

module.exports = PaymentService;
