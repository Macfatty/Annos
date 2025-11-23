# Förenklad Order Flow - Design

## 📊 Nuvarande Problem

**Nuvarande statuses (8 stycken):**
```
received → accepted → in_progress → ready_for_pickup → assigned → out_for_delivery → delivered
```

**Problem:**
- `in_progress` används INTE i praktiken
- För många steg mellan accept och pickup
- Orders försvinner inte från aktiva listor när de flyttas vidare i flödet

---

## ✅ Ny Förenklad Flow (6 statuses)

### Flow Diagram:
```
KUND lägger order
    ↓
[received] ← Order skapas i systemet
    ↓
╔═══════════════════════════════╗
║  RESTAURANG VY                ║
║  - Ser: received orders       ║
║  - Action: "Acceptera order"  ║
╚═══════════════════════════════╝
    ↓
[accepted] ← Restaurang accepterar
    ↓
╔═══════════════════════════════╗
║  RESTAURANG VY                ║
║  - Ser: accepted orders       ║
║  - Action: "Klar för hämtning"║
╚═══════════════════════════════╝
    ↓
[ready_for_pickup] ← Mat är klar
    │
    │ ⚡ Order FÖRSVINNER från restaurang aktiva lista
    │    (flyttas till historik)
    ↓
╔═══════════════════════════════╗
║  KURIR VY                     ║
║  - Ser: ready_for_pickup      ║
║  - Action: "Acceptera order"  ║
╚═══════════════════════════════╝
    ↓
[assigned] ← Kurir accepterar
    ↓
╔═══════════════════════════════╗
║  KURIR VY                     ║
║  - Ser: assigned orders       ║
║  - Action: "Hämtat order"     ║
╚═══════════════════════════════╝
    ↓
[out_for_delivery] ← Kurir hämtat
    │
    │ ⚡ Order FÖRSVINNER från kurir aktiva lista
    │    (kurir ser bara assigned i sin lista)
    ↓
╔═══════════════════════════════╗
║  KURIR VY                     ║
║  - Ser: out_for_delivery      ║
║  - Action: "Levererad"        ║
╚═══════════════════════════════╝
    ↓
[delivered] ← Leverans klar
    │
    │ ⚡ Order i historik för alla
    ↓
[KUND får notifikation] (admin ser i historik)
```

---

## 🗑️ Statuses Som Tas Bort

### ❌ `in_progress` - REMOVES
**Varför:**
- Används aldrig i praktiken
- Restauranger går direkt från "accepted" → "ready_for_pickup"
- Onödig mellanstation

**Impact:**
- Uppdatera `orderStatuses.js`
- Ta bort från STATUS_TRANSITIONS
- Inga breaking changes (används inte i frontend)

---

## 🔄 Nya Status Transitions

```javascript
const STATUS_TRANSITIONS = {
  received: [
    "accepted",
    "cancelled"
  ],

  accepted: [
    "ready_for_pickup",  // ← Direkt till ready (hoppa över in_progress)
    "cancelled"
  ],

  // in_progress: REMOVED

  ready_for_pickup: [
    "assigned",          // ← Kurir accepterar
    "cancelled"
  ],

  assigned: [
    "out_for_delivery",  // ← Kurir hämtat
    "cancelled"
  ],

  out_for_delivery: [
    "delivered",
    "cancelled"
  ],

  // Terminal states
  delivered: [],
  cancelled: []
};
```

---

## 🎯 Filter Logic för Vyer

### Restaurang Vy - Aktiva Orders
**Visa ENDAST:**
- `received` - Nya orders som väntar på accept
- `accepted` - Accepterade orders som tillagas

**DÖLJ (flyttas till historik):**
- `ready_for_pickup` och senare statuses
- Dessa hanteras av kurirer

### Kurir Vy - Aktiva Orders
**Visa ENDAST:**
- `ready_for_pickup` - Tillgängliga för pickup
- `assigned` - Kurirens accepterade orders

**DÖLJ (flyttas till historik):**
- `out_for_delivery` och senare
- När kurir klickat "Hämtat" försvinner order från aktiva

### Admin/Kund Vy - Alla Orders
**Visa:**
- Alla statuses (ingen filtering)
- Full historik och tracking

---

## 📋 Implementation Plan

### PHASE 1: Backend Status Cleanup (30 min)
**Tasks:**
1. ✅ Update `orderStatuses.js`:
   - Remove `IN_PROGRESS` from enum
   - Remove from STATUS_TRANSITIONS
   - Update transitions: accepted → ready_for_pickup (direkt)

