# 📊 PHASE 2 ANALYS RAPPORT

**Datum:** 2025-11-24
**Status:** ✅ KOMPATIBEL & REDO ATT IMPLEMENTERA
**Estimerad tid:** 8-11 timmar

---

## 🎯 SAMMANFATTNING

PHASE 2 (Restaurant Management System) är **100% KOMPATIBEL** med din nuvarande kodbas och följer samma höga standard som PHASE 1.

**Huvudsakliga fynd:**
- ✅ Inga breaking changes
- ✅ Följer PHASE 1 patterns
- ✅ Låg risk
- ✅ Moderna best practices
- ⚠️ MEN: Håll JSON-menyer (migrera INTE till databas)

---

## 1. KOMPATIBILITET MED NUVARANDE SYSTEM

### ✅ Hur menyer fungerar idag:

**Backend:**
```javascript
// Data läses från JSON-filer
const meny = {
  campino: JSON.parse(fs.readFileSync("menyer/campino.json")),
  sunsushi: JSON.parse(fs.readFileSync("menyer/sunsushi.json"))
};

// API-endpoint
GET /api/meny?restaurang=campino
→ Returnerar: Array med menyposter
```

**Frontend:**
```javascript
// Fetch menu
fetchMenu('campino')
→ Får tillbaka: [{id: 1, namn: "MARGARITA", pris: 125, ...}, ...]
```

**Detta fungerar perfekt - ÄNDRA INTE! ✅**

### ✅ Nuvarande databas-struktur:

```sql
-- Finns redan (minimal)
restaurants (
  id, slug, namn, beskrivning
)

-- Används i orders
orders.restaurant_slug = 'campino'

-- Används i users
users.restaurant_slug = 'campino'
```

**PHASE 2 lägger till kolumner (backward compatible):**
```sql
ALTER TABLE restaurants ADD COLUMN address TEXT;
ALTER TABLE restaurants ADD COLUMN phone VARCHAR(20);
ALTER TABLE restaurants ADD COLUMN email VARCHAR(100);
ALTER TABLE restaurants ADD COLUMN logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN opening_hours JSONB;
ALTER TABLE restaurants ADD COLUMN menu_file_path VARCHAR(255);
```

**Risk: INGEN** - Lägger bara till nya kolumner

---

## 2. VAD KAN GÅ FEL? (RISKANALYS)

### ⚠️ RISK 1: Migrera menyer till databas
**Problem:** Originalplanen ville flytta menyer till databas-tabeller
**Konsekvens:** Frontend skulle krasha (förväntar sig nuvarande JSON-format)
**Lösning:** ✅ **Redan fixat i roadmap - behåll JSON-filer**

```javascript
// ❌ GALLER INTE:
CREATE TABLE menu_items (...)

// ✅ GÖR ISTÄLLET:
-- Behåll campino.json och sunsushi.json
-- Lägg bara till menu_file_path i restaurants-tabellen
```

### ⚠️ RISK 2: Restaurant finns inte
**Problem:** Någon skapar order för restaurang som inte finns
**Nu:** Ingen validering - order skapas ändå
**PHASE 2 fix:**
```javascript
// Lägg till validering
if (!restaurantExists(slug)) {
  return res.status(400).json({ error: 'Restaurant finns inte' });
}
```
**Risk: LÅG** - Lätt att fixa

### ⚠️ RISK 3: Meny-fil saknas
**Problem:** restaurants.menu_file_path pekar på fil som inte finns
**Nu:** Server kraschar
**PHASE 2 fix:**
```javascript
try {
  const menu = JSON.parse(fs.readFileSync(menuPath));
  return menu;
} catch (error) {
  console.error('Menu not found:', error);
  return []; // Returnera tom meny istället för krasch
}
```
**Risk: LÅG** - Lägg till error handling

### ✅ INGEN RISK: Restaurant access control
**Status:** Redan implementerat perfekt i `verifyAdminForSlug`
```javascript
// Admin kan se alla
if (req.user.role === "admin") return next();

// Restaurant kan bara se egen data
if (req.user.restaurant_slug !== slug) {
  return res.status(403).json({ error: "Fel restaurang" });
}
```

---

## 3. FÖRBÄTTRINGAR & MODERNISERING

### 💡 Förbättring 1: Meny-editor i admin-panelen

**Istället för att manuellt ändra JSON:**
```javascript
// Admin får ett UI för att redigera menyn
POST /api/admin/restaurants/:slug/menu
{
  "items": [
    {id: 1, namn: "Margarita", pris: 125, ...},
    {id: 2, namn: "Vesuvio", pris: 135, ...}
  ]
}

// Backend:
1. Validerar JSON-struktur
2. Skapar backup av gammal meny
3. Sparar ny meny till campino.json
4. Uppdaterar restaurants.updated_at
```

**Fördelar:**
- ✅ Inga manuella filändringar
- ✅ Backup före varje ändring
- ✅ Validering (förhindrar fel)
- ✅ Versionering (kan ångra)

### 💡 Förbättring 2: Restaurant metadata API

