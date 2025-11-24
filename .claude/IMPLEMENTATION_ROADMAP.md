# 🗺️ Implementation Roadmap - Multi-Tenant System

**Datum:** 2025-11-23
**Status:** PLANNING PHASE
**Estimated Total Time:** ~40-50 timmar (fördelat över 5 faser)

---

## 📋 Översikt - Features att Implementera

### Användarhistorier:

1. ✅ **Som admin** vill jag kunna lägga till nya restauranger lätt och deras meny
2. ✅ **Som admin** vill jag kunna ge ut roller som kurir-roll och restaurang-roll
3. ✅ **Som kund** ska jag kunna bli medlem
4. ✅ **Som admin** vill jag kunna administrera kunder men INTE se personnummer/känslig info utan kryptering (GDPR)
5. ✅ **Som kurir** ska jag ha tillgång till min historik och INTE andras historik
6. ✅ **Som restaurang** ska jag endast kunna se orders som kommit in till vår restaurang och INTE andras
7. ✅ **Som restaurang** vill jag kunna kontakta admin för hjälp med problem
8. ✅ **Som admin** vill jag se kurir-kontrakt och relevant info i kurir-profil när de får kurir-rollen
9. ✅ **Som kund** ska jag INTE ha tillgång till eller se det kurir och restaurang ser

---

## 🎯 PHASE 1: Roll & Autentisering System (Foundation)

**Prioritet:** 🔴 KRITISK - Måste göras först
**Estimerad tid:** ~8-10 timmar
**Komplexitet:** MEDIUM

### Mål:
Implementera ett robust roll-baserat autentiseringssystem som separerar vyer och behörigheter.

### Tasks:

#### 1.1 Backend - Roll System ✓
- [x] Skapa `roles` tabell i databasen
  - Roller: `admin`, `restaurant_staff`, `courier`, `customer`
- [ ] Skapa `user_roles` junction tabell (many-to-many)
- [ ] Uppdatera `users` tabell med `primary_role`
- [ ] Implementera permission system

