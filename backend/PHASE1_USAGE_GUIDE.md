# 📖 PHASE 1 - Permission-Based Authorization Usage Guide

**Version:** 1.0
**Date:** 2025-11-26
**API Base URL:** `http://localhost:3001`

---

## 🎯 Översikt

PHASE 1 introducerade ett komplett permission-baserat auktoriseringssystem som ersätter det enkla rollbaserade systemet. Systemet ger granulär kontroll över vad användare kan göra baserat på deras roll och specifika permissions.

---

## 🔐 Rollsystem

### Tillgängliga Roller

**Admin:**
- Har alla 20 permissions automatiskt
- Full åtkomst till hela systemet
- Kan hantera användare, restauranger, menyer, ordrar

**Restaurant:**
- Kan se och hantera sina egna ordrar
- Kan uppdatera meny för sin restaurang
- Kan se order-status
- **8 permissions totalt**

**Courier (Kurir):**
- Kan se tillgängliga ordrar
- Kan acceptera och leverera ordrar
- Kan uppdatera order-status
- **5 permissions totalt**

**Customer (Kund):**
- Kan se och skapa sina egna ordrar
- Kan se meny (publikt)
- Kan uppdatera sin profil
- **6 permissions totalt**

---

## 🎫 Permission-system

### Alla Permissions (20 st)

**Orders (5 permissions):**
```
orders:view:all     - Se alla ordrar (admin)
orders:view:own     - Se egna ordrar (customer, restaurant, courier)
orders:create       - Skapa ordrar (customer)
orders:update:status - Uppdatera order-status (restaurant, courier)
orders:cancel       - Avbryta ordrar (customer)
```

**Menu (3 permissions):**
```
menu:view      - Se menyer (alla, publikt)
menu:edit      - Redigera menyer (restaurant)
menu:create    - Skapa nya menyer (admin)
```

**Users (3 permissions):**
```
users:view     - Se användare (admin)
users:manage   - Hantera användare (admin)
users:delete   - Ta bort användare (admin)
```

**Restaurant (3 permissions):**
```
restaurant:view:all  - Se alla restauranger (admin)
restaurant:view:own  - Se sin egen restaurang (restaurant)
restaurant:manage    - Hantera restauranger (admin)
```

**Courier (3 permissions):**
```
courier:view:all  - Se alla kurirer (admin)
courier:view:own  - Se sin egen info (courier)
courier:manage    - Hantera kurirer (admin)
```

**Support (3 permissions):**
```
support:view    - Se support-ärenden (admin, restaurant)
support:create  - Skapa support-ärenden (alla)
support:manage  - Hantera support-ärenden (admin)
```

---

## 🔧 Autentisering

### 1. Registrera ny användare

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "namn": "Test User"
  }'
```

**Response:**
```json
{
  "message": "Användare skapad",
  "userId": 5,
  "role": "customer"
}
```

**Default role:** `customer`

---

### 2. Logga in

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }' \
  -c cookies.txt
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin",
    "namn": "Admin User"
  }
}
```

**JWT-token sparas automatiskt i cookie.**

**Rate limiting:**
- Max 5 login-försök per 15 minuter
- HTTP 429 "Too Many Requests" om överskridits

---

### 3. Logga ut

**Endpoint:** `POST /api/auth/logout`

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Utloggad"
}
```

**Vad händer:**
- JWT-token läggs till i blacklist
- Token kan inte längre användas (även om den inte har expirerat)
- Audit log skapas med action `auth:logout`

---

### 4. Hämta profil

**Endpoint:** `GET /api/profile`
**Autentisering:** Ja

```bash
curl http://localhost:3001/api/profile \
  -b cookies.txt
```

**Response:**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "role": "admin",
  "namn": "Admin User",
  "created_at": "2025-11-01T10:00:00.000Z"
}
```

---

### 5. Uppdatera profil

**Endpoint:** `PUT /api/profile`
**Autentisering:** Ja

```bash
curl -X PUT http://localhost:3001/api/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "namn": "Ny Namn",
    "email": "nyemail@example.com"
  }'
```

