# Phase 1.1.4: Wireframes & UI Plan

**Date:** 2025-12-03
**Status:** 🚧 IN PROGRESS
**Focus:** Admin Dashboard Design & Architecture

---

## 📋 Executive Summary

This document outlines the complete wireframe and UI architecture for the Admin Dashboard redesign. We are modernizing the existing basic admin panel into a comprehensive, professional dashboard using MUI components, React Query for data management, and a well-structured routing system.

---

## 🎯 Current State Analysis

### Existing Admin Panel (`/admin`)

**Current Features:**
- ✅ View all orders filtered by restaurant
- ✅ Mark orders as done
- ✅ Basic navigation dropdown
- ✅ Real-time order display with items and options
- ✅ Dark mode support

**Current Limitations:**
- ❌ No dashboard overview/analytics
- ❌ No restaurant management UI
- ❌ No courier management UI
- ❌ Basic inline styling (no MUI components)
- ❌ No proper layout structure (sidebar/header)
- ❌ Limited order status management (only "mark as done")
- ❌ No data visualization/charts
- ❌ No search/filter capabilities
- ❌ No pagination for large datasets

**Current Routes:**
```
/admin              - Orders list with basic filters
/admin-test         - Test route (redirects to Start)
/restaurang-vy      - Restaurant view (separate)
/kurir-vy           - Courier view (separate)
```

---

