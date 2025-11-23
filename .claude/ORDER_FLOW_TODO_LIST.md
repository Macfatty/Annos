# Order Flow Implementation - TODO List

**Skapad:** 2025-11-23
**Status:** 🔴 KRITISKA BUGGAR IDENTIFIERADE
**Syfte:** Implementera komplett order flow: Admin → Restaurang → Kurir → Kund

---

## 🔴 KRITISK BUG - MÅSTE FIXAS FÖRST

### Problem: Status Mismatch mellan Frontend och Backend

**Root Cause:** Frontend och backend använder OLIKA status-namn!

**Frontend (RestaurangVy.jsx) använder:**
```javascript
"received" → "accepted" → "in_progress" → "out_for_delivery" → "delivered"
```

**Backend (OrderService.js) validerar mot:**
```javascript
['received', 'preparing', 'ready', 'assigned', 'delivered', 'cancelled']
```

**Middleware (authMiddleware.js) förväntar:**
```javascript
received → accepted → in_progress → out_for_delivery → delivered
```

**Konsekvens:**
- När admin trycker "Acceptera order" → Frontend skickar `status: "accepted"`
- Backend validerar → `"accepted"` NOT IN validStatuses → Error: "Invalid status"
- Request misslyckas → Ordern kan inte accepteras ❌

**Fil-lokationer:**
- Frontend: `frontend/src/pages/restaurant/RestaurangVy.jsx` (rad 48-82)
- Backend validation: `backend/src/services/orderService.js` (rad 287)
- Middleware transitions: `backend/src/middleware/authMiddleware.js` (rad 33-39)

---

## 📋 TODO List - Industry Standard Format

### Phase 0: Critical Bug Fix (BLOCKAR ALLT) 🔴

**Priority:** P0 (CRITICAL)
**Estimated Effort:** 2-4 hours
**Dependencies:** None
**Blocking:** All order flow features

#### Task 0.1: Standardize Order Status Enum
**Type:** Bug Fix
**Component:** Backend + Frontend
**Description:** Skapa en single source of truth för order statuses

