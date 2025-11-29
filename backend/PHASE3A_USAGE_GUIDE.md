# 📖 PHASE 3A Usage Guide - Courier Management API

**Version:** 1.0
**Date:** 2025-11-29
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication & Permissions](#authentication--permissions)
3. [API Endpoints](#api-endpoints)
4. [Database Structure](#database-structure)
5. [Common Use Cases](#common-use-cases)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Overview

PHASE 3A implementerar ett komplett Courier Management System med:
- Courier profiles (profiler)
- Courier contracts (kontrakt)
- Statistics & analytics (statistik)
- Integration med order-systemet

### Nyckelfeatures:
- ✅ CRUD operationer för courier profiles
- ✅ Kontrakt management
- ✅ Real-time statistik via database view
- ✅ Permission-baserad åtkomstkontroll
- ✅ Audit logging
- ✅ 100% backward compatible

---

## Authentication & Permissions

### Permissions

PHASE 3A använder två permissions:

| Permission | Beskrivning | Tilldelad till |
|------------|-------------|----------------|
| `courier:view` | Visa courier information | Courier, Admin |
| `courier:manage` | Hantera couriers och kontrakt | Admin |

### Roller

| Roll | Permissions | Kan göra |
|------|------------|----------|
| **Admin** | courier:view, courier:manage | Allt |
| **Courier** | courier:view | Se egen profil, kontrakt, statistik |
| **Restaurant** | - | Inget (än) |
| **Customer** | - | Inget (än) |

### Autentisering

Alla skyddade endpoints kräver JWT token via cookie:

```bash
# 1. Logga in
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c cookies.txt

# 2. Använd cookie i requests
curl http://localhost:3001/api/couriers \
  -b cookies.txt
```

---

## API Endpoints

### Public Endpoints (Ingen autentisering krävs)

#### 1. Get Available Couriers

**Endpoint:** `GET /api/couriers/available`
**Permission:** None (public)
**Beskrivning:** Hämta alla tillgängliga couriers

**Query Parameters:**
- `vehicleType` (optional): Filter by vehicle type (bike, car, scooter, walking)

**Request:**
```bash
# Alla tillgängliga couriers
curl http://localhost:3001/api/couriers/available

# Endast bike couriers
curl http://localhost:3001/api/couriers/available?vehicleType=bike
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "courier_id": 1,
      "user_id": 4,
      "courier_name": "testcourier@test.com",
      "courier_email": "testcourier@test.com",
      "vehicle_type": "bike",
      "is_available": true,
      "rating": "5.00",
      "total_deliveries": 0,
      "lifetime_orders": "0",
      "completed_orders": "0",
      "cancelled_orders": "0",
      "avg_delivery_time_minutes": null,
      "last_delivery_at": null
    }
  ],
  "count": 1
}
```

---

### Courier Endpoints (Kräver `courier:view`)

#### 2. Get Own Courier Profile

**Endpoint:** `GET /api/couriers/user/:userId`
**Permission:** `courier:view`
**Beskrivning:** Courier kan hämta sin egen profil

**Request:**
```bash
curl http://localhost:3001/api/couriers/user/4 \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "user_id": 4,
    "courier_name": "testcourier@test.com",
    "courier_email": "testcourier@test.com",
    "vehicle_type": "bike",
    "is_available": true,
    "rating": "5.00",
    "total_deliveries": 0,
    "lifetime_orders": "0",
    "completed_orders": "0",
    "cancelled_orders": "0",
    "avg_delivery_time_minutes": null,
    "last_delivery_at": null
  }
}
```

#### 3. Get Own Courier Statistics

**Endpoint:** `GET /api/couriers/:id/stats`
**Permission:** `courier:view`
**Beskrivning:** Hämta statistik för egen courier profile

**Request:**
```bash
curl http://localhost:3001/api/couriers/1/stats \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "user_id": 4,
    "vehicle_type": "bike",
    "is_available": true,
    "rating": "5.00",
    "total_deliveries": 0,
    "lifetime_orders": "0",
    "completed_orders": "0",
    "cancelled_orders": "0",
    "avg_delivery_time_minutes": null,
    "last_delivery_at": null
  }
}
```

#### 4. Get Own Courier Contracts

**Endpoint:** `GET /api/couriers/:id/contracts`
**Permission:** `courier:view`
**Beskrivning:** Hämta sina kontrakt

**Query Parameters:**
- `includeInactive` (optional): Include inactive contracts (true/false)

**Request:**
```bash
# Endast aktiva kontrakt
curl http://localhost:3001/api/couriers/1/contracts \
  -b cookies.txt

# Inkludera inaktiva
curl http://localhost:3001/api/couriers/1/contracts?includeInactive=true \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "courier_id": 1,
      "contract_type": "freelance",
      "start_date": "2025-11-29",
      "end_date": null,
      "delivery_rate": "50.00",
      "is_active": true,
      "created_at": "2025-11-29T08:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### Admin Endpoints (Kräver `courier:manage`)

#### 5. Get All Couriers

**Endpoint:** `GET /api/couriers`
**Permission:** `courier:manage`
**Beskrivning:** Hämta alla couriers (admin)

**Query Parameters:**
- `includeUnavailable` (optional): Include unavailable couriers (true/false)

**Request:**
```bash
# Endast tillgängliga
curl http://localhost:3001/api/couriers \
  -b cookies.txt

# Alla (inkl. ej tillgängliga)
curl http://localhost:3001/api/couriers?includeUnavailable=true \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "courier_id": 1,
      "user_id": 4,
      "courier_name": "testcourier@test.com",
      "courier_email": "testcourier@test.com",
      "vehicle_type": "bike",
      "is_available": true,
      "rating": "5.00",
      "total_deliveries": 0,
      "lifetime_orders": "0",
      "completed_orders": "0",
      "cancelled_orders": "0",
      "avg_delivery_time_minutes": null,
      "last_delivery_at": null
    }
  ],
  "count": 1
}
```

#### 6. Get Courier by ID

**Endpoint:** `GET /api/couriers/:id`
**Permission:** `courier:manage`
**Beskrivning:** Hämta specifik courier (admin)

**Request:**
```bash
curl http://localhost:3001/api/couriers/1 \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "user_id": 4,
    "courier_name": "testcourier@test.com",
    "courier_email": "testcourier@test.com",
    "vehicle_type": "bike",
    "is_available": true,
    "rating": "5.00",
    "total_deliveries": 0
  }
}
```

#### 7. Create Courier Profile

**Endpoint:** `POST /api/couriers`
**Permission:** `courier:manage`
**Beskrivning:** Skapa ny courier profile för en user

**Request Body:**
```json
{
  "userId": 5,
  "vehicleType": "bike"
}
```

**Valid vehicle types:**
- `bike`
- `car`
- `scooter`
- `walking`

**Request:**
```bash
curl -X POST http://localhost:3001/api/couriers \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "userId": 5,
    "vehicleType": "bike"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "user_id": 5,
    "vehicle_type": "bike",
    "is_available": true,
    "rating": "5.00",
    "total_deliveries": 0,
    "created_at": "2025-11-29T10:00:00.000Z"
  },
  "message": "Courier profile created successfully"
}
```

#### 8. Update Courier Profile

**Endpoint:** `PUT /api/couriers/:id`
**Permission:** `courier:manage`
**Beskrivning:** Uppdatera courier profile

**Request Body (alla fält optional):**
```json
{
  "vehicleType": "car",
  "isAvailable": true,
  "rating": 4.5
}
```

**Request:**
```bash
curl -X PUT http://localhost:3001/api/couriers/1 \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "vehicleType": "car",
    "rating": 4.8
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 4,
    "vehicle_type": "car",
    "is_available": true,
    "rating": "4.80",
    "total_deliveries": 0,
    "updated_at": "2025-11-29T10:30:00.000Z"
  },
  "message": "Courier profile updated successfully"
}
```

#### 9. Toggle Courier Availability

**Endpoint:** `PATCH /api/couriers/:id/availability`
**Permission:** `courier:manage`
**Beskrivning:** Ändra courier tillgänglighet (on/off duty)

**Request Body:**
```json
{
  "isAvailable": false
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3001/api/couriers/1/availability \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"isAvailable": false}'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 4,
    "is_available": false,
    "updated_at": "2025-11-29T10:45:00.000Z"
  },
  "message": "Courier availability updated successfully"
}
```

#### 10. Create Courier Contract

**Endpoint:** `POST /api/couriers/:id/contracts`
**Permission:** `courier:manage`
**Beskrivning:** Skapa nytt kontrakt för courier

**Request Body:**
```json
{
  "contractType": "freelance",
  "startDate": "2025-12-01",
  "endDate": "2026-11-30",
  "deliveryRate": 55.00
}
```

**Valid contract types:**
- `employee`
- `contractor`
- `freelance`

**Request:**
```bash
curl -X POST http://localhost:3001/api/couriers/1/contracts \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "contractType": "freelance",
    "startDate": "2025-12-01",
    "deliveryRate": 55.00
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "courier_id": 1,
    "contract_type": "freelance",
    "start_date": "2025-12-01",
    "end_date": null,
    "delivery_rate": "55.00",
    "is_active": true,
    "created_at": "2025-11-29T11:00:00.000Z"
  },
  "message": "Contract created successfully"
}
```

#### 11. Deactivate Courier Contract

**Endpoint:** `DELETE /api/couriers/:id/contracts/:contractId`
**Permission:** `courier:manage`
**Beskrivning:** Deaktivera ett kontrakt (soft delete)

**Request:**
```bash
curl -X DELETE http://localhost:3001/api/couriers/1/contracts/1 \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Contract deactivated successfully"
}
```

#### 12. Get Global Statistics

**Endpoint:** `GET /api/couriers/stats/global`
**Permission:** `courier:manage`
**Beskrivning:** Hämta systemövergripande statistik

**Request:**
```bash
curl http://localhost:3001/api/couriers/stats/global \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_couriers": 5,
    "available_couriers": 3,
    "unavailable_couriers": 2,
    "total_deliveries": 127,
    "avg_rating": "4.65",
    "active_contracts": 4
  }
}
```

---

## Database Structure

### Tabeller

#### courier_profiles
```sql
id                  SERIAL PRIMARY KEY
user_id             INTEGER UNIQUE (FK to users)
vehicle_type        VARCHAR(50) (bike/car/scooter/walking)
is_available        BOOLEAN (default true)
rating              DECIMAL(3,2) (0-5)
total_deliveries    INTEGER (default 0)
created_at          TIMESTAMP
updated_at          TIMESTAMP (auto-update trigger)
```

#### courier_contracts
```sql
id              SERIAL PRIMARY KEY
courier_id      INTEGER (FK to courier_profiles)
contract_type   VARCHAR(50) (employee/contractor/freelance)
start_date      DATE
end_date        DATE (nullable)
delivery_rate   DECIMAL(10,2)
is_active       BOOLEAN (default true)
created_by      INTEGER (FK to users)
created_at      TIMESTAMP
```

### View: courier_statistics

Pre-calculated view för snabb statistik:

```sql
courier_id                    -- Courier profile ID
user_id                       -- User ID
courier_name                  -- Namn (från users.namn)
courier_email                 -- Email
vehicle_type                  -- Fordonstyp
is_available                  -- Tillgänglig
rating                        -- Betyg
total_deliveries              -- Totalt antal leveranser
lifetime_orders               -- Alla ordrar
completed_orders              -- Genomförda ordrar
cancelled_orders              -- Avbrutna ordrar
avg_delivery_time_minutes     -- Genomsnittlig leveranstid
last_delivery_at              -- Senaste leverans
```

### Indexes

Performance optimering:
- `idx_courier_profiles_user_id` - Snabb lookup by user
- `idx_courier_profiles_available` - Partial index för tillgängliga
- `idx_courier_contracts_courier` - Kontrakt per courier
- `idx_courier_contracts_active` - Partial index för aktiva kontrakt

---

## Common Use Cases

### Use Case 1: Hitta Närmaste Tillgängliga Courier

**Scenario:** Restaurant behöver hitta en courier för en order

```bash
# 1. Hämta alla tillgängliga couriers
curl http://localhost:3001/api/couriers/available?vehicleType=bike