## 🎨 New Admin Dashboard Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (AppBar)                                             │
│  [Logo] [Search] [Notifications] [Profile] [Theme Toggle]   │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Sidebar  │  Main Content Area                                │
│          │                                                   │
│ [Dashboard] │  ┌──────────────────────────────────────┐     │
│ [Orders]    │  │                                        │     │
│ [Restaurants]│  │  Page Content                          │     │
│ [Couriers]  │  │  (Dynamic based on route)              │     │
│ [Analytics] │  │                                        │     │
│ [Settings]  │  └──────────────────────────────────────┘     │
│             │                                                │
└─────────────┴────────────────────────────────────────────────┘
```

---

## 📐 Wireframes

### 1. Dashboard Overview (`/admin/dashboard`)

**Purpose:** High-level metrics and quick access to key features

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Overview                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ 📦 Orders│ │ 💰 Revenue│ │ 🍽️ Restaurants│ │ 🚚 Couriers│  │
│  │  71      │ │ 888,500 kr│ │  2 Active  │ │  1 Active  │  │
│  │ +5 today │ │ +12,500   │ │  0 Pending │ │  3 Idle    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌─────────────────────────────┐│
│  │  Recent Orders          │ │  Activity Chart             ││
│  │  [Order list - 5 items] │ │  [Line chart - last 7 days] ││
│  │                         │ │                             ││
│  └────────────────────────┘ └─────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌─────────────────────────────┐│
│  │  Quick Actions          │ │  System Status              ││
│  │  [+ New Order]          │ │  ✅ Backend: Online          ││
│  │  [+ New Restaurant]     │ │  ✅ Database: Connected      ││
│  │  [+ New Courier]        │ │  ⚠️  Payment: 2 pending      ││
│  └────────────────────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- `StatCard` - Metric cards with icon, value, and change indicator
- `RecentOrders` - Table with latest 5 orders
- `ActivityChart` - Line/Bar chart showing order trends
- `QuickActions` - Action buttons grid
- `SystemStatus` - Status indicators with alerts

---

### 2. Orders Management (`/admin/orders`)

**Purpose:** Complete order lifecycle management

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Orders Management                                           │
├─────────────────────────────────────────────────────────────┤
│  [Search: 🔍____________] [Filter ▼] [Restaurant ▼] [Export]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ID │ Time  │ Restaurant │ Customer │ Status │ Total │ Actions ││
│  ├────┼───────┼────────────┼──────────┼────────┼───────┼─────┤│
│  │ 71 │ 14:30 │ Campino    │ John Doe │ 🟡 Prep│ 250kr│ [👁][✏️]││
│  │ 70 │ 14:15 │ SunSushi   │ Jane     │ ✅ Done│ 180kr│ [👁][✏️]││
│  │... │ ...   │ ...        │ ...      │ ...    │ ...  │ ...  ││
│  └─────────────────────────────────────────────────────────┘│
│  [< Previous] Page 1 of 8 [Next >]                          │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Real-time order list with MUI DataGrid
- ✅ Search by customer name, phone, order ID
- ✅ Filter by status, restaurant, date range
- ✅ Inline status updates via dropdown
- ✅ View order details in modal/drawer
- ✅ Export orders to CSV/PDF
- ✅ Pagination (20 orders per page)
- ✅ Sort by any column

**Status Flow:**
```
pending → received → confirmed → preparing → ready →
picked_up → delivered (or cancelled at any stage)
```

---

### 3. Order Details Modal

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Order #71 Details                              [✕ Close]│
├─────────────────────────────────────────────────────────┤
│  📦 Order Information                                    │
│  Created: 2025-12-03 14:30:15                           │
│  Status: 🟡 Preparing                                    │
│  Restaurant: Campino                                    │
│                                                          │
│  👤 Customer                                             │
│  Name: John Doe                                         │
│  Phone: 070-123 45 67                                   │
│  Address: Storgatan 12, Stockholm                       │
│                                                          │
│  🍕 Items                                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ 1x Pizza Margherita          150 kr             │    │
│  │    + Extra cheese              20 kr             │    │
│  │    + Olives                    15 kr             │    │
│  │ 1x Coca Cola                   25 kr             │    │
│  │                                                  │    │
│  │ Subtotal:                     210 kr             │    │
│  │ Delivery:                      40 kr             │    │
│  │ Total:                        250 kr             │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [Update Status ▼] [Assign Courier ▼] [Print Receipt]  │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Restaurant Management (`/admin/restaurants`)

**Purpose:** CRUD operations for restaurants

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Restaurant Management                     [+ New Restaurant]│
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐ ┌────────────────────┐             │
│  │ 🍕 Campino         │ │ 🍣 SunSushi        │             │
│  │ ─────────────────  │ │ ─────────────────  │             │
│  │ Status: ✅ Active   │ │ Status: ✅ Active   │             │
│  │ Orders: 45 today   │ │ Orders: 26 today   │             │
│  │ Menu Items: 82     │ │ Menu Items: 64     │             │
│  │ Rating: ⭐⭐⭐⭐⭐ 4.8  │ │ Rating: ⭐⭐⭐⭐⭐ 4.6  │             │
│  │                    │ │                    │             │
│  │ [View] [Edit]      │ │ [View] [Edit]      │             │
│  │ [Menu] [Disable]   │ │ [Menu] [Disable]   │             │
│  └────────────────────┘ └────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Grid/Card view of all restaurants
- ✅ Quick stats per restaurant
- ✅ Enable/disable restaurants
- ✅ Edit restaurant details (name, address, phone, email)
- ✅ Manage menu items
- ✅ View restaurant analytics

---

### 5. Restaurant Edit Form

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Edit Restaurant: Campino                      [✕ Close]│
├─────────────────────────────────────────────────────────┤
│  Basic Information                                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Slug:        [campino_________________]          │   │
│  │ Name:        [Campino Pizza & Pasta__]           │   │
│  │ Description: [________________________]          │   │
│  │              [________________________]          │   │
│  │ Phone:       [08-123 456______________]          │   │
│  │ Email:       [info@campino.se_________]          │   │
│  │ Address:     [Storgatan 1, Stockholm__]          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Media                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Logo:   [Upload] [Current: logo.png]             │   │
│  │ Banner: [Upload] [Current: banner.jpg]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Opening Hours                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Monday:    [10:00] - [22:00]  ☑ Open             │   │
│  │ Tuesday:   [10:00] - [22:00]  ☑ Open             │   │
│  │ ...                                               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  [Cancel] [Save Changes]                                │
└─────────────────────────────────────────────────────────┘
```

