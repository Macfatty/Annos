# Betalningsarkitektur

## Översikt

Annos använder en modulär betalningsarkitektur med Swish som första provider och utbyggbar struktur för Klarna och kortbetalningar.

## Arkitektur

### Provider-abstraktion
```javascript
// backend/payments/index.js
class PaymentProvider {
  async createPayment(order) {
    throw new Error('Not implemented');
  }
  
  async verifyPayment(paymentId) {
    throw new Error('Not implemented');
  }
}

class SwishMockProvider extends PaymentProvider {
  async createPayment(order) {
    // Mock-implementation för utveckling
  }
}

class SwishProvider extends PaymentProvider {
  async createPayment(order) {
    // Produktionsimplementering med Swish API
  }
}
```

### Provider-fabrik
```javascript
function createPaymentProvider(method) {
  switch (method) {
    case 'swish':
      return process.env.NODE_ENV === 'development' 
        ? new SwishMockProvider() 
        : new SwishProvider();
    case 'klarna':
      return new KlarnaProvider();
    case 'card':
      return new StripeProvider();
    default:
      throw new Error(`Okänd betalningsmetod: ${method}`);
  }
}
```

## API Endpoints

### POST /api/payments/create
Skapa betalning för en order.

**Request:**
```json
{
  "method": "swish",
  "orderId": 123
}
```

**Response (Development - Mock):**
```json
{
  "paymentId": "mock_swish_123",
  "status": "pending",
  "qrCode": "swish://payment?token=mock_token_123",
  "instructions": "Öppna Swish och skanna QR-koden",
  "amount": 12500, // öre
  "expiresAt": 1703123756789
}
```

**Response (Production - Swish):**
```json
{
  "paymentId": "swish_abc123def456",
  "status": "pending",
  "qrCode": "swish://payment?token=abc123def456",
  "instructions": "Öppna Swish och skanna QR-koden",
  "amount": 12500,
  "expiresAt": 1703123756789,
  "merchantNumber": "1234567890"
}
```

### GET /api/payments/:paymentId/status
Kontrollera betalningsstatus.

**Response:**
```json
{
  "paymentId": "swish_abc123def456",
  "status": "completed",
  "amount": 12500,
  "completedAt": 1703123456789
}
```

## Environment Variables

### Development (.env)
```bash
# Betalningsutveckling
PAYMENT_PROVIDER_SWISH_MOCK=true
PAYMENT_PROVIDER_SWISH_CALLBACK_URL=http://localhost:3001/api/payments/callback
PAYMENT_PROVIDER_SWISH_MERCHANT_NUMBER=1234567890

# Säkerhet
JWT_SECRET=your_jwt_secret_here
REFRESH_SECRET=your_refresh_secret_here
FRONTEND_ORIGIN=http://localhost:5173
```

### Production (.env)
```bash
# Swish Produktion
PAYMENT_PROVIDER_SWISH_ENABLED=true
PAYMENT_PROVIDER_SWISH_MERCHANT_NUMBER=your_merchant_number
PAYMENT_PROVIDER_SWISH_CERT_PATH=/path/to/swish_cert.p12
PAYMENT_PROVIDER_SWISH_CERT_PASSWORD=your_cert_password
PAYMENT_PROVIDER_SWISH_API_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v1

# Klarna (framtida)
PAYMENT_PROVIDER_KLARNA_USERNAME=your_klarna_username
PAYMENT_PROVIDER_KLARNA_PASSWORD=your_klarna_password
PAYMENT_PROVIDER_KLARNA_TEST_MODE=true

# Stripe (framtida)
PAYMENT_PROVIDER_STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYMENT_PROVIDER_STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Säkerhet
JWT_SECRET=production_jwt_secret_256_bits
REFRESH_SECRET=production_refresh_secret_256_bits
FRONTEND_ORIGIN=https://yourdomain.com
```

## Swish Implementation

