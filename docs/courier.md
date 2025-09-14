# Kurirvy och Funktioner

## Översikt

Kurirrollen hanterar leveranser med begränsad tillgång till kundinformation. Kurirer ser endast namn, adress och telefon - inte e-post eller andra personuppgifter.

## Åtkomst och Routing

### Route
```
/kurir
```

**Rollkrav:** `courier` eller `admin`

### Åtkomstkontroll
```javascript
// Middleware verifiering
verifyRole(['courier', 'admin'])

// Kurirer ser endast sina egna pågående ordrar
// Admin kan se alla ordrar
```

## API Endpoints för Kurir

### GET /api/courier/orders
Lista ordrar för kurir med begränsad information.

**Query Parameters:**
- `status`: `pending|out_for_delivery|mine`

**Statusbeskrivningar:**
- `pending`: Nya ordrar som väntar på kurir
- `out_for_delivery`: Ordrar tilldelade till kurir
- `mine`: Kurirens egna pågående ordrar

**Exempel:**
```javascript
// Hämta nya ordrar som väntar på kurir
GET /api/courier/orders?status=pending

// Hämta kurirens egna ordrar
GET /api/courier/orders?status=mine
```

**Response:**
```json
[
  {
    "id": 123,
    "customer_name": "Anna Andersson",
    "customer_address": "Storgatan 1, Stockholm",
    "customer_phone": "0701234567",
    "grand_total": 12500, // öre
    "restaurant_slug": "sunsushi",
    "status": "out_for_delivery",
    "assigned_courier_id": 5,
    "created_at": 1703123456789
  }
]
```

**Säkerhetsnot:** E-post returneras INTE till kurir-API.

### PATCH /api/courier/orders/:id/accept
Tilldela order till kuriren.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "message": "Order accepterad",
  "orderId": 123,
  "assignedTo": 5
}
```

**Logik:**
- Kontrollera att order har status `out_for_delivery`
- Kontrollera att ingen annan kurir redan är tilldelad
- Tilldela order till inloggad kurir
- Uppdatera `assigned_courier_id` i databasen

### PATCH /api/courier/orders/:id/delivered
Markera order som levererad.

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "message": "Order levererad",
  "orderId": 123,
  "deliveredAt": 1703123456789
}
```

**Logik:**
- Kontrollera att kuriren är tilldelad till ordern
- Ändra status från `out_for_delivery` till `delivered`
- Spara leveranstidpunkt
- Logga leverans för restaurang

## Säkerhetsregler för Kurir

### Dataanonymisering
Kurirer får endast se:
- ✅ Kundens namn
- ✅ Leveransadress
- ✅ Telefonnummer
- ✅ Order-ID
- ✅ Totalbelopp
- ✅ Restaurangnamn

Kurirer får INTE se:
- ❌ E-postadress
- ❌ Orderdetaljer (vilka rätter)
- ❌ Tillbehör och specialönskemål
- ❌ Betalningsinformation

### Åtkomstkontroll
```javascript
// Verifiera att kuriren är tilldelad till ordern
async function verifyCourierAssignment(orderId, courierId) {
  const order = await getOrderById(orderId);
  return order && order.assigned_courier_id === courierId;
}

// För delivered-statusändring
if (!(await verifyCourierAssignment(orderId, user.userId))) {
  return res.status(403).json({ 
    error: "Du är inte tilldelad denna order" 
  });
}
```

## UI-komponenter för Kurir

### Kurirvy
```jsx
function KurirVy() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchCourierOrders(filter);
  }, [filter]);

  return (
    <div className="courier-view">
      <h1>Kurirvy</h1>
      
      {/* Filter-knappar */}
      <div className="filter-buttons">
        <button 
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? 'active' : ''}
          aria-label="Visa nya ordrar"
        >
          Nya ordrar
        </button>
        <button 
          onClick={() => setFilter('mine')}
          className={filter === 'mine' ? 'active' : ''}
          aria-label="Visa mina ordrar"
        >
          Mina ordrar
        </button>
      </div>

      {/* Orderlista */}
      <div className="orders-list">
        {orders.map(order => (
          <CourierOrderCard 
            key={order.id} 
            order={order}
            onAccept={handleAcceptOrder}
            onDeliver={handleDeliverOrder}
          />
        ))}
      </div>
    </div>
  );
}
```

