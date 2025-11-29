# PHASE 3B.3: Analytics Dashboard - Användningsguide

**Version:** 1.0
**Datum:** 2025-11-29
**Status:** ✅ Produktionsklar

## Innehållsförteckning

1. [Översikt](#översikt)
2. [Snabbstart](#snabbstart)
3. [API-Dokumentation](#api-dokumentation)
4. [Användningsexempel](#användningsexempel)
5. [Materialiserade Vyer](#materialiserade-vyer)
6. [Best Practices](#best-practices)
7. [Felsökning](#felsökning)
8. [Prestandaoptimering](#prestandaoptimering)

---

## Översikt

PHASE 3B.3 implementerar ett komplett analytics-system för Foodie-plattformen med fokus på snabba queries via PostgreSQL materialiserade vyer.

### Nyckelfunktioner

- **4 Materialiserade Vyer** för snabb dataåtkomst
- **7 API-endpoints** för olika analytics-behov
- **27 Automatiska Tester** (100% pass rate)
- **Datumfiltrering** för real-time och historisk data
- **Multi-metric Leaderboards** (leveranser, betyg, intäkter)
- **Dashboard Summary** för admin-panel

### Vad är Materialiserade Vyer?

Materialiserade vyer är förkalkylerade tabeller som lagrar resultatet av komplexa queries. Detta ger:

- ⚡ **Snabbare queries** (millisekunder istället för sekunder)
- 📊 **Konsekvent data** för rapporter
- 🔄 **Uppdateringskontroll** via refresh-funktion
- 💾 **Lägre databaslast** vid frekventa queries

---

## Snabbstart

### 1. Kör Database Migration

```bash
cd backend
node migrations/006_analytics_materialized_views.js
```

**Output:**
```
🚀 Starting PHASE 3B.3 Migration: Analytics Dashboard
✅ courier_performance_metrics view created
✅ system_wide_statistics view created
✅ hourly_activity_stats view created
✅ daily_revenue_stats view created
✅ Indexes created on materialized views
✅ Refresh function created
🎉 PHASE 3B.3 Migration completed successfully!
```

### 2. Verifiera Installation

```bash
node test-analytics.js
```

**Förväntat resultat:**
```
Total Tests: 27
✅ Passed: 27
❌ Failed: 0
Success Rate: 100.00%
```

### 3. Testa API

```bash
# Hämta systemstatistik (kräver admin-token)
curl -X GET http://localhost:3001/api/analytics/system \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## API-Dokumentation

### Authentication

Alla endpoints kräver JWT-autentisering via `Authorization: Bearer <token>` header.

**Behörigheter:**
- `courier:view` - Kurir kan se sin egen statistik
- `admin` - Admin kan se all statistik

---

### 1. GET /api/analytics/courier/:id

Hämta prestationsstatistik för en specifik kurir.

**Behörighet:** Kurir (endast egen data) eller Admin (all data)

**Query Parameters:**
- `startDate` (optional) - Startdatum för filtrering (YYYY-MM-DD)
- `endDate` (optional) - Slutdatum för filtrering (YYYY-MM-DD)

**Exempel:**

```bash
# Hämta all-time statistik för kurir 1
curl -X GET http://localhost:3001/api/analytics/courier/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Hämta statistik för senaste månaden
curl -X GET "http://localhost:3001/api/analytics/courier/1?startDate=2025-10-29&endDate=2025-11-29" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "courier_id": 1,
    "user_id": 5,
    "courier_name": "Erik Andersson",
    "courier_email": "erik@foodie.se",
    "vehicle_type": "bike",
    "is_available": true,
    "gps_enabled": true,
    "rating": 4.8,
    "total_deliveries": 156,
    "lifetime_orders": 156,
    "completed_deliveries": 148,
    "cancelled_deliveries": 8,
    "pending_deliveries": 0,
    "active_deliveries": 0,
    "avg_delivery_time_minutes": 23.45,
    "fastest_delivery_minutes": 12.30,
    "slowest_delivery_minutes": 45.20,
    "estimated_earnings_sek": 5180.00,
    "last_delivery_at": "2025-11-29T14:30:00.000Z",
    "last_order_at": "2025-11-29T15:00:00.000Z",
    "last_location_update": "2025-11-29T15:10:00.000Z",
    "success_rate_percentage": 94.87,
    "current_status": "active"
  }
}
```

---

### 2. GET /api/analytics/system

Hämta systemövergripande statistik.

**Behörighet:** Admin

**Query Parameters:**
- `startDate` (optional) - Startdatum (YYYY-MM-DD)
- `endDate` (optional) - Slutdatum (YYYY-MM-DD)

**Exempel:**

```bash
# All-time statistik
curl -X GET http://localhost:3001/api/analytics/system \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Statistik för november 2025
curl -X GET "http://localhost:3001/api/analytics/system?startDate=2025-11-01&endDate=2025-11-30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total_orders": 1234,
    "total_delivered": 1156,
    "total_cancelled": 78,
    "total_pending": 5,
    "total_in_progress": 12,
    "total_couriers": 45,
    "active_couriers": 23,
    "gps_enabled_couriers": 20,
    "avg_delivery_time_minutes": 28.34,
    "avg_courier_rating": 4.6,
    "overall_success_rate": 93.68,
    "estimated_total_revenue_sek": 40460.00,
    "total_customers": 456,
    "last_order_time": "2025-11-29T15:45:00.000Z",
    "last_delivery_time": "2025-11-29T15:30:00.000Z",
    "orders_today": 45,
    "deliveries_today": 42,
    "last_updated": "2025-11-29T16:00:00.000Z"
  }
}
```

---

### 3. GET /api/analytics/activity

Hämta aktivitetsstatistik per timme.

**Behörighet:** Admin

**Query Parameters:**
- `startDate` (optional) - Startdatum
- `endDate` (optional) - Slutdatum

**Exempel:**

```bash
# Timvis aktivitet (senaste 30 dagarna från materialiserad vy)
curl -X GET http://localhost:3001/api/analytics/activity \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Custom datumintervall
curl -X GET "http://localhost:3001/api/analytics/activity?startDate=2025-11-01&endDate=2025-11-29" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "hour_of_day": 12,
      "total_orders": 78,
      "delivered_orders": 73,
      "cancelled_orders": 5,
      "avg_delivery_time_minutes": 25.6,
      "success_rate": 93.59
    },
    {
      "hour_of_day": 18,
      "total_orders": 125,
      "delivered_orders": 118,
      "cancelled_orders": 7,
      "avg_delivery_time_minutes": 32.1,
      "success_rate": 94.40
    }
  ]
}
```

**Användning:**
- Identifiera topptider för leveranser
- Planera kurir-schemaläggning
- Analysera prestanda per tidpunkt

---

### 4. GET /api/analytics/revenue

Hämta dagliga intäktsmått.

**Behörighet:** Admin

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)

**Exempel:**

```bash
# Senaste 90 dagarna (från materialiserad vy)
curl -X GET http://localhost:3001/api/analytics/revenue \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Custom intervall
curl -X GET "http://localhost:3001/api/analytics/revenue?startDate=2025-11-01&endDate=2025-11-29" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "activity_date": "2025-11-29",
      "total_orders": 45,
      "delivered_orders": 42,
      "daily_revenue_sek": 1470.00,
      "unique_customers": 38,
      "active_couriers": 12,
      "avg_delivery_time": 27.8
    },
    {
      "activity_date": "2025-11-28",
      "total_orders": 52,
      "delivered_orders": 49,
      "daily_revenue_sek": 1715.00,
      "unique_customers": 45,
      "active_couriers": 14,
      "avg_delivery_time": 29.2
    }
  ]
}
```

**Beräkning:**
- Intäkt = Antal levererade × 35 SEK (fast avgift per leverans)
- Kan anpassas i service-lagret

---

### 5. GET /api/analytics/leaderboard

Hämta topplista över kurirer.

**Behörighet:** Admin

**Query Parameters:**
- `limit` (optional, default: 10, max: 100) - Antal kurirer att returnera
- `metric` (optional, default: 'deliveries') - Sorteringsmått
  - `deliveries` - Flest leveranser
  - `rating` - Högst betyg
  - `earnings` - Högst intjäning

**Exempel:**

```bash
# Top 10 kurirer (flest leveranser)
curl -X GET http://localhost:3001/api/analytics/leaderboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Top 5 kurirer med högst betyg
curl -X GET "http://localhost:3001/api/analytics/leaderboard?limit=5&metric=rating" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Top 20 kurirer med högst intjäning
curl -X GET "http://localhost:3001/api/analytics/leaderboard?limit=20&metric=earnings" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "courier_id": 3,
      "courier_name": "Maria Johansson",
      "courier_email": "maria@foodie.se",
      "vehicle_type": "bike",
      "completed_deliveries": 234,
      "rating": 4.9,
      "estimated_earnings_sek": 8190.00,
      "avg_delivery_time_minutes": 22.1,
      "success_rate_percentage": 96.30,
      "current_status": "active",
      "last_delivery_at": "2025-11-29T14:20:00.000Z"
    },
    {
      "courier_id": 1,
      "courier_name": "Erik Andersson",
      "courier_email": "erik@foodie.se",
      "vehicle_type": "bike",
      "completed_deliveries": 156,
      "rating": 4.8,
      "estimated_earnings_sek": 5460.00,
      "avg_delivery_time_minutes": 23.5,
      "success_rate_percentage": 94.87,
      "current_status": "active",
      "last_delivery_at": "2025-11-29T14:30:00.000Z"
    }
  ]
}
```

---

### 6. GET /api/analytics/dashboard

Hämta kombinerad dashboard-data för admin-panel.

**Behörighet:** Admin

**Exempel:**

```bash
curl -X GET http://localhost:3001/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "system": {
      "total_orders": 1234,
      "total_delivered": 1156,
      "total_couriers": 45,
      "active_couriers": 23,
      "avg_delivery_time_minutes": 28.34,
      "avg_courier_rating": 4.6,
      "overall_success_rate": 93.68,
      "estimated_total_revenue_sek": 40460.00
    },
    "today": {
      "orders_today": 45,
      "deliveries_today": 42,
      "in_progress": 3,
      "revenue_today": 1470.00
    },
    "topCouriers": [
      {
        "courier_id": 3,
        "courier_name": "Maria Johansson",
        "completed_deliveries": 234,
        "rating": 4.9,
        "estimated_earnings_sek": 8190.00
      }
    ],
    "hourlyActivity": [
      {
        "hour": 12,
        "orders": 15
      },
      {
        "hour": 18,
        "orders": 23
      }
    ]
  }
}
```

**Användning:**
- Perfect för admin dashboard
- En request för all viktig data
- Optimerad prestanda

---

### 7. POST /api/analytics/refresh

Uppdatera alla materialiserade vyer manuellt.

**Behörighet:** Admin

**När använda:**
- Efter stora dataändringar
- Vid misstänkt gammal data
- Enligt schema (t.ex. varje natt kl 02:00)

**Exempel:**

```bash
curl -X POST http://localhost:3001/api/analytics/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "duration_ms": 245,
    "refreshed_at": "2025-11-29T16:30:00.000Z"
  },
  "message": "Analytics views refreshed successfully in 245ms"
}
```

**Rekommendation:**
- Sätt upp cron job för automatisk refresh
- Kör varje natt eller varje timme beroende på behov
- Övervaka duration_ms för prestandaproblem

---

## Användningsexempel

### Dashboard Implementation (React)

```javascript
import { useState, useEffect } from 'react';