# 2. Välj närmaste (frontend logic baserat på GPS)
# 3. Tilldela order till courier (använd OrderService)
curl -X PATCH http://localhost:3001/api/orders/123/assign \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"courierId": 4}'
```

### Use Case 2: Courier Börjar/Slutar Sitt Pass

**Scenario:** Courier loggar in/ut från arbete

```bash
# Starta pass (sätt tillgänglig)
curl -X PATCH http://localhost:3001/api/couriers/1/availability \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"isAvailable": true}'

# Sluta pass (sätt otillgänglig)
curl -X PATCH http://localhost:3001/api/couriers/1/availability \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"isAvailable": false}'
```

### Use Case 3: Admin Skapar Ny Courier

**Scenario:** Ny courier anställs

```bash
# 1. Skapa user först (om inte redan finns)
curl -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newcourier@example.com",
    "password": "secure123",
    "role": "courier"
  }'

# 2. Skapa courier profile
curl -X POST http://localhost:3001/api/couriers \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "userId": 6,
    "vehicleType": "bike"
  }'

# 3. Skapa kontrakt
curl -X POST http://localhost:3001/api/couriers/2/contracts \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "contractType": "freelance",
    "startDate": "2025-12-01",
    "deliveryRate": 50.00
  }'
```

### Use Case 4: Visa Courier Dashboard

**Scenario:** Courier vill se sina stats

```bash
# 1. Hämta profil
curl http://localhost:3001/api/couriers/user/4 \
  -b cookies.txt