### Development (Mock)
```javascript
class SwishMockProvider extends PaymentProvider {
  async createPayment(order) {
    const paymentId = `mock_swish_${order.id}_${Date.now()}`;
    
    // Simulera QR-kod
    const qrCode = `swish://payment?token=mock_token_${paymentId}`;
    
    // I verkligheten skulle detta sparas i databasen
    const mockPayment = {
      paymentId,
      status: 'pending',
      qrCode,
      amount: order.grand_total,
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minuter
      orderId: order.id
    };

    // Simulera att betalningen "slutförs" automatiskt efter 30 sekunder
    setTimeout(() => {
      this.simulatePaymentCompletion(paymentId);
    }, 30000);

    return mockPayment;
  }

  simulatePaymentCompletion(paymentId) {
    console.log(`Mock: Betalning ${paymentId} slutförd`);
    // Här skulle man uppdatera databasen och meddela frontend
  }

  async verifyPayment(paymentId) {
    // Mock: Alltid returnera "completed" efter 30 sekunder
    return {
      paymentId,
      status: 'completed',
      completedAt: Date.now()
    };
  }
}
```

### Production (Swish API)
```javascript
class SwishProvider extends PaymentProvider {
  constructor() {
    this.merchantNumber = process.env.PAYMENT_PROVIDER_SWISH_MERCHANT_NUMBER;
    this.certPath = process.env.PAYMENT_PROVIDER_SWISH_CERT_PATH;
    this.certPassword = process.env.PAYMENT_PROVIDER_SWISH_CERT_PASSWORD;
    this.apiUrl = process.env.PAYMENT_PROVIDER_SWISH_API_URL;
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
      const response = await this.makeSwishRequest('/paymentrequests', paymentRequest);
      
      return {
        paymentId: response.id,
        status: 'pending',
        qrCode: response.qrCode,
        amount: paymentRequest.amount,
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minuter
        merchantNumber: this.merchantNumber
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
        completedAt: response.dateCreated
      };
    } catch (error) {
      console.error('Swish verifieringsfel:', error);
      throw new Error('Kunde inte verifiera betalning');
    }
  }

  async makeSwishRequest(endpoint, data = null) {
    // Implementera HTTPS-request med klientcertifikat
    // Detaljerad implementation kräver Swish-certifikat och säker kommunikation
  }
}
```

## Frontend Integration

### Betalningskomponent
```jsx
// frontend/src/payments/PaymentProvider.jsx
function PaymentProvider({ order, onPaymentComplete }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);

  const createPayment = async (method) => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          method,
          orderId: order.id
        })
      });

      const paymentData = await response.json();
      setPayment(paymentData);
      
      if (method === 'swish') {
        // Starta polling för betalningsstatus
        pollPaymentStatus(paymentData.paymentId);
      }
    } catch (error) {
      console.error('Betalningsfel:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/${paymentId}/status`);
        const status = await response.json();
        
        if (status.status === 'completed') {
          clearInterval(interval);
          onPaymentComplete(status);
        }
      } catch (error) {
        console.error('Statuskontrollfel:', error);
      }
    }, 5000); // Kontrollera var 5:e sekund

    // Stoppa efter 10 minuter
    setTimeout(() => clearInterval(interval), 600000);
  };

  return (
    <div className="payment-provider">
      <h3>Välj betalningsmetod</h3>
      
      <button 
        onClick={() => createPayment('swish')}
        disabled={loading}
        className="payment-button swish-button"
        aria-label="Betala med Swish"
      >
        {loading ? 'Skapar betalning...' : 'Betala med Swish'}
      </button>

      {payment && (
        <div className="payment-details">
          <h4>Swish-betalning</h4>
          <p>{payment.instructions}</p>
          <div className="qr-code">
            <img src={`data:image/png;base64,${generateQRCode(payment.qrCode)}`} 
                 alt="Swish QR-kod" />
          </div>
          <p>Belopp: {(payment.amount / 100).toFixed(2)} kr</p>
        </div>
      )}
    </div>
  );
}
```

## Säkerhet

### HTTPS och Certifikat
- Alla betalningskommunikation via HTTPS
- Swish kräver klientcertifikat för autentisering
- Validera alla webhook-signaturer

### Datahantering
```javascript
// Lagra aldrig känslig betalningsdata
const safePaymentData = {
  paymentId: payment.id,
  status: payment.status,
  amount: payment.amount,
  createdAt: payment.createdAt
  // Exkludera: tokens, certifikat, personuppgifter
};

// Logga betalningsaktivitet säkert
console.log(`Betalning ${paymentId} skapad för order ${orderId}`);
console.log(`Betalning ${paymentId} slutförd`);
// Logga INTE: belopp, kunddata, betalningstokens
```

### Rate Limiting
```javascript
// Begränsa betalningsförsök
const paymentLimits = {
  create: 5, // max 5 betalningsförsök per minut
  status: 60 // max 60 statuskontroller per minut
};
```

## Testflöde i Development

1. **Skapa order** via `/api/order`
2. **Skapa Swish-betalning** via `/api/payments/create`
3. **Visa QR-kod** i frontend
4. **Mock-betalning** slutförs automatiskt efter 30 sekunder
5. **Verifiera status** via polling eller webhook
6. **Uppdatera order** till betald status

## Produktionsnoter

### Swish Merchant-krav
- Registrering hos Swish för att få merchant-nummer
- Klientcertifikat (.p12) för API-autentisering
- HTTPS-endpoint för callback/webhooks
- GDPR-efterlevnad för betalningsdata

### BankID Integration (framtida)
- BankID för användarautentisering
- Spara betalningsmetoder säkert
- Recurring payments för prenumerationer

### Monitoring och Logging
```javascript
// Produktionsloggning
const paymentLogger = {
  info: (message, data) => console.log(`[PAYMENT] ${message}`, data),
  error: (message, error) => console.error(`[PAYMENT ERROR] ${message}`, error),
  warn: (message, data) => console.warn(`[PAYMENT WARN] ${message}`, data)
};

// Exempel
paymentLogger.info('Betalning skapad', { paymentId, orderId, method });
paymentLogger.error('Swish API-fel', { error: error.message, paymentId });
```
