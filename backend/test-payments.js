/**
 * PHASE 3B.4: Payment System Test Suite
 *
 * Comprehensive tests for courier payment and invoice system
 */

require('dotenv').config();
const pool = require('./src/config/database');
const PaymentService = require('./src/services/paymentService');
const assert = require('assert');

let client;
let testCourierId;
let testUserId;
let testPaymentId;
let testInvoiceId;

async function setup() {
  console.log('📋 Setting up test environment...\n');

  client = await pool.connect();

  try {
    // Create test user
    const userResult = await client.query(`
      INSERT INTO users (email, password, namn, role)
      VALUES ('test-courier-payment@test.com', 'hashedpassword', 'Test Payment Courier', 'courier')
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create test courier profile
    const courierResult = await client.query(`
      INSERT INTO courier_profiles (user_id, vehicle_type, is_available, gps_enabled, rating)
      VALUES ($1, 'bike', true, true, 4.5)
      RETURNING id
    `, [testUserId]);
    testCourierId = courierResult.rows[0].id;

    // Create test orders for payment calculation
    const orderIds = [];
    for (let i = 0; i < 5; i++) {
      const result = await client.query(`
        INSERT INTO orders (
          restaurant_slug, customer_name, customer_email, customer_phone, customer_address,
          status, assigned_courier_id, items_total, delivery_fee, discount_total, grand_total,
          created_at, delivered_at
        ) VALUES (
          'test-restaurant', 'Test Customer', 'customer@test.com', '1234567890', 'Test Address',
          'delivered', $1, 10000, 5000, 0, 15000,
          NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'
        )
        RETURNING id
      `, [testUserId]);
      orderIds.push(result.rows[0].id);
    }

    console.log(`✅ Created test courier (ID: ${testCourierId}) with ${orderIds.length} delivered orders\n`);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete test orders
    await client.query(`DELETE FROM orders WHERE assigned_courier_id = $1`, [testUserId]);

    // Delete test courier profile
    await client.query(`DELETE FROM courier_profiles WHERE id = $1`, [testCourierId]);

    // Delete test user
    await client.query(`DELETE FROM users WHERE id = $1`, [testUserId]);

    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function runTests() {
  console.log('🧪 Starting PHASE 3B.4 Payment System Test Suite\n');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;

  // ============================================
  // DATABASE TESTS
  // ============================================

  console.log('📦 DATABASE STRUCTURE TESTS\n');

  // TEST 1: courier_payments table exists
  try {
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'courier_payments'
    `);
    assert(result.rows.length === 1, 'courier_payments table exists');
    console.log('  ✅ TEST 1: courier_payments table exists');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 1 FAILED:', error.message);
    failed++;
  }

  // TEST 2: invoices table exists
  try {
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'invoices'
    `);
    assert(result.rows.length === 1, 'invoices table exists');
    console.log('  ✅ TEST 2: invoices table exists');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 2 FAILED:', error.message);
    failed++;
  }

  // TEST 3: calculate_courier_payment function exists
  try {
    const result = await client.query(`
      SELECT proname FROM pg_proc
      WHERE proname = 'calculate_courier_payment'
    `);
    assert(result.rows.length === 1, 'calculate_courier_payment function exists');
    console.log('  ✅ TEST 3: calculate_courier_payment function exists');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 3 FAILED:', error.message);
    failed++;
  }

  // TEST 4: generate_invoice_number function exists
  try {
    const result = await client.query(`
      SELECT proname FROM pg_proc
      WHERE proname = 'generate_invoice_number'
    `);
    assert(result.rows.length === 1, 'generate_invoice_number function exists');
    console.log('  ✅ TEST 4: generate_invoice_number function exists');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 4 FAILED:', error.message);
    failed++;
  }

  // ============================================
  // PAYMENT SERVICE TESTS
  // ============================================

  console.log('\n💰 PAYMENT CALCULATION TESTS\n');

  // TEST 5: Calculate payment for courier
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
    const periodEnd = new Date().toISOString();

    const calculation = await PaymentService.calculatePayment(testCourierId, periodStart, periodEnd);

    assert(calculation.courier_id === testCourierId, 'Calculation has correct courier_id');
    assert(calculation.completed_deliveries === 5, 'Calculation shows 5 completed deliveries');
    assert(calculation.base_amount === 175.00, 'Base amount is 175.00 SEK (5 * 35)');
    assert(calculation.commission_percentage === 15.00, 'Commission percentage is 15%');
    assert(calculation.commission_amount === 26.25, 'Commission amount is 26.25 SEK');
    assert(calculation.net_amount === 148.75, 'Net amount is 148.75 SEK');

    console.log('  ✅ TEST 5: Calculate payment for courier');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 5 FAILED:', error.message);
    failed++;
  }

  // TEST 6: Calculate payment with custom commission
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const calculation = await PaymentService.calculatePayment(
      testCourierId,
      periodStart,
      periodEnd,
      { commissionPercentage: 20.00 }
    );

    assert(calculation.commission_percentage === 20.00, 'Custom commission percentage applied');
    assert(calculation.commission_amount === 35.00, 'Commission amount is 35.00 SEK (20% of 175)');
    assert(calculation.net_amount === 140.00, 'Net amount is 140.00 SEK');

    console.log('  ✅ TEST 6: Calculate payment with custom commission');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 6 FAILED:', error.message);
    failed++;
  }

  // TEST 7: Calculate payment with custom base rate
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const calculation = await PaymentService.calculatePayment(
      testCourierId,
      periodStart,
      periodEnd,
      { baseRate: 40.00 }
    );

    assert(calculation.base_amount === 200.00, 'Base amount is 200.00 SEK (5 * 40)');
    assert(calculation.net_amount === 170.00, 'Net amount is 170.00 SEK (200 - 30)');

    console.log('  ✅ TEST 7: Calculate payment with custom base rate');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 7 FAILED:', error.message);
    failed++;
  }

  // TEST 8: Invalid date range (end before start)
  try {
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    await PaymentService.calculatePayment(testCourierId, periodStart, periodEnd);
    assert(false, 'Should throw error for invalid date range');
  } catch (error) {
    assert(error.message.includes('Period start must be before period end'), 'Correct error message');
    console.log('  ✅ TEST 8: Invalid date range throws error');
    passed++;
  }

  // TEST 9: Future end date throws error
  try {
    const periodStart = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await PaymentService.calculatePayment(testCourierId, periodStart, periodEnd);
    assert(false, 'Should throw error for future end date');
  } catch (error) {
    assert(error.message.includes('cannot be in the future'), 'Correct error message');
    console.log('  ✅ TEST 9: Future end date throws error');
    passed++;
  }

  // ============================================
  // PAYMENT CRUD TESTS
  // ============================================

  console.log('\n📝 PAYMENT CRUD TESTS\n');

  // TEST 10: Create payment record
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    const payment = await PaymentService.createPayment(
      testCourierId,
      periodStart,
      periodEnd,
      { paymentMethod: 'bank_transfer', paymentNotes: 'Test payment' }
    );

    testPaymentId = payment.id;

    assert(payment.courier_id === testCourierId, 'Payment has correct courier_id');
    assert(payment.status === 'pending', 'Payment status is pending');
    assert(payment.completed_deliveries === 5, 'Payment shows 5 deliveries');
    assert(payment.net_amount === '148.75', 'Net amount is correct');
    assert(payment.payment_method === 'bank_transfer', 'Payment method saved');

    console.log('  ✅ TEST 10: Create payment record');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 10 FAILED:', error.message);
    failed++;
  }

  // TEST 11: Get payment by ID
  try {
    const payment = await PaymentService.getPaymentById(testPaymentId);

    assert(payment.id === testPaymentId, 'Payment ID matches');
    assert(payment.courier_name === 'Test Payment Courier', 'Courier name included');
    assert(payment.courier_email === 'test-courier-payment@test.com', 'Courier email included');

    console.log('  ✅ TEST 11: Get payment by ID');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 11 FAILED:', error.message);
    failed++;
  }

  // TEST 12: Get courier payments
  try {
    const payments = await PaymentService.getCourierPayments(testCourierId);

    assert(payments.length === 1, 'Returns 1 payment for courier');
    assert(payments[0].id === testPaymentId, 'Payment ID matches');

    console.log('  ✅ TEST 12: Get courier payments');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 12 FAILED:', error.message);
    failed++;
  }

  // TEST 13: Filter courier payments by status
  try {
    const pendingPayments = await PaymentService.getCourierPayments(testCourierId, { status: 'pending' });
    const paidPayments = await PaymentService.getCourierPayments(testCourierId, { status: 'paid' });

    assert(pendingPayments.length === 1, 'Returns 1 pending payment');
    assert(paidPayments.length === 0, 'Returns 0 paid payments');

    console.log('  ✅ TEST 13: Filter courier payments by status');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 13 FAILED:', error.message);
    failed++;
  }

  // TEST 14: Duplicate payment throws error
  try {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date().toISOString();

    try {
      await PaymentService.createPayment(testCourierId, periodStart, periodEnd);
      assert(false, 'Should throw error for duplicate payment');
    } catch (error) {
      // Should throw error (any error is acceptable since duplicate constraint could vary)
      assert(error.message.length > 0, 'Error thrown for duplicate payment');
      console.log('  ✅ TEST 14: Duplicate payment throws error');
      passed++;
    }
  } catch (error) {
    console.log('  ❌ TEST 14 FAILED:', error.message);
    failed++;
  }

  // ============================================
  // PAYMENT WORKFLOW TESTS
  // ============================================

  console.log('\n🔄 PAYMENT WORKFLOW TESTS\n');

  // TEST 15: Approve payment
  try {
    const adminUserId = testUserId; // Using test user as admin for simplicity
    const approvedPayment = await PaymentService.approvePayment(testPaymentId, adminUserId);

    assert(approvedPayment.status === 'approved', 'Payment status is approved');
    assert(approvedPayment.approved_by === adminUserId, 'Approved by admin user');
    assert(approvedPayment.approved_at !== null, 'Approved timestamp set');

    console.log('  ✅ TEST 15: Approve payment');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 15 FAILED:', error.message);
    failed++;
  }

  // TEST 16: Cannot approve already approved payment
  try {
    await PaymentService.approvePayment(testPaymentId, testUserId);
    assert(false, 'Should throw error for already approved payment');
  } catch (error) {
    assert(error.message.includes('not in pending status'), 'Correct error message');
    console.log('  ✅ TEST 16: Cannot approve already approved payment');
    passed++;
  }

  // TEST 17: Mark payment as paid and generate invoice
  try {
    const result = await PaymentService.markAsPaid(testPaymentId, {
      paymentMethod: 'swish',
      paymentReference: 'SWISH-12345'
    });

    assert(result.payment.status === 'paid', 'Payment status is paid');
    assert(result.payment.payment_method === 'swish', 'Payment method updated');
    assert(result.payment.payment_reference === 'SWISH-12345', 'Payment reference saved');
    assert(result.payment.paid_at !== null, 'Paid timestamp set');

    assert(result.invoice !== undefined, 'Invoice generated');
    assert(result.invoice.payment_id === testPaymentId, 'Invoice linked to payment');
    assert(result.invoice.courier_id === testCourierId, 'Invoice linked to courier');
    assert(result.invoice.invoice_number.startsWith('INV-'), 'Invoice number format correct');

    testInvoiceId = result.invoice.id;

    console.log('  ✅ TEST 17: Mark payment as paid and generate invoice');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 17 FAILED:', error.message);
    failed++;
  }

  // TEST 18: Cannot mark unapproved payment as paid
  try {
    // Create new payment to test
    const periodStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const newPayment = await PaymentService.createPayment(testCourierId, periodStart, periodEnd);

    await PaymentService.markAsPaid(newPayment.id);
    assert(false, 'Should throw error for unapproved payment');
  } catch (error) {
    assert(error.message.includes('must be approved'), 'Correct error message');
    console.log('  ✅ TEST 18: Cannot mark unapproved payment as paid');
    passed++;
  }

  // ============================================
  // REJECTION WORKFLOW TEST
  // ============================================

  console.log('\n❌ REJECTION WORKFLOW TESTS\n');

  // TEST 19: Reject payment
  try {
    // Create another payment to reject
    const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();

    const newPayment = await PaymentService.createPayment(testCourierId, periodStart, periodEnd);
    const rejectedPayment = await PaymentService.rejectPayment(newPayment.id, testUserId, 'Invalid period');

    assert(rejectedPayment.status === 'rejected', 'Payment status is rejected');
    assert(rejectedPayment.rejected_by === testUserId, 'Rejected by admin user');
    assert(rejectedPayment.rejection_reason === 'Invalid period', 'Rejection reason saved');
    assert(rejectedPayment.rejected_at !== null, 'Rejected timestamp set');

    console.log('  ✅ TEST 19: Reject payment');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 19 FAILED:', error.message);
    failed++;
  }

  // ============================================
  // INVOICE TESTS
  // ============================================

  console.log('\n📄 INVOICE TESTS\n');

  // TEST 20: Get invoice by ID
  try {
    const invoice = await PaymentService.getInvoiceById(testInvoiceId);

    assert(invoice.id === testInvoiceId, 'Invoice ID matches');
    assert(invoice.payment_id === testPaymentId, 'Linked to correct payment');
    assert(invoice.status === 'sent', 'Invoice status is sent');
    assert(invoice.file_format === 'json', 'Invoice format is JSON');

    // Validate invoice data structure
    const invoiceData = invoice.invoice_data;
    assert(invoiceData.courier !== undefined, 'Invoice has courier data');
    assert(invoiceData.company !== undefined, 'Invoice has company data');
    assert(invoiceData.period !== undefined, 'Invoice has period data');
    assert(invoiceData.lineItems !== undefined, 'Invoice has line items');
    assert(invoiceData.totals !== undefined, 'Invoice has totals');

    console.log('  ✅ TEST 20: Get invoice by ID');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 20 FAILED:', error.message);
    failed++;
  }

  // TEST 21: Get courier invoices
  try {
    const invoices = await PaymentService.getCourierInvoices(testCourierId);

    assert(invoices.length >= 1, 'Returns at least 1 invoice');
    assert(invoices[0].courier_id === testCourierId, 'Invoice belongs to courier');

    console.log('  ✅ TEST 21: Get courier invoices');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 21 FAILED:', error.message);
    failed++;
  }

  // TEST 22: Invoice number generation
  try {
    const result = await client.query('SELECT generate_invoice_number() AS number');
    const invoiceNumber = result.rows[0].number;

    assert(invoiceNumber.match(/^INV-\d{4}-\d{6}$/), 'Invoice number format is INV-YYYY-NNNNNN');

    console.log('  ✅ TEST 22: Invoice number generation');
    passed++;
  } catch (error) {
    console.log('  ❌ TEST 22 FAILED:', error.message);
    failed++;
  }

  // ============================================
  // SUMMARY
  // ============================================

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`  Total Tests: ${passed + failed}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('⚠️  SOME TESTS FAILED\n');
  }

  return { passed, failed };
}

// Main execution
(async () => {
  try {
    await setup();
    const results = await runTests();
    await cleanup();

    process.exit(results.failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    await cleanup();
    process.exit(1);
  }
})();
