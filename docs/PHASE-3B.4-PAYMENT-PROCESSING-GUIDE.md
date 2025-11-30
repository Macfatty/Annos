# PHASE 3B.4: Payment Processing System - User Guide

**Version:** 1.0
**Last Updated:** 2025-11-30
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Usage Scenarios](#usage-scenarios)
6. [Payment Workflow](#payment-workflow)
7. [Invoice System](#invoice-system)
8. [Integration Examples](#integration-examples)
9. [Production Setup](#production-setup)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Payment Processing System manages courier payments, commission calculations, and invoice generation for the Foodie platform.

### Key Features

- **Automated Payment Calculation** - Calculate courier earnings based on completed deliveries
- **Commission Management** - Flexible commission percentages (default: 15%)
- **Payment Workflow** - Status progression: pending → approved → paid
- **Invoice Generation** - Automatic invoice creation with unique numbering
- **Payment Tracking** - Complete audit trail with timestamps and approvals
- **Multiple Payment Methods** - Swish, bank transfer, Stripe, etc.

### Commission Model

```
Base Amount:       Deliveries × Base Rate (default 35 SEK/delivery)
Commission:        Base Amount × Commission % (default 15%)
Net Amount:        Base Amount - Commission
```

**Example:**
```
Deliveries:        10 completed
Base Amount:       350 SEK (10 × 35 SEK)
Commission (15%):   52.50 SEK
Net Payment:       297.50 SEK
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PAYMENT SYSTEM                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Payment Calculation                                    │
│  ├─ Count completed deliveries                          │
│  ├─ Calculate base amount                               │
│  ├─ Apply commission percentage                         │
│  └─ Calculate net amount                                │
│                                                         │
│  Payment Workflow                                       │
│  ├─ Create (pending)                                    │
│  ├─ Approve (admin)                                     │
│  ├─ Mark as Paid                                        │
│  └─ Generate Invoice                                    │
│                                                         │
│  Invoice Generation                                     │
│  ├─ Unique invoice number (INV-YYYY-NNNNNN)            │
│  ├─ JSON invoice data                                   │
│  ├─ PDF generation (future)                             │
│  └─ Email delivery (future)                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `courier_payments`

Tracks payment calculations for courier work periods.

```sql
CREATE TABLE courier_payments (
  id SERIAL PRIMARY KEY,
  courier_id INTEGER NOT NULL REFERENCES courier_profiles(id),

  -- Payment period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,

  -- Delivery statistics
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  completed_deliveries INTEGER NOT NULL DEFAULT 0,

  -- Financial calculations (SEK)
  base_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

  -- Payment details
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  payment_notes TEXT,

  -- Status: 'pending', 'approved', 'paid', 'rejected', 'failed'
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  rejected_at TIMESTAMP,

  -- Audit fields
  approved_by INTEGER REFERENCES users(id),
  rejected_by INTEGER REFERENCES users(id),
  rejection_reason TEXT
);
```

### Table: `invoices`

Stores generated invoices for payments.

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES courier_payments(id),
  courier_id INTEGER NOT NULL REFERENCES courier_profiles(id),

  -- Invoice identification
  invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "INV-2025-000123"
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,

  -- Invoice details (JSONB for flexibility)
  invoice_data JSONB NOT NULL,

  -- File information
  file_path VARCHAR(500),
  file_format VARCHAR(20) DEFAULT 'json',  -- 'json', 'pdf', 'html'

  -- Status: 'draft', 'sent', 'paid', 'cancelled'
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP
);
```

### Database Functions

#### `calculate_courier_payment()`

Calculates payment for a courier in a date range.

```sql
SELECT * FROM calculate_courier_payment(
  courier_id := 1,
  period_start := '2025-01-01'::timestamp,
  period_end := '2025-01-31'::timestamp,
  commission_percentage := 15.00,  -- Optional, default 15%
  base_rate := 35.00                -- Optional, default 35 SEK
);
```

**Returns:**
```
total_deliveries      | 45
completed_deliveries  | 42
base_amount          | 1470.00
commission_amount    | 220.50
net_amount           | 1249.50
```

#### `generate_invoice_number()`

Generates unique invoice numbers with format `INV-YYYY-NNNNNN`.

```sql
SELECT generate_invoice_number();
-- Returns: 'INV-2025-000123'
```

---

## API Endpoints

All endpoints require JWT authentication. Admin-only endpoints are marked with 🔐.

### Base URL
```
http://localhost:3001/api/payments
```

---

### 1. Calculate Payment

**POST** `/api/payments/calculate`

Calculate payment for a courier without creating a record.

**Auth:** Admin or Courier (own data only)

**Request Body:**
```json
{
  "courierId": 1,
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-31T23:59:59Z",
  "commissionPercentage": 15.00,  // Optional, default 15%
  "baseRate": 35.00                // Optional, default 35 SEK
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "period_start": "2025-01-01T00:00:00.000Z",
    "period_end": "2025-01-31T23:59:59.000Z",
    "total_deliveries": 45,
    "completed_deliveries": 42,
    "base_amount": 1470.00,
    "commission_percentage": 15.00,
    "commission_amount": 220.50,
    "net_amount": 1249.50,
    "base_rate": 35.00
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/payments/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "courierId": 1,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z"
  }'
```

---

### 2. Create Payment 🔐

**POST** `/api/payments`

Create a payment record for a courier.

**Auth:** Admin only

**Request Body:**
```json
{
  "courierId": 1,
  "periodStart": "2025-01-01T00:00:00Z",
  "periodEnd": "2025-01-31T23:59:59Z",
  "paymentMethod": "bank_transfer",  // Optional
  "paymentNotes": "January 2025",    // Optional
  "commissionPercentage": 15.00,     // Optional
  "baseRate": 35.00                  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "courier_id": 1,
    "period_start": "2025-01-01T00:00:00.000Z",
    "period_end": "2025-01-31T23:59:59.000Z",
    "total_deliveries": 45,
    "completed_deliveries": 42,
    "base_amount": "1470.00",
    "commission_percentage": "15.00",
    "commission_amount": "220.50",
    "net_amount": "1249.50",
    "payment_method": "bank_transfer",
    "payment_notes": "January 2025",
    "status": "pending",
    "created_at": "2025-01-31T23:00:00.000Z",
    "approved_at": null,
    "paid_at": null,
    "rejected_at": null
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "courierId": 1,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z",
    "paymentMethod": "swish"
  }'
```

---

### 3. Get Payment by ID

**GET** `/api/payments/:id`

Get a specific payment record.

**Auth:** Admin or Courier (own payment only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "courier_id": 1,
    "courier_name": "John Doe",
    "courier_email": "john@courier.com",
    "period_start": "2025-01-01T00:00:00.000Z",
    "period_end": "2025-01-31T23:59:59.000Z",
    "total_deliveries": 45,
    "completed_deliveries": 42,
    "base_amount": "1470.00",
    "commission_percentage": "15.00",
    "commission_amount": "220.50",
    "net_amount": "1249.50",
    "payment_method": "swish",
    "payment_reference": "SWISH-ABC123",
    "status": "paid",
    "created_at": "2025-01-31T23:00:00.000Z",
    "approved_at": "2025-02-01T10:00:00.000Z",
    "paid_at": "2025-02-01T15:30:00.000Z",
    "approved_by": 5
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/payments/42 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. Get Courier Payments

**GET** `/api/payments/courier/:courierId`

Get all payments for a courier with optional filtering.

**Auth:** Admin or Courier (own payments only)

**Query Parameters:**
- `status` (optional) - Filter by status: pending, approved, paid, rejected
- `limit` (optional) - Limit number of results
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "courier_id": 1,
      "courier_name": "John Doe",
      "courier_email": "john@courier.com",
      "period_start": "2025-01-01T00:00:00.000Z",
      "period_end": "2025-01-31T23:59:59.000Z",
      "completed_deliveries": 42,
      "net_amount": "1249.50",
      "status": "paid",
      "created_at": "2025-01-31T23:00:00.000Z"
    },
    {
      "id": 38,
      "courier_id": 1,
      "period_start": "2024-12-01T00:00:00.000Z",
      "period_end": "2024-12-31T23:59:59.000Z",
      "completed_deliveries": 38,
      "net_amount": "1122.50",
      "status": "paid",
      "created_at": "2024-12-31T23:00:00.000Z"
    }
  ],
  "count": 2
}
```

**cURL Examples:**
```bash
# Get all payments for courier
curl http://localhost:3001/api/payments/courier/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by status
curl "http://localhost:3001/api/payments/courier/1?status=pending" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Pagination
curl "http://localhost:3001/api/payments/courier/1?limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 5. Approve Payment 🔐

**POST** `/api/payments/:id/approve`

Approve a pending payment.

**Auth:** Admin only

**Response:**
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "data": {
    "id": 42,
    "status": "approved",
    "approved_at": "2025-02-01T10:00:00.000Z",
    "approved_by": 5
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/payments/42/approve \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

### 6. Reject Payment 🔐

**POST** `/api/payments/:id/reject`

Reject a pending payment with a reason.

**Auth:** Admin only

**Request Body:**
```json
{
  "reason": "Incorrect period or delivery count mismatch"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "id": 42,
    "status": "rejected",
    "rejected_at": "2025-02-01T10:15:00.000Z",
    "rejected_by": 5,
    "rejection_reason": "Incorrect period or delivery count mismatch"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/payments/42/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"reason": "Incorrect period"}'
```

---

### 7. Mark Payment as Paid 🔐

**POST** `/api/payments/:id/pay`

Mark an approved payment as paid and generate invoice.

**Auth:** Admin only

**Request Body:**
```json
{
  "paymentMethod": "swish",       // Optional
  "paymentReference": "SWISH-123" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment marked as paid and invoice generated",
  "data": {
    "payment": {
      "id": 42,
      "status": "paid",
      "paid_at": "2025-02-01T15:30:00.000Z",
      "payment_method": "swish",
      "payment_reference": "SWISH-123"
    },
    "invoice": {
      "id": 28,
      "payment_id": 42,
      "courier_id": 1,
      "invoice_number": "INV-2025-000028",
      "invoice_date": "2025-02-01",
      "due_date": "2025-03-03",
      "status": "sent",
      "file_format": "json",
      "invoice_data": { ... }
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/payments/42/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "paymentMethod": "swish",
    "paymentReference": "SWISH-ABC123"
  }'
```

---

### 8. Get Invoice by ID

**GET** `/api/payments/invoices/:id`

Get a specific invoice.

**Auth:** Admin or Courier (own invoice only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 28,
    "payment_id": 42,
    "courier_id": 1,
    "invoice_number": "INV-2025-000028",
    "invoice_date": "2025-02-01",
    "due_date": "2025-03-03",
    "invoice_data": {
      "courier": {
        "name": "John Doe",
        "email": "john@courier.com",
        "address": ""
      },
      "company": {
        "name": "Foodie Platform AB",
        "address": "Platform Street 123, Stockholm",
        "org_number": "556XXX-XXXX",
        "vat": "SE556XXXXXXX01"
      },
      "period": {
        "start": "2025-01-01T00:00:00.000Z",
        "end": "2025-01-31T23:59:59.000Z"
      },
      "lineItems": [
        {
          "description": "Courier services - 42 deliveries",
          "quantity": 42,
          "rate": 35.00,
          "amount": 1470.00
        },
        {
          "description": "Platform commission (15%)",
          "quantity": 1,
          "rate": -220.50,
          "amount": -220.50
        }
      ],
      "totals": {
        "subtotal": 1470.00,
        "commission": 220.50,
        "net": 1249.50,
        "vat": 0,
        "total": 1249.50
      },
      "notes": "Payment due within 30 days. Thank you for your service!"
    },
    "file_path": null,
    "file_format": "json",
    "status": "sent",
    "created_at": "2025-02-01T15:30:00.000Z",
    "sent_at": "2025-02-01T15:30:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/payments/invoices/28 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 9. Get Courier Invoices

**GET** `/api/payments/courier/:courierId/invoices`

Get all invoices for a courier.

**Auth:** Admin or Courier (own invoices only)

**Query Parameters:**
- `status` (optional) - Filter by status: draft, sent, paid, cancelled
- `limit` (optional) - Limit number of results
- `offset` (optional) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 28,
      "payment_id": 42,
      "courier_id": 1,
      "invoice_number": "INV-2025-000028",
      "invoice_date": "2025-02-01",
      "status": "sent",
      "invoice_data": { ... }
    },
    {
      "id": 24,
      "payment_id": 38,
      "courier_id": 1,
      "invoice_number": "INV-2025-000024",
      "invoice_date": "2025-01-01",
      "status": "paid",
      "invoice_data": { ... }
    }
  ],
  "count": 2
}
```

**cURL Example:**
```bash
curl http://localhost:3001/api/payments/courier/1/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Usage Scenarios

### Scenario 1: Monthly Payment Cycle (Admin)

**Step 1: Calculate Payment**

Preview earnings before creating payment record.

```bash
curl -X POST http://localhost:3001/api/payments/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "courierId": 1,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z"
  }'
```

**Step 2: Create Payment**

If calculation looks correct, create payment record.

```bash
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "courierId": 1,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z",
    "paymentNotes": "January 2025 - Monthly payment"
  }'
```

**Step 3: Review & Approve**

Admin reviews payment and approves.

```bash
curl -X POST http://localhost:3001/api/payments/42/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Step 4: Process Payment**

After transferring money via Swish/bank, mark as paid.

```bash
curl -X POST http://localhost:3001/api/payments/42/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "paymentMethod": "swish",
    "paymentReference": "SWISH-20250201-ABC123"
  }'
```

**Step 5: Verify Invoice**

Check that invoice was generated.

```bash
curl http://localhost:3001/api/payments/invoices/28 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Scenario 2: Courier Checking Earnings

**Check Pending Payments**

```bash
curl "http://localhost:3001/api/payments/courier/1?status=pending" \
  -H "Authorization: Bearer COURIER_TOKEN"
```

**Check Payment History**

```bash
curl http://localhost:3001/api/payments/courier/1 \
  -H "Authorization: Bearer COURIER_TOKEN"
```

**View Specific Payment**

```bash
curl http://localhost:3001/api/payments/42 \
  -H "Authorization: Bearer COURIER_TOKEN"
```

**Download Invoice**

```bash
curl http://localhost:3001/api/payments/courier/1/invoices \
  -H "Authorization: Bearer COURIER_TOKEN"
```

---

### Scenario 3: Batch Payment Processing

Process payments for all couriers at end of month.

```javascript
const couriers = [1, 2, 3, 4, 5]; // Courier IDs
const periodStart = '2025-01-01T00:00:00Z';
const periodEnd = '2025-01-31T23:59:59Z';

for (const courierId of couriers) {
  // 1. Calculate to preview
  const calc = await fetch('/api/payments/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ courierId, periodStart, periodEnd })
  }).then(r => r.json());

  console.log(`Courier ${courierId}: ${calc.data.completed_deliveries} deliveries, ${calc.data.net_amount} SEK`);

  // 2. Create payment if has deliveries
  if (calc.data.completed_deliveries > 0) {
    const payment = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        courierId,
        periodStart,
        periodEnd,
        paymentNotes: 'January 2025 batch'
      })
    }).then(r => r.json());

    console.log(`Created payment ${payment.data.id} for courier ${courierId}`);
  }
}
```

---

### Scenario 4: Handling Payment Disputes

**Step 1: Courier reports issue**

Courier contacts admin about incorrect payment.

**Step 2: Admin reviews payment**

```bash
curl http://localhost:3001/api/payments/42 \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Step 3: Reject if incorrect**

```bash
curl -X POST http://localhost:3001/api/payments/42/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "reason": "Courier disputed delivery count - needs manual review"
  }'
