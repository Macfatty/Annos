# 📊 Förenklad Order Flow - Visuellt Diagram

## Före vs Efter

### ❌ FÖRE (8 statuses - för komplext)
```
KUND → received → RESTAURANG accepts → accepted
                                          ↓
                                    in_progress (OANVÄND!)
                                          ↓
                                   ready_for_pickup
                                          ↓
       KURIR accepts → assigned → out_for_delivery → delivered
```

### ✅ EFTER (7 statuses - förenklat)
```
KUND → received → RESTAURANG accepts → accepted → ready_for_pickup
                                                         ↓
       KURIR accepts → assigned → out_for_delivery → delivered
```

---

## 🔄 Detaljerat Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  KUND LÄGGER ORDER                                              │
└─────────────────────────────────────────────────────────────────┘
                           ↓
                    [📥 RECEIVED]
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🏪 RESTAURANG VY - Aktiva Orders                               │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║  Order #123                        Status: RECEIVED      ║  │
│  ║  - Pizza Margherita x2                                   ║  │
│  ║  - Kund: Anna Andersson                                  ║  │
│  ║                                                          ║  │
│  ║  [ Acceptera order ]  [ Avvisa ]                        ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (klickar "Acceptera")
                    [✅ ACCEPTED]
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🏪 RESTAURANG VY - Aktiva Orders                               │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║  Order #123                        Status: ACCEPTED      ║  │
│  ║  - Pizza Margherita x2                                   ║  │
│  ║  - Tillagningstid: ~20 min                              ║  │
│  ║                                                          ║  │
│  ║  [ Klar för hämtning ]                                  ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (klickar "Klar för hämtning")
                 [📦 READY_FOR_PICKUP]
                           │
                           │ ⚡ Order FÖRSVINNER från restaurang
                           │    (flyttas till historik)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🏪 RESTAURANG VY - Aktiva Orders                               │
│                                                                  │
│  [ Tom - inga aktiva orders ]                                   │
│                                                                  │
│  ▶ Se historik (123 tillgänglig för kurir)                     │
└─────────────────────────────────────────────────────────────────┘
                           ║
                           ║ Samtidigt...
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🚗 KURIR VY - Tillgängliga Orders                              │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║  Order #123               Status: READY FOR PICKUP       ║  │
│  ║  📍 Restaurang: Pizzeria Napoli                          ║  │
│  ║  📍 Kund: Storgatan 12                                   ║  │
│  ║  💰 Leveransavgift: 49 kr                                ║  │
│  ║                                                          ║  │
│  ║  [ Acceptera order ]                                    ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (klickar "Acceptera order")
                      [👤 ASSIGNED]
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🚗 KURIR VY - Mina Aktiva Orders                               │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║  Order #123                    Status: ASSIGNED          ║  │
│  ║  📍 Hämta från: Pizzeria Napoli (2.3 km)                 ║  │
│  ║  📍 Leverera till: Storgatan 12                          ║  │
│  ║  ☎ Kund: 070-123 45 67                                  ║  │
│  ║                                                          ║  │
│  ║  [ Hämtat order ]                                       ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (klickar "Hämtat order")
                 [🚚 OUT_FOR_DELIVERY]
                           │
                           │ ⚡ Order flyttas till "Under leverans"
                           │    (inte i "Mina aktiva" längre)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  🚗 KURIR VY - Under Leverans                                   │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗  │
│  ║  Order #123              Status: OUT FOR DELIVERY        ║  │
│  ║  📍 Leveransadress: Storgatan 12                          ║  │
│  ║  🕐 Uppskattad tid: 10 min                               ║  │
│  ║                                                          ║  │
│  ║  [ Markera som levererad ]                              ║  │
│  ╚══════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (klickar "Levererad")
                      [✅ DELIVERED]
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  👤 KUND (Admin) - Notifikation                                 │
│                                                                  │
│  🔔 Din order #123 har levererats!                              │
│     - Levererad: 2025-01-23 16:45                               │
│     - Levererad av: Erik K.                                     │
│                                                                  │
│  [ Se orderhistorik ]                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Status Visibility Matrix