---

### 6. Courier Management (`/admin/couriers`)

**Purpose:** Manage courier fleet and assignments

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Courier Management                           [+ New Courier]│
├─────────────────────────────────────────────────────────────┤
│  [Search: 🔍____________] [Status ▼] [Vehicle ▼]            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ID │ Name     │ Vehicle │ Status   │ Orders │ Actions   ││
│  ├────┼──────────┼─────────┼──────────┼────────┼───────────┤│
│  │ 1  │ Erik L.  │ 🚴 Bike  │ 🟢 Active │ 12     │ [View][Edit]││
│  │ 2  │ Sara M.  │ 🏍️ Scooter│ 🔴 Offline│ 8      │ [View][Edit]││
│  │ 3  │ Johan K. │ 🚗 Car   │ 🟡 Busy   │ 15     │ [View][Edit]││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  📍 Live Map (if GPS enabled)                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │         [Interactive map showing courier locations]      ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Real-time courier status
- ✅ Vehicle type filtering
- ✅ Availability toggle
- ✅ Order assignment
- ✅ Performance metrics per courier
- 🔜 GPS tracking (Phase 3b)

---

### 7. Analytics Dashboard (`/admin/analytics`)

**Purpose:** Data visualization and insights

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Analytics Dashboard                      [Date Range ▼]    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌─────────────────────────────┐│
│  │  Orders by Hour         │ │  Revenue Trend              ││
│  │  [Bar Chart]            │ │  [Line Chart]               ││
│  │                         │ │                             ││
│  └────────────────────────┘ └─────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌─────────────────────────────┐│
│  │  Top Restaurants        │ │  Popular Items              ││
│  │  1. Campino (45 ord.)   │ │  1. Pizza Margherita (23)   ││
│  │  2. SunSushi (26 ord.)  │ │  2. California Roll (18)    ││
│  │                         │ │  3. Pasta Carbonara (15)    ││
│  └────────────────────────┘ └─────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐ ┌─────────────────────────────┐│
│  │  Order Status Breakdown │ │  Courier Performance        ││
│  │  [Pie Chart]            │ │  [Table with metrics]       ││
│  │                         │ │                             ││
│  └────────────────────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- ✅ Date range filtering
- ✅ Multiple chart types (Line, Bar, Pie, Doughnut)
- ✅ Export charts as images
- ✅ Real-time data updates
- ✅ Customizable dashboards

---

## 🗂️ Component Hierarchy

### Admin Layout Structure

```
AdminLayout (src/layouts/AdminLayout.jsx)
├── AdminHeader (src/components/admin/AdminHeader.jsx)
│   ├── Logo
│   ├── SearchBar
│   ├── NotificationButton
│   ├── ProfileMenu
│   └── ThemeToggle (from Zustand)
│
├── AdminSidebar (src/components/admin/AdminSidebar.jsx)
│   ├── NavigationList
│   │   ├── DashboardMenuItem
│   │   ├── OrdersMenuItem
│   │   ├── RestaurantsMenuItem
│   │   ├── CouriersMenuItem
│   │   ├── AnalyticsMenuItem
│   │   └── SettingsMenuItem
│   └── CollapseButton
│
└── MainContent (src/components/admin/MainContent.jsx)
    └── Outlet (React Router)
        ├── DashboardPage
        ├── OrdersPage
        ├── RestaurantsPage
        ├── CouriersPage
        ├── AnalyticsPage
        └── SettingsPage
```

### Page-Level Components

**DashboardPage** (`/admin/dashboard`)
```
DashboardPage
├── StatCardGrid
│   ├── StatCard (Orders)
│   ├── StatCard (Revenue)
│   ├── StatCard (Restaurants)
│   └── StatCard (Couriers)
├── RecentOrdersCard
│   └── OrdersTable (mini version)
├── ActivityChartCard
│   └── LineChart (recharts)
├── QuickActionsCard
│   └── ActionButtonGrid
└── SystemStatusCard
    └── StatusIndicatorList
```