function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await fetch('/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Laddar...</div>;

  return (
    <div className="dashboard">
      <h1>Analytics Dashboard</h1>

      {/* System Overview */}
      <div className="stats-grid">
        <StatCard
          title="Totalt Orders"
          value={dashboardData.system.total_orders}
        />
        <StatCard
          title="Levererade"
          value={dashboardData.system.total_delivered}
        />
        <StatCard
          title="Aktiva Kurirer"
          value={dashboardData.system.active_couriers}
        />
        <StatCard
          title="Genomsnittlig Betyg"
          value={dashboardData.system.avg_courier_rating.toFixed(1)}
        />
      </div>

      {/* Today's Performance */}
      <div className="today-stats">
        <h2>Idag</h2>
        <p>Orders: {dashboardData.today.orders_today}</p>
        <p>Levererade: {dashboardData.today.deliveries_today}</p>
        <p>Intäkt: {dashboardData.today.revenue_today} SEK</p>
      </div>

      {/* Top Couriers */}
      <div className="leaderboard">
        <h2>Topplista Kurirer</h2>
        <table>
          <thead>
            <tr>
              <th>Kurir</th>
              <th>Leveranser</th>
              <th>Betyg</th>
              <th>Intjäning</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.topCouriers.map(courier => (
              <tr key={courier.courier_id}>
                <td>{courier.courier_name}</td>
                <td>{courier.completed_deliveries}</td>
                <td>{courier.rating.toFixed(1)}</td>
                <td>{courier.estimated_earnings_sek} SEK</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hourly Activity Chart */}
      <div className="activity-chart">
        <h2>Aktivitet Idag</h2>
        <ActivityChart data={dashboardData.hourlyActivity} />
      </div>
    </div>
  );
}
```

### Courier Profile Page

```javascript
function CourierProfile({ courierId }) {
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState('all-time');

  async function fetchStats(startDate = null, endDate = null) {
    let url = `/api/analytics/courier/${courierId}`;

    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const result = await response.json();
    if (result.success) {
      setStats(result.data);
    }
  }

  function handleDateRangeChange(range) {
    setDateRange(range);

    const today = new Date();
    let startDate, endDate;

    switch(range) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        startDate = new Date(today - 7*24*60*60*1000).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      default:
        startDate = endDate = null;
    }

    fetchStats(startDate, endDate);
  }

  return (
    <div className="courier-profile">
      <h1>{stats?.courier_name}</h1>

      {/* Date Range Selector */}
      <div className="date-selector">
        <button onClick={() => handleDateRangeChange('today')}>Idag</button>
        <button onClick={() => handleDateRangeChange('week')}>Senaste Veckan</button>
        <button onClick={() => handleDateRangeChange('month')}>Denna Månad</button>
        <button onClick={() => handleDateRangeChange('all-time')}>Alla Tider</button>
      </div>

      {/* Stats Display */}
      <div className="stats">
        <div className="stat-card">
          <h3>Leveranser</h3>
          <p className="big-number">{stats?.completed_deliveries}</p>
          <p className="sub-text">
            Framgångsrate: {stats?.success_rate_percentage}%
          </p>
        </div>

        <div className="stat-card">
          <h3>Betyg</h3>
          <p className="big-number">{stats?.rating}</p>
          <p className="sub-text">
            Status: {stats?.current_status}
          </p>
        </div>

        <div className="stat-card">
          <h3>Genomsnittlig Tid</h3>
          <p className="big-number">{stats?.avg_delivery_time_minutes} min</p>
          <p className="sub-text">
            Snabbast: {stats?.fastest_delivery_minutes} min
          </p>
        </div>

        <div className="stat-card">
          <h3>Intjäning</h3>
          <p className="big-number">{stats?.estimated_earnings_sek} SEK</p>
          <p className="sub-text">
            Baserat på {stats?.completed_deliveries} leveranser
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Revenue Report Generator

```javascript
async function generateRevenueReport(startDate, endDate) {
  const response = await fetch(
    `/api/analytics/revenue?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to fetch revenue data');
  }

  // Calculate totals
  const totals = result.data.reduce((acc, day) => ({
    orders: acc.orders + day.total_orders,
    delivered: acc.delivered + day.delivered_orders,
    revenue: acc.revenue + parseFloat(day.daily_revenue_sek),
    customers: Math.max(acc.customers, day.unique_customers)
  }), { orders: 0, delivered: 0, revenue: 0, customers: 0 });

  // Generate CSV
  const csv = [
    'Datum,Orders,Levererade,Intäkt (SEK),Unika Kunder,Aktiva Kurirer,Snitt Leveranstid',
    ...result.data.map(day =>
      `${day.activity_date},${day.total_orders},${day.delivered_orders},${day.daily_revenue_sek},${day.unique_customers},${day.active_couriers},${day.avg_delivery_time}`
    ),
    '',
    `Totalt,${totals.orders},${totals.delivered},${totals.revenue.toFixed(2)},${totals.customers},,`
  ].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
  a.click();
}
```

### Leaderboard with Filtering

```javascript
function Leaderboard() {
  const [couriers, setCouriers] = useState([]);
  const [metric, setMetric] = useState('deliveries');
  const [limit, setLimit] = useState(10);

  async function fetchLeaderboard() {
    const response = await fetch(
      `/api/analytics/leaderboard?metric=${metric}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      }
    );

    const result = await response.json();
    if (result.success) {
      setCouriers(result.data);
    }
  }

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, limit]);

  return (
    <div className="leaderboard">
      <h1>Kurir Topplista</h1>

      {/* Filters */}
      <div className="filters">
        <select value={metric} onChange={e => setMetric(e.target.value)}>
          <option value="deliveries">Flest Leveranser</option>
          <option value="rating">Högst Betyg</option>
          <option value="earnings">Högst Intjäning</option>
        </select>

        <select value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          <option value="5">Top 5</option>
          <option value="10">Top 10</option>
          <option value="20">Top 20</option>
          <option value="50">Top 50</option>
        </select>
      </div>

      {/* Leaderboard Table */}
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Kurir</th>
            <th>Fordon</th>
            <th>Leveranser</th>
            <th>Betyg</th>
            <th>Intjäning</th>
            <th>Framgång</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {couriers.map((courier, index) => (
            <tr key={courier.courier_id} className={index < 3 ? 'top-three' : ''}>
              <td className="rank">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && index + 1}
              </td>
              <td>
                <div className="courier-info">
                  <strong>{courier.courier_name}</strong>
                  <small>{courier.courier_email}</small>
                </div>
              </td>
              <td>{courier.vehicle_type}</td>
              <td>{courier.completed_deliveries}</td>
              <td>
                <span className="rating">
                  ⭐ {courier.rating.toFixed(1)}
                </span>
              </td>
              <td>{courier.estimated_earnings_sek} SEK</td>
              <td>{courier.success_rate_percentage}%</td>
              <td>
                <span className={`status ${courier.current_status}`}>
                  {courier.current_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Materialiserade Vyer

### 1. courier_performance_metrics

**Innehåll:** Detaljerad statistik per kurir

**Kolumner:**
- `courier_id`, `user_id`, `courier_name`, `courier_email`
- `vehicle_type`, `is_available`, `gps_enabled`, `rating`
- `total_deliveries`, `lifetime_orders`
- `completed_deliveries`, `cancelled_deliveries`
- `pending_deliveries`, `active_deliveries`
- `avg_delivery_time_minutes`, `fastest_delivery_minutes`, `slowest_delivery_minutes`
- `estimated_earnings_sek`
- `last_delivery_at`, `last_order_at`, `last_location_update`
- `success_rate_percentage`, `current_status`
- `last_updated`

**Uppdateringsfrekvens:** Manuell eller via cron

**Index:**
- `idx_courier_performance_courier_id` på `courier_id`
- `idx_courier_performance_status` på `current_status`
- `idx_courier_performance_rating` på `rating DESC`

---

### 2. system_wide_statistics

**Innehåll:** Plattformsövergripande metrics

**Kolumner:**
- `total_orders`, `total_delivered`, `total_cancelled`
- `total_pending`, `total_in_progress`
- `total_couriers`, `active_couriers`, `gps_enabled_couriers`
- `avg_delivery_time_minutes`, `avg_courier_rating`
- `overall_success_rate`
- `estimated_total_revenue_sek`
- `total_customers`
- `last_order_time`, `last_delivery_time`
- `orders_today`, `deliveries_today`
- `last_updated`

**Användning:** Dashboard sammanfattning, KPI-uppföljning

---

### 3. hourly_activity_stats

**Innehåll:** Aktivitet per timme och datum

**Kolumner:**
- `hour_of_day` (0-23)
- `activity_date`
- `total_orders`, `delivered_orders`, `cancelled_orders`
- `avg_delivery_time_minutes`
- `success_rate`
- `last_updated`

**Tidsspann:** Senaste 30 dagarna (default)

**Index:**
- `idx_hourly_activity_date` på `activity_date DESC`
- `idx_hourly_activity_hour` på `hour_of_day`

**Användning:**
- Identifiera topptider
- Planera kurir-schemaläggning
- Analysera prestanda per tidpunkt

---

### 4. daily_revenue_stats

**Innehåll:** Daglig intäkts- och aktivitetsdata

**Kolumner:**
- `activity_date`
- `total_orders`, `delivered_orders`
- `daily_revenue_sek`
- `unique_customers`, `active_couriers`
- `avg_delivery_time`
- `last_updated`

**Tidsspann:** Senaste 90 dagarna (default)

**Index:**
- `idx_daily_revenue_date` på `activity_date DESC`

**Användning:**
- Intäktsrapporter
- Trendanalys
- Prognos

---

## Best Practices

### 1. Uppdatering av Materialiserade Vyer

**Rekommenderad Schema:**

```bash
# Lägg till i crontab
# Kör varje natt kl 02:00
0 2 * * * curl -X POST http://localhost:3001/api/analytics/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Alternativt med Node.js cron:**

```javascript
const cron = require('node-cron');
const AnalyticsService = require('./services/analyticsService');

// Kör varje natt kl 02:00
cron.schedule('0 2 * * *', async () => {
  console.log('Refreshing analytics views...');
  try {
    const result = await AnalyticsService.refreshAnalytics();
    console.log(`Analytics refreshed in ${result.duration_ms}ms`);
  } catch (error) {
    console.error('Failed to refresh analytics:', error);
  }
});
```

### 2. Cachning i Frontend

```javascript
// Cache dashboard data i 5 minuter
const CACHE_DURATION = 5 * 60 * 1000;
let dashboardCache = null;
let cacheTimestamp = 0;

async function getCachedDashboard() {
  const now = Date.now();

  if (dashboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return dashboardCache;
  }

  const response = await fetch('/api/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const result = await response.json();

  if (result.success) {
    dashboardCache = result.data;
    cacheTimestamp = now;
  }

  return dashboardCache;
}
```

### 3. Error Handling

```javascript
async function fetchAnalytics(endpoint) {
  try {
    const response = await fetch(`/api/analytics/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Redirect till login
      window.location.href = '/login';
      return null;
    }

    if (response.status === 403) {
      throw new Error('Du har inte behörighet att se denna data');
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Något gick fel');
    }

    return result.data;

  } catch (error) {
    console.error('Analytics error:', error);
    // Visa användarvänligt felmeddelande
    showNotification('Kunde inte hämta analytics-data', 'error');
    return null;
  }
}
```

### 4. Datumvalidering

```javascript
function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Ogiltigt datumformat. Använd YYYY-MM-DD');
  }

  // Start must be before end
  if (start > end) {
    throw new Error('Startdatum måste vara före slutdatum');
  }

  // End cannot be in future
  if (end > now) {
    throw new Error('Slutdatum kan inte vara i framtiden');
  }

  // Max 1 year range for performance
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (start < oneYearAgo) {
    console.warn('Datumintervall över 1 år kan ge långsamma queries');
  }

  return { startDate, endDate };
}
```

---

## Felsökning

### Problem: Materialiserade vyer är tomma

**Symptom:** API returnerar tom data eller null-värden

**Lösning:**

```bash
# 1. Verifiera att migration kördes korrekt
psql -d annos_dev -c "\d+ courier_performance_metrics"