**SQL Schema:**
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  restaurant_id INTEGER REFERENCES restaurants(id), -- NULL för kurir/admin
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id, restaurant_id)
);
```

#### 1.2 Backend - Permission Middleware
- [ ] Skapa `checkPermission(permission)` middleware
- [ ] Skapa `checkRole(roles)` middleware
- [ ] Skapa `checkRestaurantAccess(restaurantId)` middleware
- [ ] Skapa `checkCourierOwnership(orderId)` middleware

**Exempel:**
```javascript
router.get('/orders',
  verifyJWT,
  checkRole(['restaurant_staff']),
  checkRestaurantAccess(),
  OrderController.getRestaurantOrders
);
```

#### 1.3 Frontend - Role Context
- [ ] Skapa `RoleContext.jsx` med user's roles
- [ ] Skapa `ProtectedRoute` component
- [ ] Implementera `usePermission(permission)` hook
- [ ] Implementera `useRole(role)` hook

#### 1.4 Frontend - Role-Based Navigation
- [ ] Visa olika navbar baserat på roll
- [ ] Redirect baserat på primary role efter login
- [ ] Dölj/visa komponenter baserat på permissions

**Acceptance Criteria:**
- ✅ Admin kan se alla vyer
- ✅ Restaurang-staff ser endast restaurang-vy
- ✅ Kurir ser endast kurir-vy
- ✅ Kund ser endast kund-vy
- ✅ Unauthorized access returnerar 403

---

## 🏪 PHASE 2: Restaurang Management System

**Prioritet:** 🟠 HÖG
**Estimerad tid:** ~10-12 timmar
**Komplexitet:** MEDIUM-HIGH
**Beroenden:** PHASE 1

### Mål:
Admin kan enkelt lägga till och hantera restauranger och deras menyer. Restauranger ser endast sina egna orders.

### Tasks:

#### 2.1 Database - Restaurant System
- [ ] Skapa `restaurants` tabell (om inte finns)
- [ ] Skapa `menu_items` tabell
- [ ] Skapa `menu_categories` tabell
- [ ] Lägg till `restaurant_id` på orders (kolla om finns)

**SQL Schema:**
```sql
CREATE TABLE restaurants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  logo_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  opening_hours JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE menu_categories (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  category_id INTEGER REFERENCES menu_categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- öre
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  options JSONB, -- allergener, tillval, etc
  display_order INTEGER DEFAULT 0
);
```

#### 2.2 Backend - Restaurant Management API
- [ ] `POST /api/admin/restaurants` - Skapa restaurang
- [ ] `PUT /api/admin/restaurants/:id` - Uppdatera restaurang
- [ ] `DELETE /api/admin/restaurants/:id` - Ta bort/inaktivera restaurang
- [ ] `GET /api/admin/restaurants` - Lista alla restauranger
- [ ] `POST /api/admin/restaurants/:id/menu` - Lägg till menu item
- [ ] `PUT /api/admin/restaurants/:id/menu/:itemId` - Uppdatera menu item
- [ ] `DELETE /api/admin/restaurants/:id/menu/:itemId` - Ta bort menu item

#### 2.3 Backend - Restaurant Isolation
- [ ] Uppdatera `fetchAdminOrders` att filtrera på `restaurant_id`
- [ ] Lägg till middleware `verifyRestaurantAccess`
- [ ] Säkerställ att restaurang-staff endast ser sina orders

**Exempel:**
```javascript
// Middleware som kollar att user har access till restaurang
const verifyRestaurantAccess = async (req, res, next) => {
  const { restaurantId } = req.params;
  const userRoles = await getUserRoles(req.user.userId);

  const hasAccess = userRoles.some(role =>
    role.role_name === 'admin' ||
    (role.role_name === 'restaurant_staff' && role.restaurant_id === restaurantId)
  );

  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
  next();
};
```

#### 2.4 Frontend - Admin Restaurant Management
- [ ] Skapa `/admin/restaurants` sida
- [ ] Lista alla restauranger
- [ ] Formulär för att lägga till ny restaurang
- [ ] Edit-modal för att uppdatera restaurang
- [ ] Aktivera/inaktivera restaurang

#### 2.5 Frontend - Admin Menu Management
- [ ] Skapa `/admin/restaurants/:id/menu` sida
- [ ] Lista menu items grupperade per kategori
- [ ] Formulär för att lägga till menu item
- [ ] Drag-and-drop för att ordna items
- [ ] Bulk upload (JSON/CSV)

#### 2.6 Frontend - Restaurant Staff Isolation
- [ ] Uppdatera `RestaurangVy` att använda user's restaurant_id
- [ ] Ta bort restaurant selector för restaurant_staff
- [ ] Verifiera att endast egna orders visas

**Acceptance Criteria:**
- ✅ Admin kan skapa ny restaurang med meny
- ✅ Admin kan uppdatera restaurang-info och meny
- ✅ Restaurang-staff ser endast sin restaurangs orders
- ✅ Restaurang-staff kan INTE byta till annan restaurang
- ✅ Orders filtreras korrekt per restaurang

---

## 🚚 PHASE 3: Kurir Management System

**Prioritet:** 🟠 HÖG
**Estimerad tid:** ~8-10 timmar
**Komplexitet:** MEDIUM
**Beroenden:** PHASE 1

### Mål:
Admin kan ge kurir-roll med kontrakt. Kurir ser endast sin egen historik.

### Tasks:

#### 3.1 Database - Courier System
- [ ] Skapa `courier_profiles` tabell
- [ ] Skapa `courier_contracts` tabell
- [ ] Lägg till `assigned_courier_id` på orders (kolla om finns)

**SQL Schema:**
```sql
CREATE TABLE courier_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  vehicle_type VARCHAR(50), -- bike, car, scooter
  license_number VARCHAR(50),
  vehicle_registration VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3,2),
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courier_contracts (
  id SERIAL PRIMARY KEY,
  courier_id INTEGER REFERENCES courier_profiles(id),
  contract_type VARCHAR(50), -- employee, freelance
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate INTEGER, -- öre
  delivery_rate INTEGER, -- öre per delivery
  contract_pdf_url TEXT,
  insurance_info JSONB,
  emergency_contact JSONB,
  signed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 Backend - Courier Management API
- [ ] `POST /api/admin/couriers` - Skapa kurir-profil och ge roll
- [ ] `PUT /api/admin/couriers/:id` - Uppdatera kurir-profil
- [ ] `POST /api/admin/couriers/:id/contract` - Lägg till kontrakt
- [ ] `GET /api/admin/couriers/:id/contracts` - Hämta kurir-kontrakt
- [ ] `GET /api/admin/couriers` - Lista alla kurirer

#### 3.3 Backend - Courier Isolation
- [ ] Uppdatera `fetchCourierOrders` att filtrera på `assigned_courier_id`
- [ ] Lägg till middleware `verifyCourierOwnership`
- [ ] Säkerställ att kurir endast ser sina egna orders

**Exempel:**
```javascript
// Middleware som kollar att user är kuriren för denna order
const verifyCourierOwnership = async (req, res, next) => {
  const { orderId } = req.params;
  const order = await getOrderById(orderId);

  const isAdmin = req.user.role === 'admin';
  const isOwnOrder = order.assigned_courier_id === req.user.userId;

  if (!isAdmin && !isOwnOrder) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};
```

#### 3.4 Backend - Courier History Filter
- [ ] Uppdatera `getCourierOrders` med courier_id filter för historik
- [ ] Endast admin kan se alla kurirers historik
- [ ] Kurir ser endast sin egen historik

#### 3.5 Frontend - Admin Courier Management
- [ ] Skapa `/admin/couriers` sida
- [ ] Lista alla kurirer med status
- [ ] Formulär för att lägga till ny kurir
- [ ] Upload kontrakt-PDF
- [ ] Visa kurir-statistik (deliveries, rating)

#### 3.6 Frontend - Courier Profile View
- [ ] Skapa `/courier/profile` sida
- [ ] Visa kurir-info och kontrakt
- [ ] Visa statistik (antal leveranser, rating)
- [ ] Visa kontrakt-dokument (read-only)

#### 3.7 Frontend - Courier History Isolation
- [ ] Uppdatera `KurirVy` att filtrera på egen courier_id
- [ ] Historik visar endast egna levererade orders
- [ ] Verifiera att inga andra kurirers orders visas

**Acceptance Criteria:**
- ✅ Admin kan skapa kurir-profil med kontrakt
- ✅ Kurir kan se sitt kontrakt i profil
- ✅ Kurir ser endast sin egen historik
- ✅ Kurir kan INTE se andra kurirers orders eller historik
- ✅ Orders filtreras korrekt per kurir

---

## 👤 PHASE 4: Kund Management & GDPR

**Prioritet:** 🟡 MEDIUM
**Estimerad tid:** ~10-12 timmar
**Komplexitet:** HIGH (på grund av GDPR-krav)
**Beroenden:** PHASE 1

### Mål:
Kunder kan registrera sig som medlemmar. Admin kan administrera kunder men känslig data är krypterad enligt GDPR.

### Tasks:

#### 4.1 Database - Customer System
- [ ] Skapa `customers` tabell (separat från `users`)
- [ ] Implementera kryptering för känslig data
- [ ] Skapa `customer_consents` tabell för GDPR

**SQL Schema:**
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  -- KRYPTERAD DATA (använd pgcrypto)
  personal_number_encrypted BYTEA, -- personnummer
  address_encrypted BYTEA,
  phone_encrypted BYTEA,
  -- OKRYPTERAD DATA
  email VARCHAR(100) NOT NULL,
  preferences JSONB, -- dietary restrictions, etc
  loyalty_points INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customer_consents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  consent_type VARCHAR(50) NOT NULL, -- gdpr, marketing, analytics
  is_granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address INET
);
```

#### 4.2 Backend - Encryption Implementation
- [ ] Installera `crypto` library
- [ ] Skapa `encryptionService.js`
- [ ] Implementera `encrypt(data)` och `decrypt(data)` funktioner
- [ ] Använda AES-256-GCM encryption
- [ ] Spara encryption key i `.env` (ALDRIG i git!)

**Exempel:**
```javascript
// encryptionService.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encrypted, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

