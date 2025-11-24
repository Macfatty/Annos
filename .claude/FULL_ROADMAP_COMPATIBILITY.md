# 🔍 FULL ROADMAP COMPATIBILITY ANALYSIS

**Datum:** 2025-11-24
**Status:** KOMPLETT VERIFIERING AV ALLA PHASES
**Kodbas:** /home/macfatty/foodie/Annos

---

## 📊 Befintlig Kodbas - Komplett Översikt

### Database (PostgreSQL)

**Befintliga Tabeller:**
```sql
✅ users
   - id, email, password_hash, role, restaurant_slug, name, created_at

✅ orders
   - id, restaurant_slug, assigned_courier_id, customer_name, customer_phone,
     customer_address, customer_email, status, payment_method, payment_status,
     items_total, delivery_fee, discount_total, grand_total, customer_notes,
     order_json, created_at, updated_at, delivered_at

✅ order_items
   - id, order_id, name, quantity, unit_price, line_total

✅ order_item_options
   - id, order_item_id, typ, label, price_delta, custom_note

✅ payouts
   - id, restaurant_slug, period_start, period_end, orders_count,
     gross_revenue, per_order_fee, percent_fee, net_amount, created_at
```

**Befintliga Index:**
```sql
✅ idx_orders_restaurant_created (restaurant_slug, created_at)
✅ idx_orders_assigned_status (assigned_courier_id, status)
```

### Backend Structure

**Menyhantering (VIKTIGT!):**
```javascript
// backend/Data/menuData.js
// Läser från JSON-filer:
✅ backend/Data/menyer/campino.json
✅ backend/Data/menyer/sunsushi.json

// Struktur:
{
  "id": 1,
  "namn": "MARGARITA",
  "kategori": "Vegetarisk-Pizza",
  "pris": 125,
  "familjepris": 280,
  "beskrivning": "tomat, ost",
  "ingredienser": "tomat, ost",
  "tillbehor": [406, 500],
  "bild": "Magarita.png"
}
```

**Befintliga API Endpoints:**
```javascript
✅ GET /api/meny/:restaurang
✅ GET /api/meny?restaurang=campino
✅ GET /api/tillbehor/:restaurang
✅ GET /api/menu/restaurants
✅ GET /api/menu/:slug
```

---

## 🎯 PHASE 1: Roll & Permission System

### ✅ Kompatibilitet: PERFEKT

**Vad som passar:**
- users.role finns redan som VARCHAR
- users.restaurant_slug finns redan
- orders.assigned_courier_id finns redan
- verifyJWT och verifyRole middleware finns redan
- Admin inherit fungerar redan

**Vad som läggs till:**
- permissions tabell (NY)
- role_permissions tabell (NY)
- audit_logs tabell (NY)
- PermissionService (NY)
- requirePermission middleware (NY)

**Risk:** 🟢 LÅG - Additive only, ingen breaking change

**FUNGERAR: JA ✅**

---

## 🏪 PHASE 2: Restaurang Management System

### ⚠️ Kompatibilitet: KRÄVER UPPDATERING

**Problem Identifierat:**

#### ❌ **KONFLIKT: Befintlig Menyhantering**

**Nuvarande system:**
```javascript
// Menyer lagras i JSON-filer
backend/Data/menyer/campino.json
backend/Data/menyer/sunsushi.json

// Läses via:
const meny = require("./Data/menuData.js");
app.get("/api/meny/:restaurang", (req, res) => {
  const restaurangData = meny[restaurang];
  res.json(restaurangData);
});
```

**PHASE 2 Plan:**
```sql
-- Flytta menyer till databas
CREATE TABLE menu_items (...)
CREATE TABLE menu_categories (...)
```

**💥 DETTA KOMMER BRYTA BEFINTLIG FRONTEND!**

Frontend förväntar sig JSON structure från `/api/meny/:restaurang`

#### ✅ **LÖSNING: Hybrid Approach**

**Option 1: Gradvis Migration (REKOMMENDERAD)**