| Status             | Restaurang Aktiva | Kurir Aktiva | Kurir Tillgängliga | Admin/Historik |
|--------------------|-------------------|--------------|-------------------|----------------|
| received           | ✅ Ja             | ❌ Nej       | ❌ Nej            | ✅ Ja          |
| accepted           | ✅ Ja             | ❌ Nej       | ❌ Nej            | ✅ Ja          |
| ready_for_pickup   | ❌ Nej (historik) | ❌ Nej       | ✅ Ja             | ✅ Ja          |
| assigned           | ❌ Nej            | ✅ Ja        | ❌ Nej            | ✅ Ja          |
| out_for_delivery   | ❌ Nej            | ✅ Ja (sep.) | ❌ Nej            | ✅ Ja          |
| delivered          | ❌ Nej            | ❌ Nej       | ❌ Nej            | ✅ Ja          |
| cancelled          | ❌ Nej            | ❌ Nej       | ❌ Nej            | ✅ Ja          |

---

## 🎯 Button Actions per Status

### Restaurang Vy

| Current Status | Button Text           | New Status        | Action              |
|----------------|-----------------------|-------------------|---------------------|
| received       | "Acceptera order"     | accepted          | Godkänn order       |
| accepted       | "Klar för hämtning"   | ready_for_pickup  | Mat klar            |
| *              | "Avvisa"              | cancelled         | Avbryt order        |

### Kurir Vy - Tillgängliga

| Current Status   | Button Text       | New Status | Action         |
|------------------|-------------------|------------|----------------|
| ready_for_pickup | "Acceptera order" | assigned   | Ta order       |

### Kurir Vy - Mina Aktiva

| Current Status    | Button Text      | New Status        | Action           |
|-------------------|------------------|-------------------|------------------|
| assigned          | "Hämtat order"   | out_for_delivery  | Pickup från rest.|
| out_for_delivery  | "Levererad"      | delivered         | Delivered till kund|

---

## 🗂️ Filter Implementation

### Backend Query Examples

#### Restaurang Active Orders
```sql
SELECT * FROM orders
WHERE restaurant_slug = 'pizzeria-napoli'
  AND status IN ('received', 'accepted')
ORDER BY created_at ASC;
```

#### Kurir Available Orders
```sql
SELECT * FROM orders
WHERE status = 'ready_for_pickup'
ORDER BY created_at ASC;
```

#### Kurir My Active Orders
```sql
SELECT * FROM orders
WHERE assigned_courier_id = 5
  AND status IN ('assigned', 'out_for_delivery')
ORDER BY created_at ASC;
```

#### Admin All Orders
```sql
SELECT * FROM orders
ORDER BY created_at DESC;
```

---

## 🔄 State Transitions (Förenklad)

```javascript
// Endast giltiga transitions
const TRANSITIONS = {
  received: ["accepted", "cancelled"],
  accepted: ["ready_for_pickup", "cancelled"],  // ← Direkt (hoppa över in_progress)
  ready_for_pickup: ["assigned", "cancelled"],
  assigned: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],    // Terminal state
  cancelled: []     // Terminal state
};
```

---

## ⏱️ Estimated Times per Stage

```
received         → accepted           (1-2 min)  - Restaurang ser och accepterar
accepted         → ready_for_pickup   (15-30 min) - Tillagning
ready_for_pickup → assigned           (1-5 min)   - Kurir ser och accepterar
assigned         → out_for_delivery   (5-10 min)  - Kurir åker till restaurang
out_for_delivery → delivered          (10-20 min) - Leverans till kund

TOTAL: ~30-60 min från order till leverans
```

---

## ✅ Success Metrics

### Restaurang
- ✅ Kan se nya orders (received)
- ✅ Kan acceptera → accepted
- ✅ Kan markera klar → ready_for_pickup
- ✅ Order försvinner från aktiva när klar
- ✅ Kan se i historik

### Kurir
- ✅ Ser tillgängliga orders (ready_for_pickup)
- ✅ Kan acceptera → assigned
- ✅ Kan hämta → out_for_delivery
- ✅ Kan leverera → delivered
- ✅ Aktiva orders försvinner efter pickup

### Kund/Admin
- ✅ Ser all historik
- ✅ Kan tracka status
- ✅ Får notifikation vid delivered

---

## 🚨 Edge Cases

### 1. Kurir accepterar men restaurang inte klar ännu
- **Status:** ready_for_pickup → assigned
- **Handling:** Kurir ser "På väg att hämta" - väntar tills mat klar
- **OK:** Fungerar som förväntat

### 2. Order cancelled efter accept
- **Alla statuses:** Kan cancelas fram till delivered
- **Notification:** Alla parter får notifikation
- **OK:** Fungerar som förväntat

### 3. Flera kurirer försöker acceptera samma order
- **Race condition:** Första kurir som accepterar får ordern
- **Andra kurir:** Får felmeddelande "Order redan tilldelad"
- **Lösning:** Database constraint på assigned_courier_id

---

Detta är det nya förenklade flödet! 🎉
