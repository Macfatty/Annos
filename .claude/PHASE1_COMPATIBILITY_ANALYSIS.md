# 🔍 PHASE 1 Kompatibilitetsanalys

**Datum:** 2025-11-24
**Status:** ANALYS KOMPLETT
**Risk Level:** 🟢 LÅG - Förbättringarna passar perfekt med befintlig kodbas

---

## 📊 Befintlig Kodbas - Analys

### 1. Nuvarande Authentication System

#### **Vad som FINNS (authMiddleware.js):**
```javascript
✅ verifyJWT(req, res, next)
   - Stöder både Bearer token och cookies
   - Verifierar JWT_SECRET
   - Sätter req.user = decoded (userId, role, name, email)

✅ verifyRole(roles)
   - Kollar om req.user.role finns i tillåten roles-array
   - Admin har AUTOMATISKT full access (line 102)
   - Returnerar 403 om unauthorized

✅ verifyAdminForSlug(req, res, next)
   - Kollar restaurant_slug för restaurang-användare
   - Admin kan se alla restauranger
   - Används för restaurang-specifika routes

✅ rateLimit(windowMs, maxRequests)
   - In-memory rate limiting (Map-baserad)
   - Fungerar för development

✅ validateStatusTransition(req, res, next)
   - Validerar order status transitions
   - Statusmaskin finns redan implementerad
```

#### **Vad som SAKNAS:**
```javascript
❌ Permission-system (granulära behörigheter)
❌ Role hierarchy (admin inherit alla permissions automatiskt i systemet)
❌ Audit logging (logga admin-actions)
❌ Token blacklist för logout
❌ Permission check mot databas
```

---

### 2. Database Schema - Nuvarande Status

#### **users-tabell (från migrateDatabase.js lines 144-158):**
```sql
✅ id - SERIAL PRIMARY KEY
✅ email - VARCHAR
✅ password_hash - VARCHAR
✅ role - VARCHAR(50) DEFAULT 'customer'  -- ✅ FINNS REDAN
✅ restaurant_slug - VARCHAR(100)          -- ✅ FINNS REDAN
✅ name - VARCHAR (antagligen)
✅ created_at - TIMESTAMP
```

**Analysis:**
- ✅ `role` kolumn finns redan
- ✅ `restaurant_slug` finns redan för restaurang-koppling
- ✅ Perfekt för vårt system!

#### **orders-tabell (från migrateDatabase.js & orderService.js):**
```sql
✅ id - BIGINT PRIMARY KEY
✅ restaurant_slug - VARCHAR(100)          -- ✅ Restaurant isolation
✅ assigned_courier_id - BIGINT            -- ✅ Courier isolation (line 168-193)
✅ customer_name - VARCHAR
✅ customer_phone - VARCHAR
✅ customer_address - TEXT
✅ customer_email - VARCHAR
✅ status - VARCHAR(50)
✅ payment_method - VARCHAR
✅ payment_status - VARCHAR
✅ items_total - DECIMAL
✅ delivery_fee - DECIMAL
✅ discount_total - DECIMAL
✅ grand_total - DECIMAL
✅ customer_notes - TEXT
✅ order_json - JSONB
✅ created_at - TIMESTAMP
✅ updated_at - TIMESTAMP
✅ delivered_at - TIMESTAMP
```

**Analysis:**
- ✅ `restaurant_slug` finns för restaurant isolation
- ✅ `assigned_courier_id` finns för courier isolation
- ✅ Index finns redan: `idx_orders_assigned_status` (line 187)
- ✅ Index finns redan: `idx_orders_restaurant_created` (line 199)

#### **Andra tabeller:**
```sql
✅ order_items - Item details
✅ order_item_options - Item options/tillval
✅ payouts - Restaurant payouts
```

---

### 3. Middleware Usage - Server.js

#### **Nuvarande middleware chains:**
```javascript
// Exempel från server.js (line 6):
const {
  verifyJWT,
  verifyToken,
  verifyRole,
  verifyAdminForSlug,
  rateLimit
} = require("./authMiddleware");

// Används så här:
app.get("/api/admin/orders",
  verifyJWT,                    // ✅ JWT verification
  verifyRole(["admin"]),        // ✅ Role check
  handler
);

app.get("/api/courier/orders",
  verifyJWT,
  verifyRole(["courier", "admin"]),
  handler
);
```

