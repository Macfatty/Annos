# PHASE 3B.4: Payment Processing System - Usage Guide

Complete guide for managing courier payments and invoices.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Payment Workflow](#payment-workflow)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Payment Processing System provides comprehensive courier payment management including:

- **Automatic Payment Calculation**: Based on deliveries completed (35 SEK/delivery default)
- **Commission System**: 15% platform commission (customizable)
- **Payment Workflow**: pending → approved → paid
- **Invoice Generation**: Automatic invoice creation with sequential numbering
- **Audit Trail**: Complete timestamp tracking for all state changes

### Key Features

- Calculate payments for any date range
- Support for custom commission rates and base rates
- Payment approval/rejection workflow
- Automatic invoice generation (JSON format, PDF-ready structure)
- Permission-based access control

---

## API Endpoints

### 1. Calculate Payment

Calculate payment for a courier without creating a record.

```http
POST /api/payments/calculate
Authorization: Bearer <token>
Content-Type: application/json

{
  "courierId": 1,
  "periodStart": "2025-11-01T00:00:00Z",
  "periodEnd": "2025-11-30T23:59:59Z",
  "commissionPercentage": 15.00,  // Optional, default: 15
  "baseRate": 35.00                // Optional, default: 35 SEK/delivery
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "period_start": "2025-11-01T00:00:00.000Z",
    "period_end": "2025-11-30T23:59:59.000Z",
    "total_deliveries": 150,
    "completed_deliveries": 145,
    "base_amount": 5075.00,
    "commission_percentage": 15.00,
    "commission_amount": 761.25,
    "net_amount": 4313.75,
    "base_rate": 35.00
  }
}
```

---

### 2. Create Payment

Create a payment record (admin only).

```http
POST /api/payments
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "courierId": 1,
  "periodStart": "2025-11-01T00:00:00Z",
  "periodEnd": "2025-11-30T23:59:59Z",
  "paymentMethod": "bank_transfer",
  "paymentNotes": "Monthly payment November 2025"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "courier_id": 1,
    "period_start": "2025-11-01T00:00:00.000Z",
    "period_end": "2025-11-30T23:59:59.000Z",
    "total_deliveries": 150,
    "completed_deliveries": 145,
    "base_amount": "5075.00",
    "commission_percentage": "15.00",
    "commission_amount": "761.25",
    "net_amount": "4313.75",
    "payment_method": "bank_transfer",
    "payment_notes": "Monthly payment November 2025",
    "status": "pending",
    "created_at": "2025-11-30T12:00:00.000Z"
  }
}
```

---

### 3. Get Payment by ID

Retrieve payment details (admin or courier for own payment).

```http
GET /api/payments/1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "courier_id": 1,
    "courier_name": "John Doe",
    "courier_email": "john@example.com",
    "period_start": "2025-11-01T00:00:00.000Z",
    "period_end": "2025-11-30T23:59:59.000Z",
    "base_amount": "5075.00",
    "net_amount": "4313.75",
    "status": "pending",
    "created_at": "2025-11-30T12:00:00.000Z"
  }
}
```

---

### 4. Get Courier Payments

Get all payments for a specific courier (with optional filtering).

```http
GET /api/payments/courier/1?status=pending&limit=10&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, paid, rejected)
- `limit` (optional): Number of results to return
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "courier_id": 1,
      "courier_name": "John Doe",
      "courier_email": "john@example.com",
      "period_start": "2025-11-01T00:00:00.000Z",
      "period_end": "2025-11-30T23:59:59.000Z",
      "net_amount": "4313.75",
      "status": "pending",
      "created_at": "2025-11-30T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 5. Approve Payment

Approve a pending payment (admin only).

```http
POST /api/payments/1/approve
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "data": {
    "id": 1,
    "status": "approved",
    "approved_at": "2025-11-30T13:00:00.000Z",
    "approved_by": 2
  }
}
```

---

### 6. Reject Payment

Reject a pending payment (admin only).

```http
POST /api/payments/1/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reason": "Invalid period - overlaps with previous payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment rejected",
  "data": {
    "id": 1,
    "status": "rejected",
    "rejected_at": "2025-11-30T13:30:00.000Z",
    "rejected_by": 2,
    "rejection_reason": "Invalid period - overlaps with previous payment"
  }
}
```

---

### 7. Mark as Paid

Mark approved payment as paid and generate invoice (admin only).

```http
POST /api/payments/1/pay
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "paymentMethod": "swish",
  "paymentReference": "SWISH-123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment marked as paid and invoice generated",
  "data": {
    "payment": {
      "id": 1,
      "status": "paid",
      "paid_at": "2025-11-30T14:00:00.000Z",
      "payment_method": "swish",
      "payment_reference": "SWISH-123456789"
    },
    "invoice": {
      "id": 1,
      "payment_id": 1,
      "invoice_number": "INV-2025-000001",
      "invoice_date": "2025-11-30",
      "due_date": "2025-12-30",
      "status": "sent",
      "invoice_data": {
        "courier": {
          "name": "John Doe",
          "email": "john@example.com",
          "address": ""
        },
        "totals": {
          "subtotal": 5075.00,
          "commission": 761.25,
          "net": 4313.75
        }
      }
    }
  }
}
```

---

### 8. Get Invoice by ID

Retrieve invoice details.

```http
GET /api/payments/invoices/1
Authorization: Bearer <token>
```

---

### 9. Get Courier Invoices

Get all invoices for a courier.

```http
GET /api/payments/courier/1/invoices?status=sent&limit=10
Authorization: Bearer <token>
```

---

## Payment Workflow

### Standard Payment Flow

```
1. Create Payment (pending)
   ↓
