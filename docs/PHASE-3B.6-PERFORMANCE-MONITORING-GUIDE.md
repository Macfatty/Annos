# PHASE 3B.6: Performance Monitoring - User Guide

## Översikt

Performance Monitoring System ger dig fullständig överblick över systemets prestanda med automatisk KPI-spårning, anpassningsbara larm och dashboard för realtidsanalys.

**Funktioner:**
- Automatisk prestandaspårning med snapshots
- Anpassningsbara larm med tröskelvärdeskonfiguration
- Trendanalys över tid
- Dashboard med aktiva larm och KPI:er
- Historik för larmutlösningar

---

## Snabbstart

### 1. Kör migrationen (om inte redan gjord)

```bash
cd /home/macfatty/foodie/Annos/backend
node run-migration-008.js
```

### 2. Starta servern

```bash
npm start
```

### 3. Logga in som admin

Du måste vara inloggad som admin för att använda performance endpoints.

```bash
# Exempel: Logga in som admin
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Spara token från response (antingen från cookie eller response body).

---

## API Endpoints

Alla endpoints kräver admin-autentisering via JWT token (cookie eller Authorization header).

**Base URL:** `http://localhost:3001/api/performance`

### 📸 Snapshots

#### Skapa ny snapshot

Tar en ögonblicksbild av systemets nuvarande prestanda.

```bash
POST /api/performance/snapshot
```

**Exempel:**
```bash
curl -X POST http://localhost:3001/api/performance/snapshot \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snapshot_id": 1,
    "snapshot_at": "2025-11-30T10:30:00.000Z",
    "total_orders": 150,
    "orders_pending": 5,
    "orders_preparing": 3,
    "orders_ready": 2,
    "orders_in_transit": 8,
    "orders_delivered": 132,
    "orders_cancelled": 0,
    "total_couriers": 12,
    "available_couriers": 7,
    "busy_couriers": 5,
    "offline_couriers": 0,
    "avg_delivery_time_minutes": 28.5,
    "success_rate_percentage": 98.7,
    "daily_revenue_sek": 45000.00,
    "daily_order_count": 89,
    "peak_hour_orders": 15,
    "avg_order_value_sek": 505.62,
    "active_routes": 5
  }
}
```

#### Hämta senaste snapshot

```bash
GET /api/performance/snapshots/latest
```

**Exempel:**
```bash
curl http://localhost:3001/api/performance/snapshots/latest \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

#### Hämta snapshots med filter

```bash
GET /api/performance/snapshots?limit=10&offset=0&startDate=2025-11-01&endDate=2025-11-30
```

**Query Parameters:**
- `limit` - Max antal resultat (default: alla)
- `offset` - Hoppa över N första resultat
- `startDate` - ISO 8601 datum (filtrera från och med)
- `endDate` - ISO 8601 datum (filtrera till och med)

**Exempel:**
```bash
# Hämta senaste 5 snapshots
curl "http://localhost:3001/api/performance/snapshots?limit=5" \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Hämta snapshots för november 2025
curl "http://localhost:3001/api/performance/snapshots?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### 📊 Trends (Trendanalys)

Jämför senaste snapshot med en snapshot från X timmar sedan.

```bash
GET /api/performance/trends?hours=24
```

**Query Parameters:**
- `hours` - Antal timmar bakåt att jämföra (default: 24)

**Exempel:**
```bash
# Trender senaste 24 timmarna
curl "http://localhost:3001/api/performance/trends?hours=24" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders_change": 45,
    "deliveries_change": 42,
    "couriers_change": 2,
    "delivery_time_change": -2.3,
    "success_rate_change": 1.2,
    "revenue_change": 8500.00
  }
}
```

**Tolkning:**
- Positiva värden = ökning
- Negativa värden = minskning
- `delivery_time_change: -2.3` = leveranstiden har förbättrats med 2.3 minuter

---

### 🚨 Alerts (Larm)

#### Hämta alla larm

```bash
GET /api/performance/alerts
```

**Exempel:**
```bash
curl http://localhost:3001/api/performance/alerts \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "alert_name": "High Delivery Time",
      "description": "Alert when average delivery time exceeds threshold",
      "alert_type": "threshold",
      "metric_name": "avg_delivery_time_minutes",
      "threshold_value": "45.00",
      "comparison_operator": ">",
      "severity": "warning",
      "is_enabled": true,
      "notify_email": null,
      "notify_slack": null,
      "created_at": "2025-11-30T08:00:00.000Z",
      "updated_at": "2025-11-30T08:00:00.000Z"
    }
  ]
}
```

#### Hämta endast aktiverade larm