**OrdersPage** (`/admin/orders`)
```
OrdersPage
├── OrdersToolbar
│   ├── SearchInput
│   ├── StatusFilter
│   ├── RestaurantFilter
│   └── ExportButton
├── OrdersDataGrid (MUI DataGrid)
│   └── Custom columns with actions
├── OrderDetailModal
│   ├── OrderInfo
│   ├── CustomerInfo
│   ├── ItemsList
│   └── ActionButtons
└── Pagination
```

**RestaurantsPage** (`/admin/restaurants`)
```
RestaurantsPage
├── RestaurantsToolbar
│   ├── SearchInput
│   ├── ViewToggle (Grid/List)
│   └── NewRestaurantButton
├── RestaurantsGrid (Grid view)
│   └── RestaurantCard[]
│       ├── RestaurantInfo
│       ├── Stats
│       └── ActionButtons
└── RestaurantEditDialog
    └── RestaurantForm
        ├── BasicInfoSection
        ├── ContactSection
        ├── MediaSection
        └── OpeningHoursSection
```

**CouriersPage** (`/admin/couriers`)
```
CouriersPage
├── CouriersToolbar
│   ├── SearchInput
│   ├── StatusFilter
│   ├── VehicleFilter
│   └── NewCourierButton
├── CouriersDataGrid
│   └── Custom columns with actions
├── CourierMapCard (if GPS enabled)
│   └── InteractiveMap
└── CourierEditDialog
    └── CourierForm
```

**AnalyticsPage** (`/admin/analytics`)
```
AnalyticsPage
├── AnalyticsToolbar
│   ├── DateRangePicker
│   ├── RefreshButton
│   └── ExportButton
├── MetricsGrid
│   ├── OrdersByHourChart
│   ├── RevenueTrendChart
│   ├── TopRestaurantsCard
│   ├── PopularItemsCard
│   ├── OrderStatusPieChart
│   └── CourierPerformanceTable
└── CustomDashboardButton
```

---

## 🛣️ Routing Structure

### New Admin Routes

```javascript
// Current route (will be replaced)
/admin → Orders list only

// New nested routes
/admin
├── /dashboard           → Dashboard overview (default)
├── /orders
│   ├── /               → Orders list
│   ├── /:id            → Order details view
│   └── /new            → Create new order (optional)
├── /restaurants
│   ├── /               → Restaurants grid
│   ├── /:slug          → Restaurant details
│   ├── /:slug/edit     → Edit restaurant
│   ├── /:slug/menu     → Manage menu
│   └── /new            → Create new restaurant
├── /couriers
│   ├── /               → Couriers list
│   ├── /:id            → Courier details
│   ├── /:id/edit       → Edit courier
│   └── /new            → Create new courier
├── /analytics          → Analytics dashboard
└── /settings           → Admin settings
```

### Route Guards

```javascript
<Route path="/admin" element={<RequireAuth role="admin" />}>
  <Route element={<AdminLayout />}>
    <Route index element={<Navigate to="dashboard" />} />
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="orders" element={<OrdersPage />} />
    <Route path="orders/:id" element={<OrderDetailPage />} />
    <Route path="restaurants" element={<RestaurantsPage />} />
    <Route path="restaurants/:slug/edit" element={<RestaurantEditPage />} />
    <Route path="couriers" element={<CouriersPage />} />
    <Route path="analytics" element={<AnalyticsPage />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route>
</Route>
```

---

## 🎨 MUI Theme Configuration

### Component Customizations

**DataGrid:**
```javascript
MuiDataGrid: {
  styleOverrides: {
    root: {
      border: 'none',
      '& .MuiDataGrid-cell:focus': {
        outline: 'none',
      },
    },
  },
  defaultProps: {
    pagination: true,
    pageSize: 20,
    rowsPerPageOptions: [10, 20, 50, 100],
    disableSelectionOnClick: true,
  },
}
```