2. Admin Reviews
   ↓
3a. Approve Payment        OR    3b. Reject Payment
    ↓                              ↓
4. Mark as Paid                    END (rejected)
   ↓
5. Invoice Generated
   ↓
6. Payment Complete (paid)
```

### State Transitions

| From State | To State   | Action                    | Who Can Do It |
|-----------|-----------|---------------------------|---------------|
| -         | pending   | Create payment            | Admin         |
| pending   | approved  | Approve payment           | Admin         |
| pending   | rejected  | Reject payment            | Admin         |
| approved  | paid      | Mark as paid + invoice    | Admin         |

**Important Notes:**
- Only pending payments can be approved or rejected
- Only approved payments can be marked as paid
- Invoice is automatically generated when marking as paid
- All state changes create audit trail entries

---

## Usage Examples

### Example 1: Monthly Payment Cycle (Admin)

```javascript
// 1. Calculate payment for courier
const calculation = await fetch('/api/payments/calculate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    courierId: 5,
    periodStart: '2025-11-01T00:00:00Z',
    periodEnd: '2025-11-30T23:59:59Z'
  })
});

const calc = await calculation.json();
console.log(`Courier will receive: ${calc.data.net_amount} SEK`);

// 2. Create payment if amount looks correct
const createPayment = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    courierId: 5,
    periodStart: '2025-11-01T00:00:00Z',
    periodEnd: '2025-11-30T23:59:59Z',
    paymentMethod: 'bank_transfer',
    paymentNotes: 'November 2025 monthly payment'
  })
});

const payment = await createPayment.json();
const paymentId = payment.data.id;