**Response:**
```json
{
  "message": "Profil uppdaterad",
  "user": {
    "id": 1,
    "email": "nyemail@example.com",
    "namn": "Ny Namn",
    "role": "admin"
  }
}
```

**Audit log:** `user:update`

---

## 🛡️ Permission-skyddade Endpoints

### Orders

#### 1. Skapa Order (Customer)

**Endpoint:** `POST /api/order`
**Permission:** `orders:create`

```bash
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "items": [
      {
        "menyId": 1,
        "antal": 2,
        "options": [
          {"optionId": 100, "pris": 10}
        ]
      }
    ],
    "totalBelopp": 270,
    "leveransadress": "Testgatan 1",
    "restaurang": "campino"
  }'
```

**Response:**
```json
{
  "message": "Order skapad",
  "orderId": 15
}
```

**Audit log:** `order:create`

---

#### 2. Hämta Dagens Orders (Restaurant)

**Endpoint:** `GET /api/admin/orders/today`
**Permission:** `orders:view:own`

```bash
curl http://localhost:3001/api/admin/orders/today \
  -b cookies.txt
```

**Response:**
```json
[
  {
    "id": 15,
    "status": "pending",
    "skapad": "2025-11-26T18:00:00.000Z",
    "totalpris": 270,
    "leveransadress": "Testgatan 1"
  }
]
```

---

#### 3. Hämta Orders för Restaurang (Restaurant)

**Endpoint:** `GET /api/admin/orders?slug=campino`
**Permission:** `orders:view:own`

```bash
curl "http://localhost:3001/api/admin/orders?slug=campino" \
  -b cookies.txt
```

**Validering:**
- Restaurant-användare måste ha `restaurant_slug` som matchar
- Admin kan se alla restaurangers ordrar

---

#### 4. Hämta Courier Orders (Courier)

**Endpoint:** `GET /api/courier/orders`
**Permission:** `orders:view:own`

```bash
curl http://localhost:3001/api/courier/orders \
  -b cookies.txt
```

**Response:**
```json
{
  "pending": [
    {"id": 15, "status": "ready", "restaurang": "campino"}
  ],
  "accepted": [
    {"id": 12, "status": "out_for_delivery", "restaurang": "sunsushi"}
  ]
}
```

---

#### 5. Acceptera Order (Courier)

**Endpoint:** `PATCH /api/courier/orders/:id/accept`
**Permission:** `orders:update:status`

```bash
curl -X PATCH http://localhost:3001/api/courier/orders/15/accept \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Order accepterad",
  "order": {
    "id": 15,
    "status": "out_for_delivery",
    "assigned_courier_id": 3
  }
}
```

**Audit log:** `order:update` (action: accepted)

---

#### 6. Markera Order som Levererad (Courier)

**Endpoint:** `PATCH /api/courier/orders/:id/delivered`
**Permission:** `orders:update:status`

```bash
curl -X PATCH http://localhost:3001/api/courier/orders/15/delivered \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Order levererad",
  "order": {
    "id": 15,
    "status": "delivered"
  }
}
```

**Audit log:** `order:update` (action: delivered)

---

#### 7. Markera Order som Klar (Restaurant)

**Endpoint:** `PUT /api/admin/orders/:id/klart`
**Permission:** `orders:update:status`

```bash
curl -X PUT http://localhost:3001/api/admin/orders/15/klart \
  -b cookies.txt
```

**Response:**
```json
{
  "message": "Order markerad som klar",
  "order": {
    "id": 15,
    "status": "ready"
  }
}
```

**Audit log:** `order:update` (action: marked_ready)

---

#### 8. Hämta Mina Orders (Customer)

**Endpoint:** `GET /api/my-orders`
**Permission:** `orders:view:own`

```bash
curl http://localhost:3001/api/my-orders \
  -b cookies.txt
```

**Response:**
```json
[
  {
    "id": 15,
    "status": "pending",
    "skapad": "2025-11-26T18:00:00.000Z",
    "totalpris": 270,
    "leveransadress": "Testgatan 1",
    "items": [...]
  }
]
```

---

## 📊 Audit Logging

Alla viktiga operationer loggas automatiskt i `audit_logs` tabell.

### Loggade Actions