#### 4.3 Backend - Customer Registration API
- [ ] `POST /api/auth/register/customer` - Registrera kund
- [ ] `POST /api/customers/verify-email` - Verifiera email
- [ ] `GET /api/customers/profile` - Hämta profil (customer only)
- [ ] `PUT /api/customers/profile` - Uppdatera profil
- [ ] `POST /api/customers/consents` - Uppdatera GDPR-consent

#### 4.4 Backend - Admin Customer Management API
- [ ] `GET /api/admin/customers` - Lista kunder (UTAN känslig data)
- [ ] `GET /api/admin/customers/:id` - Hämta kund-detaljer
- [ ] `POST /api/admin/customers/:id/decrypt` - Dekryptera data (med audit log)
- [ ] `PUT /api/admin/customers/:id` - Uppdatera kund
- [ ] `DELETE /api/admin/customers/:id` - GDPR-delete (soft delete)

#### 4.5 Backend - GDPR Compliance
- [ ] Implementera audit logging för dekryptering
- [ ] Implementera "right to be forgotten" (data deletion)
- [ ] Implementera "right to data portability" (export)
- [ ] Auto-delete old data efter retention period

**Exempel:**
```javascript
// Admin måste ha specific permission för att dekryptera
router.post('/api/admin/customers/:id/decrypt',
  verifyJWT,
  checkPermission('decrypt_customer_data'),
  async (req, res) => {
    const { field } = req.body; // 'personal_number', 'address', etc

    // LOG AUDIT
    await logAudit({
      action: 'DECRYPT_CUSTOMER_DATA',
      user_id: req.user.userId,
      customer_id: req.params.id,
      field,
      timestamp: new Date(),
      ip_address: req.ip
    });

    // DEKRYPTERA
    const encrypted = await getEncryptedField(req.params.id, field);
    const decrypted = decrypt(encrypted.data, encrypted.iv, encrypted.authTag);

    res.json({ [field]: decrypted });
  }
);
```

