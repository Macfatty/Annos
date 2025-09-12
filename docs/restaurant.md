# Restaurangvy och Funktioner

## Översikt

Restaurangrollen hanterar inkommande beställningar och uppdaterar orderstatus enligt en strikt statusmaskin.

## Åtkomst och Routing

### Route
```
/restaurang/:slug/incoming
```

**Rollkrav:** `restaurant` eller `admin`
- Restaurant-rollen kan endast se ordrar för sin egen `restaurangSlug`
- Admin-rollen kan se ordrar för alla restauranger

### Åtkomstkontroll
```javascript
// Middleware verifiering
verifyRole(['restaurant', 'admin'])

// För restaurant-rollen, kontrollera att slug matchar användarens restaurangSlug
if (user.role === 'restaurant' && user.restaurangSlug !== req.params.slug) {
  return res.status(403).json({ error: "Otillräcklig behörighet" });
}
```

## API Endpoints för Restaurang

### GET /api/admin/orders
Hämta inkommande ordrar för restaurang.

**Query Parameters:**
- `slug` (required): restaurant_slug
- `status` (optional): filtrera på status

**Exempel:**
```javascript
// Hämta alla ordrar för SunSushi
GET /api/admin/orders?slug=sunsushi

// Hämta endast nya ordrar
GET /api/admin/orders?slug=sunsushi&status=received
```

**Response:**
```json
[
  {
    "id": 123,
    "customer_name": "Anna Andersson",
    "customer_phone": "070***67",
    "customer_address": "Storgatan 1, Stockholm",
    "status": "received",
    "grand_total": 12500,
    "created_at": 1703123456789,
    "items": [
      {
        "name": "California Roll",
        "quantity": 1,
        "unit_price": 8500,
        "options": [
          {
            "typ": "såser",
            "label": "Wasabi",
            "price_delta": 0
          },
          {
            "typ": "valfri",
            "label": "Valfri önskan",
            "price_delta": 0,
            "custom_note": "Extra ingefära tack"
          }
        ]
      }
    ]
  }
]
```

### PATCH /api/admin/orders/:id/status
Uppdatera orderstatus enligt statusmaskin.

**Request Body:**
```json
{
  "status": "accepted"
}
```

**Tillåtna statusövergångar:**
1. `received` → `accepted`
2. `accepted` → `in_progress`  
3. `in_progress` → `out_for_delivery`

**Response (Success):**
```json
{
  "message": "Status uppdaterad",
  "newStatus": "accepted",
  "orderId": 123
}
```

**Response (Error - Ogiltig övergång):**
```json
{
  "error": "Ogiltig statusövergång",
  "currentStatus": "received",
  "requestedStatus": "delivered",
  "allowedTransitions": ["accepted"]
}
```

## Statusmaskin för Restaurang

### Statusflöde
```
received → accepted → in_progress → out_for_delivery
```

### Statusbeskrivningar
- **received**: Ny beställning mottagen
- **accepted**: Order accepterad och förbereds för tillverkning
- **in_progress**: Mat tillverkas nu
- **out_for_delivery**: Mat är klar och skickas ut

### Validering
```javascript
const validTransitions = {
  'received': ['accepted'],
  'accepted': ['in_progress'],
  'in_progress': ['out_for_delivery'],
  'out_for_delivery': [], // Endast kurir kan ändra till delivered
  'delivered': [] // Slutstatus
};

function isValidTransition(currentStatus, newStatus) {
  return validTransitions[currentStatus]?.includes(newStatus);
}
```

## UI-komponenter för Restaurang

### Orderlista
```jsx
// Återanvänd befintliga komponenter, ingen layoutändring
function RestaurantOrders({ restaurantSlug }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders(restaurantSlug);
  }, [restaurantSlug]);

  return (
    <div className="restaurant-orders">
      <h2>Inkommande beställningar - {restaurantSlug}</h2>
      {orders.map(order => (
        <OrderCard 
          key={order.id} 
          order={order} 
          onStatusUpdate={handleStatusUpdate}
        />
      ))}
    </div>
  );
}
```