**Nuläge:** Minimal data (bara namn, slug)
**PHASE 2:** Komplett information

```javascript
// GET alla restauranger (publikt)
GET /api/restaurants
→ [{
  slug: "campino",
  namn: "Campino",
  beskrivning: "Italiensk pizza",
  logo_url: "/logos/campino.png",
  is_active: true,
  opening_hours: {
    monday: "11:00-22:00",
    tuesday: "11:00-22:00"
  }
}]

// Admin skapar ny restaurang
POST /api/admin/restaurants
{
  "slug": "newrestaurant",
  "namn": "Ny Restaurant",
  "adress": "Storgatan 1",
  "telefon": "08-123456"
}
```

### 💡 Förbättring 3: Meny-validering

**Validera struktur innan sparande:**
```javascript
function validateMenu(menuData) {
  // Kolla att det är en array
  if (!Array.isArray(menuData)) throw new Error('Menu måste vara array');

  // Kolla varje post
  for (const item of menuData) {
    if (!item.id) throw new Error('Saknar id');
    if (!item.namn) throw new Error('Saknar namn');
    if (!item.kategori) throw new Error('Saknar kategori');
    if (item.pris < 0) throw new Error('Pris kan inte vara negativt');
  }

  // Kolla dubletter
  const ids = menuData.map(i => i.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) throw new Error(`Dublett-ID: ${duplicates}`);
}
```

---

## 4. FÖLJER PHASE 1 STANDARD?

### ✅ JA! PHASE 2 följer samma mönster:

**Service Layer:**
```javascript
// PHASE 1 pattern:
class PermissionService {
  static async getUserPermissions(userId) { ... }
}

// PHASE 2 följer samma:
class RestaurantService {
  static async getAllRestaurants() { ... }
  static async getRestaurantBySlug(slug) { ... }
  static async updateMenu(slug, menuData) { ... }
}
```

**Controller Layer:**
```javascript
// PHASE 1 pattern:
try {
  const data = await Service.getData();
  res.json({ success: true, data });
} catch (error) {
  next(error);
}

// PHASE 2 samma:
static async getAllRestaurants(req, res, next) {
  try {
    const restaurants = await RestaurantService.getAllRestaurants();
    res.json({ success: true, data: restaurants });
  } catch (error) {
    next(error);
  }
}
```

**Middleware Chain:**
```javascript
// PHASE 1:
router.get('/api/orders',
  verifyJWT,
  requirePermission('orders:view:own'),
  OrderController.getOrders
);

// PHASE 2 samma:
router.get('/api/admin/restaurants',
  verifyJWT,
  requirePermission('restaurant:view:all'),
  RestaurantController.getAllRestaurants
);
```

**✅ PHASE 2 följer exakt samma kodkvalitet som PHASE 1!**

---

## 5. ANTI-PATTERNS ATT UNDVIKA

### ❌ FEL: Ändra befintliga endpoints
```javascript
// GÖR INTE:
GET /api/meny → {restaurant: {}, menu: []}  // Frontend kraschar!

// GÖR:
GET /api/meny → [...]  // Samma som innan
GET /api/restaurants/:slug/menu → {restaurant: {}, menu: []}  // Ny endpoint
```

### ❌ FEL: Synkrona fil-operationer
```javascript
// GÖR INTE:
fs.writeFileSync(path, data);  // Blockerar servern!

// GÖR:
await fs.promises.writeFile(path, data);
```

### ❌ FEL: Direkt databas i controller
```javascript
// GÖR INTE:
const result = await pool.query('SELECT ...');
res.json(result.rows);

// GÖR:
const data = await RestaurantService.getData();
res.json({ success: true, data });
```

### ✅ RÄTT: Transaktioner för kritiska operationer
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // 1. Skapa restaurant
  await client.query('INSERT INTO restaurants...');

  // 2. Skapa meny-fil
  await fs.promises.writeFile(...);

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## 6. TESTNING

### Unit Tests (RestaurantService):
```javascript
✅ getAllRestaurants() - returnerar alla aktiva
✅ getRestaurantBySlug() - hittar rätt restaurant
✅ getRestaurantBySlug('invalid') - kastar fel
✅ updateMenu() - validerar struktur
✅ updateMenu() - skapar backup
```

### Integration Tests (API):
```javascript
✅ GET /api/admin/restaurants - admin får data
✅ GET /api/admin/restaurants - icke-admin nekas (403)
✅ PUT /api/restaurant/:slug/menu - restaurant kan uppdatera egen
✅ PUT /api/restaurant/:slug/menu - restaurant kan INTE uppdatera annans (403)
```

### End-to-End Test:
```javascript
1. Admin skapar ny restaurant
2. Restaurant syns i listan
3. Admin skapar användare för restaurangen
4. Användare kan logga in
5. Användare kan se egna orders
6. Användare kan uppdatera egen meny
7. Admin kan deaktivera restaurangen
```

---

## 7. IMPLEMENTATIONSPLAN

### Backend (6-8h):

