# 🚀 Implementation Plan - Förenklad Order Flow

## 📋 Sammanfattning

### Mål
Förenkla orderflödet från 8 till 7 statuses och implementera korrekt filtering så orders försvinner från aktiva listor när de går vidare i flödet.

### Huvudändringar
1. ❌ **Ta bort:** `in_progress` status (används inte)
2. 🔧 **Fixa:** `markOrderAsDone` använder fel status ('ready' → 'ready_for_pickup')
3. 🎯 **Lägg till:** Filter logic i restaurang & kurir vyer
4. ✅ **Verifiera:** Hela flödet fungerar end-to-end

---

## 🔄 Nya Flödet (Förenklat)

```
KUND → received
         ↓
RESTAURANG: Acceptera → accepted
         ↓
RESTAURANG: Klar för hämtning → ready_for_pickup
         ↓ (order försvinner från restaurang)
KURIR: Acceptera → assigned
         ↓
KURIR: Hämtat → out_for_delivery
         ↓ (order försvinner från kurir aktiva)
KURIR: Levererad → delivered
```

---

## 📝 TODO List (12 steg)

### PHASE 1: Backend Status Cleanup (30 min)

#### ✅ Task 1.1: Ta bort IN_PROGRESS från orderStatuses.js
**Fil:** `backend/src/constants/orderStatuses.js`
**Ändring:**
```javascript
// FÖRE
const ORDER_STATUS = {
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',        // ← TA BORT
  READY_FOR_PICKUP: 'ready_for_pickup',
  ...
};

// EFTER
const ORDER_STATUS = {
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  READY_FOR_PICKUP: 'ready_for_pickup',  // ← Direkt efter accepted
  ...
};
```

#### ✅ Task 1.2: Uppdatera STATUS_TRANSITIONS
**Fil:** `backend/src/constants/orderStatuses.js`
**Ändring:**
```javascript
// FÖRE
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.IN_PROGRESS,      // ← TA BORT
    ORDER_STATUS.CANCELLED
  ],
  [ORDER_STATUS.IN_PROGRESS]: [    // ← TA BORT HELA
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.CANCELLED
  ],
  ...
};

// EFTER
const STATUS_TRANSITIONS = {
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.READY_FOR_PICKUP,  // ← Direkt transition
    ORDER_STATUS.CANCELLED
  ],
  // IN_PROGRESS helt borttagen
  ...
};
```

#### ✅ Task 1.3: Fixa markOrderAsDone controller
**Fil:** `backend/src/controllers/orderController.js`
**Rad:** 181
**Ändring:**
```javascript
// FÖRE
const updatedOrder = await OrderService.updateOrderStatus(orderId, 'ready');

// EFTER
const updatedOrder = await OrderService.updateOrderStatus(orderId, 'ready_for_pickup');
```

#### ✅ Task 1.4: Testa backend
**Kommando:**
```bash
cd backend && npm test
```
**Verifiera:**
- Alla tester passar
- Ingen referens till 'in_progress'
- Status validation fungerar

---

### PHASE 2: Restaurang Vy Updates (45 min)

#### ✅ Task 2.1: Uppdatera status buttons
**Fil:** `frontend/src/pages/restaurant/RestaurangVy.jsx`
**Funktion:** `getStatusButtons(order)`
**Ändring:**
```javascript
// FÖRE
switch (order.status) {
  case "received":
    return <button onClick={() => handleUpdateOrderStatus(order.id, "accepted")}>
      Acceptera order
    </button>;
  case "accepted":
    return <button onClick={() => handleUpdateOrderStatus(order.id, "in_progress")}>
      Påbörja tillverkning
    </button>;
  case "in_progress":
    return <button onClick={() => handleUpdateOrderStatus(order.id, "ready_for_pickup")}>
      Klar för hämtning
    </button>;
  ...
}

// EFTER
switch (order.status) {
  case "received":
    return <button onClick={() => handleUpdateOrderStatus(order.id, "accepted")}>
      Acceptera order
    </button>;
  case "accepted":
    return <button onClick={() => handleUpdateOrderStatus(order.id, "ready_for_pickup")}>
      Klar för hämtning
    </button>;
  // in_progress case borttaget
  ...
}
```

#### ✅ Task 2.2: Lägg till filter för aktiva orders
**Fil:** `frontend/src/pages/restaurant/RestaurangVy.jsx`
**Lägg till efter fetchOrders:**
```javascript
const fetchOrders = useCallback(async () => {
  try {
    setLoading(true);
    const data = await fetchAdminOrders(selectedRestaurant, statusFilter);

    // NYTT: Filtrera endast aktiva statuses för restaurang
    const activeOrders = data.filter(order =>
      ['received', 'accepted'].includes(order.status)
    );

    setOrders(activeOrders);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, [selectedRestaurant, statusFilter]);
```