```javascript
// Behåll gamla endpoint för bakåtkompatibilitet
app.get("/api/meny/:restaurang", (req, res) => {
  const { restaurang } = req.params;

  // Försök hämta från DB först
  const dbMenu = await MenuService.getMenuBySlug(restaurang);
  if (dbMenu && dbMenu.length > 0) {
    return res.json(dbMenu);  // Från DB (nya systemet)
  }

  // Fallback till JSON-fil (gamla systemet)
  const fileMenu = meny[restaurang];
  if (fileMenu) {
    return res.json(fileMenu);
  }

  res.status(404).json({ error: "Meny inte hittad" });
});

// NY endpoint för admin management
app.get("/api/admin/menu/:slug", verifyJWT, requirePermission('menu:view'), async (req, res) => {
  const menu = await MenuService.getMenuBySlug(req.params.slug);
  res.json(menu);
});
```

**Migration Strategy:**
```
STEG 1: Skapa DB-tabeller (menu_items, menu_categories)
STEG 2: Importera befintliga JSON-menyer till DB
STEG 3: Uppdatera /api/meny att kolla DB först, JSON fallback
STEG 4: Admin kan nu editera menyer via DB
STEG 5: När alla restauranger i DB, ta bort JSON-fallback
```

**Option 2: Keep JSON Files (ENKLARE)**

```javascript
// Skippa databas-migration för menyer
// Menyer fortsätter vara JSON-filer
// Admin editerar via file upload/JSON editor

app.post("/api/admin/restaurants/:slug/menu",
  verifyJWT,
  requirePermission('menu:edit'),
  async (req, res) => {
    const { slug } = req.params;
    const { menu } = req.body;

    // Spara till JSON-fil
    fs.writeFileSync(
      path.join(__dirname, `Data/menyer/${slug}.json`),
      JSON.stringify(menu, null, 2)
    );

    res.json({ message: 'Meny uppdaterad' });
  }
);
```

**Min Rekommendation för ER:**

### **🎯 ANVÄND OPTION 2 (Keep JSON Files) för PHASE 2**

**Anledningar:**
1. ✅ Ingen breaking change
2. ✅ Befintlig frontend fortsätter fungera
3. ✅ Enklare implementation
4. ✅ Menyer ändras sällan (inte critical data)
5. ✅ JSON-filer är lätta att backup/version control

**Uppdatera PHASE 2:**
```
2.1 Database - Restaurant System
- [x] restaurants tabell (för restaurant metadata)
- [ ] ❌ SKIPPA menu_items tabell (behåll JSON)
- [ ] ❌ SKIPPA menu_categories tabell (behåll JSON)

2.2 Backend - Menu Management
- [ ] POST /api/admin/restaurants/:slug/menu/upload (JSON upload)
- [ ] GET /api/admin/restaurants/:slug/menu/download (JSON download)
- [ ] PUT /api/admin/restaurants/:slug/menu (uppdatera JSON-fil)

2.3 Frontend - Menu Management
- [ ] JSON Editor för menu items
- [ ] Upload/Download JSON-filer
- [ ] Preview menu innan save
```

**FUNGERAR MED UPPDATERING: JA ✅**

---

## 🚚 PHASE 3: Kurir Management System

### ✅ Kompatibilitet: PERFEKT

**Vad som passar:**
- orders.assigned_courier_id finns redan ✅
- Index idx_orders_assigned_status finns redan ✅
- getCourierOrders query finns redan ✅

**Vad som läggs till:**
- courier_profiles tabell (NY)
- courier_contracts tabell (NY)
- Courier isolation middleware (NY)

**Risk:** 🟢 LÅG - Bygger på befintlig struktur

**FUNGERAR: JA ✅**

---

## 👤 PHASE 4: Kund Management & GDPR

### ✅ Kompatibilitet: PERFEKT

**Vad som passar:**
- users tabell finns redan ✅
- Kan lägga till customers tabell separat ✅
- orders.customer_* finns redan (name, phone, address, email) ✅

**Vad som läggs till:**
- customers tabell (NY - för medlemmar)
- customer_consents tabell (NY)
- Encryption för känslig data (NY)

**Viktigt:**
```javascript
// Nuvarande: Guests kan checkout utan account
orders.customer_name
orders.customer_phone
orders.customer_address
orders.customer_email

// Efter PHASE 4: Members kan ha profile
customers.user_id → users.id
customers.personal_number_encrypted (GDPR)
customers.address_encrypted (GDPR)

// Orders fortsätter fungera för både guests och members!
```