# 2. Hämta statistik
curl http://localhost:3001/api/couriers/1/stats \
  -b cookies.txt

# 3. Hämta aktiva ordrar (från OrderService)
curl http://localhost:3001/api/orders/courier/active \
  -b cookies.txt
```

### Use Case 5: Admin Övervakar Alla Couriers

**Scenario:** Manager vill se systemstatus

```bash
# 1. Hämta global statistik
curl http://localhost:3001/api/couriers/stats/global \
  -b cookies.txt

# 2. Hämta alla couriers med detaljer
curl http://localhost:3001/api/couriers \
  -b cookies.txt

# 3. Filtrera tillgängliga couriers
curl http://localhost:3001/api/couriers/available \
  -b cookies.txt
```

### Use Case 6: Uppdatera Courier Rating

**Scenario:** Efter leverans, uppdatera courier betyg

```bash
# Backend beräknar nytt genomsnittsbetyg baserat på customer feedback
curl -X PUT http://localhost:3001/api/couriers/1 \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "rating": 4.7
  }'
```

---

## Error Handling

### Error Response Format

Alla errors returneras i samma format:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "User-friendly message"
}
```

### Common Errors

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided",
  "message": "Authentication required"
}
```

**Lösning:** Logga in och använd JWT cookie

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "You don't have permission to access this resource"
}
```

