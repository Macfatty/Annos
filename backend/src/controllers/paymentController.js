/**
 * PHASE 3B.4: Payment Controller
 *
 * HTTP handlers for courier payment and invoice endpoints
 */

const PaymentService = require('../services/paymentService');

/**
 * POST /api/payments/calculate
 * Calculate payment for a courier in a date range
 * Auth: Admin or Courier (own data only)
 */
exports.calculatePayment = async (req, res) => {
  try {
    const { courierId, periodStart, periodEnd, commissionPercentage, baseRate } = req.body;

    // Validate required fields
    if (!courierId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: courierId, periodStart, periodEnd'
      });
    }

    // Permission check: courier can only calculate own payment
    if (req.user.role !== 'admin') {
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== parseInt(courierId, 10)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only calculate your own payment'
        });
      }
    }

    const calculation = await PaymentService.calculatePayment(
      courierId,
      periodStart,
      periodEnd,
      { commissionPercentage, baseRate }
    );

    return res.status(200).json({
      success: true,
      data: calculation
    });

  } catch (error) {
    console.error('Error calculating payment:', error);

    if (error.message.includes('not found') || error.message.includes('Period')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to calculate payment'
    });
  }
};

/**
 * POST /api/payments
 * Create a payment record for a courier
 * Auth: Admin only
 */
exports.createPayment = async (req, res) => {
  try {
    const { courierId, periodStart, periodEnd, paymentMethod, paymentNotes, commissionPercentage, baseRate } = req.body;

    // Validate required fields
    if (!courierId || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: courierId, periodStart, periodEnd'
      });
    }

    const payment = await PaymentService.createPayment(
      courierId,
      periodStart,
      periodEnd,
      { paymentMethod, paymentNotes, commissionPercentage, baseRate }
    );

    return res.status(201).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error creating payment:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('Period')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    });
  }
};

/**
 * GET /api/payments/:id
 * Get payment by ID
 * Auth: Admin or Courier (own payment only)
 */
exports.getPaymentById = async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    const payment = await PaymentService.getPaymentById(paymentId);

    // Permission check: courier can only view own payment
    if (req.user.role !== 'admin') {
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== payment.courier_id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own payments'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error getting payment:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment'
    });
  }
};

/**
 * GET /api/payments/courier/:courierId
 * Get all payments for a courier
 * Auth: Admin or Courier (own payments only)
 */
exports.getCourierPayments = async (req, res) => {
  try {
    const courierId = parseInt(req.params.courierId, 10);

    if (isNaN(courierId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid courier ID'
      });
    }

    // Permission check: courier can only view own payments
    if (req.user.role !== 'admin') {
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== courierId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own payments'
        });
      }
    }

    const filters = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
    };

    const payments = await PaymentService.getCourierPayments(courierId, filters);

    return res.status(200).json({
      success: true,
      data: payments,
      count: payments.length
    });

  } catch (error) {
    console.error('Error getting courier payments:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courier payments'
    });
  }
};

/**
 * POST /api/payments/:id/approve
 * Approve a payment
 * Auth: Admin only
 */
exports.approvePayment = async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    const payment = await PaymentService.approvePayment(paymentId, req.user.id);

    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment approved successfully'
    });

  } catch (error) {
    console.error('Error approving payment:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('not in pending status')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to approve payment'
    });
  }
};

/**
 * POST /api/payments/:id/reject
 * Reject a payment
 * Auth: Admin only
 */
exports.rejectPayment = async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const payment = await PaymentService.rejectPayment(paymentId, req.user.id, reason);

    return res.status(200).json({
      success: true,
      data: payment,
      message: 'Payment rejected'
    });

  } catch (error) {
    console.error('Error rejecting payment:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('not in pending status')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to reject payment'
    });
  }
};

/**
 * POST /api/payments/:id/pay
 * Mark payment as paid and generate invoice
 * Auth: Admin only
 */
exports.markAsPaid = async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const { paymentMethod, paymentReference } = req.body;

    if (isNaN(paymentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    const result = await PaymentService.markAsPaid(paymentId, {
      paymentMethod,
      paymentReference
    });

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Payment marked as paid and invoice generated'
    });

  } catch (error) {
    console.error('Error marking payment as paid:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('must be approved')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to mark payment as paid'
    });
  }
};

/**
 * GET /api/payments/invoices/:id
 * Get invoice by ID
 * Auth: Admin or Courier (own invoice only)
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id, 10);

    if (isNaN(invoiceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }

    const invoice = await PaymentService.getInvoiceById(invoiceId);

    // Permission check: courier can only view own invoice
    if (req.user.role !== 'admin') {
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== invoice.courier_id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own invoices'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error getting invoice:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve invoice'
    });
  }
};

/**
 * GET /api/payments/courier/:courierId/invoices
 * Get all invoices for a courier
 * Auth: Admin or Courier (own invoices only)
 */
exports.getCourierInvoices = async (req, res) => {
  try {
    const courierId = parseInt(req.params.courierId, 10);

    if (isNaN(courierId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid courier ID'
      });
    }

    // Permission check: courier can only view own invoices
    if (req.user.role !== 'admin') {
      const CourierService = require('../services/courierService');
      const courierProfile = await CourierService.getCourierByUserId(req.user.id);

      if (!courierProfile || courierProfile.id !== courierId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only view your own invoices'
        });
      }
    }

    const filters = {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined
    };

    const invoices = await PaymentService.getCourierInvoices(courierId, filters);

    return res.status(200).json({
      success: true,
      data: invoices,
      count: invoices.length
    });

  } catch (error) {
    console.error('Error getting courier invoices:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courier invoices'
    });
  }
};