2. ✅ Fix `markOrderAsDone` controller:
   - Change `'ready'` → `'ready_for_pickup'`

3. ✅ Add status filter helpers:
   - `getActiveRestaurantStatuses()` → [received, accepted]
   - `getActiveCourierStatuses()` → [ready_for_pickup, assigned]

### PHASE 2: Restaurang Vy Updates (45 min)
**Tasks:**
1. ✅ Update RestaurangVy.jsx status buttons:
   - received → "Acceptera order" → accepted
   - accepted → "Klar för hämtning" → ready_for_pickup
   - Remove in_progress button

2. ✅ Add filter to fetchOrders:
   - Only show: received, accepted
   - Hide: ready_for_pickup and later

3. ✅ Update status display names

### PHASE 3: Kurir Vy Updates (45 min)
**Tasks:**
1. ✅ Create/Update KurirVy.jsx:
   - Show ready_for_pickup orders → "Acceptera"
   - Show assigned orders → "Hämtat order"
   - Hide out_for_delivery from active list

2. ✅ Add filter logic:
   - Active: ready_for_pickup, assigned
   - History: out_for_delivery, delivered

### PHASE 4: Testing (30 min)
**Tasks:**
1. ✅ Test full flow:
   - Kund places order → received
   - Restaurant accepts → accepted
   - Restaurant marks ready → ready_for_pickup (disappears from restaurant list)
   - Courier sees order in available list
   - Courier accepts → assigned
   - Courier picks up → out_for_delivery (disappears from courier active list)
   - Courier delivers → delivered
   - Admin sees full history

---

## 🎨 UI Changes Summary

### Restaurang Vy - Button Labels
```javascript
{
  received: "Acceptera order" → accepted,
  accepted: "Klar för hämtning" → ready_for_pickup
}
```

### Kurir Vy - Button Labels
```javascript
{
  ready_for_pickup: "Acceptera order" → assigned,
  assigned: "Hämtat order" → out_for_delivery,
  out_for_delivery: "Markera levererad" → delivered
}
```

---

## 🔧 Technical Changes

### Backend Files:
1. `backend/src/constants/orderStatuses.js` - Remove IN_PROGRESS
2. `backend/src/controllers/orderController.js` - Fix 'ready' → 'ready_for_pickup'

### Frontend Files:
1. `frontend/src/pages/restaurant/RestaurangVy.jsx` - Filter + button updates
2. `frontend/src/pages/courier/KurirVy.jsx` - Create/update with filter logic
3. `frontend/src/services/api.js` - Add courier endpoints if missing

---

## ⚠️ Breaking Changes

### None Expected
- Existing orders in database will continue to work
- Old status values are maintained (just removing one unused status)
- Frontend changes are additive (filtering, not removal)

### Migration Needed?
**NO** - No database migration needed because:
- `in_progress` is not used in existing data
- All other statuses remain the same

---

## 📊 Status Count Comparison

**Before:** 8 statuses
```
received → accepted → in_progress → ready_for_pickup →
assigned → out_for_delivery → delivered + cancelled
```

**After:** 7 statuses
```
received → accepted → ready_for_pickup → assigned →
out_for_delivery → delivered + cancelled
```

**Removed:** 1 status (`in_progress`)
**Simplified:** Direct path from accepted → ready_for_pickup

---

## ✅ Success Criteria

1. ✅ Restaurang kan acceptera order (received → accepted)
2. ✅ Restaurang kan markera klar (accepted → ready_for_pickup)
3. ✅ Order försvinner från restaurang lista efter ready_for_pickup
4. ✅ Kurir ser ready_for_pickup orders
5. ✅ Kurir kan acceptera (ready_for_pickup → assigned)
6. ✅ Kurir kan hämta (assigned → out_for_delivery)
7. ✅ Order försvinner från kurir aktiva lista efter pickup
8. ✅ Kurir kan leverera (out_for_delivery → delivered)
9. ✅ Admin ser full historik
10. ✅ Inga fel i console eller backend logs

---

## 🚀 Estimated Time

**Total:** ~2.5 hours
- Phase 1: 30 min (Backend)
- Phase 2: 45 min (Restaurang)
- Phase 3: 45 min (Kurir)
- Phase 4: 30 min (Testing)

**Priority:** HIGH - Fixes critical bug + simplifies flow