**Risk:** 🟢 LÅG - Additive, guests fortsätter fungera

**FUNGERAR: JA ✅**

---

## 💬 PHASE 5: Support System

### ✅ Kompatibilitet: PERFEKT

**Vad som läggs till:**
- support_tickets tabell (NY)
- support_messages tabell (NY)
- support_categories tabell (NY)

**Risk:** 🟢 LÅG - Helt nya tabeller, påverkar inget befintligt

**FUNGERAR: JA ✅**

---

## 🚀 PHASE 6: Performance & Scaling (NY!)

### Redis Integration - FUTURE PROOF

**Prioritet:** 🟢 LÅG (6-12 månader framåt)
**Estimerad tid:** ~4-6 timmar
**Komplexitet:** LOW
**Beroenden:** PHASE 1-5 i produktion med high traffic

### Mål:
Optimera performance för high traffic och multi-server setup med Redis caching.

### När behövs detta?

**Triggers:**
- ⏰ 1000+ samtidiga användare
- ⏰ Multiple server instances (load balancing)
- ⏰ DB queries > 100ms
- ⏰ Permission checks blir flaskhals

### Tasks:

#### 6.1 Infrastructure Setup
- [ ] Installera Redis server (Docker eller managed service)
- [ ] Installera Redis client library (`npm install redis`)
- [ ] Konfigurera Redis connection i `.env`

**Installation:**
```bash
# Docker (REKOMMENDERAT för development)
docker run -d --name redis -p 6379:6379 redis:alpine

# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # optional
```

#### 6.2 Rate Limiting Migration
- [ ] Migrera från Map till Redis för rate limiting
- [ ] Shared rate limiting över multiple servers

**Före (in-memory Map):**
```javascript
const rateLimitStore = new Map();
```

**Efter (Redis):**
```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

async function rateLimit(windowMs, maxRequests) {
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}:${req.path}`;
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, Math.ceil(windowMs / 1000));
    }

    if (count > maxRequests) {
      return res.status(429).json({ error: 'För många förfrågningar' });
    }

    next();
  };
}
```

#### 6.3 JWT Blacklist Migration
- [ ] Migrera från Set till Redis för JWT blacklist
- [ ] Persistent blacklist över server restarts

**Före (in-memory Set):**
```javascript
const blacklistedTokens = new Set();
```

**Efter (Redis):**
```javascript
// Blacklist token
await client.setex(`blacklist:${token}`, 86400, '1');  // 24h TTL

// Check blacklist
const isBlacklisted = await client.get(`blacklist:${token}`);
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token revoked' });
}
```

#### 6.4 Permission Caching
- [ ] Cache user permissions i Redis (5 min TTL)
- [ ] Invalidate cache när permissions ändras

**Implementation:**
```javascript
// backend/src/services/permissionService.js
static async getUserPermissions(userId) {
  const cacheKey = `permissions:user:${userId}`;

  // Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Not in cache, query PostgreSQL
  const query = `SELECT DISTINCT p.name FROM permissions p...`;
  const result = await pool.query(query, [userId]);
  const permissions = result.rows.map(row => row.name);

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(permissions));

  return permissions;
}

