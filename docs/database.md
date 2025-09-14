# Databasstruktur

## Översikt

Annos använder **PostgreSQL** som databas. Alla monetära belopp lagras i **öre (BIGINT)** för precision.

### Databasval
- **Produktion**: PostgreSQL (rekommenderat för skalning och avancerade funktioner)
- **Utveckling**: PostgreSQL
- **Migration**: Fullständig migration från SQLite till PostgreSQL genomförd

## Tabeller

### orders
Huvudtabell för beställningar med ny statusmaskin och monetära fält i öre.

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  restaurant_slug VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(255) NOT NULL,
  customer_address TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'in_progress', 'out_for_delivery', 'delivered')),
  payment_method VARCHAR(50) DEFAULT 'mock' CHECK (payment_method IN ('swish', 'klarna', 'card', 'mock')),
  payment_status VARCHAR(50) DEFAULT 'pending',
  items_total BIGINT NOT NULL, -- öre
  delivery_fee BIGINT DEFAULT 0, -- öre
  discount_total BIGINT DEFAULT 0, -- öre
  grand_total BIGINT NOT NULL, -- öre
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```


### order_items
Individuella varor i en beställning.

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL, -- öre
  line_total BIGINT NOT NULL, -- öre
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```


### order_item_options
Tillbehör och anpassningar för varje order_item.

```sql
CREATE TABLE order_item_options (
  id SERIAL PRIMARY KEY,
  order_item_id BIGINT NOT NULL,
  typ VARCHAR(50) NOT NULL CHECK (typ IN ('såser', 'kött', 'grönt', 'övrigt', 'drycker', 'valfri')),
  label VARCHAR(255) NOT NULL,
  price_delta BIGINT NOT NULL, -- öre (kan vara negativ för rabatter)
  custom_note VARCHAR(140), -- max 140 tecken för valfri-önskningar
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);
```


### payouts
Månadsvisa utbetalningar till restauranger.

```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  restaurant_slug VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  orders_count INTEGER NOT NULL,
  gross_revenue BIGINT NOT NULL, -- öre
  per_order_fee BIGINT NOT NULL, -- öre (45 kr = 4500)
  percent_fee BIGINT NOT NULL, -- öre (5% av gross_revenue)
  net_amount BIGINT NOT NULL, -- öre
  created_at TIMESTAMP DEFAULT NOW()
);
```


### users
Användartabell med roller.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  namn VARCHAR(255) NOT NULL,
  telefon VARCHAR(255),
  adress TEXT,
  role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'restaurant', 'courier', 'admin')),
  restaurant_slug VARCHAR(255)
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

-- Användarindex
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_restaurant_slug ON users(restaurant_slug);
```


## Exempel på INSERT/SELECT

### Skapa en beställning

```sql
-- 1. Skapa huvudorder (total: 12500 öre = 125 kr)
INSERT INTO orders (
  restaurant_slug, customer_name, customer_phone, customer_address,
  items_total, grand_total
) VALUES (
  $1, $2, $3, $4, $5, $6
) RETURNING id;

-- 2. Lägg till varor
INSERT INTO order_items (order_id, name, quantity, unit_price, line_total)
VALUES ($1, $2, $3, $4, $5) RETURNING id;

-- 3. Lägg till tillbehör
INSERT INTO order_item_options (order_item_id, typ, label, price_delta, custom_note)
VALUES ($1, $2, $3, $4, $5);
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
WHERE o.restaurant_slug = $1
  AND o.created_at >= $2::timestamp -- dagens början
  AND o.created_at < $3::timestamp  -- morgondagens början
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
WHERE o.id = $1 
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

## Databaskonfiguration

### Miljövariabler

**PostgreSQL (primärt):**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=annos_dev
DB_USER=postgres
DB_PASSWORD=your-postgres-password
```

**Legacy-filer:**
Gamla SQLite-filer finns arkiverade i `backend/legacy/` för historisk referens.

### Anslutningslogik

Systemet använder `backend/db.js` som:
1. Försöker ansluta till PostgreSQL med miljövariabler
2. Loggar anslutningsstatus vid start
3. Hanterar anslutningsfel gracefully
4. Stöder connection pooling för bättre prestanda

### Databashantering

Systemet använder PostgreSQL med följande funktioner:

- ✅ Parametriserade queries (`$1, $2, $3...`)
- ✅ `RETURNING` clauses för att få nya ID:n
- ✅ Async/await för asynkron hantering
- ✅ Connection pooling för bättre prestanda
- ✅ Transaktionshantering förbättrad

### Tabellskapande

Nya tabeller skapas automatiskt vid första körning via `backend/createTables.js`.

### Legacy Files

Gamla SQLite-initialiseringsskript finns arkiverade i `backend/legacy/` för historisk referens:
- `backend/legacy/initDB.js` - Original SQLite tabellskapande (deprecated)
- Se `backend/legacy/README.md` för detaljer om arkiverade filer

## Säkerhet

- Alla PII (personuppgifter) loggas inte i klartext
- Telefonnummer maskas i loggar (070***67)
- E-post returneras endast till kund, inte till kurir-API
- Filrättigheter för exports: 0600 (endast ägare kan läsa)