**1. Databas Migration (1h)**
```bash
# Skapa migration
backend/migrations/003_restaurants_extended.js

# Lägg till kolumner
ALTER TABLE restaurants ADD COLUMN address TEXT;
ALTER TABLE restaurants ADD COLUMN phone VARCHAR(20);
...

# Seed befintliga
INSERT INTO restaurants (slug, namn, menu_file_path) VALUES
  ('campino', 'Campino', 'Data/menyer/campino.json'),
  ('sunsushi', 'SunSushi', 'Data/menyer/sunsushi.json');
```

**2. Service Layer (2-3h)**
```bash
# Skapa service
backend/src/services/restaurantService.js

# Metoder:
- getAllRestaurants()
- getRestaurantBySlug(slug)
- createRestaurant(data)
- updateRestaurant(slug, data)
- deleteRestaurant(slug)  // Soft delete
- updateMenu(slug, menuData)
- validateMenu(menuData)
```

**3. Controller Layer (1h)**
```bash
backend/src/controllers/restaurantController.js

# Alla endpoints med try-catch och next(error)
```

**4. API Routes (1-2h)**
```bash
backend/src/routes/restaurants.js

GET    /api/restaurants           # Publikt
GET    /api/admin/restaurants     # Admin
POST   /api/admin/restaurants     # Admin
PUT    /api/admin/restaurants/:slug  # Admin/Restaurant
DELETE /api/admin/restaurants/:slug  # Admin (soft delete)
PUT    /api/restaurant/:slug/menu    # Restaurant
```

**5. Middleware (1h)**
```bash
- validateRestaurantExists
- validateMenuStructure
- Använd befintliga: verifyJWT, requirePermission, verifyAdminForSlug
```

**6. Testing (1-2h)**
```bash
npm test -- restaurantService.test.js
npm test -- restaurants.test.js
```

### Frontend (2-3h):

**1. Admin Restaurant Management (1-2h)**
```bash
frontend/src/pages/admin/RestaurantsPage.jsx

# Features:
- Lista alla restauranger
- Lägg till ny restaurang
- Redigera restaurang
- Aktivera/Deaktivera
```

**2. Meny Editor (1h)**
```bash
frontend/src/pages/admin/MenuEditor.jsx

# Features:
- Visa nuvarande meny
- Redigera meny (JSON editor eller form)
- Ladda upp JSON-fil
- Ladda ner JSON-fil
- Preview
```

---

## 8. KRITISKA VARNINGAR

### ⚠️ 1. Migrera INTE menyer till databas
**Varför:** Frontend förväntar sig nuvarande JSON-format
**Gör istället:** Behåll JSON-filer, lägg bara till `menu_file_path` i restaurants-tabellen

### ⚠️ 2. Ändra INTE `/api/meny` endpoint
**Varför:** Frontend är beroende av nuvarande response format
**Gör istället:** Skapa nya endpoints om du behöver annan struktur

### ⚠️ 3. Ta INTE bort `restaurant_slug` från orders/users
**Varför:** Det är länken mellan allt
**Viktigt:** `restaurants.slug` måste matcha exakt

### ✅ 4. Använd transaktioner vid restaurant-skapande
**Varför:** Skapa restaurant + meny-fil ska vara atomiskt
**Rollback om något misslyckas**

### ✅ 5. Validera alltid meny-struktur
**Varför:** Förhindra invalid JSON från att krasha frontend
**Skapa backup innan varje meny-uppdatering**

---

## 9. SLUTSATS

### ✅ REKOMMENDATION: GÅ VIDARE MED PHASE 2

**Varför:**
- ✅ 100% kompatibel med nuvarande system
- ✅ Följer PHASE 1 standard
- ✅ Låg risk-profil
- ✅ Additive changes (inga breaking changes)
- ✅ Moderna best practices
- ✅ Realistisk tidslinje (8-11h)

**Vad du får:**
- Metadata-hantering för restauranger
- Meny-editor i admin-panel
- Validering och backup av menyer
- RESTful API för restauranger
- Soft delete (is_active flagga)
- Versionering av menyändringar

**Sätt igång:**
```bash
# 1. Skapa branch
git checkout -b feature/phase2-restaurant-management

# 2. Börja med databas
node backend/migrations/003_restaurants_extended.js

# 3. Implementera service layer
# Följ PHASE 1 patterns

# 4. Testa grundligt
npm test

# 5. Deplooya stegvis
# Backend först, sedan frontend
```

---

## 📋 CHECKLISTA INNAN START

- [ ] Läst denna rapport
- [ ] Förstått att JSON-menyer ska behållas
- [ ] Bekräftat att PHASE 1 är mergead till main
- [ ] Skapat feature branch: `feature/phase2-restaurant-management`
- [ ] Backupat databasen: `pg_dump > backup.sql`
- [ ] Klar att börja med migration

---

**Rapport skapad:** 2025-11-24
**Analyserad av:** Claude Code
**Status:** ✅ REDO FÖR IMPLEMENTATION

🚀 **PHASE 2 är redo - lycka till med implementationen!**
