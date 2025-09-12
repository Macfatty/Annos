# Systemfunktioner och Flöden

## Frontendflöden

### Huvudmeny → Undermeny → Kundvagn → Checkout → Tack

1. **Huvudmeny** (`/restaurang/:slug`)
   - Visa rätter från `menuData.js`
   - Använd `restaurantSlug` för att filtrera rätt meny

2. **Undermeny** (`Undermeny.jsx`)
   - Hämta tillbehör via `getAccessoriesByRestaurant(slug)`
   - Gruppera efter `typ` (såser, kött, grönt, övrigt, drycker)
   - Visa input för "valfri" om `typ === "valfri"` eller `allowCustom: true`
   - Sticky kategori-navigation med `position: sticky; top: 0; z-index: 20`

3. **Kundvagn** (`/kundvagn`)
   - Visa valda rätter med tillbehör
   - Beräkna totalpris
   - Kräv inloggning för checkout

4. **Checkout** (`/checkout`)
   - Prefill användardata (namn, e-post, telefon, adress)
   - Välj betalningsmetod (Swish mock, framtida Klarna/kort)
   - POST `/api/order` med fullständig orderdata

5. **Tack-sida** (`/tack`)
   - Visa order-ID
   - Starta polling för orderstatus via GET `/api/order/:id`
   - Statusflöde: Mottagen → Accepterad → Påbörjad → Skickad → Levererad

## Backend-endpoints

### Kund (roll: customer)

#### POST /api/order
Skapa ny beställning med validering av custom_note.

**Request:**
```json
{
  "kund": {
    "namn": "Anna Andersson",
    "telefon": "0701234567",
    "adress": "Storgatan 1, Stockholm",
    "email": "anna@example.com",
    "ovrigt": "Ring på porttelefon"
  },
  "order": [
    {
      "namn": "California Roll",
      "pris": 85,
      "tillval": [
        {
          "id": 123,
          "namn": "Wasabi",
          "pris": 0,
          "antal": 1,
          "totalpris": 0
        },
        {
          "id": 211,
          "namn": "Valfri önskan",
          "pris": 0,
          "antal": 1,
          "totalpris": 0,
          "custom_note": "Extra ingefära tack"
        }
      ],
      "total": 85
    }
  ],
  "restaurangSlug": "sunsushi"
}
```

**Validering av custom_note:**
- String, trim, maxLength 140
- Regex: `/^[\p{L}\p{N}\p{P}\p{Zs}]+$/u`
- Avvisa tomma/whitespace-bara strängar
- Logga inte innehållet i klartext

**Response:**
```json
{
  "message": "Beställning mottagen",
  "orderId": 123
}
```

#### GET /api/order/:id
Hämta orderstatus för polling.

**Response:**
```json
{
  "id": 123,
  "status": "accepted",
  "statusMessage": "Order accepterad och tillverkas",
  "updated_at": 1703123456789
}
```

### Restaurang (roll: restaurant|admin)

#### GET /api/admin/orders
Lista inkommande ordrar för restaurang.

**Query params:**
- `slug`: restaurant_slug (required)
- `status`: optional filter

**Response:**
```json
[
  {
    "id": 123,
    "customer_name": "Anna Andersson",
    "customer_phone": "070***67", // maskad
    "customer_address": "Storgatan 1, Stockholm",
    "status": "received",
    "grand_total": 12500, // öre
    "created_at": 1703123456789,
    "items": [
      {
        "name": "California Roll",
        "quantity": 1,
        "options": [
          {
            "typ": "såser",
            "label": "Wasabi",
            "custom_note": null
          },
          {
            "typ": "valfri",
            "label": "Valfri önskan",
            "custom_note": "Extra ingefära tack"
          }
        ]
      }
    ]
  }
]
```

#### PATCH /api/admin/orders/:id/status
Uppdatera orderstatus enligt statusmaskin.

**Request:**
```json
{
  "status": "accepted"
}
```

**Tillåtna övergångar:**
- `received` → `accepted`
- `accepted` → `in_progress`
- `in_progress` → `out_for_delivery`

**Response:**
```json
{
  "message": "Status uppdaterad",
  "newStatus": "accepted"
}
```

### Kurir (roll: courier|admin)

#### GET /api/courier/orders
Lista ordrar för kurir (begränsad information).

**Query params:**
- `status`: `pending|out_for_delivery|mine`

**Response:**
```json
[
  {
    "id": 123,
    "customer_name": "Anna Andersson",
    "customer_address": "Storgatan 1, Stockholm",
    "customer_phone": "0701234567",
    "grand_total": 12500, // öre
    "restaurant_slug": "sunsushi"
  }
]
```

#### PATCH /api/courier/orders/:id/accept
Tilldela order till kuriren.

**Response:**
```json
{
  "message": "Order accepterad",
  "orderId": 123
}
```

#### PATCH /api/courier/orders/:id/delivered
Markera order som levererad.

**Response:**
```json
{
  "message": "Order levererad",
  "orderId": 123
}
```

### Betalning

#### POST /api/payments/create
Skapa betalning (mock i dev, utbyggbart).

**Request:**
```json
{
  "method": "swish",
  "orderId": 123
}
```

**Response (mock):**
```json
{
  "paymentId": "mock_123",
  "qrCode": "swish://payment?token=mock_token_123",
  "instructions": "Öppna Swish och skanna QR-koden"
}
```

## Statusmaskin

### Tillåtna övergångar
```
received → accepted → in_progress → out_for_delivery → delivered
```

### Övergångsregler
1. **received** → **accepted**: Restaurang accepterar order
2. **accepted** → **in_progress**: Restaurang börjar tillverka
3. **in_progress** → **out_for_delivery**: Restaurang skickar ut order
4. **out_for_delivery** → **delivered**: Kurir levererar order

### Felhantering
- **409 Conflict**: Ogiltig statusövergång
- **400 Bad Request**: Saknad eller ogiltig status
- **403 Forbidden**: Otillräcklig behörighet för statusändring

### Statusmeddelanden för kund
- `received`: "Order mottagen"
- `accepted`: "Order accepterad och tillverkas"
- `in_progress`: "Din mat tillverkas nu"
- `out_for_delivery`: "Din mat är på väg"
- `delivered`: "Order levererad"

## Säkerhet

### Rollbaserad åtkomst
- **customer**: Kan skapa beställningar, se egna ordrar
- **restaurant**: Kan hantera ordrar för sin restaurang
- **courier**: Kan se begränsad orderinfo (namn, adress, telefon)
- **admin**: Full åtkomst till alla funktioner

### Dataanonymisering
- Kurir får endast se: namn, adress, telefon
- E-post returneras endast till kund
- Telefonnummer maskas i loggar (070***67)

### Rate Limiting
- `/api/login`: 5 försök per minut
- `/api/order`: 10 beställningar per minut per användare

### CSP Headers
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://apis.google.com https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://your-api.com https://*.stripe.com; frame-src https://js.stripe.com;
```