#### ✅ Task 2.3: Lägg till historik-länk
**Fil:** `frontend/src/pages/restaurant/RestaurangVy.jsx`
**Lägg till i JSX:**
```javascript
<div className="view-toggle">
  <button onClick={() => setShowHistory(false)}>Aktiva Orders</button>
  <button onClick={() => setShowHistory(true)}>Historik</button>
</div>

{!showHistory ? (
  // Visa aktiva orders (received, accepted)
  <div className="active-orders">
    {orders.map(order => ...)}
  </div>
) : (
  // Visa historik (alla statuses)
  <div className="order-history">
    {allOrders.map(order => ...)}
  </div>
)}
```

#### ✅ Task 2.4: Testa restaurang flow
**Manuellt test:**
1. Logga in som admin
2. Gå till restaurang vy
3. Se en order med status "received"
4. Klicka "Acceptera order" → status blir "accepted"
5. Klicka "Klar för hämtning" → status blir "ready_for_pickup"
6. Verifiera: Order försvinner från aktiva listan
7. Klicka "Historik" → order syns där

---

### PHASE 3: Kurir Vy Updates (45 min)

#### ✅ Task 3.1: Hitta/skapa KurirVy fil
**Kommando:**
```bash
find frontend/src -name "*urir*" -o -name "*ourier*"
```
**Om inte finns:** Skapa `frontend/src/pages/courier/KurirVy.jsx`

#### ✅ Task 3.2: Implementera tillgängliga orders vy
**Fil:** `frontend/src/pages/courier/KurirVy.jsx`
**Struktur:**
```javascript
function KurirVy() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  // Fetch tillgängliga orders (ready_for_pickup)
  const fetchAvailableOrders = async () => {
    const data = await fetchCourierOrders();
    const available = data.filter(o => o.status === 'ready_for_pickup');
    setAvailableOrders(available);
  };

  // Fetch mina orders (assigned, out_for_delivery)
  const fetchMyOrders = async () => {
    const data = await fetchCourierOrders();
    const mine = data.filter(o =>
      ['assigned', 'out_for_delivery'].includes(o.status) &&
      o.assigned_courier_id === currentUserId
    );
    setMyOrders(mine);
  };

  return (
    <div>
      <h2>Tillgängliga Orders</h2>
      {availableOrders.map(order => (
        <OrderCard
          order={order}
          action={() => acceptOrder(order.id)}
          buttonText="Acceptera order"
        />
      ))}

      <h2>Mina Aktiva Orders</h2>
      {myOrders.map(order => (
        <OrderCard
          order={order}
          action={() => handleStatusUpdate(order)}
          buttonText={getButtonText(order.status)}
        />
      ))}
    </div>
  );
}
```

#### ✅ Task 3.3: Implementera kurir actions
**Funktioner:**
```javascript
// Acceptera tillgänglig order
const acceptOrder = async (orderId) => {
  await updateOrderStatus(orderId, 'assigned');
  fetchAvailableOrders();  // Refresh - order försvinner
  fetchMyOrders();         // Order dyker upp i "Mina"
};

// Hämtat från restaurang
const markAsPickedUp = async (orderId) => {
  await updateOrderStatus(orderId, 'out_for_delivery');
  fetchMyOrders();  // Order flyttas till "Under leverans"
};

// Levererad till kund
const markAsDelivered = async (orderId) => {
  await updateOrderStatus(orderId, 'delivered');
  fetchMyOrders();  // Order försvinner (historik)
};

const getButtonText = (status) => {
  switch (status) {
    case 'assigned': return 'Hämtat order';
    case 'out_for_delivery': return 'Levererad';
    default: return '';
  }
};
```

#### ✅ Task 3.4: Lägg till routing
**Fil:** `frontend/src/App.jsx` eller routing file
```javascript
<Route path="/courier" element={<KurirVy />} />
```

#### ✅ Task 3.5: Testa kurir flow
**Manuellt test:**
1. Logga in som kurir (eller admin)
2. Gå till /courier
3. Se tillgängliga orders (ready_for_pickup)
4. Klicka "Acceptera order" → order flyttas till "Mina aktiva"
5. Klicka "Hämtat order" → status blir out_for_delivery
6. Klicka "Levererad" → order försvinner från aktiva

---

### PHASE 4: End-to-End Testing (30 min)