**Cards:**
```javascript
MuiCard: {
  styleOverrides: {
    root: {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderRadius: '12px',
    },
  },
}
```

**AppBar:**
```javascript
MuiAppBar: {
  styleOverrides: {
    root: {
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    },
  },
}
```

---

## 📊 Data Flow Architecture

### React Query + Zustand Integration

**Data Categories:**

1. **Server State (React Query):**
   - Orders data
   - Restaurants data
   - Couriers data
   - Analytics data
   - Auto-refresh every 60 seconds

2. **Client State (Zustand):**
   - Auth state (user, isAuthenticated)
   - UI state (sidebar collapsed, dark mode)
   - Filter state (selected restaurant, date range)
   - Modal/dialog state

**Example Flow:**

```
User Action (Change order status)
    ↓
Component calls useUpdateOrderStatus()
    ↓
React Query mutation executes
    ↓
API call via Axios client
    ↓
Backend updates database
    ↓
Response returns
    ↓
React Query invalidates ["orders"] cache
    ↓
All components using useOrders() auto-refetch
    ↓
UI updates with new data
```

---

## 🎯 Implementation Priority

### Phase 1: Core Layout (Week 1)
- [ ] Create AdminLayout with sidebar and header
- [ ] Setup nested routing structure
- [ ] Implement responsive sidebar (collapsible)
- [ ] Add navigation menu items
- [ ] Setup route guards

### Phase 2: Dashboard Page (Week 1-2)
- [ ] StatCard component with metrics
- [ ] Recent orders table
- [ ] Activity chart (basic line chart)
- [ ] Quick actions buttons
- [ ] System status indicators

### Phase 3: Orders Management (Week 2)
- [ ] Orders list with MUI DataGrid
- [ ] Search and filter functionality
- [ ] Order detail modal
- [ ] Status update workflow
- [ ] Export functionality

### Phase 4: Restaurant Management (Week 3)
- [ ] Restaurants grid view
- [ ] Restaurant edit form
- [ ] Menu management (basic)
- [ ] Enable/disable functionality

### Phase 5: Courier Management (Week 3)
- [ ] Couriers list with DataGrid
- [ ] Courier edit form
- [ ] Availability toggle
- [ ] Performance metrics

### Phase 6: Analytics (Week 4)
- [ ] Charts integration (recharts or Chart.js)
- [ ] Date range filtering
- [ ] Multiple visualizations
- [ ] Export functionality

---

## 🔄 Migration Strategy

### From Current to New Admin Panel

**Step 1: Parallel Development**
- Keep `/admin` route working (old panel)
- Develop new panel at `/admin-v2` or `/admin/dashboard`
- Test thoroughly with real data

**Step 2: Feature Parity**
- Ensure new panel has all features of old panel
- Add migration guide for admin users
- Setup A/B testing if needed

**Step 3: Cutover**
- Redirect `/admin` → `/admin/dashboard`
- Keep old panel as `/admin-legacy` for 1 sprint
- Monitor for issues

**Step 4: Cleanup**
- Remove old AdminPanel.jsx
- Update documentation
- Clean up unused code

---

## 📝 Design Tokens

### Spacing
```javascript
spacing: {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
}
```

### Breakpoints
```javascript
breakpoints: {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
}
```

### Sidebar Width
```javascript
sidebarWidth: {
  expanded: 240,
  collapsed: 64,
}
```

---

## 🎉 Success Criteria

Phase 1.1.4 is complete when:

- ✅ All wireframes documented
- ✅ Component hierarchy defined
- ✅ Routing structure planned
- ✅ Data flow architecture documented
- ✅ MUI theme customizations specified
- ✅ Implementation priority established
- ✅ Migration strategy defined

---

**Next Phase:** 1.1.5 - Design Review & Approval

**Document Created:** 2025-12-03
**Last Updated:** 2025-12-03
**Author:** Claude AI + macfatty