**Acceptance Criteria:**
- [ ] Skapa `backend/src/constants/orderStatuses.js` med canonical status enum
- [ ] Enum innehåller: `RECEIVED`, `ACCEPTED`, `IN_PROGRESS`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`
- [ ] Exportera både constants och transition rules
- [ ] Dokumentera varje status med kommentarer

**Files to Create:**
```
backend/src/constants/orderStatuses.js
```

**Implementation Notes:**
```javascript
// Förslag på struktur:
const ORDER_STATUS = {
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const STATUS_TRANSITIONS = {
  [ORDER_STATUS.RECEIVED]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.IN_PROGRESS],
  [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: []
};
```

---

#### Task 0.2: Update Backend OrderService Validation
**Type:** Bug Fix
**Component:** Backend Service Layer
**Description:** Använd nya status constants i OrderService

**Acceptance Criteria:**
- [ ] Importera ORDER_STATUS från constants
- [ ] Ersätt hardcoded validStatuses array
- [ ] Validera mot ORDER_STATUS values
- [ ] Testa att "accepted" nu är valid

**Files to Modify:**
```
backend/src/services/orderService.js (rad 287)
```

**Before:**
```javascript
const validStatuses = ['received', 'preparing', 'ready', 'assigned', 'delivered', 'cancelled'];
```

**After:**
```javascript
const { ORDER_STATUS } = require('../constants/orderStatuses');
const validStatuses = Object.values(ORDER_STATUS);
```

---

#### Task 0.3: Update Middleware Status Transitions
**Type:** Bug Fix
**Component:** Backend Middleware
**Description:** Använd nya transition rules från constants

**Acceptance Criteria:**
- [ ] Importera STATUS_TRANSITIONS från constants
- [ ] Ersätt hardcoded validTransitions
- [ ] Testa alla transitions
- [ ] Verifiera error messages inkluderar allowed transitions

**Files to Modify:**
```
backend/src/middleware/authMiddleware.js (rad 33-39)
```

---

#### Task 0.4: Update OrderController User ID Handling
**Type:** Bug Fix
**Component:** Backend Controller
**Description:** Fix backward compatibility för req.user.id

**Acceptance Criteria:**
- [ ] Använd `req.user.userId || req.user.id` för backward compatibility
- [ ] Lägg till kommentar om varför båda stöds
- [ ] Testa med både gamla och nya JWTs

**Files to Modify:**
```
backend/src/controllers/orderController.js (rad 136)
```

**Before:**
```javascript
const userId = req.user?.id;
```

**After:**
```javascript
// BACKWARD COMPATIBILITY: Support both userId (new) and id (old)
const userId = req.user?.userId || req.user?.id;
```

---

#### Task 0.5: Verify Frontend Status Names
**Type:** Verification
**Component:** Frontend
**Description:** Verifiera att frontend använder rätt status-namn

**Acceptance Criteria:**
- [ ] RestaurangVy.jsx använder: received, accepted, in_progress, out_for_delivery
- [ ] KurirVy.jsx (om den finns) använder samma
- [ ] MinaBeställningar.jsx displayar korrekt status-namn

**Files to Check:**
```
frontend/src/pages/restaurant/RestaurangVy.jsx
frontend/src/pages/courier/KurirVy.jsx
frontend/src/pages/customer/MinaBeställningar.jsx
```

---

#### Task 0.6: Test Critical Bug Fix
**Type:** Testing
**Component:** Integration
**Description:** Verifiera att acceptera-knappen nu fungerar

**Test Scenarios:**
- [ ] Logga in som admin
- [ ] Navigera till restaurang-sidan
- [ ] Se en order med status "received"
- [ ] Tryck "Acceptera order"
- [ ] Verifiera att status ändras till "accepted"
- [ ] Verifiera att UI uppdateras
- [ ] Verifiera att database uppdateras
- [ ] Kolla backend logs för errors

**Expected Result:**
- ✅ Status ändras från "received" till "accepted"
- ✅ Nästa knapp visas: "Påbörja tillverkning"
- ✅ Ingen error i console eller backend logs

---

### Phase 1: Restaurang Order Management ⭐

**Priority:** P1 (HIGH)
**Estimated Effort:** 4-6 hours
**Dependencies:** Phase 0 måste vara klar

#### Task 1.1: Implementera Order Status Workflow (Restaurang)
**Type:** Feature
**Component:** Frontend + Backend
**Description:** Komplett workflow för restaurang att hantera orders

**User Story:**
Som restaurang-användare vill jag kunna acceptera orders, påbörja tillverkning och markera som klar för hämtning.

**Acceptance Criteria:**
- [ ] Status "received" → Knapp: "Acceptera order" → Status: "accepted"
- [ ] Status "accepted" → Knapp: "Påbörja tillverkning" → Status: "in_progress"
- [ ] Status "in_progress" → Knapp: "Klar för hämtning" → Status: "ready_for_pickup"
- [ ] Varje status-byte sparas i database
- [ ] Updated_at timestamp uppdateras
- [ ] UI visar current status tydligt

**Note:** Behöver lägga till `ready_for_pickup` status i enum (mellan in_progress och out_for_delivery)

---

#### Task 1.2: Real-time Order Notifications (Restaurang)
**Type:** Feature
**Component:** Backend + Frontend
**Description:** Notifiera restaurang när nya orders kommer in

**Acceptance Criteria:**
- [ ] Polling varje 30 sekunder för nya orders (initial implementation)
- [ ] Ljud/visuell notis när ny order kommer
- [ ] Badge visar antal nya orders
- [ ] Auto-refresh order list
- [ ] (Future: WebSocket för real-time push)

**Files to Modify:**
```
frontend/src/pages/restaurant/RestaurangVy.jsx
```

---

#### Task 1.3: Order Detail View (Restaurang)
**Type:** Enhancement
**Component:** Frontend
**Description:** Expanderbar vy för att se full orderdetalj

**Acceptance Criteria:**
- [ ] Click på order → expanderar detaljer
- [ ] Visar alla items med options
- [ ] Visar customer notes tydligt
- [ ] Visar allergi-info (om tillagt)
- [ ] Print-funktion för kvitto

---

### Phase 2: Kurir Order Management ⭐

**Priority:** P1 (HIGH)
**Estimated Effort:** 6-8 hours
**Dependencies:** Phase 1.1 (status workflow)

#### Task 2.1: Kurir Orders Dashboard
**Type:** Feature
**Component:** Frontend + Backend
**Description:** Skapa dashboard för kurir att se tillgängliga och accepterade orders

**User Story:**
Som kurir vill jag se orders som är klara för hämtning och kunna acceptera dem.

**Acceptance Criteria:**
- [ ] Två tabs: "Tillgängliga" och "Mina orders"
- [ ] "Tillgängliga" visar orders med status "ready_for_pickup"
- [ ] Visar restaurang-namn, adress, leveransadress
- [ ] Visar estimated pickup time
- [ ] Sorteras på äldst först
- [ ] Knapp: "Acceptera att hämta"

**Files to Check/Modify:**
```
frontend/src/pages/courier/KurirVy.jsx
```

---

#### Task 2.2: Accept Order (Kurir)
**Type:** Feature
**Component:** Backend + Frontend
**Description:** Kurir kan acceptera en order för hämtning

**Acceptance Criteria:**
- [ ] Endpoint: PATCH `/api/order/:orderId/accept`
- [ ] Sätter status till "assigned"
- [ ] Sätter assigned_courier_id till kurir's user ID
- [ ] Returnerar full order med restaurang-info
- [ ] Frontend visar bekräftelse
- [ ] Order flyttas till "Mina orders" tab

**Backend Work:**
- [ ] Skapa/uppdatera OrderController.acceptOrder
- [ ] Validera att order är i "ready_for_pickup" status
- [ ] Validera att kurir har courier role
- [ ] Uppdatera database

**Files to Modify:**
```
backend/src/controllers/orderController.js
backend/src/services/orderService.js
frontend/src/pages/courier/KurirVy.jsx
frontend/src/services/orders/orderService.js
```

---

#### Task 2.3: Order Info för Kurir
**Type:** Feature
**Component:** Frontend
**Description:** Detaljerad info för kurir om hämtning och leverans

**Acceptance Criteria:**
- [ ] **Hämtadress:** Restaurang-namn, gatuadress, telefonnummer
- [ ] **Leveransadress:** Kund-namn, gatuadress, telefonnummer
- [ ] **Order items:** Lista på vad som ska levereras
- [ ] **Special instructions:** Customer notes
- [ ] **Navigation:** Knapp för att öppna i Google Maps
- [ ] **Contact:** Knapp för att ringa restaurang/kund

**UI Design:**
```
┌─────────────────────────────────────────┐
│ Order #123                              │
│ ────────────────────────────────────────│
│ 📍 HÄMTA FRÅN                           │
│   Campino Pizzeria                      │
│   Storgatan 1, Stockholm                │
│   📞 08-123 456                         │
│   [🗺️ Visa karta] [📞 Ring]            │
│                                         │
│ 📦 LEVERERA TILL                        │
│   Johan Andersson                       │
│   Lillgatan 5, Stockholm                │
│   📞 070-123 4567                       │
│   [🗺️ Visa karta] [📞 Ring]            │
│                                         │
│ 📋 INNEHÅLL                             │
│   • Margherita x2                       │
│   • Coca-Cola x1                        │
│                                         │
│ 💬 MEDDELANDE                           │
│   "Ring på dörren, jag hör inte         │
│    portelefonen"                        │
│                                         │
│ [✅ Markera hämtad]                     │
└─────────────────────────────────────────┘
```

---

#### Task 2.4: Markera Order Hämtad (Kurir)
**Type:** Feature
**Component:** Backend + Frontend
**Description:** Kurir markerar när order är hämtad från restaurang

**Acceptance Criteria:**
- [ ] Knapp: "Markera hämtad" (endast när status är "assigned")
- [ ] Endpoint: PATCH `/api/order/:orderId/picked-up`
- [ ] Sätter status till "out_for_delivery"
- [ ] Sätter picked_up_at timestamp
- [ ] Skickar notis till kund (future: SMS/email)
- [ ] UI uppdateras till leverans-läge

**Backend Work:**
- [ ] Skapa OrderController.markOrderAsPickedUp
- [ ] Validera att kurir är assigned till order
- [ ] Uppdatera database

**Files to Create/Modify:**
```
backend/src/controllers/orderController.js
backend/src/services/orderService.js
```

---

#### Task 2.5: Markera Order Levererad (Kurir)
**Type:** Feature
**Component:** Backend + Frontend
**Description:** Kurir markerar när order är levererad till kund

**Acceptance Criteria:**
- [ ] Knapp: "Markera levererad" (endast när status är "out_for_delivery")
- [ ] Endpoint: PATCH `/api/order/:orderId/delivered`
- [ ] Sätter status till "delivered"
- [ ] Sätter delivered_at timestamp
- [ ] Tar bort från "Mina orders"
- [ ] Visar leverans-bekräftelse
- [ ] Skickar notis till kund

**Backend Work:**
- [ ] Uppdatera OrderController.markOrderAsDelivered
- [ ] Validera att kurir är assigned till order
- [ ] Uppdatera database
- [ ] Returnera bekräftelse

---

### Phase 3: Kund Order Tracking ⭐

**Priority:** P2 (MEDIUM)
**Estimated Effort:** 4-6 hours
**Dependencies:** Phase 2 (kurir flow)

#### Task 3.1: Order Status Display (Kund)
**Type:** Feature
**Component:** Frontend
**Description:** Kund kan se status på sin order i real-time

**User Story:**
Som kund vill jag se var min order är i processen.

**Acceptance Criteria:**
- [ ] Status-timeline visar: Beställd → Accepterad → Tillagas → Ute för leverans → Levererad
- [ ] Current status highlightad
- [ ] Completed steps visas med checkmark
- [ ] Estimated delivery time visas
- [ ] Auto-refresh var 30:e sekund

**UI Design:**
```
Order #123 - 450 kr

┌─────────────────────────────────────────┐
│ Status Timeline                         │
│                                         │
│ ✅ Beställd        10:30                │
│ ✅ Accepterad      10:32                │
│ ✅ Tillagas        10:35                │
│ 🔄 Ute för leverans 10:50  ← DU ÄR HÄR │
│ ⏳ Levererad       ~11:10               │
│                                         │
│ 🚴 Din kurir är på väg!                 │
│    Beräknad leverans: 11:10            │
└─────────────────────────────────────────┘
```

**Files to Modify:**
```
frontend/src/pages/customer/MinaBeställningar.jsx
```

---

#### Task 3.2: Order Picked Up Notification
**Type:** Feature
**Component:** Frontend
**Description:** Notis till kund när order är hämtad

**Acceptance Criteria:**
- [ ] När status ändras till "out_for_delivery"
- [ ] Visa toast-notis: "Din beställning är på väg! 🚴"
- [ ] Uppdatera status-timeline
- [ ] Visa estimated delivery time
- [ ] (Future: Push notification)

---

#### Task 3.3: Order Delivered Notification
**Type:** Feature
**Component:** Frontend
**Description:** Notis till kund när order är levererad

**Acceptance Criteria:**
- [ ] När status ändras till "delivered"
- [ ] Visa toast-notis: "Din beställning har levererats! Smaklig måltid! 🍕"
- [ ] Markera som "Slutförd"
- [ ] Visa leverans-tid
- [ ] Erbjud rating/feedback (future)

---

### Phase 4: Database Schema Updates 📊

**Priority:** P1 (HIGH)
**Estimated Effort:** 1-2 hours
**Dependencies:** Phase 0 (status standardization)

#### Task 4.1: Add Missing Columns to Orders Table
**Type:** Database Migration
**Component:** Database
**Description:** Lägg till kolumner för ny funktionalitet

**Acceptance Criteria:**
- [ ] `picked_up_at TIMESTAMP` - När kurir hämtade order
- [ ] `ready_for_pickup_at TIMESTAMP` - När restaurang markerade klar
- [ ] `estimated_delivery_time TIMESTAMP` - Beräknad leveranstid
- [ ] Kolumner är nullable (gamla orders har inte dessa)
- [ ] Indexes på status, assigned_courier_id

**Migration Script:**
```sql
ALTER TABLE orders
  ADD COLUMN picked_up_at TIMESTAMP,
  ADD COLUMN ready_for_pickup_at TIMESTAMP,
  ADD COLUMN estimated_delivery_time TIMESTAMP;

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_courier ON orders(assigned_courier_id);
```

**Files to Create:**
```
backend/migrations/20251123_add_order_tracking_columns.sql
```

---

#### Task 4.2: Update CreateTables.js
**Type:** Maintenance
**Component:** Backend Setup
**Description:** Uppdatera table creation script med nya kolumner

**Acceptance Criteria:**
- [ ] Nya kolumner inkluderade i CREATE TABLE
- [ ] Indexes definierade
- [ ] Kommentarer förklarar varje kolumn

**Files to Modify:**
```
backend/createTables.js
```

---

### Phase 5: Testing & Quality Assurance 🧪

**Priority:** P1 (HIGH)
**Estimated Effort:** 6-8 hours
**Dependencies:** All previous phases

#### Task 5.1: Unit Tests (Backend)
**Type:** Testing
**Component:** Backend
**Description:** Enhetstester för order service och controllers

**Test Coverage:**
- [ ] OrderService.updateOrderStatus - alla transitions
- [ ] OrderService.acceptOrder - validation
- [ ] OrderService.markOrderAsPickedUp
- [ ] OrderService.markOrderAsDelivered
- [ ] Status transition validation
- [ ] Invalid status handling
- [ ] Invalid role handling

**Files to Create:**
```
backend/src/services/__tests__/orderService.test.js
backend/src/controllers/__tests__/orderController.test.js
```

---

#### Task 5.2: Integration Tests (API)
**Type:** Testing
**Component:** API
**Description:** End-to-end API tests för order flow

**Test Scenarios:**
- [ ] **Happy Path:** received → accepted → in_progress → ready_for_pickup → assigned → out_for_delivery → delivered
- [ ] **Invalid Transition:** received → delivered (should fail)
- [ ] **Role Validation:** Customer försöker acceptera order (should fail)
- [ ] **Not Found:** Uppdatera non-existent order (should 404)
- [ ] **Unauthorized:** Kurir försöker uppdatera annan kurirs order (should 403)

**Files to Create:**
```
backend/src/__tests__/orderFlow.integration.test.js
```

---

#### Task 5.3: E2E Tests (Frontend)
**Type:** Testing
**Component:** Frontend
**Description:** End-to-end tests för user flows

**Test Flows:**
1. **Admin Flow:**
   - Login som admin
   - Navigate till restaurang
   - Se order med status "received"
   - Acceptera order
   - Påbörja tillverkning
   - Markera klar för hämtning

2. **Kurir Flow:**
   - Login som kurir
   - Se tillgängliga orders
   - Acceptera order
   - Se hämtadress och leveransadress
   - Markera hämtad
   - Markera levererad

3. **Kund Flow:**
   - Login som kund
   - Se sina orders
   - Se status-uppdateringar
   - Se när order är levererad

**Tools:** Cypress eller Playwright

---

#### Task 5.4: Manual Testing Checklist
**Type:** Testing
**Component:** Full Stack
**Description:** Manuell testing av hela flödet

**Checklist:**
- [ ] Logga in som admin
- [ ] Välj restaurang "Campino"
- [ ] Lägg en beställning (2x Pizza, 1x Dricka)
- [ ] Navigera till admin → restaurang
- [ ] Verifiera att order syns med status "received"
- [ ] Klicka "Acceptera order"
- [ ] Verifiera att status ändras till "accepted"
- [ ] Klicka "Påbörja tillverkning"
- [ ] Verifiera att status ändras till "in_progress"
- [ ] Klicka "Klar för hämtning"
- [ ] Logga ut, logga in som kurir
- [ ] Se order under "Tillgängliga"
- [ ] Klicka "Acceptera att hämta"
- [ ] Verifiera restaurang-info visas
- [ ] Klicka "Markera hämtad"
- [ ] Verifiera leverans-info visas
- [ ] Klicka "Markera levererad"
- [ ] Logga ut, logga in som kund (samma email som beställde)
- [ ] Navigera till "Mina beställningar"
- [ ] Verifiera order visar status "delivered"

**Expected Result:** Hela flödet fungerar utan errors

---

### Phase 6: UI/UX Improvements 🎨

**Priority:** P2 (MEDIUM)
**Estimated Effort:** 4-6 hours
**Dependencies:** Phase 1-3 (core features)

#### Task 6.1: Status Color Coding
**Type:** Enhancement
**Component:** Frontend
**Description:** Konsistent färgkodning för alla statuser

**Color Scheme:**
```javascript
const STATUS_COLORS = {
  received: '#FF6B6B',        // Röd - Ny
  accepted: '#4ECDC4',        // Cyan - Accepterad
  in_progress: '#45B7D1',     // Blå - Pågående
  ready_for_pickup: '#F9CA24', // Gul - Klar
  assigned: '#A29BFE',        // Lila - Tilldelad
  out_for_delivery: '#FD79A8', // Rosa - Levereras
  delivered: '#00B894',       // Grön - Levererad
  cancelled: '#636E72'        // Grå - Avbruten
};
```

**Acceptance Criteria:**
- [ ] Alla status-badges använder dessa färger
- [ ] Timeline använder samma färger
- [ ] Accessibility-check (WCAG AA contrast)

---

#### Task 6.2: Loading States
**Type:** Enhancement
**Component:** Frontend
**Description:** Tydliga loading indicators

**Acceptance Criteria:**
- [ ] Spinner när order-list laddas
- [ ] Disabled knapp med spinner när status uppdateras
- [ ] Skeleton screens för order cards
- [ ] Error states med retry-knapp

---

#### Task 6.3: Toast Notifications
**Type:** Enhancement
**Component:** Frontend
**Description:** User-friendly notifications för alla actions

**Acceptance Criteria:**
- [ ] Success toast när order accepteras
- [ ] Error toast vid misslyckade requests
- [ ] Info toast vid status-ändringar
- [ ] Toast auto-dismiss efter 5 sekunder
- [ ] Använd react-hot-toast eller liknande

---

#### Task 6.4: Mobile Responsiveness
**Type:** Enhancement
**Component:** Frontend CSS
**Description:** Optimera för mobil (especially för kurir)

**Acceptance Criteria:**
- [ ] Order cards stackar vertikalt på mobil
- [ ] Knappar är touch-friendly (min 44x44px)
- [ ] Font sizes läsbara på mobil
- [ ] No horizontal scroll
- [ ] Test på iPhone och Android

---

### Phase 7: Documentation & Deployment 📚

**Priority:** P2 (MEDIUM)
**Estimated Effort:** 3-4 hours
**Dependencies:** All features completed

#### Task 7.1: API Documentation
**Type:** Documentation
**Component:** Backend
**Description:** Dokumentera alla order-relaterade endpoints

**Acceptance Criteria:**
- [ ] OpenAPI/Swagger spec för alla endpoints
- [ ] Request/response examples
- [ ] Error codes dokumenterade
- [ ] Status transitions dokumenterade

**Files to Create:**
```
backend/docs/API_ORDER_ENDPOINTS.md
```

---

#### Task 7.2: User Documentation
**Type:** Documentation
**Component:** General
**Description:** Guide för admin, kurir och kund

**Acceptance Criteria:**
- [ ] Admin guide: Hur hantera orders
- [ ] Kurir guide: Hur acceptera och leverera
- [ ] Kund guide: Hur följa sin beställning
- [ ] Screenshots/GIFs av varje steg

**Files to Create:**
```
docs/USER_GUIDE_ADMIN.md
docs/USER_GUIDE_COURIER.md
docs/USER_GUIDE_CUSTOMER.md
```

---

#### Task 7.3: Deployment Checklist
**Type:** Operations
**Component:** DevOps
**Description:** Checklist för production deployment

**Checklist:**
- [ ] Database migrations körda
- [ ] Environment variables satta
- [ ] Status constants synkade mellan frontend/backend
- [ ] Tests passing
- [ ] No console errors
- [ ] Performance tested (order list med 100+ orders)
- [ ] Security audit (status transitions locked by role)
- [ ] Backup plan (rollback strategy)

---

## 📊 Progress Tracking

### Status Definition

- 🔴 **Blocked:** Kan inte starta (dependency inte klar)
- 🟡 **Ready:** Kan startas när som helst
- 🔵 **In Progress:** Pågående arbete
- 🟢 **Done:** Komplett och testad
- ⚪ **Skipped:** Inte relevant längre

### Current Status (2025-11-23)

| Phase | Status | Progress | Blocker |
|-------|--------|----------|---------|
| Phase 0: Critical Bug Fix | 🟡 Ready | 0/6 tasks | None - START HERE |
| Phase 1: Restaurang | 🔴 Blocked | 0/3 tasks | Phase 0 |
| Phase 2: Kurir | 🔴 Blocked | 0/5 tasks | Phase 1 |
| Phase 3: Kund | 🔴 Blocked | 0/3 tasks | Phase 2 |
| Phase 4: Database | 🟡 Ready | 0/2 tasks | Can run parallel with Phase 0 |
| Phase 5: Testing | 🔴 Blocked | 0/4 tasks | All features |
| Phase 6: UI/UX | 🔴 Blocked | 0/4 tasks | Phase 1-3 |
| Phase 7: Docs | 🔴 Blocked | 0/3 tasks | All phases |

**Total Tasks:** 30
**Completed:** 0
**Overall Progress:** 0%

---

## 🎯 Milestones

### Milestone 1: Acceptera Order Fungerar ✅
**Target:** Day 1
**Tasks:** Phase 0 (all)
**Success Criteria:** Admin kan trycka "Acceptera order" och status ändras

### Milestone 2: Restaurang Kan Hantera Orders ⭐
**Target:** Week 1
**Tasks:** Phase 0 + Phase 1
**Success Criteria:** Restaurang kan ta order från received → ready_for_pickup

### Milestone 3: Kurir Kan Leverera ⭐
**Target:** Week 2
**Tasks:** Phase 2
**Success Criteria:** Kurir kan acceptera, hämta och leverera order

### Milestone 4: Kund Kan Följa ⭐
**Target:** Week 3
**Tasks:** Phase 3
**Success Criteria:** Kund ser real-time status på sin order

### Milestone 5: Production Ready 🚀
**Target:** Week 4
**Tasks:** Phase 4-7 (all)
**Success Criteria:** Alla tests passing, dokumenterat, deployat

---

## 🚨 Risks & Mitigation

### Risk 1: Status Enum Konflikt
**Risk:** Ändring av status-namn kan bryta gamla orders i database
**Mitigation:**
- Kör migration för att uppdatera gamla statuses
- Test på staging först
- Backup database före deployment

### Risk 2: Real-time Updates Kräver WebSocket
**Risk:** Polling varje 30s är inte true real-time
**Mitigation:**
- Start med polling (enklare)
- Plan för WebSocket implementation senare
- Feature flag för att växla mellan polling/WebSocket

### Risk 3: Kurir Accepterar Samma Order
**Risk:** Två kurir kan acceptera samma order samtidigt
**Mitigation:**
- Database constraint: assigned_courier_id unique per order
- Optimistic locking på order updates
- UI visar "Order redan accepterad" om någon annan tog den

### Risk 4: Order Transitions Bryter
**Risk:** Invalid status transition kan lämna order i bad state
**Mitigation:**
- Strict validation i backend
- Status transition middleware
- Database constraint på allowed values (future)
- Rollback capability

---

## 📝 Notes

### Vad Fungerar Nu (Verified)
✅ Login som admin
✅ Navigate till restaurang
✅ Välja restaurang
✅ Lägga beställning med tillbehör
✅ Tacksida efter beställning
✅ Navigera till adminpanel
✅ Se restaurangsida
✅ Se order i Campino med status "received"

### Vad INTE Fungerar (Verified)
❌ Trycka "Acceptera order" - Request misslyckas pga status mismatch

### Scope Decisions

**In Scope:**
- Complete order workflow
- Role-based access (admin, restaurant, courier, customer)
- Real-time status updates (polling)
- Mobile-first design (courier UX)

**Out of Scope (Future):**
- Push notifications
- SMS notifications
- WebSocket real-time
- Advanced analytics
- Multiple couriers per order
- Order rating/review system

---

## 🔧 Development Guidelines

### Code Style
- Follow existing patterns in codebase
- Use constants for status values (no magic strings)
- Add JSDoc comments for all new functions
- Error handling: try/catch with meaningful messages

### Testing Strategy
- Write tests BEFORE implementing features (TDD)
- Minimum 80% code coverage
- Integration tests for critical paths
- Manual testing checklist before PR

### Git Workflow
- Branch naming: `feature/order-flow-phase-X-task-Y`
- Commit messages: Conventional Commits format
- PR template: Include test results and screenshots
- Require 1 approval before merge

### Deployment
- Deploy to staging first
- Run smoke tests on staging
- Database migrations run automatically
- Zero-downtime deployment strategy

---

## 📞 Support & Questions

**Issues to Watch:**
1. Status mismatch errors
2. Role validation failures
3. Concurrent order acceptance
4. Database deadlocks on updates

**Who to Contact:**
- Backend issues: Check `backend/src/services/orderService.js`
- Frontend issues: Check `frontend/src/pages/restaurant/RestaurangVy.jsx`
- Database issues: Check `backend/createTables.js`
- Status questions: Check `backend/src/constants/orderStatuses.js` (efter Phase 0)

---

**Last Updated:** 2025-11-23
**Created By:** Claude Code Analysis
**Version:** 1.0
**Next Review:** After Phase 0 completion
