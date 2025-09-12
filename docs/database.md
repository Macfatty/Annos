# Databasstruktur

## Översikt

Annos använder SQLite som databas med monetära belopp lagrade i **öre (INTEGER)** för precision.

## Tabeller

### orders
Huvudtabell för beställningar med ny statusmaskin och monetära fält i öre.

```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_slug TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'in_progress', 'out_for_delivery', 'delivered')),
  payment_method TEXT DEFAULT 'mock' CHECK (payment_method IN ('swish', 'klarna', 'card', 'mock')),
  payment_status TEXT DEFAULT 'pending',
  items_total INTEGER NOT NULL, -- öre
  delivery_fee INTEGER DEFAULT 0, -- öre
  discount_total INTEGER DEFAULT 0, -- öre
  grand_total INTEGER NOT NULL, -- öre
  created_at INTEGER NOT NULL, -- epoch ms
  updated_at INTEGER NOT NULL -- epoch ms
);
```

### order_items
Individuella varor i en beställning.

```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- öre
  line_total INTEGER NOT NULL, -- öre
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

### order_item_options
Tillbehör och anpassningar för varje order_item.

```sql
CREATE TABLE order_item_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  typ TEXT NOT NULL CHECK (typ IN ('såser', 'kött', 'grönt', 'övrigt', 'drycker', 'valfri')),
  label TEXT NOT NULL,
  price_delta INTEGER NOT NULL, -- öre (kan vara negativ för rabatter)
  custom_note TEXT, -- max 140 tecken för valfri-önskningar
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);
```

### payouts
Månadsvisa utbetalningar till restauranger.

```sql
CREATE TABLE payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_slug TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  orders_count INTEGER NOT NULL,
  gross_revenue INTEGER NOT NULL, -- öre
  per_order_fee INTEGER NOT NULL, -- öre (45 kr = 4500)
  percent_fee INTEGER NOT NULL, -- öre (5% av gross_revenue)
  net_amount INTEGER NOT NULL, -- öre
  created_at INTEGER NOT NULL -- epoch ms
);
```

### users
Användartabell med roller.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  namn TEXT NOT NULL,
  telefon TEXT,
  adress TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'restaurant', 'courier', 'admin')),
  restaurangSlug TEXT
);
```

## Index

```sql
-- Prestanda för orderhämtning
CREATE INDEX idx_orders_restaurant_created ON orders(restaurant_slug, created_at);
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- FK-index
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_item_options_item_id ON order_item_options(order_item_id);

-- Payouts per restaurang och period
CREATE INDEX idx_payouts_restaurant_period ON payouts(restaurant_slug, period_start);
```

## Exempel på INSERT/SELECT

### Skapa en beställning
```sql
-- 1. Skapa huvudorder (total: 12500 öre = 125 kr)
INSERT INTO orders (
  restaurant_slug, customer_name, customer_phone, customer_address,
  items_total, grand_total, created_at, updated_at
) VALUES (
  'sunsushi', 'Anna Andersson', '0701234567', 'Storgatan 1, Stockholm',
  12500, 12500, 1703123456789, 1703123456789
);

-- 2. Lägg till varor
INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
VALUES (1, 'California Roll', 1, 8500, 8500);

INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
VALUES (1, 'Edamame', 1, 4000, 4000);

-- 3. Lägg till tillbehör
INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
VALUES (1, 'såser', 'Wasabi', 0, NULL);

INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
VALUES (1, 'valfri', 'Valfri önskan', 0, 'Extra ingefära tack');
```

### Hämta dagens ordrar för restaurang
```sql
SELECT 
  o.id,
  o.customer_name,
  o.customer_phone,
  o.customer_address,
  o.status,
  o.grand_total,
  o.created_at
FROM orders o
WHERE o.restaurant_slug = 'sunsushi'
  AND o.created_at >= ? -- dagens början
  AND o.created_at < ?  -- morgondagens början
ORDER BY o.created_at DESC;
```

### Hämta orderdetaljer för kurir
```sql
SELECT 
  o.id,
  o.customer_name,
  o.customer_address,
  o.customer_phone,
  o.grand_total
FROM orders o
WHERE o.id = ? 
  AND o.status IN ('out_for_delivery', 'delivered');
```

## Exportflöde (CSV/JSON)

Var 30:e dag körs `npm run payouts:run` som:

1. **Beräknar avgifter per restaurang:**
   - Per order: 45 kr (4500 öre)
   - Procentuell avgift: 5% av bruttot

2. **Skapar filer:**
   - `backend/exports/{restaurant_slug}/{YYYY-MM}.csv`
   - `backend/exports/{restaurant_slug}/{YYYY-MM}.json`

3. **Exempel på CSV-format:**
```csv
order_id,customer_name,created_at,grand_total_öre,grand_total_kr
1,Anna Andersson,2024-01-15 12:30,12500,125.00
2,Erik Eriksson,2024-01-15 13:45,8900,89.00
```

4. **Exempel på payout-beräkning:**
```
Restaurang: sunsushi
Period: 2024-01-01 till 2024-01-31
Orders: 150 st
Bruttot: 187,500 kr (18,750,000 öre)

Avgifter:
- Per order: 150 × 45 kr = 6,750 kr (675,000 öre)
- Procentuell: 187,500 × 5% = 9,375 kr (937,500 öre)
- Total avgift: 16,125 kr (1,612,500 öre)

Netto: 187,500 - 16,125 = 171,375 kr (17,137,500 öre)
```

## Migration från befintlig struktur

Befintliga tabeller behålls för bakåtkompatibilitet. Nya tabeller läggs till parallellt och data migreras gradvis.

## Säkerhet

- Alla PII (personuppgifter) loggas inte i klartext
- Telefonnummer maskas i loggar (070***67)
- E-post returneras endast till kund, inte till kurir-API
- Filrättigheter för exports: 0600 (endast ägare kan läsa)
