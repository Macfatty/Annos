# 🔧 PostgreSQL Sequence Fix - Instruktioner

## Problem
Admin får 409-fel vid orderläggning på grund av PostgreSQL sequence som är out of sync:
```
duplicerat nyckelvärde bryter mot unik-villkor "orders_pkey"
Nyckeln (id)=(16) existerar redan.
```

## Lösning implementerad

### 1. Automatisk sequence-synkronisering
- Körs automatiskt vid serverstart
- Kontrollerar och synkroniserar alla SERIAL sequences
- Förhindrar framtida sequence-problem

### 2. Manuell sequence-fix
Kör detta kommando för att fixa sequences manuellt:
```bash
cd backend
npm run fix-sequences
```

### 3. Förbättrad felhantering
- Backend identifierar nu sequence-problem specifikt
- Returnerar tydligare felmeddelanden
- Loggar sequence-problem för debugging

## Testning

### Steg 1: Starta backend
```bash
cd backend
npm start
```
Kontrollera att du ser:
```
🔧 Kontrollerar och synkroniserar sequences...
✅ orders: Sequence synkroniserad från X till Y
✅ order_items: Sequence redan synkroniserad (Z)
✅ order_item_options: Sequence redan synkroniserad (W)
🎉 Sequence-kontroll slutförd!
```

### Steg 2: Testa admin orderläggning
1. Logga in som admin
2. Lägg en testbeställning
3. Kontrollera att det fungerar utan 409-fel

### Steg 3: Verifiera i databasen
Om du har tillgång till psql:
```sql
-- Kontrollera sequence-värden
SELECT last_value FROM orders_id_seq;
SELECT MAX(id) FROM orders;

-- Kontrollera att de matchar
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders) + 1, false);
```

## Förhindra framtida problem

### 1. Använd alltid SERIAL PRIMARY KEY
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,  -- ✅ Korrekt
  ...
);
```

### 2. Undvik manuell ID-insertion
```sql
-- ❌ Undvik detta
INSERT INTO orders (id, ...) VALUES (16, ...);

-- ✅ Använd detta
INSERT INTO orders (...) VALUES (...);  -- Låt DB generera ID
```

### 3. Använd transaktioner korrekt
```javascript
// ✅ Korrekt transaktionshantering
await client.query('BEGIN');
try {
  const result = await client.query('INSERT INTO orders (...) VALUES (...)');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Felsökning

### Om sequence-fixet inte fungerar:
1. Kontrollera databasanslutning i `.env`
2. Kör manuell fix: `npm run fix-sequences`
3. Kontrollera server-loggar för sequence-meddelanden

### Om problemet kvarstår:
1. Kontrollera att ingen annan process använder samma ID
2. Verifiera att alla tabeller använder SERIAL PRIMARY KEY
3. Kontrollera att inga manuella ID-insertioner sker

## Automatisk övervakning

Backend loggar nu sequence-problem automatiskt:
```
⚠️  Sequence problem upptäckt: Nyckeln (id)=(16) existerar redan.
```

Detta hjälper att identifiera problem tidigt.