```

**Step 4: Create corrected payment**

After investigation, create new payment with correct data.

```bash
curl -X POST http://localhost:3001/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "courierId": 1,
    "periodStart": "2025-01-01T00:00:00Z",
    "periodEnd": "2025-01-31T23:59:59Z",
    "commissionPercentage": 12.00,
    "paymentNotes": "Corrected payment - reduced commission as compensation"
  }'
```

---

## Payment Workflow

### State Machine

```
         CREATE
           ↓
      [PENDING] ─────────┐
           ↓             │ REJECT
      APPROVE            │
           ↓             ↓
      [APPROVED]    [REJECTED]
           ↓
     MARK AS PAID
           ↓
        [PAID]
```

### Status Transitions

| From       | To         | Action          | Who   | Notes                        |
|------------|------------|-----------------|-------|------------------------------|
| -          | pending    | Create payment  | Admin | Initial state                |
| pending    | approved   | Approve payment | Admin | Ready for payment processing |
| pending    | rejected   | Reject payment  | Admin | Requires reason              |
| approved   | paid       | Mark as paid    | Admin | Generates invoice            |

**Business Rules:**

1. **Only pending payments can be approved or rejected**
2. **Only approved payments can be marked as paid**
3. **Rejections require a reason**
4. **Invoice auto-generated when marked as paid**
5. **Duplicate payments for same period blocked**
6. **Period end cannot be in the future**
7. **Period start must be before period end**

---

## Invoice System

### Invoice Number Format

```
INV-YYYY-NNNNNN
```

- `INV` - Prefix
- `YYYY` - Year (4 digits)
- `NNNNNN` - Sequential number (6 digits, zero-padded)

**Examples:**
- `INV-2025-000001`
- `INV-2025-000123`
- `INV-2025-012345`

### Invoice Data Structure

Invoices are stored as JSONB for flexibility.

```json
{
  "courier": {
    "name": "John Doe",
    "email": "john@courier.com",
    "address": ""
  },
  "company": {
    "name": "Foodie Platform AB",
    "address": "Platform Street 123, Stockholm",
    "org_number": "556XXX-XXXX",
    "vat": "SE556XXXXXXX01"
  },
  "period": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-31T23:59:59.000Z"
  },
  "lineItems": [
    {
      "description": "Courier services - 42 deliveries",
      "quantity": 42,
      "rate": 35.00,
      "amount": 1470.00
    },
    {
      "description": "Platform commission (15%)",
      "quantity": 1,
      "rate": -220.50,
      "amount": -220.50
    }
  ],
  "totals": {
    "subtotal": 1470.00,
    "commission": 220.50,
    "net": 1249.50,
    "vat": 0,
    "total": 1249.50
  },
  "notes": "Payment due within 30 days. Thank you for your service!"
}
```

### Future Enhancements

**PDF Generation** (Planned)
- Generate PDF invoices from JSON data
- Store in `/invoices/pdf/` directory
- Email to courier automatically

**Email Delivery** (Planned)
- Send invoice via email when payment marked as paid
- Include PDF attachment
- Payment confirmation message

---

## Integration Examples

### JavaScript/TypeScript (Frontend)

```typescript
// paymentService.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/payments';

