/**
 * PHASE 3B.4: Payment Routes
 *
 * Routes for courier payments and invoices
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyJWT, checkPermission } = require('../middleware/authMiddleware');

/**
 * POST /api/payments/calculate
 * Calculate payment for a courier
 * Auth: Admin or Courier (own data only)
 */
router.post(
  '/calculate',
  verifyJWT,
  checkPermission('courier:view'),
  paymentController.calculatePayment
);

/**
 * POST /api/payments
 * Create a payment record
 * Auth: Admin only
 */
router.post(
  '/',
  verifyJWT,
  checkPermission('admin'),
  paymentController.createPayment
);

/**
 * GET /api/payments/:id
 * Get payment by ID
 * Auth: Admin or Courier (own payment only)
 */
router.get(
  '/:id',
  verifyJWT,
  checkPermission('courier:view'),
  paymentController.getPaymentById
);

/**
 * GET /api/payments/courier/:courierId
 * Get all payments for a courier
 * Auth: Admin or Courier (own payments only)
 */
router.get(
  '/courier/:courierId',
  verifyJWT,
  checkPermission('courier:view'),
  paymentController.getCourierPayments
);

/**
 * POST /api/payments/:id/approve
 * Approve a payment
 * Auth: Admin only
 */
router.post(
  '/:id/approve',
  verifyJWT,
  checkPermission('admin'),
  paymentController.approvePayment
);

/**
 * POST /api/payments/:id/reject
 * Reject a payment
 * Auth: Admin only
 */
router.post(
  '/:id/reject',
  verifyJWT,
  checkPermission('admin'),
  paymentController.rejectPayment
);

/**
 * POST /api/payments/:id/pay
 * Mark payment as paid and generate invoice
 * Auth: Admin only
 */
router.post(
  '/:id/pay',
  verifyJWT,
  checkPermission('admin'),
  paymentController.markAsPaid
);

/**
 * GET /api/payments/invoices/:id
 * Get invoice by ID
 * Auth: Admin or Courier (own invoice only)
 */
router.get(
  '/invoices/:id',
  verifyJWT,
  checkPermission('courier:view'),
  paymentController.getInvoiceById
);

/**
 * GET /api/payments/courier/:courierId/invoices
 * Get all invoices for a courier
 * Auth: Admin or Courier (own invoices only)
 */
router.get(
  '/courier/:courierId/invoices',
  verifyJWT,
  checkPermission('courier:view'),
  paymentController.getCourierInvoices
);

module.exports = router;