### Kurir Order-kort
```jsx
function CourierOrderCard({ order, onAccept, onDeliver }) {
  const isAssigned = order.assigned_courier_id;
  const isMine = isAssigned && isAssigned === getCurrentUserId();

  return (
    <div className="courier-order-card">
      <div className="order-header">
        <h3>Order #{order.id}</h3>
        <span className="status-badge">{order.status}</span>
      </div>

      <div className="customer-info">
        <h4>{order.customer_name}</h4>
        <p>📍 {order.customer_address}</p>
        <p>📞 {order.customer_phone}</p>
      </div>

      <div className="order-details">
        <p><strong>Restaurang:</strong> {order.restaurant_slug}</p>
        <p><strong>Total:</strong> {(order.grand_total / 100).toFixed(2)} kr</p>
        <p><strong>Beställt:</strong> {formatDate(order.created_at)}</p>
      </div>

      <div className="action-buttons">
        {!isAssigned && order.status === 'out_for_delivery' && (
          <button 
            onClick={() => onAccept(order.id)}
            className="accept-button"
            aria-label="Acceptera order"
          >
            Acceptera order
          </button>
        )}
        
        {isMine && order.status === 'out_for_delivery' && (
          <button 
            onClick={() => onDeliver(order.id)}
            className="deliver-button"
            aria-label="Markera som levererad"
          >
            Order levererad
          </button>
        )}
      </div>
    </div>
  );
}
```

## Databasstruktur för Kurir

### Uppdatering av orders-tabell
```sql
-- Lägg till courier-fält
ALTER TABLE orders ADD COLUMN assigned_courier_id BIGINT;
ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP;

-- Index för kurirprestanda
CREATE INDEX idx_orders_courier_status ON orders(assigned_courier_id, status);
CREATE INDEX idx_orders_out_for_delivery ON orders(status) WHERE status = 'out_for_delivery';
```

### Exempel på kurir-operationer
```sql
-- Acceptera order
UPDATE orders 
SET assigned_courier_id = 5, updated_at = 1703123456789
WHERE id = 123 AND status = 'out_for_delivery' AND assigned_courier_id IS NULL;

-- Markera som levererad
UPDATE orders 
SET status = 'delivered', 
    delivered_at = 1703123456789,
    updated_at = 1703123456789
WHERE id = 123 AND assigned_courier_id = 5 AND status = 'out_for_delivery';
```

## Loggning och Säkerhet

### Säker loggning
```javascript
// Logga kuriraktiviteter (ingen PII i klartext)
console.log(`Kurir ${courierId} accepterade order ${orderId}`);
console.log(`Kurir ${courierId} levererade order ${orderId} till ${maskPhone(order.customer_phone)}`);

// Maskera telefonnummer i loggar
function maskPhone(phone) {
  return phone.replace(/(\d{3})\d{4}(\d{2})/, '$1***$2');
}
```

### Rate Limiting
```javascript
// Begränsa antal orderacceptanser per minut
const courierLimits = {
  accept: 10, // max 10 accepterade ordrar per minut
  deliver: 20 // max 20 leveranser per minut
};
```

## Exempel på Fullständig Implementation

```javascript
// backend/routes/courier.js
app.get('/api/courier/orders', verifyRole(['courier', 'admin']), async (req, res) => {
  const { status } = req.query;
  const courierId = req.user.userId;

  try {
    let orders;
    
    switch (status) {
      case 'pending':
        // Nya ordrar som väntar på kurir
        orders = await getPendingOrders();
        break;
      case 'mine':
        // Kurirens egna ordrar
        orders = await getCourierOrders(courierId);
        break;
      case 'out_for_delivery':
        // Alla ordrar som är ute för leverans
        orders = await getOutForDeliveryOrders();
        break;
      default:
        return res.status(400).json({ error: "Ogiltig status" });
    }

    // Filtrera bort PII för kurirer
    const safeOrders = orders.map(order => ({
      id: order.id,
      customer_name: order.customer_name,
      customer_address: order.customer_address,
      customer_phone: order.customer_phone,
      grand_total: order.grand_total,
      restaurant_slug: order.restaurant_slug,
      status: order.status,
      assigned_courier_id: order.assigned_courier_id,
      created_at: order.created_at
      // Medvetet exkluderat: email, orderdetaljer, betalningsinfo
    }));

    res.json(safeOrders);
  } catch (error) {
    console.error('Fel vid hämtning av kurirordrar:', error);
    res.status(500).json({ error: "Serverfel" });
  }
});

app.patch('/api/courier/orders/:id/accept', verifyRole(['courier', 'admin']), async (req, res) => {
  const { id } = req.params;
  const courierId = req.user.userId;

  try {
    const result = await acceptOrder(id, courierId);
    
    if (result.success) {
      res.json({
        message: "Order accepterad",
        orderId: id,
        assignedTo: courierId
      });
    } else {
      res.status(409).json({ error: result.error });
    }
  } catch (error) {
    console.error('Fel vid orderacceptans:', error);
    res.status(500).json({ error: "Serverfel" });
  }
});

app.patch('/api/courier/orders/:id/delivered', verifyRole(['courier', 'admin']), async (req, res) => {
  const { id } = req.params;
  const courierId = req.user.userId;

  try {
    const result = await deliverOrder(id, courierId);
    
    if (result.success) {
      res.json({
        message: "Order levererad",
        orderId: id,
        deliveredAt: result.deliveredAt
      });
    } else {
      res.status(403).json({ error: result.error });
    }
  } catch (error) {
    console.error('Fel vid leverans:', error);
    res.status(500).json({ error: "Serverfel" });
  }
});
```
