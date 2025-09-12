const crypto = require('crypto');

// Abstrakt basklass för betalningsproviders
class PaymentProvider {
  async createPayment(order) {
    throw new Error('createPayment must be implemented');
  }
  
  async verifyPayment(paymentId) {
    throw new Error('verifyPayment must be implemented');
  }
}

// Swish Mock Provider för utveckling
class SwishMockProvider extends PaymentProvider {
  constructor() {
    super();
    this.mockPayments = new Map();
  }

  async createPayment(order) {
    const paymentId = `mock_swish_${order.id}_${Date.now()}`;
    
    // Simulera QR-kod
    const qrCode = `swish://payment?token=mock_token_${paymentId}`;
    
    const mockPayment = {
      paymentId,
      status: 'pending',
      qrCode,
      amount: order.grand_total, // öre
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minuter
      orderId: order.id,
      method: 'swish'
    };

    // Spara mock-betalning
    this.mockPayments.set(paymentId, mockPayment);

    // Simulera att betalningen "slutförs" automatiskt efter 30 sekunder
    setTimeout(() => {
      this.simulatePaymentCompletion(paymentId);
    }, 30000);

    return mockPayment;
  }

  simulatePaymentCompletion(paymentId) {
    const payment = this.mockPayments.get(paymentId);
    if (payment && payment.status === 'pending') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      console.log(`Mock: Betalning ${paymentId} slutförd`);
    }
  }

  async verifyPayment(paymentId) {
    const payment = this.mockPayments.get(paymentId);
    
    if (!payment) {
      throw new Error('Betalning hittades inte');
    }

    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      completedAt: payment.completedAt
    };
  }
}

// Swish Produktions Provider (placeholder)
class SwishProvider extends PaymentProvider {
  constructor() {
    super();
    this.merchantNumber = process.env.PAYMENT_PROVIDER_SWISH_MERCHANT_NUMBER;
    this.certPath = process.env.PAYMENT_PROVIDER_SWISH_CERT_PATH;
    this.certPassword = process.env.PAYMENT_PROVIDER_SWISH_CERT_PASSWORD;
    this.apiUrl = process.env.PAYMENT_PROVIDER_SWISH_API_URL || 'https://mss.cpc.getswish.net/swish-cpcapi/api/v1';
  }

  async createPayment(order) {
    const paymentRequest = {
      payeePaymentReference: order.id.toString(),
      callbackUrl: `${process.env.FRONTEND_ORIGIN}/api/payments/callback`,
      payeeAlias: this.merchantNumber,
      amount: order.grand_total, // öre
      currency: 'SEK',
      message: `Order ${order.id} - ${order.restaurant_slug}`
    };

    try {
      // I verkligheten skulle detta göra en HTTPS-request med klientcertifikat
      const response = await this.makeSwishRequest('/paymentrequests', paymentRequest);
      
      return {
        paymentId: response.id,
        status: 'pending',
        qrCode: response.qrCode,
        amount: paymentRequest.amount,
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minuter
        merchantNumber: this.merchantNumber,
        method: 'swish'
      };
    } catch (error) {
      console.error('Swish betalningsfel:', error);
      throw new Error('Kunde inte skapa Swish-betalning');
    }
  }

  async verifyPayment(paymentId) {
    try {
      const response = await this.makeSwishRequest(`/paymentrequests/${paymentId}`);
      return {
        paymentId,
        status: response.status,
        amount: response.amount,
        completedAt: response.dateCreated
      };
    } catch (error) {
      console.error('Swish verifieringsfel:', error);
      throw new Error('Kunde inte verifiera betalning');
    }
  }

  async makeSwishRequest(endpoint, data = null) {
    // Placeholder för verklig Swish-implementation
    // Kräver HTTPS-request med klientcertifikat (.p12)
    throw new Error('Swish produktion inte implementerad än');
  }
}

// Klarna Provider (placeholder för framtida implementation)
class KlarnaProvider extends PaymentProvider {
  async createPayment(order) {
    throw new Error('Klarna provider inte implementerad än');
  }

  async verifyPayment(paymentId) {
    throw new Error('Klarna provider inte implementerad än');
  }
}

// Stripe Provider (placeholder för framtida implementation)
class StripeProvider extends PaymentProvider {
  async createPayment(order) {
    throw new Error('Stripe provider inte implementerad än');
  }

  async verifyPayment(paymentId) {
    throw new Error('Stripe provider inte implementerad än');
  }
}

// Provider Factory
function createPaymentProvider(method) {
  switch (method.toLowerCase()) {
    case 'swish':
      return process.env.NODE_ENV === 'development' 
        ? new SwishMockProvider() 
        : new SwishProvider();
    case 'klarna':
      return new KlarnaProvider();
    case 'card':
    case 'stripe':
      return new StripeProvider();
    default:
      throw new Error(`Okänd betalningsmetod: ${method}`);
  }
}

// Validering av betalningsdata
function validatePaymentRequest(data) {
  const { method, orderId } = data;
  
  if (!method || !orderId) {
    throw new Error('Saknad method eller orderId');
  }
  
  const validMethods = ['swish', 'klarna', 'card'];
  if (!validMethods.includes(method.toLowerCase())) {
    throw new Error(`Ogiltig betalningsmetod: ${method}`);
  }
  
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error('Ogiltigt orderId');
  }
}

// Säker loggning (ingen PII)
function logPaymentActivity(action, paymentId, orderId, method) {
  console.log(`[PAYMENT] ${action}: ${paymentId} för order ${orderId} (${method})`);
}

// Exporter
module.exports = {
  PaymentProvider,
  SwishMockProvider,
  SwishProvider,
  KlarnaProvider,
  StripeProvider,
  createPaymentProvider,
  validatePaymentRequest,
  logPaymentActivity
};