# 2. Manuell refresh
curl -X POST http://localhost:3001/api/analytics/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. Kontrollera om det finns data i orders-tabellen
psql -d annos_dev -c "SELECT COUNT(*) FROM orders"
```

---

### Problem: Långsamma queries trots materialiserade vyer

**Symptom:** API-requests tar >1 sekund

**Lösning:**

```sql
-- 1. Verifiera index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'courier_performance_metrics';

-- 2. Kör ANALYZE för uppdatera statistik
ANALYZE courier_performance_metrics;
ANALYZE system_wide_statistics;
ANALYZE hourly_activity_stats;
ANALYZE daily_revenue_stats;

-- 3. Kontrollera view-storlek
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname = 'public';
```

---

### Problem: "Customer_email does not exist" error

**Symptom:** Migration eller queries failar

**Orsak:** Orders-tabellen använder `customer_email` istället för `user_id`

**Lösning:** Migration 006 är uppdaterad för korrekt kolumnnamn. Om du får detta fel:

```bash
# Rollback och kör om migration
node migrations/006_analytics_materialized_views.js --rollback
node migrations/006_analytics_materialized_views.js
```

---

### Problem: Permission denied

**Symptom:** 403 Forbidden vid API-anrop

**Lösning:**

```javascript
// Verifiera att token innehåller rätt roll
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('User role:', decoded.role);
console.log('User permissions:', decoded.permissions);