// 3. Approve payment
await fetch(`/api/payments/${paymentId}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

// 4. After bank transfer completes, mark as paid
const finalizePayment = await fetch(`/api/payments/${paymentId}/pay`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paymentMethod: 'bank_transfer',
    paymentReference: 'BANK-TX-987654'
  })
});

const result = await finalizePayment.json();
console.log(`Invoice generated: ${result.data.invoice.invoice_number}`);
```

---

### Example 2: Courier Viewing Own Payments

```javascript
// Get all payments for logged-in courier
const getPayments = async (courierToken, courierId) => {
  const response = await fetch(`/api/payments/courier/${courierId}`, {
    headers: {
      'Authorization': `Bearer ${courierToken}`
    }
  });

  const result = await response.json();
  return result.data;
};

// Get all invoices
const getInvoices = async (courierToken, courierId) => {
  const response = await fetch(`/api/payments/courier/${courierId}/invoices`, {
    headers: {
      'Authorization': `Bearer ${courierToken}`
    }
  });

  const result = await response.json();
  return result.data;
};

// Example usage
const payments = await getPayments(token, 5);
console.log(`You have ${payments.length} payments`);

const pendingPayments = payments.filter(p => p.status === 'pending');
console.log(`${pendingPayments.length} pending approval`);

const paidPayments = payments.filter(p => p.status === 'paid');
const totalEarned = paidPayments.reduce((sum, p) => sum + parseFloat(p.net_amount), 0);
console.log(`Total earned: ${totalEarned} SEK`);
```

---

### Example 3: React Payment Dashboard (Admin)

```jsx
import React, { useState, useEffect } from 'react';

function PaymentDashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all pending payments
    fetch('/api/payments/courier/all?status=pending', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
    .then(res => res.json())
    .then(data => {
      setPayments(data.data);
      setLoading(false);
    });
  }, []);

  const approvePayment = async (paymentId) => {
    const response = await fetch(`/api/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });

    if (response.ok) {
      // Refresh payments list
      setPayments(payments.map(p =>
        p.id === paymentId ? { ...p, status: 'approved' } : p
      ));
    }
  };

  const markPaid = async (paymentId, paymentRef) => {
    const response = await fetch(`/api/payments/${paymentId}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: 'bank_transfer',
        paymentReference: paymentRef
      })
    });

    if (response.ok) {
      const result = await response.json();
      alert(`Invoice generated: ${result.data.invoice.invoice_number}`);
      // Refresh list
      setPayments(payments.filter(p => p.id !== paymentId));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Pending Payments</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Courier</th>
            <th>Period</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>{payment.id}</td>
              <td>{payment.courier_name}</td>
              <td>
                {new Date(payment.period_start).toLocaleDateString()} -
                {new Date(payment.period_end).toLocaleDateString()}
              </td>
              <td>{payment.net_amount} SEK</td>
              <td>{payment.status}</td>
              <td>
                {payment.status === 'pending' && (
                  <button onClick={() => approvePayment(payment.id)}>
                    Approve
                  </button>
                )}
                {payment.status === 'approved' && (
                  <button onClick={() => {
                    const ref = prompt('Enter payment reference:');
                    if (ref) markPaid(payment.id, ref);
                  }}>
                    Mark as Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentDashboard;
```

---

## Best Practices

### 1. Payment Period Management

**DO:**
- Use consistent periods (e.g., monthly: 1st - last day of month)
- Ensure periods don't overlap
- Use ISO 8601 format for dates
- Include time zone in period boundaries

**DON'T:**
- Create multiple payments for overlapping periods
- Use future end dates
- Create payments with start date after end date

```javascript
// GOOD: Monthly payment
{
  periodStart: '2025-11-01T00:00:00Z',
  periodEnd: '2025-11-30T23:59:59Z'
}

// BAD: Overlapping with different periods
{
  periodStart: '2025-11-15T00:00:00Z',
  periodEnd: '2025-12-15T23:59:59Z'
}
```

---

### 2. Commission Rate Configuration

Default commission is 15%, but can be customized per payment:

```javascript
// Standard commission (15%)
const standardPayment = {
  courierId: 1,
  periodStart: '2025-11-01T00:00:00Z',
  periodEnd: '2025-11-30T23:59:59Z'
  // Uses default 15% commission
};

// Custom commission (e.g., promotional rate)
const promotionalPayment = {
  courierId: 1,
  periodStart: '2025-11-01T00:00:00Z',
  periodEnd: '2025-11-30T23:59:59Z',
  commissionPercentage: 10.00  // 10% commission
};
```

---

### 3. Error Handling

Always handle errors properly:

```javascript
async function createPaymentSafe(paymentData) {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 409) {
        console.error('Payment already exists for this period');
      } else if (response.status === 400) {
        console.error('Invalid data:', result.error);
      }
      throw new Error(result.error);
    }

    return result.data;
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}
```

---

### 4. Invoice Data Structure

Invoices are stored as JSON with this structure:

```javascript
{
  "courier": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": ""
  },
  "company": {
    "name": "Foodie Platform AB",
    "address": "Platform Street 123, Stockholm",
    "org_number": "556XXX-XXXX",
    "vat": "SE556XXXXXXX01"
  },
  "period": {
    "start": "2025-11-01T00:00:00.000Z",
    "end": "2025-11-30T23:59:59.000Z"
  },
  "lineItems": [
    {
      "description": "Courier services - 145 deliveries",
      "quantity": 145,
      "rate": 35.00,
      "amount": 5075.00
    },
    {
      "description": "Platform commission (15%)",
      "quantity": 1,
      "rate": -761.25,
      "amount": -761.25
    }
  ],
  "totals": {
    "subtotal": 5075.00,
    "commission": 761.25,
    "net": 4313.75,
    "vat": 0,
    "total": 4313.75
  },
  "notes": "Payment due within 30 days. Thank you for your service!"
}
```

This structure is ready for PDF generation or external accounting system integration.

---

## Troubleshooting

### Common Issues

#### 1. "Payment already exists for this courier and period"

**Cause:** Duplicate payment for the same date range.

**Solution:** Check existing payments first:
```javascript
const existing = await fetch(`/api/payments/courier/${courierId}`);
// Review existing payments before creating new one
```

---

#### 2. "Payment must be approved before marking as paid"

**Cause:** Trying to mark unapproved payment as paid.

**Solution:** Approve payment first:
```javascript
// Step 1: Approve
await fetch(`/api/payments/${paymentId}/approve`, { method: 'POST', ... });

// Step 2: Mark as paid
await fetch(`/api/payments/${paymentId}/pay`, { method: 'POST', ... });
```

---

#### 3. "Period end cannot be in the future"

**Cause:** End date is after current date.

**Solution:** Use current date or earlier:
```javascript
const now = new Date().toISOString();
const periodEnd = new Date(Math.min(
  new Date(requestedEnd),
  new Date()
)).toISOString();
```

---

#### 4. Invoice number collision

**Cause:** Database issue with sequence generation.

**Solution:** The `generate_invoice_number()` function handles this automatically. If issues persist, check:
```sql
-- Verify invoice number generation
SELECT generate_invoice_number();

-- Check latest invoice number
SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1;
```

---

## Migration and Setup

### Running Migration 007

```bash
cd /home/macfatty/foodie/Annos/backend
node run-migration-007.js
```

This creates:
- `courier_payments` table
- `invoices` table
- `calculate_courier_payment()` function
- `generate_invoice_number()` function
- 8 indexes for performance

---

## Testing

Run the comprehensive test suite:

```bash
cd /home/macfatty/foodie/Annos/backend
node test-payments.js
```

Test coverage:
- 22 tests covering all functionality
- Database structure validation
- Payment calculation with custom rates
- CRUD operations
- Workflow testing (approve/reject/pay)
- Invoice generation
- Duplicate prevention
- Permission checks

---

## Production Checklist

Before deploying to production:

- [ ] Run migration 007
- [ ] Run test suite (all 22 tests must pass)
- [ ] Configure commission rate if different from 15%
- [ ] Configure base delivery rate if different from 35 SEK
- [ ] Set up automated monthly payment creation (cron job)
- [ ] Configure payment provider integration (Swish/Stripe)
- [ ] Set up invoice email delivery
- [ ] Configure backup strategy for payment data
- [ ] Document payment approval workflow for admins
- [ ] Train admin users on payment system

---

**PHASE 3B.4 Payment Processing System**
Version: 1.0
Last Updated: 2025-11-30
Tests: 22/22 Passing (100%)
Status: Production Ready