#### 4.6 Frontend - Customer Registration
- [ ] Skapa `/register` sida
- [ ] Formulär med GDPR-consents
- [ ] Email-verifikation flow
- [ ] Welcome email

#### 4.7 Frontend - Customer Profile
- [ ] Skapa `/profile` sida för kunder
- [ ] Visa profil-info
- [ ] Uppdatera preferences
- [ ] Hantera GDPR-consents
- [ ] Export data-knapp
- [ ] Delete account-knapp

#### 4.8 Frontend - Admin Customer Management
- [ ] Skapa `/admin/customers` sida
- [ ] Lista kunder (maskerad känslig data)
- [ ] Sök och filtrera kunder
- [ ] "Decrypt"-knapp med confirmation (audit logged)
- [ ] Visa GDPR-consents
- [ ] Export customer data

**Acceptance Criteria:**
- ✅ Kund kan registrera sig som medlem
- ✅ Känslig data krypteras i databasen
- ✅ Admin ser INTE känslig data utan explicit dekryptering
- ✅ All dekryptering loggas i audit log
- ✅ Kund kan exportera sin data (GDPR)
- ✅ Kund kan ta bort sitt konto (GDPR)
- ✅ GDPR-consents hanteras korrekt

---

## 💬 PHASE 5: Support & Communication System

**Prioritet:** 🟢 LÅG
**Estimerad tid:** ~6-8 timmar
**Komplexitet:** MEDIUM
**Beroenden:** PHASE 1, PHASE 2

### Mål:
Restauranger kan kontakta admin för hjälp med problem.

### Tasks:

#### 5.1 Database - Support System
- [ ] Skapa `support_tickets` tabell
- [ ] Skapa `support_messages` tabell
- [ ] Skapa `support_categories` tabell