**Lösning:** Du saknar rätt permission. Kontakta admin.

#### 404 Not Found
```json
{
  "success": false,
  "error": "Courier not found: 999",
  "message": "The requested resource was not found"
}
```

**Lösning:** Kontrollera att ID är korrekt

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid vehicle type: truck",
  "message": "Invalid input data"
}
```

**Lösning:** Kontrollera request body. Giltiga värden: bike, car, scooter, walking

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database connection failed",
  "message": "An internal error occurred"
}
```

**Lösning:** Kontakta systemadministratör

---

## Best Practices

### 1. Använd Rätt HTTP Metoder

```bash
GET     - Hämta data (ingen side effects)
POST    - Skapa ny resurs
PUT     - Uppdatera hela resursen
PATCH   - Uppdatera del av resursen
DELETE  - Ta bort (deactivate) resurs
```

### 2. Hantera Errors Gracefully

```javascript
// Frontend exempel
try {
  const response = await fetch('/api/couriers/1', {
    credentials: 'include' // Inkludera cookies
  });

  const data = await response.json();

  if (!data.success) {
    console.error('Error:', data.error);
    alert(data.message);
    return;
  }

  // Success - använd data.data
  console.log(data.data);
} catch (error) {
  console.error('Network error:', error);
  alert('Could not connect to server');
}
```

### 3. Cache Statisk Data

```javascript
// Cache tillgängliga couriers i 30 sekunder
let cachedCouriers = null;
let cacheTime = 0;

async function getAvailableCouriers() {
  const now = Date.now();

  if (cachedCouriers && (now - cacheTime) < 30000) {
    return cachedCouriers;
  }

  const response = await fetch('/api/couriers/available');
  const data = await response.json();

  if (data.success) {
    cachedCouriers = data.data;
    cacheTime = now;
  }

  return cachedCouriers;
}
```

### 4. Validera Input Innan Request

```javascript
function validateCourierData(data) {
  const validVehicleTypes = ['bike', 'car', 'scooter', 'walking'];

  if (data.vehicleType && !validVehicleTypes.includes(data.vehicleType)) {
    throw new Error(`Invalid vehicle type: ${data.vehicleType}`);
  }

  if (data.rating !== undefined && (data.rating < 0 || data.rating > 5)) {
    throw new Error('Rating must be between 0 and 5');
  }

  return true;
}
```

### 5. Använd Statistics View för Performance

```javascript
// GOOD - Använd statistics view (pre-calculated)
const stats = await fetch('/api/couriers/1/stats');

// BAD - Beräkna själv från orders (långsamt)
const orders = await fetch('/api/orders?courierId=1');
const completed = orders.filter(o => o.status === 'delivered').length;
```