// Invalidate cache när permissions ändras
static async grantPermission(roleName, permissionName) {
  // ... grant permission

  // Invalidate cache för alla users med denna role
  await redis.del(`permissions:role:${roleName}`);
}
```

#### 6.5 Session Management (Optional)
- [ ] Move sessions från memory till Redis
- [ ] Persistent sessions över server restarts

#### 6.6 Menu Caching (Optional)
- [ ] Cache menu data i Redis
- [ ] Invalidate när menu uppdateras

**Implementation:**
```javascript
app.get("/api/meny/:restaurang", async (req, res) => {
  const { restaurang } = req.params;
  const cacheKey = `menu:${restaurang}`;

  // Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Load menu
  const menu = meny[restaurang];

  // Cache for 1 hour (menyer ändras sällan)
  await redis.setex(cacheKey, 3600, JSON.stringify(menu));

  res.json(menu);
});
```

### Acceptance Criteria:

**Performance:**
- ✅ Permission checks < 10ms (från 20-50ms)
- ✅ Rate limiting fungerar över multiple servers
- ✅ JWT blacklist persistent över restarts
- ✅ Menu loading < 5ms (från 10-20ms)

**Reliability:**
- ✅ Graceful degradation om Redis går ner (fallback till PostgreSQL)
- ✅ Auto-reconnect vid Redis connection loss
- ✅ Monitoring och alerts för Redis health

**Scalability:**
- ✅ Support för multiple server instances
- ✅ Horizontal scaling utan shared memory issues

### Cost Estimate:

**Redis Cloud (Managed):**
- Free tier: 30MB (räcker för er use case)
- Paid tier: $5-10/månad för 100MB

**Self-hosted (Docker):**
- $0 (gratis)
- Kräver underhåll och monitoring

**Rekommendation:** Redis Cloud free tier för development, sedan paid tier för production.

---

## 📊 FINAL COMPATIBILITY SUMMARY

### PHASE 1: Roll & Permission System
- **Kompatibilitet:** ✅ PERFEKT
- **Risk:** 🟢 LÅG
- **Breaking Changes:** ❌ NEJ
- **Fungerar:** ✅ JA

### PHASE 2: Restaurang Management
- **Kompatibilitet:** ⚠️ KRÄVER JUSTERING
- **Risk:** 🟡 MEDIUM (om DB migration)
- **Breaking Changes:** ⚠️ JA (om DB migration)
- **Lösning:** Behåll JSON-filer för menyer
- **Fungerar:** ✅ JA (med justering)

### PHASE 3: Kurir Management
- **Kompatibilitet:** ✅ PERFEKT
- **Risk:** 🟢 LÅG
- **Breaking Changes:** ❌ NEJ
- **Fungerar:** ✅ JA

### PHASE 4: Kund Management & GDPR
- **Kompatibilitet:** ✅ PERFEKT
- **Risk:** 🟢 LÅG
- **Breaking Changes:** ❌ NEJ
- **Fungerar:** ✅ JA

### PHASE 5: Support System
- **Kompatibilitet:** ✅ PERFEKT
- **Risk:** 🟢 LÅG
- **Breaking Changes:** ❌ NEJ
- **Fungerar:** ✅ JA

### PHASE 6: Performance & Scaling (Redis)
- **Kompatibilitet:** ✅ PERFEKT
- **Risk:** 🟢 LÅG
- **Breaking Changes:** ❌ NEJ
- **Behövs Nu:** ❌ NEJ (framtida optimering)
- **Fungerar:** ✅ JA (när ni behöver det)

---

## 🎯 Rekommenderade Ändringar

### 1. Uppdatera PHASE 2 (Restaurant Management)

**Ändra från:**
```
- Skapa menu_items tabell
- Skapa menu_categories tabell
- Migrera JSON till DB
```

**Till:**
```
- Skapa restaurants tabell (metadata only)
- Behåll JSON-filer för menyer
- Admin kan upload/edit JSON-filer via UI
- Backup/version control för JSON-filer
```

### 2. Lägg till PHASE 6 (Performance & Scaling)

**Ny phase:**
- Redis integration
- Permission caching
- Rate limiting optimization
- Session management
- Menu caching

**Timeline:** 6-12 månader efter PHASE 1-5 live

---

## ✅ Slutsats

**ALLA PHASES FUNGERAR MED ER KODBAS!**

**Enda justeringen:**
- PHASE 2: Behåll JSON-menyer istället för DB migration

**Anledningar:**
1. ✅ Enklare implementation
2. ✅ Ingen breaking change
3. ✅ Befintlig frontend fortsätter fungera
4. ✅ Git version control för menyer
5. ✅ Backup och restore enklare

**Redis:**
- ✅ Behövs INTE nu
- ✅ Lägg till PHASE 6 (6-12 månader framåt)
- ✅ PostgreSQL räcker för er nuvarande skala

**Totalt Estimat:**
- PHASE 1: 9-12h
- PHASE 2: 8-10h (förenklat utan DB migration)
- PHASE 3: 8-10h
- PHASE 4: 10-12h
- PHASE 5: 6-8h
- **TOTAL: 41-52h (5-7 dagar)**

**PHASE 6 (framtiden):** 4-6h extra när ni behöver scale

**Allt är redo att implementeras! 🚀**