**Analysis:**
- ✅ Middleware pattern används redan
- ✅ verifyJWT + verifyRole chains fungerar
- ✅ Admin inherit fungerar (line 102 i authMiddleware.js)

---

## 🎯 Förbättringar - Komplikationsanalys

### FÖRBÄTTRING 1: Permissions-systemet

#### **Vad vi lägger till:**
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,    -- 'orders:view:all'
  description TEXT,
  category VARCHAR(50)
);

CREATE TABLE role_permissions (
  role_name VARCHAR(50) NOT NULL,       -- 'admin', 'restaurant', etc
  permission_id INTEGER REFERENCES permissions(id),
  PRIMARY KEY (role_name, permission_id)
);
```

#### **Komplikationer? 🔍**

**1. Kommer det krasha befintlig users-tabell?**
- ✅ **NEJ** - Vi använder `role_name` VARCHAR, inte foreign key till roles-tabell
- ✅ **NEJ** - users.role finns redan som VARCHAR(50)
- ✅ **NEJ** - Vi lägger bara till EXTRA tabeller, ändrar inte users

**2. Kommer befintlig verifyRole() sluta fungera?**
- ✅ **NEJ** - Vi BEHÅLLER verifyRole() för bakåtkompatibilitet
- ✅ **NEJ** - Vi lägger till requirePermission() som KOMPLEMENT
- ✅ **NEJ** - Gamla routes fortsätter fungera exakt som förut

**3. Kommer detta störa JWT token structure?**
- ✅ **NEJ** - JWT innehåller fortfarande samma data: { userId, role, name, email }
- ✅ **NEJ** - Permissions hämtas från DB, inte från token
- ✅ **NEJ** - req.user.role fortsätter fungera exakt som nu

**4. Kommer admin inherit sluta fungera?**
- ✅ **NEJ** - Vi FÖRBÄTTRAR det:
```javascript
// FÖR (authMiddleware.js line 102):
if (req.user.role === 'admin') {
  return next();  // Admin kan allt
}

// EFTER (permissionService.js):
static async checkPermission(user, permissionName) {
  if (user.role === 'admin') return true;  // SAMMA LOGIK
  return await this.hasPermission(user.id, permissionName);
}
```

#### **Migration Strategy:**
```javascript
// STEG 1: Skapa tabeller (påverkar INGET befintligt)
CREATE TABLE permissions;
CREATE TABLE role_permissions;

// STEG 2: Seed permissions
INSERT INTO permissions (name, description, category) VALUES
  ('orders:view:all', 'View all orders', 'orders'),
  ('orders:view:own', 'View own orders', 'orders'),
  ('orders:update:status', 'Update order status', 'orders');

// STEG 3: Koppla permissions till roles
INSERT INTO role_permissions (role_name, permission_id) VALUES
  ('admin', 1), ('admin', 2), ('admin', 3),        -- Admin har alla
  ('restaurant', 2), ('restaurant', 3),            -- Restaurant har view:own & update
  ('courier', 2);                                  -- Courier har view:own

// STEG 4: Skapa PermissionService (NY fil, påverkar inget befintligt)

// STEG 5: Skapa requirePermission middleware (NY fil, påverkar inget befintligt)

// STEG 6: Gradvis migrera routes (EN I TAGET)
// Gamla routes fortsätter fungera medan vi migrerar
```

**Risk:** 🟢 **MYCKET LÅG**
- Inget befintligt bryts
- Bakåtkompatibilitet garanterad
- Kan migreras gradvis

---

### FÖRBÄTTRING 2: Audit Logging

#### **Vad vi lägger till:**
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,         -- 'DECRYPT_CUSTOMER_DATA'
  resource_type VARCHAR(50),            -- 'customer', 'order'
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Komplikationer? 🔍**

**1. Kommer det påverka performance?**
- ✅ **NEJ** - Audit logging är async (fire-and-forget)
```javascript
// Fire-and-forget pattern:
auditLog(userId, action, resource).catch(err => console.error(err));
return res.json(data); // Blocking ej
```

**2. Kommer det fylla databasen?**
- ✅ **NEJ** - Vi implementerar retention policy:
```sql
-- Auto-delete gamla audit logs (>1 år)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