**Auth:**
```
auth:login   - Användare loggade in
auth:logout  - Användare loggade ut
auth:register - Ny användare registrerad
```

**Orders:**
```
order:create - Order skapad
order:update - Order uppdaterad (status change)
order:cancel - Order avbruten
```

**Users:**
```
user:update - Användarprofil uppdaterad
user:delete - Användare borttagen
```

**Restaurant (PHASE 2):**
```
restaurant:create - Restaurang skapad
restaurant:update - Restaurang uppdaterad
restaurant:delete - Restaurang borttagen
```

**Menu (PHASE 2):**
```
menu:update  - Meny uppdaterad
menu:restore - Meny återställd från version
```

### Visa Audit Logs

```bash
cd backend
node check-audit.js
```

**Output:**
```
📋 SENASTE 10 AUDIT LOGS:

1. [2025-11-26T18:00:00.000Z]
   User: 1
   Action: order:create
   Resource: orders #15
   IP: ::1
   Details: { action: 'created', orderId: 15 }

2. [2025-11-26T17:55:00.000Z]
   User: 1
   Action: auth:logout
   Resource: N/A
   IP: ::1
   Details: { loggedOutAt: '2025-11-26T17:55:00.000Z' }

📊 STATISTIK:
   Totalt antal logs: 25
   Unika användare: 3
   Unika actions: 8
```

---

## 🔍 Permission-kontroll i Kod

### Backend: requirePermission Middleware

**Exempel från server.js:**

```javascript
// Single permission
app.post("/api/order",
  verifyJWT,
  requirePermission('orders:create'),
  async (req, res) => {
    // Handler
  }
);

// ANY permission (user has at least one)
app.get("/api/admin/orders",
  verifyJWT,
  requireAnyPermission(['orders:view:all', 'orders:view:own']),
  async (req, res) => {
    // Handler
  }
);

// ALL permissions (user must have all)
app.delete("/api/admin/users/:id",
  verifyJWT,
  requireAllPermissions(['users:view', 'users:delete']),
  async (req, res) => {
    // Handler
  }
);
```

### Frontend: usePermissions Hook

**Installation:**
```javascript
import { usePermissions } from './hooks';

function MyComponent() {
  const { hasPermission, isAdmin, role } = usePermissions();

  if (!hasPermission('orders:create')) {
    return <p>Du har inte tillgång till denna funktion</p>;
  }

  return (
    <div>
      {isAdmin && <AdminPanel />}
      {hasPermission('menu:edit') && <MenuEditor />}
    </div>
  );
}
```

### Frontend: ProtectedRoute Component

**Skydda routes baserat på permissions:**

```javascript
import { ProtectedRoute } from './components/common/ProtectedRoute';

<Routes>
  <Route
    path="/admin"
    element={
      <ProtectedRoute permission="orders:view:all">
        <AdminPanel />
      </ProtectedRoute>
    }
  />

  <Route
    path="/kurir"
    element={
      <ProtectedRoute permission="orders:view:own">
        <KurirVy />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

## 🚨 Error Handling

### Permission Denied (403 Forbidden)

**Response:**
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to perform this action",
  "required_permission": "orders:view:all",
  "your_role": "customer"
}
```

**Lösning:**
- Kontrollera att du är inloggad som rätt användare
- Kontrollera att din roll har rätt permission

---

### Rate Limit Exceeded (429 Too Many Requests)

**Response:**
```json
{
  "error": "Too many login attempts. Try again later."
}
```

**Lösning:**
- Vänta 15 minuter
- Kontrollera att du använder rätt lösenord

---

### JWT Blacklisted (401 Unauthorized)

**Response:**
```json
{
  "error": "Token has been revoked"
}
```

**Lösning:**
- Logga in igen
- Token har blacklistats (t.ex. efter logout)

---

## 📋 Permission Matrix