export interface PaymentCalculation {
  courier_id: number;
  period_start: string;
  period_end: string;
  total_deliveries: number;
  completed_deliveries: number;
  base_amount: number;
  commission_percentage: number;
  commission_amount: number;
  net_amount: number;
  base_rate: number;
}

export interface Payment {
  id: number;
  courier_id: number;
  courier_name?: string;
  courier_email?: string;
  period_start: string;
  period_end: string;
  total_deliveries: number;
  completed_deliveries: number;
  base_amount: string;
  commission_percentage: string;
  commission_amount: string;
  net_amount: string;
  payment_method: string | null;
  payment_reference: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

export const paymentService = {
  // Calculate payment
  async calculate(
    courierId: number,
    periodStart: string,
    periodEnd: string,
    options?: { commissionPercentage?: number; baseRate?: number }
  ): Promise<PaymentCalculation> {
    const { data } = await axios.post(`${API_BASE}/calculate`, {
      courierId,
      periodStart,
      periodEnd,
      ...options
    });
    return data.data;
  },

  // Create payment
  async create(
    courierId: number,
    periodStart: string,
    periodEnd: string,
    options?: {
      paymentMethod?: string;
      paymentNotes?: string;
      commissionPercentage?: number;
      baseRate?: number;
    }
  ): Promise<Payment> {
    const { data } = await axios.post(API_BASE, {
      courierId,
      periodStart,
      periodEnd,
      ...options
    });
    return data.data;
  },

  // Get payment by ID
  async getById(paymentId: number): Promise<Payment> {
    const { data } = await axios.get(`${API_BASE}/${paymentId}`);
    return data.data;
  },

  // Get courier payments
  async getCourierPayments(
    courierId: number,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<Payment[]> {
    const { data } = await axios.get(`${API_BASE}/courier/${courierId}`, {
      params: filters
    });
    return data.data;
  },

  // Approve payment (admin)
  async approve(paymentId: number): Promise<Payment> {
    const { data } = await axios.post(`${API_BASE}/${paymentId}/approve`);
    return data.data;
  },

  // Reject payment (admin)
  async reject(paymentId: number, reason: string): Promise<Payment> {
    const { data } = await axios.post(`${API_BASE}/${paymentId}/reject`, {
      reason
    });
    return data.data;
  },

  // Mark as paid (admin)
  async markAsPaid(
    paymentId: number,
    details?: { paymentMethod?: string; paymentReference?: string }
  ): Promise<{ payment: Payment; invoice: any }> {
    const { data } = await axios.post(`${API_BASE}/${paymentId}/pay`, details);
    return data.data;
  },

  // Get invoice
  async getInvoice(invoiceId: number) {
    const { data } = await axios.get(`${API_BASE}/invoices/${invoiceId}`);
    return data.data;
  },

  // Get courier invoices
  async getCourierInvoices(
    courierId: number,
    filters?: { status?: string; limit?: number; offset?: number }
  ) {
    const { data } = await axios.get(`${API_BASE}/courier/${courierId}/invoices`, {
      params: filters
    });
    return data.data;
  }
};
```

**Usage in React Component:**

```tsx
// AdminPaymentManagement.tsx
import React, { useState } from 'react';
import { paymentService } from './paymentService';

export function AdminPaymentManagement() {
  const [calculation, setCalculation] = useState(null);

  const handleCalculate = async () => {
    const result = await paymentService.calculate(
      1, // courierId
      '2025-01-01T00:00:00Z',
      '2025-01-31T23:59:59Z'
    );
    setCalculation(result);
  };

  const handleCreatePayment = async () => {
    const payment = await paymentService.create(
      1,
      '2025-01-01T00:00:00Z',
      '2025-01-31T23:59:59Z',
      { paymentNotes: 'January 2025' }
    );
    console.log('Payment created:', payment);
  };

  const handleApprove = async (paymentId: number) => {
    const approved = await paymentService.approve(paymentId);
    console.log('Payment approved:', approved);
  };

  const handleMarkAsPaid = async (paymentId: number) => {
    const result = await paymentService.markAsPaid(paymentId, {
      paymentMethod: 'swish',
      paymentReference: 'SWISH-123'
    });
    console.log('Payment marked as paid:', result.payment);
    console.log('Invoice generated:', result.invoice);
  };

  return (
    <div>
      <h1>Payment Management</h1>

      <button onClick={handleCalculate}>Calculate Payment</button>

      {calculation && (
        <div>
          <p>Completed Deliveries: {calculation.completed_deliveries}</p>
          <p>Base Amount: {calculation.base_amount} SEK</p>
          <p>Commission: {calculation.commission_amount} SEK</p>
          <p>Net Payment: {calculation.net_amount} SEK</p>

          <button onClick={handleCreatePayment}>Create Payment</button>
        </div>
      )}
    </div>
  );
}
```

---

### Node.js Backend Integration

```javascript
// paymentProcessor.js
const PaymentService = require('./src/services/paymentService');
const socketService = require('./src/services/socketService');
const pushService = require('./src/services/pushNotificationService');

/**
 * Process monthly payments for all active couriers
 */
async function processMonthlyPayments(year, month) {
  console.log(`Processing payments for ${year}-${month}...`);

  // Calculate period
  const periodStart = new Date(year, month - 1, 1).toISOString();
  const periodEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Get all active couriers
  const couriers = await getCouriersWithDeliveries(periodStart, periodEnd);

  const results = {
    processed: 0,
    skipped: 0,
    errors: []
  };

  for (const courier of couriers) {
    try {
      // Calculate payment
      const calculation = await PaymentService.calculatePayment(
        courier.id,
        periodStart,
        periodEnd
      );

      // Skip if no completed deliveries
      if (calculation.completed_deliveries === 0) {
        console.log(`Skipping courier ${courier.id} - no deliveries`);
        results.skipped++;
        continue;
      }

      // Create payment
      const payment = await PaymentService.createPayment(
        courier.id,
        periodStart,
        periodEnd,
        {
          paymentNotes: `Automated monthly payment - ${year}-${String(month).padStart(2, '0')}`
        }
      );

      console.log(`Created payment ${payment.id} for courier ${courier.id}: ${payment.net_amount} SEK`);

      // Notify courier
      await pushService.sendToUser(courier.user_id, {
        title: 'New Payment Created',
        body: `Your payment for ${calculation.completed_deliveries} deliveries (${payment.net_amount} SEK) is pending approval.`,
        data: { type: 'payment_created', paymentId: payment.id }
      });

      results.processed++;

    } catch (error) {
      console.error(`Error processing courier ${courier.id}:`, error.message);
      results.errors.push({ courierId: courier.id, error: error.message });
    }
  }

  console.log(`\nProcessing complete:`);
  console.log(`  Processed: ${results.processed}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Errors: ${results.errors.length}`);

  return results;
}

/**
 * Auto-approve payments that meet criteria
 */
async function autoApprovePayments(adminUserId) {
  const pool = require('./src/config/database');
  const client = await pool.connect();

  try {
    // Get pending payments with valid data
    const result = await client.query(`
      SELECT id FROM courier_payments
      WHERE status = 'pending'
        AND completed_deliveries > 0
        AND base_amount > 0
        AND net_amount > 0
        AND created_at > NOW() - INTERVAL '7 days'
    `);

    console.log(`Auto-approving ${result.rows.length} payments...`);

    for (const row of result.rows) {
      await PaymentService.approvePayment(row.id, adminUserId);
      console.log(`Approved payment ${row.id}`);
    }

    return result.rows.length;

  } finally {
    client.release();
  }
}

module.exports = {
  processMonthlyPayments,
  autoApprovePayments
};
```

**Cron Job Setup:**

```javascript
// scheduler.js
const cron = require('node-cron');
const { processMonthlyPayments } = require('./paymentProcessor');

// Run on the 1st of every month at 00:00
cron.schedule('0 0 1 * *', async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // Previous month (0-indexed)

  console.log(`\nCron job triggered: Processing payments for ${year}-${month + 1}`);
  await processMonthlyPayments(year, month === 0 ? 12 : month, year);
});

console.log('Payment scheduler started');
```

---

## Production Setup

### Environment Variables

Add to `.env`:

```bash
# Payment Configuration
PAYMENT_COMMISSION_PERCENTAGE=15.00
PAYMENT_BASE_RATE=35.00
PAYMENT_AUTO_APPROVE=false

# Invoice Configuration
INVOICE_COMPANY_NAME="Foodie Platform AB"
INVOICE_COMPANY_ADDRESS="Platform Street 123, Stockholm"
INVOICE_COMPANY_ORG_NUMBER="556XXX-XXXX"
INVOICE_COMPANY_VAT="SE556XXXXXXX01"
INVOICE_DUE_DAYS=30

# Payment Methods
SWISH_MERCHANT_ID="your-swish-merchant-id"
STRIPE_SECRET_KEY="sk_live_..."

# Email (for invoice delivery)
EMAIL_ENABLED=true
EMAIL_FROM="payments@foodie.se"
```

### Database Migration

Ensure migration 007 has been run:

```bash
# Check if migration exists
node -e "const pool = require('./src/config/database'); pool.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = \\'courier_payments\\')').then(r => console.log('Table exists:', r.rows[0].exists)).then(() => process.exit());"

# Run migration if needed
node run-migration-007.js
```

### Monitoring & Alerts

**Key Metrics to Monitor:**

1. **Payment Creation Rate**
   - Alert if no payments created in 35 days
   - Expected: ~1 batch/month

2. **Approval Time**
   - Track time between created and approved
   - Target: < 48 hours

3. **Failed Payments**
   - Alert on rejected payments
   - Investigate failure reasons

4. **Invoice Generation**
   - Ensure every paid payment has invoice
   - Alert on missing invoices

**Sample Monitoring Query:**

```sql
-- Payments pending approval > 3 days
SELECT
  cp.id,
  cp.courier_id,
  cp.created_at,
  cp.net_amount,
  AGE(NOW(), cp.created_at) AS pending_duration
FROM courier_payments cp
WHERE cp.status = 'pending'
  AND cp.created_at < NOW() - INTERVAL '3 days'
ORDER BY cp.created_at ASC;
```

### Backup Strategy

**Critical Data:**

1. **courier_payments table** - All payment records
2. **invoices table** - All invoice records

**Backup Frequency:**
- Full backup: Daily
- Incremental: Hourly
- Retention: 90 days

**Backup Script:**

```bash
#!/bin/bash
# backup-payments.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/payments"

pg_dump -U asha -d annos_production \
  -t courier_payments \
  -t invoices \
  > "$BACKUP_DIR/payments_$DATE.sql"

# Keep only last 90 days
find "$BACKUP_DIR" -name "payments_*.sql" -mtime +90 -delete
```

---

## Troubleshooting

### Common Issues

#### 1. Payment calculation shows 0 deliveries

**Cause:** No completed deliveries in period, or courier_id mismatch.

**Solution:**

```sql
-- Check courier's orders
SELECT
  o.id,
  o.status,
  o.created_at,
  o.assigned_courier_id
FROM orders o
JOIN courier_profiles cp ON o.assigned_courier_id = cp.user_id
WHERE cp.id = 1  -- courier_id
  AND o.created_at >= '2025-01-01'
  AND o.created_at <= '2025-01-31'
ORDER BY o.created_at;

-- Verify courier profile
SELECT * FROM courier_profiles WHERE id = 1;
```

**Common Issues:**
- Orders assigned to `user_id` instead of linking to `courier_profile.id`
- Deliveries marked as "delivered" but in different time period
- Wrong date range (timezone issues)

#### 2. Duplicate payment error

**Cause:** Payment already exists for courier + period.

**Solution:**

```sql
-- Check existing payments
SELECT * FROM courier_payments
WHERE courier_id = 1
  AND period_start = '2025-01-01'
  AND period_end = '2025-01-31';

-- Delete if needed (use with caution!)
DELETE FROM courier_payments WHERE id = 42;
```

#### 3. Cannot approve payment - wrong status

**Cause:** Payment is not in "pending" status.

**Solution:**

```sql
-- Check payment status
SELECT id, status, created_at FROM courier_payments WHERE id = 42;

-- Reset to pending if needed (use with caution!)
UPDATE courier_payments
SET status = 'pending',
    approved_at = NULL,
    approved_by = NULL
WHERE id = 42;
```

#### 4. Cannot mark as paid - not approved

**Cause:** Payment must be approved before marking as paid.

**Solution:**

```bash
# Approve first
curl -X POST http://localhost:3001/api/payments/42/approve \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Then mark as paid
curl -X POST http://localhost:3001/api/payments/42/pay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"paymentMethod": "swish"}'
```

#### 5. Invoice generation fails

**Cause:** Missing courier details or database error.

**Solution:**

```sql
-- Verify courier has user profile
SELECT
  cp.id AS courier_id,
  u.id AS user_id,
  u.namn,
  u.email
FROM courier_profiles cp
JOIN users u ON cp.user_id = u.id
WHERE cp.id = 1;

-- Check invoice number generation
SELECT generate_invoice_number();
```

#### 6. Period end in future error

**Cause:** Trying to calculate payment for period that hasn't ended yet.

**Solution:**

Use current date as period end:

```javascript
const periodEnd = new Date().toISOString();
```

Or wait until period actually ends.

#### 7. Permission denied (courier accessing other courier's data)

**Cause:** Couriers can only access their own payment data.

**Solution:**

Ensure courier is requesting their own data:

```javascript
// Get own courier profile first
const profile = await courierService.getCourierByUserId(userId);

// Then access payments
const payments = await paymentService.getCourierPayments(profile.id);
```

---

### Debug Mode

Enable detailed logging:

```javascript
// In paymentService.js, add logging
console.log('Calculating payment for courier:', courierId);
console.log('Period:', periodStart, 'to', periodEnd);
console.log('Query result:', result.rows);
```

### SQL Debugging

```sql
-- See all payments with status
SELECT
  cp.id,
  cp.courier_id,
  u.namn AS courier_name,
  cp.period_start::date,
  cp.period_end::date,
  cp.completed_deliveries,
  cp.net_amount,
  cp.status,
  cp.created_at
FROM courier_payments cp
JOIN courier_profiles c ON cp.courier_id = c.id
JOIN users u ON c.user_id = u.id
ORDER BY cp.created_at DESC
LIMIT 20;

-- Payments by status
SELECT status, COUNT(*) FROM courier_payments GROUP BY status;

-- Total payments by courier
SELECT
  courier_id,
  COUNT(*) AS payment_count,
  SUM(net_amount) AS total_earnings
FROM courier_payments
WHERE status = 'paid'
GROUP BY courier_id
ORDER BY total_earnings DESC;
```

---

## Testing

### Run Test Suite

```bash
# Run comprehensive test suite
node test-payments.js
```

**Expected Output:**

```
📋 Setting up test environment...
✅ Created test courier (ID: 6) with 5 delivered orders

🧪 Starting PHASE 3B.4 Payment System Test Suite
============================================================

📦 DATABASE STRUCTURE TESTS
  ✅ TEST 1: courier_payments table exists
  ✅ TEST 2: invoices table exists
  ✅ TEST 3: calculate_courier_payment function exists
  ✅ TEST 4: generate_invoice_number function exists

💰 PAYMENT CALCULATION TESTS
  ✅ TEST 5: Calculate payment for courier
  ✅ TEST 6: Calculate payment with custom commission
  ✅ TEST 7: Calculate payment with custom base rate
  ✅ TEST 8: Invalid date range throws error
  ✅ TEST 9: Future end date throws error

📝 PAYMENT CRUD TESTS
  ✅ TEST 10: Create payment record
  ✅ TEST 11: Get payment by ID
  ✅ TEST 12: Get courier payments
  ✅ TEST 13: Filter courier payments by status
  ✅ TEST 14: Duplicate payment throws error

🔄 PAYMENT WORKFLOW TESTS
  ✅ TEST 15: Approve payment
  ✅ TEST 16: Cannot approve already approved payment
  ✅ TEST 17: Mark payment as paid and generate invoice
  ✅ TEST 18: Cannot mark unapproved payment as paid

❌ REJECTION WORKFLOW TESTS
  ✅ TEST 19: Reject payment

📄 INVOICE TESTS
  ✅ TEST 20: Get invoice by ID
  ✅ TEST 21: Get courier invoices
  ✅ TEST 22: Invoice number generation

============================================================
📊 TEST SUMMARY
  Total Tests: 22
  ✅ Passed: 22
  ❌ Failed: 0
  Success Rate: 100.0%

🎉 ALL TESTS PASSED!
```

---

## Appendix

### Payment Status Reference

| Status   | Description                                | Can Transition To     |
|----------|--------------------------------------------|-----------------------|
| pending  | Payment created, awaiting admin approval   | approved, rejected    |
| approved | Payment approved, ready for processing     | paid                  |
| paid     | Payment completed, invoice generated       | -                     |
| rejected | Payment rejected by admin                  | -                     |
| failed   | Payment processing failed (rare)           | pending               |

### Invoice Status Reference

| Status    | Description                          |
|-----------|--------------------------------------|
| draft     | Invoice created but not sent yet     |
| sent      | Invoice sent to courier              |
| paid      | Invoice marked as paid               |
| cancelled | Invoice cancelled                    |

### Commission Rates

| Courier Type    | Default Rate | Notes                           |
|-----------------|--------------|----------------------------------|
| Standard        | 15%          | Regular couriers                 |
| Premium         | 12%          | High-volume couriers (100+/mo)   |
| Probation       | 20%          | New couriers (first 30 days)     |

*Custom rates can be set per payment*

---

## Support

### Contact

- **Email:** dev@foodie.se
- **Slack:** #payment-system
- **Documentation:** https://docs.foodie.se/payments

### Related Documentation

- [PHASE 3A: Courier Management Guide](./PHASE-3A-COURIER-MANAGEMENT-GUIDE.md)
- [PHASE 3B.1: GPS Tracking Guide](./PHASE-3B.1-GPS-TRACKING-GUIDE.md)
- [PHASE 3B.3: Analytics Dashboard Guide](./PHASE-3B.3-ANALYTICS-GUIDE.md)
- [PHASE 3B.5: Mobile App Integration Guide](./PHASE-3B.5-MOBILE-APP-INTEGRATION-GUIDE.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-30
**Author:** Claude Code
**Status:** Complete - Production Ready