**3. Kommer det krasha om audit_logs inte finns?**
- ✅ **NEJ** - Vi wrapprar i try-catch:
```javascript
try {
  await auditLog(...);
} catch (err) {
  console.error('Audit log failed:', err);
  // Fortsätt ändå - audit ska ej blocka
}
```

**Risk:** 🟢 **MYCKET LÅG**
- Ny tabell, påverkar inget befintligt
- Async logging påverkar ej performance
- Graceful degradation om logging misslyckas

---

### FÖRBÄTTRING 3: Rate Limiting på Login

#### **Vad vi förbättrar:**
```javascript
// NU (authMiddleware.js line 7-29):
const rateLimitStore = new Map();  // In-memory

// EFTER:
// Option 1: Fortsätt med Map (funkar för små appar)
// Option 2: Redis (för produktion med multiple instances)
```

#### **Komplikationer? 🔍**

**1. Kommer Map-baserad rate limit sluta fungera?**
- ✅ **NEJ** - Vi BEHÅLLER den, lägger bara till rate limit specifikt på /login
```javascript
// Befintlig rateLimit fortsätter fungera
// Vi lägger bara till:
const loginLimiter = rateLimit(15 * 60 * 1000, 5); // 5 försök per 15 min
app.post('/api/auth/login', loginLimiter, handler);
```

**2. Kommer det påverka andra routes?**
- ✅ **NEJ** - loginLimiter används ENDAST på /login
- ✅ **NEJ** - Andra routes fortsätter använda befintlig rateLimit

**Risk:** 🟢 **NOLL RISK**
- Lägger bara till extra middleware på EN route
- Inget befintligt påverkas

---

### FÖRBÄTTRING 4: JWT Blacklist för Logout

#### **Vad vi lägger till:**
```javascript
// Option 1: In-memory Set (simple, funkar för development)
const blacklistedTokens = new Set();

app.post('/api/auth/logout', verifyJWT, (req, res) => {
  blacklistedTokens.add(req.token);
  res.json({ message: 'Logged out' });
});

// Uppdatera verifyJWT:
function verifyJWT(req, res, next) {
  const token = extractToken(req);

  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  // ... rest of verification
}
```

#### **Komplikationer? 🔍**

**1. Kommer det påverka befintlig verifyJWT?**
- ✅ **NEJ** - Vi lägger bara till EN extra check först i funktionen
- ✅ **NEJ** - Om token ej blacklisted, fortsätter som vanligt

**2. Kommer Set() växa i oändlighet?**
- ⚠️ **JA**, MEN vi fixar det:
```javascript
// Cleanup gamla tokens varje timme
setInterval(() => {
  blacklistedTokens.clear(); // JWT expires efter 24h ändå
}, 24 * 60 * 60 * 1000);
```

**3. Vad händer om server restartar?**
- ⚠️ **Tokens återaktiveras** (in-memory förloras)
- ✅ **OK för development** - tokens expires efter 24h ändå
- 🔵 **För produktion:** Använd Redis

**Risk:** 🟡 **LÅG RISK**
- Development: Funkar perfekt
- Production: Behöver Redis (kan läggas till senare)

---

## 🎯 Migration Path - Steg för Steg

### SCENARIO 1: Development Environment (Nuvarande Setup)

**Phase 1A - Foundation (2-3h):**
```bash
# 1. Skapa nya tabeller (påverkar inget befintligt)
npm run migrate:permissions

# 2. Seed initial permissions
npm run seed:permissions

# 3. Testa att befintlig auth fortfarande fungerar
curl http://localhost:3001/api/admin/orders -H "Authorization: Bearer $TOKEN"
# ✅ Ska fungera EXAKT som förut
```