**SQL Schema:**
```sql
CREATE TABLE support_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50)
);

CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  restaurant_id INTEGER REFERENCES restaurants(id), -- NULL för kurir/kund
  category_id INTEGER REFERENCES support_categories(id),
  subject VARCHAR(200) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to INTEGER REFERENCES users(id), -- admin user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE support_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id),
  sender_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT false, -- internal admin note
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5.2 Backend - Support API
- [ ] `POST /api/support/tickets` - Skapa ticket
- [ ] `GET /api/support/tickets` - Lista egna tickets
- [ ] `GET /api/support/tickets/:id` - Hämta ticket med messages
- [ ] `POST /api/support/tickets/:id/messages` - Skicka meddelande
- [ ] `PUT /api/support/tickets/:id/status` - Uppdatera status
- [ ] `GET /api/admin/support/tickets` - Admin: lista alla tickets
- [ ] `PUT /api/admin/support/tickets/:id/assign` - Admin: tilldela ticket

#### 5.3 Backend - Notification System
- [ ] Skicka email när ticket skapas
- [ ] Skicka email när admin svarar
- [ ] Skicka email när ticket resolved

#### 5.4 Frontend - Restaurant Support
- [ ] Skapa "Hjälp"-knapp i RestaurangVy
- [ ] Modal för att skapa ny ticket
- [ ] Lista egna tickets
- [ ] Chat-gränssnitt för att kommunicera med admin

#### 5.5 Frontend - Admin Support Panel
- [ ] Skapa `/admin/support` sida
- [ ] Lista alla tickets med filter (status, priority)
- [ ] Tilldela tickets till admins
- [ ] Chat-gränssnitt för att svara på tickets
- [ ] Markera ticket som resolved

**Acceptance Criteria:**
- ✅ Restaurang kan skapa support ticket
- ✅ Restaurang kan kommunicera med admin via ticket
- ✅ Admin ser alla support tickets
- ✅ Admin kan tilldela och svara på tickets
- ✅ Email-notifikationer skickas korrekt

---

## 🎯 Implementation Order (Rekommenderad)

### Sprint 1 (10-12 timmar):
**PHASE 1: Roll & Autentisering**
- Kritisk foundation för allt annat
- Måste göras först

### Sprint 2 (10-12 timmar):
**PHASE 2: Restaurang Management**
- Högt prioriterad
- Bygger på PHASE 1

### Sprint 3 (8-10 timmar):
**PHASE 3: Kurir Management**
- Högt prioriterad
- Oberoende av PHASE 2

### Sprint 4 (10-12 timmar):
**PHASE 4: Kund Management & GDPR**
- Medium prioritet
- Komplex men viktig

### Sprint 5 (6-8 timmar):
**PHASE 5: Support System**
- Lägst prioritet
- Kan göras sist

**Total Estimerad Tid:** 44-54 timmar (5-7 arbetsdagar)

---

## ⚠️ Viktiga Överväganden

### Security:
- ✅ ALDRIG spara encryption keys i git
- ✅ Använd environment variables
- ✅ Implementera rate limiting på känsliga endpoints
- ✅ Audit logging för all admin access
- ✅ HTTPS i produktion

### GDPR:
- ✅ Kryptera all känslig data
- ✅ Implementera "right to be forgotten"
- ✅ Implementera "right to data portability"
- ✅ Logga all access till känslig data
- ✅ Data retention policies

### Performance:
- ✅ Indexera `restaurant_id` och `assigned_courier_id` på orders
- ✅ Caching för menu items
- ✅ Pagination för customer lists
- ✅ Lazy loading för historik

### Testing:
- ✅ Unit tests för encryption/decryption
- ✅ Integration tests för permission system
- ✅ E2E tests för critical flows
- ✅ Security audit

---

## 📋 Next Steps

### Immediate Actions:
1. **Review denna plan** med teamet
2. **Prioritera features** om nödvändigt
3. **Sätt upp development environment** för PHASE 1
4. **Skapa git branch:** `feature/role-system`
5. **Börja med PHASE 1 tasks**

### Questions to Answer Before Starting:
- [ ] Vilka encryption libraries ska vi använda?
- [ ] Hur ska vi hantera encryption keys i produktion?
- [ ] Vilken data retention policy ska vi ha?
- [ ] Behöver vi external consent management platform?
- [ ] Hur ska vi hantera multi-restaurant chains?

---

**Status:** 📋 PLANNING COMPLETE - Ready to start PHASE 1

Vill du börja med PHASE 1 nu? 🚀