#### ✅ Task 4.1: Full flow test
**Test scenario:**
```
1. Kund lägger order → received
   ✅ Syns i restaurang "Aktiva"

2. Restaurang accepterar → accepted
   ✅ Fortfarande i "Aktiva"
   ✅ Knapp ändras till "Klar för hämtning"

3. Restaurang klar → ready_for_pickup
   ✅ Försvinner från restaurang "Aktiva"
   ✅ Syns i restaurang "Historik"
   ✅ Dyker upp i kurir "Tillgängliga"

4. Kurir accepterar → assigned
   ✅ Försvinner från "Tillgängliga"
   ✅ Dyker upp i kurir "Mina aktiva"

5. Kurir hämtar → out_for_delivery
   ✅ Fortfarande i "Mina aktiva" (eller separat "Under leverans")

6. Kurir levererar → delivered
   ✅ Försvinner från kurir aktiva
   ✅ Syns i admin historik
```

#### ✅ Task 4.2: Error handling test
**Test cases:**
- Försök sätta ogiltig status → Får felmeddelande
- Försök acceptera redan assigned order → Får felmeddelande
- Backend down → Visa användarvänligt felmeddelande

---

## 🗂️ Filer Som Ändras

### Backend (3 filer)
1. ✅ `backend/src/constants/orderStatuses.js`
   - Ta bort IN_PROGRESS
   - Uppdatera transitions

2. ✅ `backend/src/controllers/orderController.js`
   - Fixa 'ready' → 'ready_for_pickup'

3. ✅ `backend/src/services/orderService.js`
   - (Ingen ändring - använder redan getAllStatuses())

### Frontend (2-3 filer)
1. ✅ `frontend/src/pages/restaurant/RestaurangVy.jsx`
   - Ta bort in_progress button
   - Lägg till filter
   - Lägg till historik toggle

2. ✅ `frontend/src/pages/courier/KurirVy.jsx`
   - Skapa/uppdatera
   - Implementera filter logic
   - Implementera actions

3. ✅ `frontend/src/App.jsx` (routing)
   - Lägg till /courier route

### Dokumentation (2 filer)
1. ✅ `.claude/ORDER_FLOW_SIMPLIFIED.md` (skapad)
2. ✅ `.claude/ORDER_FLOW_VISUAL.md` (skapad)

---

## ⚠️ Breaking Changes

### Ingen Breaking Changes!
- `in_progress` används inte i befintlig data
- Alla andra statuses behålls
- Backward compatible

---

## ✅ Definition of Done

### Backend
- [ ] `in_progress` borttagen från orderStatuses.js
- [ ] STATUS_TRANSITIONS uppdaterad
- [ ] markOrderAsDone använder 'ready_for_pickup'
- [ ] Alla tester passar
- [ ] Ingen console errors

### Restaurang Vy
- [ ] Endast 2 buttons: "Acceptera" & "Klar för hämtning"
- [ ] Orders försvinner efter ready_for_pickup
- [ ] Historik-vy visar alla orders
- [ ] Inga errors i console

### Kurir Vy
- [ ] Tillgängliga orders syns (ready_for_pickup)
- [ ] Kan acceptera → assigned
- [ ] Kan hämta → out_for_delivery
- [ ] Kan leverera → delivered
- [ ] Orders försvinner från aktiva vid rätt tidpunkt

### End-to-End
- [ ] Hela flödet fungerar utan errors
- [ ] Orders syns i rätt vyer vid rätt tidpunkt
- [ ] Backend loggar inga errors
- [ ] Frontend console inga errors

---

## 🚀 Deployment Plan

### 1. Backend Deploy
```bash
cd backend
git pull
npm install
npm test
npm start
```

### 2. Frontend Deploy
```bash
cd frontend
git pull
npm install
npm run build
```

### 3. Verification
- Test flow manuellt
- Kontrollera logs
- Verifiera orders rör sig korrekt

---

## 📊 Metrics

**Before:**
- 8 statuses (1 oanvänd)
- Orders sticker i vyer
- Fel med 'ready' status

**After:**
- 7 statuses (alla används)
- Orders försvinner automatiskt
- Korrekt status flow

**Estimated Time:** 2.5 timmar total
**Priority:** HIGH
**Impact:** HIGH (fixar kritisk bug + förbättrar UX)

---

## 🎯 Next Steps

1. ✅ Review denna plan
2. ✅ Godkännande från team/användare
3. 🔨 Implementera PHASE 1 (Backend)
4. 🔨 Implementera PHASE 2 (Restaurang)
5. 🔨 Implementera PHASE 3 (Kurir)
6. ✅ Testa hela flödet
7. 🚀 Deploy till produktion
8. 📝 Uppdatera dokumentation

---

**Redo att börja implementera!** 🚀