```bash
GET /api/performance/alerts?enabled=true
```

#### Skapa nytt larm

```bash
POST /api/performance/alerts
```

**Request Body:**
```json
{
  "alert_name": "Low Success Rate",
  "description": "Triggers when success rate drops below 95%",
  "metric_name": "success_rate_percentage",
  "threshold_value": 95,
  "comparison_operator": "<",
  "severity": "critical",
  "is_enabled": true
}
```

**Tillgängliga metrics:**
- `total_orders`, `orders_pending`, `orders_delivered`, etc.
- `total_couriers`, `available_couriers`, `busy_couriers`, etc.
- `avg_delivery_time_minutes`
- `success_rate_percentage`
- `daily_revenue_sek`
- `daily_order_count`
- `avg_order_value_sek`

**Comparison operators:**
- `>` - större än
- `<` - mindre än
- `>=` - större än eller lika med
- `<=` - mindre än eller lika med
- `=` - exakt lika med

**Severity nivåer:**
- `info` - Informativt
- `warning` - Varning
- `critical` - Kritiskt

**Exempel:**
```bash
curl -X POST http://localhost:3001/api/performance/alerts \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_name": "Very Few Available Couriers",
    "description": "Alert when available couriers drop below 3",
    "metric_name": "available_couriers",
    "threshold_value": 3,
    "comparison_operator": "<",
    "severity": "critical"
  }'
```

#### Uppdatera larm

```bash
PUT /api/performance/alerts/:id
```

**Request Body (alla fält är optional):**
```json
{
  "description": "Updated description",
  "threshold_value": 50,
  "severity": "critical",
  "is_enabled": false
}
```

**Exempel:**
```bash
curl -X PUT http://localhost:3001/api/performance/alerts/1 \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "threshold_value": 50,
    "severity": "critical"
  }'
```

#### Ta bort larm

```bash
DELETE /api/performance/alerts/:id
```

**Exempel:**
```bash
curl -X DELETE http://localhost:3001/api/performance/alerts/1 \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

#### Kontrollera larm

Kör alla aktiverade larm mot senaste snapshot och logga eventuella utlösningar.

```bash
POST /api/performance/alerts/check
```

**Exempel:**
```bash
curl -X POST http://localhost:3001/api/performance/alerts/check \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts_triggered": 2,
    "checked_at": "2025-11-30T10:35:00.000Z"
  }
}
```

---

### 📜 Alert History (Larmhistorik)

#### Hämta larmhistorik

```bash
GET /api/performance/alerts/history?alertId=1&resolved=false&limit=20&offset=0
```

**Query Parameters:**
- `alertId` - Filtrera på specifikt larm-ID
- `resolved` - true/false för filtrering på lösta/olösta larm
- `limit` - Max antal resultat
- `offset` - Hoppa över N första resultat

**Exempel:**
```bash
# Hämta alla olösta larm
curl "http://localhost:3001/api/performance/alerts/history?resolved=false" \
  -H "Cookie: token=YOUR_JWT_TOKEN"

# Hämta historik för larm ID 1
curl "http://localhost:3001/api/performance/alerts/history?alertId=1&limit=10" \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "alert_id": 1,
      "alert_name": "High Delivery Time",
      "alert_severity": "warning",
      "metric_value": "48.50",
      "threshold_value": "45.00",
      "triggered_at": "2025-11-30T10:30:00.000Z",
      "resolved": false,
      "resolved_at": null,
      "resolved_by": null,
      "resolution_notes": null
    }
  ]
}
```

#### Markera larm som löst

```bash
POST /api/performance/alerts/history/:id/resolve
```

**Request Body:**
```json
{
  "resolvedBy": 1,
  "notes": "Resolved by adding more couriers to the system"
}
```

**Exempel:**
```bash
curl -X POST http://localhost:3001/api/performance/alerts/history/5/resolve \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolvedBy": 1,
    "notes": "Added 3 new couriers, delivery time back to normal"
  }'
```

---

### 📈 Dashboard

Hämtar en komplett översikt med senaste snapshot, trender och aktiva larm.

```bash
GET /api/performance/dashboard
```

**Exempel:**
```bash
curl http://localhost:3001/api/performance/dashboard \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "snapshot_id": 15,
      "total_orders": 150,
      "avg_delivery_time_minutes": 28.5,
      "success_rate_percentage": 98.7,
      // ... alla snapshot metrics
    },
    "trends": {
      "orders_change": 45,
      "deliveries_change": 42,
      "delivery_time_change": -2.3,
      // ... alla trend metrics
    },
    "active_alerts": [
      {
        "id": 5,
        "alert_name": "High Delivery Time",
        "severity": "warning",
        "triggered_at": "2025-11-30T10:30:00.000Z",
        "resolved": false
      }
    ],
    "active_alerts_count": 1
  }
}
```

---

## Användningsscenarier

### Scenario 1: Daglig morgonkontroll

```bash
# 1. Hämta dashboard
curl http://localhost:3001/api/performance/dashboard \
  -H "Cookie: token=$TOKEN"