// Admin endpoints kräver role: 'admin'
// Courier endpoints kräver permission: 'courier:view'
```

---

## Prestandaoptimering

### 1. Monitoring

Övervaka refresh-tid:

```javascript
// Logga refresh-tid i Prometheus/Grafana
async function monitoredRefresh() {
  const start = Date.now();

  try {
    await AnalyticsService.refreshAnalytics();
    const duration = Date.now() - start;

    // Logga till monitoring system
    metrics.histogram('analytics_refresh_duration_ms', duration);

    if (duration > 5000) {
      console.warn(`Slow analytics refresh: ${duration}ms`);
    }
  } catch (error) {
    metrics.increment('analytics_refresh_errors');
    throw error;
  }
}
```

### 2. Partial Refresh

För stora dataset, överväg att refresha en vy i taget:

```sql
-- Refresha endast en specifik vy
REFRESH MATERIALIZED VIEW courier_performance_metrics;
```

### 3. Concurrent Refresh

För att undvika låsning under refresh:

```sql
-- Skapa concurrent refresh (kräver UNIQUE index)
CREATE UNIQUE INDEX idx_courier_perf_unique ON courier_performance_metrics(courier_id);

-- Använd CONCURRENTLY för refresh utan låsning
REFRESH MATERIALIZED VIEW CONCURRENTLY courier_performance_metrics;
```

### 4. Partitionering

För mycket stora dataset (>10M rader), överväg partitionering:

```sql
-- Exempel: Partitionera daily_revenue_stats per månad
CREATE TABLE daily_revenue_stats_2025_11 PARTITION OF daily_revenue_stats
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

---

## Sammanfattning

PHASE 3B.3 ger dig ett kraftfullt analytics-system med:

✅ **Snabba queries** via materialiserade vyer
✅ **Flexibel filtrering** med datumintervall
✅ **7 färdiga endpoints** för olika behov
✅ **100% testad** med 27 automatiska tester
✅ **Produktionsklar** med best practices

**Nästa steg:**
1. Sätt upp automatisk refresh (cron job)
2. Implementera frontend dashboard
3. Konfigurera monitoring
4. Skapa customiserade rapporter

**Support:**
- Dokumentation: `backend/PHASE3B.3_USAGE_GUIDE.md`
- Tester: `backend/test-analytics.js`
- Migration: `backend/migrations/006_analytics_materialized_views.js`

---

**Version History:**
- v1.0 (2025-11-29) - Initial release