### Statusknappar
```jsx
function StatusButtons({ order, onStatusUpdate }) {
  const getAvailableActions = (status) => {
    switch (status) {
      case 'received':
        return [{ action: 'accepted', label: 'Acceptera order' }];
      case 'accepted':
        return [{ action: 'in_progress', label: 'Påbörja tillverkning' }];
      case 'in_progress':
        return [{ action: 'out_for_delivery', label: 'Skicka ut order' }];
      default:
        return [];
    }
  };

  const actions = getAvailableActions(order.status);

  return (
    <div className="status-buttons">
      {actions.map(action => (
        <button 
          key={action.action}
          onClick={() => onStatusUpdate(order.id, action.action)}
          className="status-button"
          aria-label={action.label}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

## Säkerhet och Loggning

### Säkerhetsåtgärder
1. **Rollverifiering**: Endast `restaurant` och `admin` roller
2. **Restaurang-isolering**: Restaurant-rollen ser endast sina egna ordrar
3. **Statusvalidering**: Endast tillåtna övergångar accepteras
4. **Input-validering**: Alla statusändringar valideras

### Loggning
```javascript
// Logga statusändringar (inte kunddata i klartext)
console.log(`Order ${orderId} status ändrad: ${oldStatus} → ${newStatus} av ${user.role}`);

// Logga felaktiga försök
console.warn(`Ogiltig statusövergång försökt: ${currentStatus} → ${requestedStatus}`);
```

### Felscenarier
1. **Ogiltig statusövergång**: Returnera 409 Conflict
2. **Saknad behörighet**: Returnera 403 Forbidden  
3. **Order finns inte**: Returnera 404 Not Found
4. **Saknad restaurang-slug**: Returnera 400 Bad Request

## Integration med Kurirsystem

När en order når status `out_for_delivery`:
1. Order blir synlig för kurirer via `/api/courier/orders`
2. Kurirer kan acceptera ordern
3. Endast accepterande kurir kan markera som levererad

## Exempel på Fullständig Implementation

```javascript
// backend/routes/restaurant.js
app.get('/api/admin/orders', verifyRole(['restaurant', 'admin']), async (req, res) => {
  const { slug, status } = req.query;
  const user = req.user;

  // Verifiera behörighet för restaurant-roll
  if (user.role === 'restaurant' && user.restaurangSlug !== slug) {
    return res.status(403).json({ error: "Otillräcklig behörighet" });
  }

  try {
    const orders = await getOrdersForRestaurant(slug, status);
    res.json(orders);
  } catch (error) {
    console.error('Fel vid hämtning av ordrar:', error);
    res.status(500).json({ error: "Serverfel" });
  }
});

app.patch('/api/admin/orders/:id/status', verifyRole(['restaurant', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { status: newStatus } = req.body;
  const user = req.user;

  try {
    const order = await getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ error: "Order hittades inte" });
    }

    // Verifiera behörighet
    if (user.role === 'restaurant' && user.restaurangSlug !== order.restaurant_slug) {
      return res.status(403).json({ error: "Otillräcklig behörighet" });
    }

    // Validera statusövergång
    if (!isValidTransition(order.status, newStatus)) {
      return res.status(409).json({
        error: "Ogiltig statusövergång",
        currentStatus: order.status,
        requestedStatus: newStatus,
        allowedTransitions: validTransitions[order.status] || []
      });
    }

    // Uppdatera status
    await updateOrderStatus(id, newStatus);
    
    res.json({
      message: "Status uppdaterad",
      newStatus,
      orderId: id
    });

  } catch (error) {
    console.error('Fel vid statusuppdatering:', error);
    res.status(500).json({ error: "Serverfel" });
  }
});
```