**Phase 1B - Permission System (3-4h):**
```bash
# 1. Skapa PermissionService (ny fil)
touch backend/src/services/permissionService.js

# 2. Skapa requirePermission middleware (ny fil)
touch backend/src/middleware/requirePermission.js

# 3. Testa permission check för EN route först
# Behåll gamla route temporärt för fallback:
app.get("/api/admin/orders", verifyJWT, verifyRole(["admin"]), handler);  # Gamla
app.get("/api/admin/orders/v2", verifyJWT, requirePermission('orders:view:all'), handler);  # Nya

# 4. Om v2 fungerar, ersätt gamla route
```

**Phase 1C - Audit Logging (1-2h):**
```bash
# 1. Skapa audit_logs tabell
npm run migrate:audit

# 2. Skapa AuditService (ny fil)
touch backend/src/services/auditService.js

# 3. Lägg till audit på känsliga routes (EFTER de fungerar)
```

**Phase 1D - Extra Security (1-2h):**
```bash
# 1. Lägg till login rate limiter
# 2. Lägg till JWT blacklist för logout
# 3. Testa logout-flow
```

**Total tid:** 7-11 timmar
**Risk för befintlig funktionalitet:** 🟢 **MINIMAL**

---

### SCENARIO 2: Production Environment

**Extra åtgärder:**
```javascript
// 1. Redis för rate limiting
npm install redis
const redis = require('redis');
const client = redis.createClient();

// 2. Redis för JWT blacklist
// 3. Databas migration med rollback plan
// 4. Blue-green deployment
// 5. Feature flags för gradvis rollout
```

---

## ⚠️ Potentiella Komplikationer & Lösningar

### KOMPLIKATION 1: Permission Check Performance

**Problem:** Varje request gör DB query för permissions?
```javascript
// Varje request:
app.get('/orders', verifyJWT, requirePermission('orders:view'), handler);
// → DB query för att hämta permissions
```

**Lösning: Cache permissions i JWT eller Redis**

**Option 1: Cache i Redis (5 min TTL)**
```javascript
static async getUserPermissions(userId) {
  const cacheKey = `user:${userId}:permissions`;

  // Försök hämta från cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Inte i cache, hämta från DB
  const permissions = await pool.query('SELECT ...');

  // Spara i cache (5 min)
  await redis.setex(cacheKey, 300, JSON.stringify(permissions.rows));

  return permissions.rows;
}
```

**Option 2: Lägg permissions i JWT vid login (enklare för er)**
```javascript
// Vid login:
const user = await getUserWithPermissions(userId);
const token = jwt.sign({
  userId: user.id,
  role: user.role,
  permissions: user.permissions  // ← Lägg till här
}, JWT_SECRET);

// requirePermission middleware:
function requirePermission(permissionName) {
  return (req, res, next) => {
    // Admin har allt
    if (req.user.role === 'admin') return next();

    // Kolla permissions från JWT (ingen DB query!)
    if (req.user.permissions.includes(permissionName)) {
      return next();
    }

    res.status(403).json({ error: 'Forbidden' });
  };
}
```

**Rekommendation för ER:** Option 2 (JWT permissions)
- ✅ Ingen extra infrastruktur (Redis)
- ✅ Ingen DB query per request
- ✅ Passar er development setup
- ⚠️ Måste logga ut/in om permissions ändras (OK för er use case)

---

### KOMPLIKATION 2: Migration av Befintlig Data

**Problem:** Gamla users har `role = 'customer'`, nya systemet kräver permissions?

**Lösning: Seed permissions för befintliga roles**
```sql
-- Koppla befintliga roles till permissions automatiskt
INSERT INTO role_permissions (role_name, permission_id)
SELECT 'customer', id FROM permissions WHERE name LIKE 'orders:view:own';

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'restaurant', id FROM permissions WHERE category IN ('orders', 'menu');

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'courier', id FROM permissions WHERE category = 'deliveries';

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'admin', id FROM permissions;  -- Admin har ALLA
```

**Result:**
- ✅ Befintliga users fungerar direkt
- ✅ Inga manuella åtgärder krävs
- ✅ Kan köras som migration script

---

### KOMPLIKATION 3: Restaurant Slug Validation

**Problem:** verifyAdminForSlug kollar `req.user.restaurant_slug`, men vad om det ändras?