# 2. Skapa ny snapshot för dagens start
curl -X POST http://localhost:3001/api/performance/snapshot \
  -H "Cookie: token=$TOKEN"
```

### Scenario 2: Upptäck problem

```bash
# 1. Kör larmkontroll
curl -X POST http://localhost:3001/api/performance/alerts/check \
  -H "Cookie: token=$TOKEN"

# 2. Hämta olösta larm
curl "http://localhost:3001/api/performance/alerts/history?resolved=false" \
  -H "Cookie: token=$TOKEN"

# 3. Undersök trender
curl "http://localhost:3001/api/performance/trends?hours=6" \
  -H "Cookie: token=$TOKEN"
```

### Scenario 3: Skapa anpassat larm

```bash
# Larm för låg revenue
curl -X POST http://localhost:3001/api/performance/alerts \
  -H "Cookie: token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_name": "Low Daily Revenue",
    "description": "Alert when daily revenue drops below 30000 SEK",
    "metric_name": "daily_revenue_sek",
    "threshold_value": 30000,
    "comparison_operator": "<",
    "severity": "warning"
  }'
```

### Scenario 4: Månadsrapport

```bash
# Hämta alla snapshots för december
curl "http://localhost:3001/api/performance/snapshots?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Cookie: token=$TOKEN"
```

---

## Standard Larm (Pre-konfigurerade)

Systemet kommer med 4 förkonfigurerade larm:

1. **High Delivery Time**
   - Triggas när genomsnittlig leveranstid > 45 minuter
   - Severity: warning

2. **Low Success Rate**
   - Triggas när success rate < 95%
   - Severity: critical

3. **Low Courier Availability**
   - Triggas när tillgängliga couriers < 3
   - Severity: warning

4. **High Revenue Day**
   - Triggas när daglig revenue > 100000 SEK
   - Severity: info (positivt larm!)

Du kan inaktivera, uppdatera eller ta bort dessa efter behov.

---

## Automatisering med Cron Jobs

För automatisk spårning kan du sätta upp cron jobs:

```bash
# Skapa snapshot varje timme
0 * * * * curl -X POST http://localhost:3001/api/performance/snapshot -H "Cookie: token=$TOKEN"

# Kontrollera larm var 15:e minut
*/15 * * * * curl -X POST http://localhost:3001/api/performance/alerts/check -H "Cookie: token=$TOKEN"
```

---

## Felsökning

### Problem: "Unauthorized" eller "Permission denied"

**Lösning:** Du måste vara inloggad som admin.

```bash
# Kontrollera att du är inloggad som admin
curl http://localhost:3001/api/profile \
  -H "Cookie: token=$TOKEN"
```

### Problem: "Alert with name 'X' already exists"

**Lösning:** Larmnamn måste vara unika. Använd ett annat namn eller uppdatera det befintliga larmet.

### Problem: Inga snapshots returneras

**Lösning:** Skapa din första snapshot:

```bash
curl -X POST http://localhost:3001/api/performance/snapshot \
  -H "Cookie: token=$TOKEN"
```

---

## Testning

Kör den kompletta testsviten:

```bash
cd /home/macfatty/foodie/Annos/backend
node test-performance.js
```

**Förväntat resultat:** 14-17 tester ska passera.

---

## Databastabeller

Performance Monitoring använder 3 tabeller:

- **performance_snapshots** - Alla snapshots
- **performance_alerts** - Larmdefinitioner
- **performance_alert_history** - Larmutlösningar

Du kan inspektera dessa direkt i PostgreSQL:

```bash
PGPASSWORD="${DB_PASSWORD:-asha}" psql -h localhost -U asha -d annos_dev \
  -c "SELECT COUNT(*) FROM performance_snapshots;"
```

---

## Nästa Steg

Efter PHASE 3B.6 kan du:

1. Integrera performance dashboard i frontend
2. Sätta upp email/Slack notifikationer för larm
3. Skapa visualiseringar av trender över tid
4. Exportera data för externa analytics-verktyg
5. Gå vidare till **PHASE 3B.5: Mobile App Integration**

---

**Guide skapad:** 2025-11-30
**Version:** 1.0
**För frågor:** Se backend/src/services/performanceService.js för implementation