### 6. Batch Updates Vid Möjlighet

```javascript
// Om du behöver uppdatera flera couriers, gör det i backend
// Undvik många små requests
// (Detta kan implementeras i PHASE 3B)
```

### 7. Respektera Rate Limits

```javascript
// Begränsa antal requests per sekund
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function updateMultipleCouriers(couriers) {
  for (const courier of couriers) {
    await updateCourier(courier);
    await delay(100); // 100ms mellan requests
  }
}
```

### 8. Log Viktiga Händelser

```javascript
// Frontend logging
console.log('[COURIER] Fetching available couriers');
console.log('[COURIER] Creating new courier profile');
console.log('[COURIER] Updating availability to:', isAvailable);
```

---

## Integration med OrderService

Courier Management är integrerat med OrderService:

### Tilldela Order till Courier

```javascript
// Använd OrderService.assignCourierToOrder()
const response = await fetch('/api/orders/123/assign', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ courierId: 4 })
});
```

### Markera Order som Levererad

```javascript
// Courier markerar order som levererad
const response = await fetch('/api/orders/123/delivered', {
  method: 'PATCH',
  credentials: 'include'
});

// Detta incrementerar automatiskt courier.total_deliveries
```

### Hämta Courier Orders

```javascript
// Hämta couriers aktiva ordrar
const response = await fetch('/api/orders/courier/active', {
  credentials: 'include'
});
```

---

## Testing

### Manual Testing med cURL

```bash
# 1. Logga in som admin
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c cookies.txt

# 2. Testa alla endpoints
curl http://localhost:3001/api/couriers -b cookies.txt
curl http://localhost:3001/api/couriers/1 -b cookies.txt
curl http://localhost:3001/api/couriers/available

# 3. Skapa test data
curl -X POST http://localhost:3001/api/couriers \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"userId":5,"vehicleType":"bike"}'
```

### Run Automated Tests

```bash
cd backend
node test-courier-service.js
```

Expected output:
```
================================================================================
PHASE 3A TEST SUITE: Courier Management System
================================================================================
✅ Tests passed: 13
❌ Tests failed: 0
📊 Total tests: 13
🎉 All tests passed! PHASE 3A implementation is complete.
```

---

## Troubleshooting

### Problem: "Authentication required"

**Symptom:** 401 Unauthorized
**Lösning:**
1. Kontrollera att du är inloggad
2. Använd `-b cookies.txt` i cURL requests
3. Kolla att JWT token inte har expired (standard: 24h)

### Problem: "Courier not found"

**Symptom:** 404 Not Found
**Lösning:**
1. Verifiera att courier ID är korrekt
2. Kolla att courier profile finns i databasen:
```bash
psql -d annos_dev -c "SELECT * FROM courier_profiles WHERE id = 1"
```

### Problem: "Insufficient permissions"

**Symptom:** 403 Forbidden
**Lösning:**
1. Kontrollera din user role:
```bash
curl http://localhost:3001/api/profile -b cookies.txt
```
2. Verifiera att rollen har rätt permissions:
```bash
psql -d annos_dev -c "SELECT * FROM role_permissions WHERE role_name = 'courier'"
```

### Problem: Slow Performance

**Symptom:** Requests tar > 1 sekund
**Lösning:**
1. Använd statistics view istället för joins
2. Kontrollera att indexes finns:
```bash
psql -d annos_dev -c "\d courier_profiles"
```
3. Analysera slow queries:
```bash
psql -d annos_dev -c "EXPLAIN ANALYZE SELECT * FROM courier_statistics"
```

---

## Changelog

### Version 1.0 (2025-11-29)
- Initial release
- 12 API endpoints
- 2 database tables
- 1 statistics view
- 13 automated tests
- Complete documentation

---

## Support

**Documentation:**
- PHASE3A_COMPLETE_SUMMARY.md - Implementation details
- PHASE3_UPDATED_PLAN.md - Future enhancements (PHASE 3B)

**Testing:**
```bash
cd backend
node test-courier-service.js
```

**Database Schema:**
```bash
psql -d annos_dev -c "\d courier_profiles"
psql -d annos_dev -c "\d courier_contracts"
psql -d annos_dev -c "\dv courier_statistics"
```

---

**Guide Version:** 1.0
**Last Updated:** 2025-11-29
**Status:** ✅ Production Ready
