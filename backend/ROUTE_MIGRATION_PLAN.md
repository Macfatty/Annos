# Route Migration Plan - PHASE 1 Task 1.5

Migration plan för att uppdatera alla routes från `verifyRole` till `requirePermission`.

## Strategi:
1. Behåll `verifyJWT` (autentisering)
2. Ersätt `verifyRole` med `requirePermission` (auktorisering)
3. Lägg till audit logging på känsliga operationer
4. 100% bakåtkompatibel migration

---

## Routes att Migrera:

### 🔓 Public Routes (ingen ändring):
- `GET /api/test` - Health check
- `GET /api/meny/:restaurang` - Meny (public)
- `GET /api/meny` - Meny (public)
- `GET /api/tillbehor/:restaurang` - Tillbehör (public)
- `GET /api/menu/restaurants` - Restaurant list (public)
- `GET /api/menu/:slug` - Menu (public)
- `GET /api/menu/:slug/accessories` - Accessories (public)
- `GET /api/menu/:slug/search` - Search menu (public)
- `GET /api/menu/:slug/categories` - Categories (public)
- `GET /api/menu/:slug/category/:category` - Category items (public)
- `GET /api/menu/:slug/item/:itemId` - Single item (public)
- `GET /api/menu/:slug/accessories/type/:type` - Accessories by type (public)
- `GET /api/menu/:slug/accessories/grouped` - Grouped accessories (public)
- `POST /api/register` - Registration (public)
- `POST /api/login` - Login (public)
- `POST /api/logout` - Logout (public)

### 🔐 Authenticated Routes (migrera):

#### Orders - Kund routes:
**Nuvarande:** `verifyRole(["customer", "admin"])`
**Nytt:** `requirePermission('orders:create')`
- `POST /api/order` (line 352)
  - Permission: `orders:create`
  - Audit: `order:create`

**Nuvarande:** `verifyJWT`
**Nytt:** `requirePermission('orders:view:own')`
- `GET /api/my-orders` (line 790)
  - Permission: `orders:view:own`
  - No audit needed (read-only)

- `GET /api/orders` (line 924)
  - Permission: `orders:view:own`
  - No audit needed (read-only)

#### Orders - Admin/Restaurant routes:
**Nuvarande:** `verifyRole(["admin", "restaurant"])`
**Nytt:** `requirePermission('orders:view:own')` (restaurant kan bara se egna)
- `GET /api/admin/orders/today` (line 534)
  - Permission: `orders:view:own` (eller `orders:view:all` för admin)
  - No audit needed (read-only)

- `GET /api/admin/orders` (line 564)
  - Permission: `orders:view:own`
  - No audit needed (read-only)

**Nuvarande:** `verifyRole(["admin", "restaurant"])`
**Nytt:** `requirePermission('orders:update:status')`
- `PUT /api/admin/orders/:id/klart` (line 651)
  - Permission: `orders:update:status`
  - Audit: `order:update` (status change)

#### Orders - Kurir routes:
**Nuvarande:** `verifyRole(["courier", "admin"])`
**Nytt:** `requirePermission('orders:view:own')`
- `GET /api/courier/orders` (line 605)
  - Permission: `orders:view:own`
  - No audit needed (read-only)

**Nuvarande:** `verifyRole(["courier", "admin"])`
**Nytt:** `requirePermission('orders:update:status')`
- `PATCH /api/courier/orders/:id/accept` (line 616)
  - Permission: `orders:update:status`
  - Audit: `order:update` (status change)

- `PATCH /api/courier/orders/:id/delivered` (line 634)
  - Permission: `orders:update:status`
  - Audit: `order:update` (status change)

#### Profile routes:
**Nuvarande:** `verifyJWT`
**Nytt:** Behåll `verifyJWT` (alla autentiserade användare kan se sin egen profil)
- `GET /api/profile` (line 696)
  - Permission: Ingen (alla autentiserade)
  - No audit needed (read-only)

- `PUT /api/profile` (line 738)
  - Permission: Ingen (alla autentiserade)
  - Audit: `user:update` (profile update)

---

## Implementation Plan:

### Step 1: Import new middleware
```javascript
const { requirePermission, requireAnyPermission } = require('./src/middleware/requirePermission');
const AuditService = require('./src/services/auditService');
```

### Step 2: Migrera routes en i taget
- Testa efter varje ändring
- Verifiera att både gamla roller och nya permissions fungerar

### Step 3: Lägg till audit logging
- Endast på write operations (POST, PUT, PATCH, DELETE)
- Inte på read operations (GET)

### Step 4: Test med alla roller
- Test admin access (alla permissions)
- Test restaurant access (orders:view:own, orders:update:status)
- Test courier access (orders:view:own, orders:update:status)
- Test customer access (orders:create, orders:view:own)

---

## Expected Results:

✅ Admin: Fortsatt full access (admin override)
✅ Restaurant: Kan bara se egna restaurangens orders
✅ Courier: Kan bara se tilldelade orders
✅ Customer: Kan skapa och se egna orders
✅ Audit logs för alla write operations
✅ 100% bakåtkompatibel (inga breaking changes)