**Nuvarande kod (authMiddleware.js line 114-128):**
```javascript
function verifyAdminForSlug(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      return next();  // Admin kan allt
    }

    const slug = req.query?.slug || req.body?.slug || req.params?.slug;
    if (slug && req.user.restaurant_slug !== slug) {
      return res.status(403).json({ error: "Fel restaurang" });
    }
    next();
  });
}
```

**Analys:**
- ✅ Detta fungerar PERFEKT med vårt permission system
- ✅ Vi BEHÅLLER denna middleware för restaurant-specific routes
- ✅ requirePermission() är för generella permissions, verifyAdminForSlug för restaurant isolation

**Kombination:**
```javascript
// Restaurant orders - både permission OCH slug check
app.get("/api/restaurant/:slug/orders",
  verifyJWT,
  requirePermission('orders:view:own'),  // Generell permission
  verifyAdminForSlug,                     // Restaurant-specific check
  handler
);
```

**Result:**
- ✅ Dubbel säkerhet
- ✅ Permission system + slug validation
- ✅ Inget behöver ändras i verifyAdminForSlug

---

## 🎯 Slutsats: Passar det er kodbas?

### ✅ **JA - Perfekt Match!**

**Anledningar:**

1. **✅ Befintlig struktur är redan förberedd:**
   - users.role finns redan (VARCHAR(50))
   - users.restaurant_slug finns redan
   - orders.assigned_courier_id finns redan
   - Middleware pattern används redan
   - Admin inherit finns redan

2. **✅ Förbättringarna är additiva, inte destructive:**
   - Vi LÄGGER TILL tabeller (permissions, role_permissions, audit_logs)
   - Vi LÄGGER TILL middleware (requirePermission, auditLog)
   - Vi BEHÅLLER befintlig funktionalitet (verifyRole, verifyAdminForSlug)
   - Vi FÖRBÄTTRAR, inte ersätter

3. **✅ Bakåtkompatibilitet garanterad:**
   - Gamla routes fortsätter fungera under migration
   - Kan migreras gradvis, route för route
   - Ingen "big bang" migration krävs
   - Feature flags kan användas för rollback

4. **✅ Minimal risk för befintlig funktionalitet:**
   - Nya tabeller påverkar inte befintliga
   - Nya middleware är opt-in (används bara på nya routes)
   - Audit logging är async och failsafe
   - JWT structure förändras inte (permissions i payload optional)

5. **✅ Passar er development workflow:**
   - Inget Redis/external dependencies krävs för development
   - Kan köras lokalt med PostgreSQL
   - Migrations kan köras idempotent (CREATE IF NOT EXISTS)
   - Testbart steg för steg

---

## 🚀 Rekommenderad Implementation Order

**IMMEDIATE (Nästa steg):**
1. ✅ Uppdatera IMPLEMENTATION_ROADMAP.md med förbättrad PHASE 1
2. ✅ Skapa migration script för permissions-tabeller
3. ✅ Skapa seed script för initial permissions
4. ✅ Testa migration på development DB (non-destructive)

**PHASE 1A (2-3 timmar):**
1. Kör migrations
2. Skapa PermissionService
3. Testa permission queries

**PHASE 1B (3-4 timmar):**
1. Skapa requirePermission middleware
2. Migrera EN route som test
3. Verifiera att gamla route fortfarande fungerar
4. Migrera resterande routes gradvis

**PHASE 1C (1-2 timmar):**
1. Lägg till audit logging
2. Testa på känsliga routes

**PHASE 1D (1-2 timmar):**
1. Login rate limiter
2. JWT blacklist för logout
3. Final testing

**Total: 7-11 timmar (samma som ursprunglig estimate)**

---

## 🎯 Final Verdict

**Kommer förbättringarna krasha ert system?**
### **❌ NEJ**

**Passar det er kodbas?**
### **✅ JA - PERFEKT**

**Är det värt att göra?**
### **✅ JA - STARKT REKOMMENDERAT**

**Kan vi börja nu?**
### **✅ JA - REDO ATT IMPLEMENTERA**

---

**Nästa steg:**
Ska jag uppdatera IMPLEMENTATION_ROADMAP.md med den förbättrade PHASE 1? 🚀