| Endpoint | Admin | Restaurant | Courier | Customer |
|----------|-------|------------|---------|----------|
| POST /api/order | ✅ | ❌ | ❌ | ✅ |
| GET /api/admin/orders/today | ✅ | ✅ | ❌ | ❌ |
| GET /api/admin/orders | ✅ | ✅ (own) | ❌ | ❌ |
| GET /api/courier/orders | ✅ | ❌ | ✅ | ❌ |
| PATCH /api/courier/orders/:id/accept | ✅ | ❌ | ✅ | ❌ |
| PATCH /api/courier/orders/:id/delivered | ✅ | ❌ | ✅ | ❌ |
| PUT /api/admin/orders/:id/klart | ✅ | ✅ | ❌ | ❌ |
| GET /api/my-orders | ✅ | ❌ | ❌ | ✅ |
| PUT /api/profile | ✅ | ✅ | ✅ | ✅ |

---

## 💡 Best Practices

### 1. Använd Rätt Permission för Rätt Task

**Fel:**
```javascript
// Använder admin-check istället för permission
if (user.role === 'admin') {
  // Allow action
}
```

**Rätt:**
```javascript
// Använd permission-system
if (hasPermission('orders:view:all')) {
  // Allow action
}
```

### 2. Alltid Validera på Backend

Frontend permission-checks är för UX - backend måste alltid validera.

```javascript
// Frontend (UX)
{hasPermission('orders:create') && <CreateOrderButton />}

// Backend (Security)
app.post('/api/order', verifyJWT, requirePermission('orders:create'), handler);
```

### 3. Logga Känsliga Operationer

```javascript
// Lägg till audit log efter viktiga operationer
await AuditService.logFromRequest(req, {
  action: 'order:create',
  resourceType: 'orders',
  resourceId: orderId
});
```

### 4. Använd Admin Override Pattern

Admin ska alltid ha tillgång - systemet hanterar detta automatiskt:

```javascript
// I PermissionService.js
if (user.role === 'admin') {
  return true; // Admin has all permissions
}
```

---

## 🔗 Integration med PHASE 2

PHASE 2 använder samma permission-system:

```javascript
// Restaurant management
POST /api/restaurants          → restaurant:manage
PUT /api/restaurants/:slug     → restaurant:manage
DELETE /api/restaurants/:slug  → restaurant:manage

// Menu management
PUT /api/restaurants/:slug/menu → menu:edit
```

---

## 🎓 Användningsexempel

### Exempel 1: Customer skapar order

```bash
# 1. Logga in som customer
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@example.com", "password": "customer123"}' \
  -c cookies.txt

# 2. Skapa order (permission: orders:create)
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "items": [...],
    "totalBelopp": 270,
    "leveransadress": "Testgatan 1",
    "restaurang": "campino"
  }'

# 3. Hämta mina orders (permission: orders:view:own)
curl http://localhost:3001/api/my-orders \
  -b cookies.txt
```

### Exempel 2: Restaurant hanterar order

```bash
# 1. Logga in som restaurant
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "restaurant@campino.se", "password": "rest123"}' \
  -c cookies.txt

# 2. Hämta dagens orders (permission: orders:view:own)
curl http://localhost:3001/api/admin/orders/today \
  -b cookies.txt

# 3. Markera order som klar (permission: orders:update:status)
curl -X PUT http://localhost:3001/api/admin/orders/15/klart \
  -b cookies.txt
```

### Exempel 3: Courier levererar order

```bash
# 1. Logga in som courier
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "courier@example.com", "password": "courier123"}' \
  -c cookies.txt

# 2. Hämta tillgängliga orders (permission: orders:view:own)
curl http://localhost:3001/api/courier/orders \
  -b cookies.txt

# 3. Acceptera order (permission: orders:update:status)
curl -X PATCH http://localhost:3001/api/courier/orders/15/accept \
  -b cookies.txt

# 4. Markera som levererad (permission: orders:update:status)
curl -X PATCH http://localhost:3001/api/courier/orders/15/delivered \
  -b cookies.txt
```

---

## 📞 Support

Om du stöter på problem:
1. Kolla error-meddelandena - de visar vilken permission som krävs
2. Verifiera att din användare har rätt roll
3. Kolla audit logs: `node check-audit.js`
4. Läs PHASE1_COMPLETE_SUMMARY.md för detaljerad info

---

**Skapad:** 2025-11-26
**Version:** 1.0
**Status:** Production Ready ✅
