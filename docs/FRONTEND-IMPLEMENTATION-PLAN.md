# 🎯 FRONTEND IMPLEMENTATION PLAN - ANNOS FOOD DELIVERY

**Skapad:** 2025-12-02
**Status:** Planering
**Uppdaterad:** 2025-12-02

---

## 📋 INNEHÅLLSFÖRTECKNING

1. [Projektöversikt](#projektöversikt)
2. [Teknisk Stack](#teknisk-stack)
3. [Phase 1: Admin Dashboard](#phase-1-admin-dashboard)
4. [Phase 2: Restaurant Dashboard](#phase-2-restaurant-dashboard)
5. [Phase 3: Courier Interface](#phase-3-courier-interface)
6. [Phase 4: Customer Ordering](#phase-4-customer-ordering)
7. [Phase 5: Real-time Features](#phase-5-real-time-features)
8. [Phase 6: Mobile Apps](#phase-6-mobile-apps)
9. [Dokumentation Guidelines](#dokumentation-guidelines)
10. [Appendix](#appendix)

---

## 📊 PROJEKTÖVERSIKT

### Nuläge
- ✅ Backend komplett (alla PHASE 3B features mergade till main)
- ✅ CI/CD pipeline fungerande (100% success rate)
- ✅ 9/9 backend tests passing
- ✅ 0 säkerhetssårbarheter
- ⚠️ Frontend har grundläggande struktur men minimal funktionalitet

### Mål
Bygga en fullständig, production-ready frontend för alla användare:
- Admin (systemadministratörer)
- Restaurant (restaurangägare och personal)
- Courier (budbärare)
- Customer (slutkunder)

### Framgångskriterier
- Alla backend APIs integrerade
- Real-time updates via WebSocket
- Responsiv design (mobil, tablet, desktop)
- WCAG 2.1 accessibility compliance
- 80%+ test coverage
- < 3s Time to Interactive
- Production deployed och stabilt

---

## 🛠️ TEKNISK STACK

### Nuvarande Stack (Bekräftat)
```json
{
  "framework": "React 18+",
  "build": "Vite",
  "routing": "React Router",
  "styling": "CSS (behöver bestämma bibliotek)"
}
```

### Föreslagna Tillägg

#### UI Component Library
**Alternativ:**
1. **Material-UI (MUI)** - Mest populär, omfattande
2. **Ant Design** - Bra för admin dashboards
3. **Chakra UI** - Modern, accessibility-först
4. **Shadcn/ui** - Minimalistisk, Tailwind-baserad

**Rekommendation:** Material-UI (MUI) för snabb utveckling

#### State Management
**Alternativ:**
1. **Zustand** - Enkel, modern, liten bundle
2. **Redux Toolkit** - Etablerad, omfattande
3. **Context API** - Built-in, enkel för små appar
4. **Jotai** - Atomic, flexibel

**Rekommendation:** Zustand för enkelhet och prestanda

#### Data Fetching
**Alternativ:**
1. **TanStack Query (React Query)** - Best practice, caching, auto-refetch
2. **SWR** - Enkel, Vercel-gjord
3. **Native fetch + useEffect** - Grundläggande

**Rekommendation:** TanStack Query för robust data management

#### Form Handling
**Alternativ:**
1. **React Hook Form** - Prestanda-fokuserad, enkel validering
2. **Formik** - Etablerad, feature-rich

**Rekommendation:** React Hook Form + Zod för validering

#### Charts & Visualization
**Alternativ:**
1. **Recharts** - React-native, komposibel
2. **Chart.js** - Populär, feature-rich
3. **D3.js** - Kraftfull, komplex

**Rekommendation:** Recharts för balans mellan kraft och enkelhet

#### Maps
**Alternativ:**
1. **Leaflet + React-Leaflet** - Open source, gratis
2. **Google Maps** - Kraftfull, kostar pengar
3. **Mapbox** - Modern, flexibel, gratis tier

**Rekommendation:** Leaflet för gratis och flexibilitet

#### Testing
```json
{
  "unit": "Vitest + React Testing Library",
  "e2e": "Playwright",
  "accessibility": "axe-core"
}
```

### Slutgiltig Tech Stack
```javascript
// Dependencies
{
  // Core
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",

  // UI
  "@mui/material": "^5.x",
  "@mui/icons-material": "^5.x",
  "@emotion/react": "^11.x",
  "@emotion/styled": "^11.x",

  // State & Data
  "zustand": "^4.x",
  "@tanstack/react-query": "^5.x",
  "axios": "^1.x",

  // Forms
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "@hookform/resolvers": "^3.x",

  // Charts
  "recharts": "^2.x",

  // Maps
  "leaflet": "^1.x",
  "react-leaflet": "^4.x",

  // WebSocket
  "socket.io-client": "^4.x",

  // Utils
  "date-fns": "^3.x",
  "clsx": "^2.x",
  "lodash": "^4.x",

  // Notifications
  "react-hot-toast": "^2.x"
}
```

---

## 🎯 PHASE 1: ADMIN DASHBOARD

**Prioritet:** HÖGST
**Estimerad tid:** 4-6 veckor
**Status:** Planerad

### Översikt
Admin dashboard är den mest kritiska delen av systemet. Den ger administratörer fullständig kontroll över:
- Order management
- Restaurant management
- Courier management
- Analytics & reporting
- System performance monitoring

---

### PHASE 1.1: Design & Architecture Review

#### 1.1.1: Design System Audit
**Mål:** Analysera befintlig frontend och planera design system

**Uppgifter:**
- [ ] Granska befintliga komponenter i `frontend/src/components/`
- [ ] Dokumentera nuvarande färgpalett och typografi
- [ ] Identifiera vilket (om något) UI-bibliotek används
- [ ] Verifiera React och Vite version
- [ ] Kontrollera responsive design capabilities
- [ ] Granska accessibility features (ARIA labels, keyboard nav, etc)

**Frågor att besvara:**
1. Vilket UI-bibliotek använder vi nu? (eller ingen?)
2. Finns det ett etablerat design system?
3. Vilka färger används för primary, secondary, error, success?
4. Vilka typsnitt används?
5. Finns det breakpoints för responsiv design?
6. Följer vi någon design standard? (Material Design, iOS HIG, etc)

**Deliverables:**
- `DESIGN_AUDIT_REPORT.md` - Rapport med nuläge och rekommendationer
- Design system decision (vilket UI-bibliotek att använda)

**Tid:** 1-2 dagar

---

#### 1.1.2: API Compatibility Check
**Mål:** Verifiera att backend APIs är redo för frontend integration

**Kritiska API Endpoints för Admin:**

**Auth APIs:**
```
POST   /api/auth/login          - Admin login
POST   /api/auth/logout         - Logout
GET    /api/auth/profile        - Get user profile
POST   /api/auth/refresh        - Refresh token
```

**Order Management APIs:**
```
GET    /api/admin/orders                - List orders (filter, pagination)
GET    /api/admin/orders/today          - Today's orders
GET    /api/admin/orders/:id            - Order details
PUT    /api/admin/orders/:id/status     - Update order status
DELETE /api/admin/orders/:id            - Cancel order
```

**Restaurant Management APIs:**
```
GET    /api/admin/restaurants           - List restaurants
POST   /api/admin/restaurants           - Create restaurant
GET    /api/admin/restaurants/:id       - Restaurant details
PUT    /api/admin/restaurants/:id       - Update restaurant
DELETE /api/admin/restaurants/:id       - Delete restaurant
GET    /api/admin/restaurants/:id/menu  - Get restaurant menu
```

**Courier Management APIs:**
```
GET    /api/couriers                    - List couriers
POST   /api/couriers                    - Create courier
GET    /api/couriers/:id                - Courier details
PUT    /api/couriers/:id                - Update courier
DELETE /api/couriers/:id                - Delete courier
GET    /api/couriers/:id/location       - Get courier GPS location
GET    /api/couriers/locations          - All courier locations
```

**Analytics APIs:**
```
GET    /api/analytics/dashboard         - Dashboard summary
GET    /api/analytics/system            - System statistics
GET    /api/analytics/revenue           - Revenue metrics
GET    /api/analytics/activity          - Activity by hour
GET    /api/analytics/leaderboard       - Courier leaderboard
POST   /api/analytics/refresh           - Refresh materialized views
```

**Performance APIs:**
```
GET    /api/performance/dashboard       - Performance summary
GET    /api/performance/snapshots       - Performance snapshots
GET    /api/performance/snapshots/latest - Latest snapshot
GET    /api/performance/trends          - Performance trends
GET    /api/performance/alerts          - Active alerts
POST   /api/performance/alerts          - Create alert
PUT    /api/performance/alerts/:id      - Update alert
DELETE /api/performance/alerts/:id      - Delete alert
GET    /api/performance/alerts/history  - Alert history
```

**Testing Tasks:**
- [ ] Test varje endpoint med cURL eller Postman
- [ ] Verifiera response format (JSON structure)
- [ ] Testa error responses (400, 401, 403, 404, 500)
- [ ] Verifiera authentication flow (JWT tokens)
- [ ] Kontrollera CORS-inställningar från frontend URL
- [ ] Testa pagination, filtering, sorting
- [ ] Dokumentera request/response format för varje endpoint

**Deliverables:**
- `API_COMPATIBILITY_REPORT.md` - Detaljerad rapport med test-resultat
- `API_REFERENCE.md` - Quick reference för frontend developers
- Lista över eventuella API-buggar eller förbättringar behövs

**Tid:** 2-3 dagar

---

#### 1.1.3: Component Architecture Design
**Mål:** Designa komponentstruktur för admin dashboard

**Föreslagen Mappstruktur:**
```
frontend/src/
│
├── pages/
│   └── admin/
│       ├── Dashboard.jsx              # Main overview page
│       ├── Orders/
│       │   ├── OrdersPage.jsx         # Order list page
│       │   ├── OrderDetailsModal.jsx  # Order details modal
│       │   └── OrderFilters.jsx       # Filter component
│       ├── Restaurants/
│       │   ├── RestaurantsPage.jsx
│       │   ├── RestaurantForm.jsx     # Create/Edit form
│       │   └── RestaurantDetails.jsx
│       ├── Couriers/
│       │   ├── CouriersPage.jsx
│       │   ├── CourierForm.jsx
│       │   ├── CourierMap.jsx         # GPS map
│       │   └── CourierDetails.jsx
│       ├── Analytics/
│       │   ├── AnalyticsPage.jsx
│       │   ├── RevenueChart.jsx
│       │   ├── ActivityChart.jsx
│       │   └── LeaderboardTable.jsx
│       └── Performance/
│           ├── PerformancePage.jsx
│           ├── MetricsChart.jsx
│           ├── AlertsPanel.jsx
│           └── AlertForm.jsx
│
├── components/
│   ├── admin/
│   │   ├── orders/
│   │   │   ├── OrderCard.jsx          # Individual order card
│   │   │   ├── OrderList.jsx          # List of orders
│   │   │   ├── OrderStatusBadge.jsx   # Status indicator
│   │   │   └── OrderTimeline.jsx      # Status timeline
│   │   ├── restaurants/
│   │   │   ├── RestaurantCard.jsx
│   │   │   ├── RestaurantGrid.jsx
│   │   │   └── RestaurantStatus.jsx
│   │   ├── couriers/
│   │   │   ├── CourierCard.jsx
│   │   │   ├── CourierList.jsx
│   │   │   ├── CourierMarker.jsx      # Map marker
│   │   │   └── CourierStats.jsx
│   │   ├── stats/
│   │   │   ├── StatsCard.jsx          # Metric card
│   │   │   ├── StatsGrid.jsx
│   │   │   └── TrendIndicator.jsx
│   │   └── layout/
│   │       ├── AdminLayout.jsx        # Admin page layout
│   │       ├── AdminSidebar.jsx       # Navigation sidebar
│   │       └── AdminHeader.jsx        # Top header
│   │
│   └── common/
│       ├── DataTable.jsx              # Reusable table
│       ├── Modal.jsx                  # Modal dialog
│       ├── ConfirmDialog.jsx          # Confirmation dialog
│       ├── LoadingSpinner.jsx         # Loading indicator
│       ├── ErrorBoundary.jsx          # Error handling
│       ├── EmptyState.jsx             # Empty state
│       ├── ErrorMessage.jsx           # Error display
│       ├── SuccessMessage.jsx         # Success display
│       ├── Pagination.jsx             # Pagination controls
│       ├── SearchBar.jsx              # Search input
│       ├── DateRangePicker.jsx        # Date range selector
│       └── StatusBadge.jsx            # Generic status badge
│
├── services/
│   ├── api/
│   │   ├── client.js                  # Axios client with interceptors
│   │   ├── auth.js                    # Auth API calls
│   │   ├── orders.js                  # Order API calls
│   │   ├── restaurants.js             # Restaurant API calls
│   │   ├── couriers.js                # Courier API calls
│   │   ├── analytics.js               # Analytics API calls
│   │   └── performance.js             # Performance API calls
│   └── websocket/
│       └── socket.js                  # WebSocket client
│
├── hooks/
│   ├── useAuth.js                     # Auth hook
│   ├── useOrders.js                   # Order management hook
│   ├── useRestaurants.js              # Restaurant management hook
│   ├── useCouriers.js                 # Courier management hook
│   ├── useAnalytics.js                # Analytics data hook
│   ├── usePerformance.js              # Performance data hook
│   ├── useWebSocket.js                # WebSocket hook
│   ├── usePagination.js               # Pagination logic
│   └── useFilters.js                  # Filter logic
│
├── store/
│   ├── authStore.js                   # Auth state (Zustand)
│   ├── orderStore.js                  # Order state
│   ├── notificationStore.js           # Notifications state
│   └── index.js                       # Store exports
│
├── utils/
│   ├── formatters.js                  # Data formatting (dates, currency, etc)
│   ├── validators.js                  # Input validation
│   ├── constants.js                   # Constants
│   └── helpers.js                     # Helper functions
│
├── constants/
│   ├── orderStatus.js                 # Order status constants
│   ├── courierStatus.js               # Courier status constants
│   ├── apiEndpoints.js                # API endpoint constants
│   └── routes.js                      # Route constants
│
└── config/
    ├── api.js                         # API configuration
    ├── theme.js                       # MUI theme configuration
    └── queryClient.js                 # React Query configuration
```

**Komponent Design Principer:**
1. **Single Responsibility** - Varje komponent gör EN sak
2. **Reusability** - Common components återanvänds
3. **Composability** - Små komponenter bygger större
4. **Props-driven** - All data via props, ingen global state i komponenter
5. **Accessibility First** - ARIA labels, keyboard nav, focus management

**Tekniska Beslut:**

**State Management:** Zustand
```javascript
// Exempel: authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
```

**Data Fetching:** TanStack Query
```javascript
// Exempel: useOrders.js
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../services/api/orders';

export const useOrders = (filters) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersApi.getOrders(filters),
    staleTime: 30000, // 30 seconds
  });
};
```

**Forms:** React Hook Form + Zod
```javascript
// Exempel: RestaurantForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const restaurantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  email: z.string().email('Invalid email'),
});

export const RestaurantForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(restaurantSchema),
  });

  // ...
};
```

**Deliverables:**
- `COMPONENT_ARCHITECTURE.md` - Detaljerad komponentstruktur
- `TECH_STACK_DECISIONS.md` - Dokumenterade tekniska val
- Diagrammen över komponenthierarki
- Kodexempel för patterns

**Tid:** 2-3 dagar

---

#### 1.1.4: Wireframes & UI Mockups
**Mål:** Visualisera UI innan implementation

**Sidor att designa:**

**1. Dashboard Overview (Startsida)**
```
┌─────────────────────────────────────────────────────┐
│ [Logo]  Dashboard          [Notifications] [Profile]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 Today's Metrics                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐    │
│  │ Orders   │ Revenue  │ Couriers │ Avg Time │    │
│  │   45     │ 12,450kr │    8     │  23 min  │    │
│  └──────────┴──────────┴──────────┴──────────┘    │
│                                                     │
│  📋 Recent Orders                [View All]         │
│  ┌─────────────────────────────────────────────┐  │
│  │ #1234  Pizza Restaurant  Preparing  15:30   │  │
│  │ #1235  Sushi Bar        Ready      15:25   │  │
│  │ #1236  Burger Joint     Delivered  15:20   │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ⚠️  Active Alerts                                  │
│  ┌─────────────────────────────────────────────┐  │
│  │ High order volume - Consider adding couriers│  │
│  │ Response time above threshold: 28 min       │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**2. Orders Page**
```
┌─────────────────────────────────────────────────────┐
│ Orders Management                                    │
├─────────────────────────────────────────────────────┤
│ [Search...] [Status ▼] [Restaurant ▼] [Date ▼]     │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ #1234  │ Pizza Resto │ Preparing │ 15:30 [▶]  │ │
│ │ #1235  │ Sushi Bar   │ Ready     │ 15:25 [▶]  │ │
│ │ #1236  │ Burger Joint│ Delivered │ 15:20 [▶]  │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [← Prev]  Page 1 of 10  [Next →]                   │
└─────────────────────────────────────────────────────┘

Order Details Modal:
┌─────────────────────────────────────┐
│ Order #1234               [X Close] │
├─────────────────────────────────────┤
│ Customer: John Doe                  │
│ Restaurant: Pizza Restaurant        │
│ Courier: Jane Smith                 │
│ Status: [Preparing ▼]  [Update]     │
│                                     │
│ Items:                              │
│ - Margherita Pizza x2  200kr       │
│ - Garlic Bread x1      50kr        │
│                                     │
│ Total: 250kr                        │
│                                     │
│ Timeline:                           │
│ ✓ Ordered    15:20                 │
│ ✓ Confirmed  15:22                 │
│ → Preparing  15:25                 │
│   Ready                            │
│   Picked Up                        │
│   Delivered                        │
└─────────────────────────────────────┘
```

**3. Restaurants Page**
```
┌─────────────────────────────────────────────────────┐
│ Restaurant Management          [+ Add Restaurant]    │
├─────────────────────────────────────────────────────┤
│ [Search...]  [Active ▼]                             │
│                                                      │
│ ┌──────────┬──────────┬──────────┬──────────┐      │
│ │ 🍕       │ 🍣       │ 🍔       │ 🌮       │      │
│ │ Pizza    │ Sushi Bar│ Burgers  │ Tacos    │      │
│ │ Active   │ Active   │ Inactive │ Active   │      │
│ │ [Edit]   │ [Edit]   │ [Edit]   │ [Edit]   │      │
│ └──────────┴──────────┴──────────┴──────────┘      │
└─────────────────────────────────────────────────────┘
```

**4. Couriers Page**
```
┌─────────────────────────────────────────────────────┐
│ Courier Management                [+ Add Courier]    │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Left: Courier List            Right: Map            │
│ ┌────────────────┐  ┌──────────────────────────┐  │
│ │ Jane Smith     │  │                          │  │
│ │ 🟢 Available   │  │    📍 📍                 │  │
│ │ 45 deliveries  │  │           📍             │  │
│ │ [Details]      │  │  📍                      │  │
│ │                │  │        📍                │  │
│ │ John Doe       │  │                          │  │
│ │ 🟡 Busy        │  │                          │  │
│ │ 32 deliveries  │  │                          │  │
│ │ [Details]      │  │                          │  │
│ └────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**5. Analytics Page**
```
┌─────────────────────────────────────────────────────┐
│ Analytics & Reports                                  │
├─────────────────────────────────────────────────────┤
│ [Today] [Week] [Month] [Custom Range]               │
│                                                      │
│ Revenue Over Time                                    │
│ ┌─────────────────────────────────────────────────┐│
│ │         📈                                       ││
│ │    /\  /  \                                      ││
│ │   /  \/    \    /\                               ││
│ │  /           \  /  \                             ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ Top Performers              System Stats            │
│ ┌─────────────────┐       ┌─────────────────────┐ │
│ │ 1. Jane Smith   │       │ Total Orders: 1,234  │ │
│ │    123 orders   │       │ Avg Delivery: 25min  │ │
│ │ 2. John Doe     │       │ Success Rate: 98%    │ │
│ │    98 orders    │       │                      │ │
│ └─────────────────┘       └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**6. Performance Page**
```
┌─────────────────────────────────────────────────────┐
│ Performance Monitoring                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Current Metrics              Trend                  │
│ ┌──────────────────┐        ┌────────────────┐    │
│ │ Orders/Hour: 12  │        │    📈          │    │
│ │ Avg Response: 3s │        │   /            │    │
│ │ Active Users: 45 │        │  /             │    │
│ └──────────────────┘        └────────────────┘    │
│                                                      │
│ ⚠️  Active Alerts                                   │
│ ┌─────────────────────────────────────────────────┐│
│ │ High response time: 5.2s (threshold: 5s)        ││
│ │ [Dismiss] [View Details]                        ││
│ └─────────────────────────────────────────────────┘│
│                                                      │
│ Alert Configuration              [+ New Alert]      │
│ ┌─────────────────────────────────────────────────┐│
│ │ Response Time > 5s - Email admin                ││
│ │ Orders/Hour > 20 - Notify operations            ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Wireframe Tools:**
- Figma (rekommenderat - gratis, kollaborativt)
- Excalidraw (snabba sketches)
- Pen & paper (initial sketches)

**Design Specifications att dokumentera:**
- Color palette (primary, secondary, error, warning, success, info)
- Typography (font family, sizes, weights)
- Spacing system (8px grid)
- Border radius
- Shadow levels
- Icon set (Material Icons)
- Responsive breakpoints (mobile: 0-600px, tablet: 600-960px, desktop: 960px+)

**Deliverables:**
- Wireframes för alla 6 sidor (low-fidelity)
- High-fidelity mockups för kritiska sidor
- `DESIGN_SYSTEM.md` - Dokumenterad design system
- Figma-fil (eller liknande) delbar med teamet

**Tid:** 3-4 dagar

---

#### 1.1.5: Design Review & Approval
**Mål:** Godkänn design innan kodning börjar

**Review Checklist:**

**Funktionalitet:**
- [ ] Täcker designen alla use cases?
- [ ] Är navigation intuitiv?
- [ ] Är critical actions lättåtkomliga?
- [ ] Är information hierarchy tydlig?

**Användbarhet:**
- [ ] Kan användare hitta vad de letar efter?
- [ ] Är formulär enkla att fylla i?
- [ ] Är error states tydliga?
- [ ] Finns success feedback?

**Responsivitet:**
- [ ] Fungerar designen på mobil?
- [ ] Fungerar designen på tablet?
- [ ] Fungerar designen på desktop?
- [ ] Är touch targets tillräckligt stora på mobil? (min 44x44px)

**Accessibility:**
- [ ] Är färgkontrasten tillräcklig? (WCAG AA: 4.5:1 för text)
- [ ] Är textstorlek läsbar? (min 16px för body text)
- [ ] Är interaktiva element tydligt märkta?
- [ ] Kan man navigera med keyboard?
- [ ] Finns focus indicators?
- [ ] Är ARIA labels planerade?

**Prestanda:**
- [ ] Är bildstorlekar optimerade?
- [ ] Är komponentstrukturen effektiv?
- [ ] Planeras lazy loading?

**Konsistens:**
- [ ] Är design konsekvent över alla sidor?
- [ ] Följer komponenter design systemet?
- [ ] Är spacing konsekvent?
- [ ] Är färger använda konsekvent?

**Stakeholder Review:**
- [ ] Product owner godkänner
- [ ] Tech lead godkänner
- [ ] UX designer godkänner (om finns)
- [ ] Eventuella användare testat prototyp

**Deliverables:**
- Design approval dokument
- Lista över eventuella ändringar behövs
- Godkänd design specification redo för implementation

**Tid:** 1 dag

---

### PHASE 1.2: Development Environment Setup

#### 1.2.1: Dependencies Installation
**Mål:** Installera alla nödvändiga npm packages

**Installation Commands:**
```bash
# Navigate to frontend directory
cd /home/macfatty/foodie/Annos/frontend

# UI Component Library - Material-UI
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

# State Management - Zustand
npm install zustand

# Data Fetching - TanStack Query
npm install @tanstack/react-query @tanstack/react-query-devtools

# HTTP Client - Axios
npm install axios

# Forms - React Hook Form + Zod
npm install react-hook-form zod @hookform/resolvers

# Charts - Recharts
npm install recharts

# Maps - Leaflet
npm install leaflet react-leaflet

# Date handling - date-fns
npm install date-fns

# WebSocket - Socket.io Client
npm install socket.io-client

# Notifications - React Hot Toast
npm install react-hot-toast

# Utils
npm install clsx lodash

# Dev Dependencies - Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Dev Dependencies - Types (if using TypeScript)
npm install -D @types/leaflet

# Dev Dependencies - Linting
npm install -D eslint-plugin-jsx-a11y
```

**Verification Steps:**
- [ ] `npm install` runs without errors
- [ ] `npm run dev` starts dev server successfully
- [ ] No dependency conflicts
- [ ] `npm audit` shows 0 vulnerabilities (or only low-severity)
- [ ] package.json and package-lock.json committed to git

**Deliverables:**
- Updated `package.json`
- Updated `package-lock.json`
- `DEPENDENCIES.md` - Dokumentation av varför varje package valdes

**Tid:** 0.5 dag

---

#### 1.2.2: Project Structure Setup
**Mål:** Skapa mappstruktur och boilerplate files

**Commands:**
```bash
cd /home/macfatty/foodie/Annos/frontend/src

# Create directory structure
mkdir -p pages/admin/{Orders,Restaurants,Couriers,Analytics,Performance}
mkdir -p components/admin/{orders,restaurants,couriers,stats,layout}
mkdir -p components/common
mkdir -p services/api
mkdir -p services/websocket
mkdir -p hooks
mkdir -p store
mkdir -p utils
mkdir -p constants
mkdir -p config
mkdir -p __tests__/components
mkdir -p __tests__/hooks
mkdir -p __tests__/services
```

**Create Configuration Files:**

`src/config/api.js`:
```javascript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  WS_URL: import.meta.env.VITE_WS_URL || 'http://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
};
```

`src/config/theme.js`:
```javascript
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue
    },
    secondary: {
      main: '#dc004e', // Pink
    },
    success: {
      main: '#4caf50', // Green
    },
    warning: {
      main: '#ff9800', // Orange
    },
    error: {
      main: '#f44336', // Red
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500 },
  },
  spacing: 8, // Base spacing unit
});
```

`src/config/queryClient.js`:
```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Create Constants Files:**

`src/constants/orderStatus.js`:
```javascript
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'warning',
  [ORDER_STATUS.CONFIRMED]: 'info',
  [ORDER_STATUS.PREPARING]: 'info',
  [ORDER_STATUS.READY]: 'success',
  [ORDER_STATUS.PICKED_UP]: 'primary',
  [ORDER_STATUS.DELIVERED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'error',
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.PREPARING]: 'Preparing',
  [ORDER_STATUS.READY]: 'Ready for Pickup',
  [ORDER_STATUS.PICKED_UP]: 'Picked Up',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
};
```

`src/constants/courierStatus.js`:
```javascript
export const COURIER_STATUS = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
};

export const COURIER_STATUS_COLORS = {
  [COURIER_STATUS.AVAILABLE]: 'success',
  [COURIER_STATUS.BUSY]: 'warning',
  [COURIER_STATUS.OFFLINE]: 'default',
};
```

`src/constants/routes.js`:
```javascript
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_RESTAURANTS: '/admin/restaurants',
  ADMIN_COURIERS: '/admin/couriers',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_PERFORMANCE: '/admin/performance',

  // Restaurant
  RESTAURANT_DASHBOARD: '/restaurant',
  RESTAURANT_ORDERS: '/restaurant/orders',
  RESTAURANT_MENU: '/restaurant/menu',

  // Courier
  COURIER_DASHBOARD: '/courier',
  COURIER_DELIVERIES: '/courier/deliveries',

  // Customer
  CUSTOMER_HOME: '/customer',
  CUSTOMER_RESTAURANTS: '/customer/restaurants',
  CUSTOMER_ORDERS: '/customer/orders',
};
```

**Update vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

**Create .env files:**

`.env.development`:
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

`.env.production`:
```
VITE_API_URL=https://api.annos.se
VITE_WS_URL=https://api.annos.se
```

**Deliverables:**
- Complete directory structure
- All configuration files created
- Constants defined
- Path aliases configured
- Environment variables setup

**Tid:** 1 dag

---

#### 1.2.3: API Service Layer
**Mål:** Implementera alla API calls

**Create API Client:**

`src/services/api/client.js`:
```javascript
import axios from 'axios';
import { API_CONFIG } from '@config/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  withCredentials: true, // For cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Handle different error types
    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        useAuthStore.getState().logout();
        window.location.href = '/login';
        toast.error('Session expired. Please login again.');
        break;
      case 403:
        toast.error('You do not have permission to perform this action.');
        break;
      case 404:
        toast.error('Resource not found.');
        break;
      case 500:
        toast.error('Server error. Please try again later.');
        break;
      default:
        toast.error(message || 'An error occurred.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

**Create Service Files:**

`src/services/api/auth.js`:
```javascript
import apiClient from './client';

export const authApi = {
  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/api/auth/profile');
    return response.data;
  },

  refreshToken: async () => {
    const response = await apiClient.post('/api/auth/refresh');
    return response.data;
  },
};
```

`src/services/api/orders.js`:
```javascript
import apiClient from './client';

export const ordersApi = {
  // Get orders with filters
  getOrders: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(`/api/admin/orders?${params}`);
    return response.data;
  },

  // Get today's orders
  getTodayOrders: async (slug = null) => {
    const params = slug ? `?slug=${slug}` : '';
    const response = await apiClient.get(`/api/admin/orders/today${params}`);
    return response.data;
  },

  // Get order by ID
  getOrderById: async (id) => {
    const response = await apiClient.get(`/api/admin/orders/${id}`);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (id, status) => {
    const response = await apiClient.put(`/api/admin/orders/${id}/status`, { status });
    return response.data;
  },

  // Cancel order
  cancelOrder: async (id) => {
    const response = await apiClient.delete(`/api/admin/orders/${id}`);
    return response.data;
  },
};
```

`src/services/api/restaurants.js`:
```javascript
import apiClient from './client';

export const restaurantsApi = {
  getRestaurants: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(`/api/admin/restaurants?${params}`);
    return response.data;
  },

  getRestaurantById: async (id) => {
    const response = await apiClient.get(`/api/admin/restaurants/${id}`);
    return response.data;
  },

  createRestaurant: async (data) => {
    const response = await apiClient.post('/api/admin/restaurants', data);
    return response.data;
  },

  updateRestaurant: async (id, data) => {
    const response = await apiClient.put(`/api/admin/restaurants/${id}`, data);
    return response.data;
  },

  deleteRestaurant: async (id) => {
    const response = await apiClient.delete(`/api/admin/restaurants/${id}`);
    return response.data;
  },

  getRestaurantMenu: async (id) => {
    const response = await apiClient.get(`/api/admin/restaurants/${id}/menu`);
    return response.data;
  },
};
```

`src/services/api/couriers.js`:
```javascript
import apiClient from './client';

export const couriersApi = {
  getCouriers: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(`/api/couriers?${params}`);
    return response.data;
  },

  getCourierById: async (id) => {
    const response = await apiClient.get(`/api/couriers/${id}`);
    return response.data;
  },

  createCourier: async (data) => {
    const response = await apiClient.post('/api/couriers', data);
    return response.data;
  },

  updateCourier: async (id, data) => {
    const response = await apiClient.put(`/api/couriers/${id}`, data);
    return response.data;
  },

  deleteCourier: async (id) => {
    const response = await apiClient.delete(`/api/couriers/${id}`);
    return response.data;
  },

  getCourierLocation: async (id) => {
    const response = await apiClient.get(`/api/couriers/${id}/location`);
    return response.data;
  },

  getAllCourierLocations: async () => {
    const response = await apiClient.get('/api/couriers/locations');
    return response.data;
  },
};
```

`src/services/api/analytics.js`:
```javascript
import apiClient from './client';

export const analyticsApi = {
  getDashboard: async () => {
    const response = await apiClient.get('/api/analytics/dashboard');
    return response.data;
  },

  getSystemStats: async () => {
    const response = await apiClient.get('/api/analytics/system');
    return response.data;
  },

  getRevenueMetrics: async (startDate, endDate) => {
    const params = new URLSearchParams({ startDate, endDate }).toString();
    const response = await apiClient.get(`/api/analytics/revenue?${params}`);
    return response.data;
  },

  getActivityByHour: async () => {
    const response = await apiClient.get('/api/analytics/activity');
    return response.data;
  },

  getLeaderboard: async (limit = 10) => {
    const response = await apiClient.get(`/api/analytics/leaderboard?limit=${limit}`);
    return response.data;
  },

  refreshAnalytics: async () => {
    const response = await apiClient.post('/api/analytics/refresh');
    return response.data;
  },
};
```

`src/services/api/performance.js`:
```javascript
import apiClient from './client';

export const performanceApi = {
  getDashboard: async () => {
    const response = await apiClient.get('/api/performance/dashboard');
    return response.data;
  },

  getSnapshots: async (limit = 50) => {
    const response = await apiClient.get(`/api/performance/snapshots?limit=${limit}`);
    return response.data;
  },

  getLatestSnapshot: async () => {
    const response = await apiClient.get('/api/performance/snapshots/latest');
    return response.data;
  },

  getTrends: async (hours = 24) => {
    const response = await apiClient.get(`/api/performance/trends?hours=${hours}`);
    return response.data;
  },

  getAlerts: async () => {
    const response = await apiClient.get('/api/performance/alerts');
    return response.data;
  },

  createAlert: async (data) => {
    const response = await apiClient.post('/api/performance/alerts', data);
    return response.data;
  },

  updateAlert: async (id, data) => {
    const response = await apiClient.put(`/api/performance/alerts/${id}`, data);
    return response.data;
  },

  deleteAlert: async (id) => {
    const response = await apiClient.delete(`/api/performance/alerts/${id}`);
    return response.data;
  },

  getAlertHistory: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(`/api/performance/alerts/history?${params}`);
    return response.data;
  },
};
```

**Create WebSocket Service:**

`src/services/websocket/socket.js`:
```javascript
import io from 'socket.io-client';
import { API_CONFIG } from '@config/api';
import { useAuthStore } from '@/store/authStore';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    const token = useAuthStore.getState().token;

    this.socket = io(API_CONFIG.WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) return;

    this.socket.on(event, callback);

    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);

    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  removeAllListeners(event) {
    if (!this.socket) return;

    this.socket.removeAllListeners(event);
    this.listeners.delete(event);
  }
}

export const socketService = new SocketService();
```

**Create Index File:**

`src/services/api/index.js`:
```javascript
export { authApi } from './auth';
export { ordersApi } from './orders';
export { restaurantsApi } from './restaurants';
export { couriersApi } from './couriers';
export { analyticsApi } from './analytics';
export { performanceApi } from './performance';
export { default as apiClient } from './client';
```

**Deliverables:**
- Complete API service layer
- WebSocket service
- Error handling implemented
- Toast notifications for errors
- All services exported from index

**Tid:** 2 dagar

---

### PHASE 1.3: Core Components Implementation

#### 1.3.1: Common Components
**Mål:** Bygga återanvändbara komponenter

**1. LoadingSpinner Component:**

`src/components/common/LoadingSpinner.jsx`:
```javascript
import React from 'react';
import { CircularProgress, Box } from '@mui/material';

export const LoadingSpinner = ({ size = 40, fullScreen = false }) => {
  if (fullScreen) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={size} />
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" p={3}>
      <CircularProgress size={size} />
    </Box>
  );
};
```

**2. EmptyState Component:**

`src/components/common/EmptyState.jsx`:
```javascript
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export const EmptyState = ({
  icon: Icon = InboxIcon,
  title = 'No data available',
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      p={6}
      textAlign="center"
    >
      <Icon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};
```

**3. ErrorMessage Component:**

`src/components/common/ErrorMessage.jsx`:
```javascript
import React from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';

export const ErrorMessage = ({
  title = 'Error',
  message = 'An error occurred',
  onRetry,
}) => {
  return (
    <Box p={3}>
      <Alert severity="error">
        <AlertTitle>{title}</AlertTitle>
        {message}
        {onRetry && (
          <Button color="inherit" size="small" onClick={onRetry} sx={{ mt: 1 }}>
            Try Again
          </Button>
        )}
      </Alert>
    </Box>
  );
};
```

**4. DataTable Component:**

`src/components/common/DataTable.jsx`:
```javascript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TableSortLabel,
} from '@mui/material';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export const DataTable = ({
  columns,
  data,
  loading,
  onRowClick,
  emptyMessage = 'No data available',
  sortBy,
  sortOrder = 'asc',
  onSort,
}) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key}>
                {column.sortable ? (
                  <TableSortLabel
                    active={sortBy === column.key}
                    direction={sortBy === column.key ? sortOrder : 'asc'}
                    onClick={() => onSort?.(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : (
                  column.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              hover
              onClick={() => onRowClick?.(row)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
```

**5. Modal Component:**

`src/components/common/Modal.jsx`:
```javascript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export const Modal = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'md',
  fullWidth = true,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
    >
      <DialogTitle>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
};
```

**6. ConfirmDialog Component:**

`src/components/common/ConfirmDialog.jsx`:
```javascript
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button onClick={handleConfirm} color={confirmColor} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

**7. Pagination Component:**

`src/components/common/Pagination.jsx`:
```javascript
import React from 'react';
import { Box, Pagination as MuiPagination, Typography } from '@mui/material';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
      <Typography variant="body2" color="text.secondary">
        Showing {startItem}-{endItem} of {totalItems}
      </Typography>
      <MuiPagination
        count={totalPages}
        page={currentPage}
        onChange={(e, page) => onPageChange(page)}
        color="primary"
      />
    </Box>
  );
};
```

**8. SearchBar Component:**

`src/components/common/SearchBar.jsx`:
```javascript
import React, { useState, useEffect } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 300
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(searchTerm);
    }, debounce);

    return () => clearTimeout(timer);
  }, [searchTerm, debounce, onChange]);

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder={placeholder}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
};
```

**9. ErrorBoundary Component:**

`src/components/common/ErrorBoundary.jsx`:
```javascript
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          p={3}
        >
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Button variant="contained" onClick={this.handleReset}>
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

**10. StatusBadge Component:**

`src/components/common/StatusBadge.jsx`:
```javascript
import React from 'react';
import { Chip } from '@mui/material';

export const StatusBadge = ({ status, colorMap, labelMap }) => {
  const color = colorMap?.[status] || 'default';
  const label = labelMap?.[status] || status;

  return <Chip label={label} color={color} size="small" />;
};
```

**Deliverables:**
- 10 reusable common components
- Each component documented with JSDoc
- Each component tested
- `src/components/common/index.js` export file

**Tid:** 3 dagar

---

#### 1.3.2: Store Setup (Zustand)
**Mål:** Implementera state management

**1. Auth Store:**

`src/store/authStore.js`:
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**2. Notification Store:**

`src/store/notificationStore.js`:
```javascript
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }],
    }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));
```

**3. UI Store (optional):**

`src/store/uiStore.js`:
```javascript
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  theme: 'light',

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open });
  },

  toggleTheme: () => {
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' }));
  },
}));
```

**Deliverables:**
- Auth store with persistence
- Notification store
- UI store for global UI state
- `src/store/index.js` export file

**Tid:** 1 dag

---

#### 1.3.3: Custom Hooks
**Mål:** Implementera återanvändbara hooks

**1. useOrders Hook:**

`src/hooks/useOrders.js`:
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@services/api';
import toast from 'react-hot-toast';

export const useOrders = (filters = {}) => {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersApi.getOrders(filters),
    staleTime: 30000, // 30 seconds
  });
};

export const useTodayOrders = (slug = null) => {
  return useQuery({
    queryKey: ['orders', 'today', slug],
    queryFn: () => ordersApi.getTodayOrders(slug),
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useOrderById = (id) => {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersApi.getOrderById(id),
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
};

export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => ordersApi.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order cancelled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel order');
    },
  });
};
```

**2. useRestaurants Hook:**

`src/hooks/useRestaurants.js`:
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantsApi } from '@services/api';
import toast from 'react-hot-toast';

export const useRestaurants = (filters = {}) => {
  return useQuery({
    queryKey: ['restaurants', filters],
    queryFn: () => restaurantsApi.getRestaurants(filters),
  });
};

export const useRestaurantById = (id) => {
  return useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => restaurantsApi.getRestaurantById(id),
    enabled: !!id,
  });
};

export const useCreateRestaurant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => restaurantsApi.createRestaurant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create restaurant');
    },
  });
};

export const useUpdateRestaurant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => restaurantsApi.updateRestaurant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update restaurant');
    },
  });
};

export const useDeleteRestaurant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => restaurantsApi.deleteRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast.success('Restaurant deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete restaurant');
    },
  });
};
```

**3. useWebSocket Hook:**

`src/hooks/useWebSocket.js`:
```javascript
import { useEffect, useCallback } from 'react';
import { socketService } from '@services/websocket/socket';
import { useAuthStore } from '@/store/authStore';

export const useWebSocket = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  const on = useCallback((event, callback) => {
    socketService.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketService.off(event, callback);
  }, []);

  const emit = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  return { on, off, emit };
};

// Specific hooks for common events
export const useOrderUpdates = (callback) => {
  const { on, off } = useWebSocket();

  useEffect(() => {
    on('order:new', callback);
    on('order:status', callback);

    return () => {
      off('order:new', callback);
      off('order:status', callback);
    };
  }, [on, off, callback]);
};

export const useCourierUpdates = (callback) => {
  const { on, off } = useWebSocket();

  useEffect(() => {
    on('courier:location:update', callback);
    on('courier:status:update', callback);

    return () => {
      off('courier:location:update', callback);
      off('courier:status:update', callback);
    };
  }, [on, off, callback]);
};
```

**4. usePagination Hook:**

`src/hooks/usePagination.js`:
```javascript
import { useState } from 'react';

export const usePagination = (initialPage = 1, initialItemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const changeItemsPerPage = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const reset = () => {
    setCurrentPage(initialPage);
    setItemsPerPage(initialItemsPerPage);
  };

  return {
    currentPage,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    changeItemsPerPage,
    reset,
  };
};
```

**5. useFilters Hook:**

`src/hooks/useFilters.js`:
```javascript
import { useState, useCallback } from 'react';

export const useFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const removeFilter = useCallback((key) => {
    setFilters((prev) => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    removeFilter,
    clearFilters,
  };
};
```

**Deliverables:**
- useOrders hook with queries and mutations
- useRestaurants hook
- useCouriers hook (similar pattern)
- useAnalytics hook
- usePerformance hook
- useWebSocket hook
- usePagination hook
- useFilters hook
- `src/hooks/index.js` export file

**Tid:** 2 dagar

---

### PHASE 1.4: Page Implementation

*(Due to character limits, I'll provide a summary structure for this section)*

#### 1.4.1: Dashboard Overview Page
- Layout with stats cards
- Recent orders widget
- Alerts widget
- Quick actions
- **Tid:** 2 dagar

#### 1.4.2: Orders Management Page
- Order list with DataTable
- Filter bar
- Order details modal
- Status update functionality
- Real-time WebSocket updates
- **Tid:** 3 dagar

#### 1.4.3: Restaurants Management Page
- Restaurant grid/list
- Create restaurant form
- Edit restaurant form
- Delete confirmation
- Menu management (future)
- **Tid:** 3 dagar

#### 1.4.4: Couriers Management Page
- Courier list
- GPS map with markers
- Courier form (create/edit)
- Performance stats
- **Tid:** 3 dagar

#### 1.4.5: Analytics Page
- Revenue charts
- Activity charts
- Leaderboard
- System statistics
- **Tid:** 2 dagar

#### 1.4.6: Performance Monitoring Page
- Performance metrics
- Alert configuration
- Alert history
- **Tid:** 2 dagar

---

### PHASE 1.5: Testing & Quality Assurance

#### 1.5.1: Unit Testing
- Component tests
- Hook tests
- Service tests
- **Coverage goal:** 80%+
- **Tid:** 3 dagar

#### 1.5.2: Integration Testing
- User flow tests
- API integration tests
- **Tid:** 2 dagar

#### 1.5.3: E2E Testing (Optional)
- Critical user journeys
- **Tool:** Playwright
- **Tid:** 2 dagar

#### 1.5.4: Accessibility Audit
- WCAG 2.1 compliance
- Keyboard navigation
- Screen reader support
- **Tid:** 1 dag

#### 1.5.5: Performance Audit
- Lighthouse audit
- Bundle size optimization
- Code splitting
- **Tid:** 1 dag

---

### PHASE 1.6: Documentation & Deployment

#### 1.6.1: Code Documentation
- JSDoc comments
- Component documentation
- **Tid:** 1 dag

#### 1.6.2: User Documentation
- Admin user guide
- Feature documentation
- **Tid:** 2 dagar

#### 1.6.3: Deployment
- Build optimization
- Production environment
- Smoke tests
- **Tid:** 1 dag

---

## 📝 DOKUMENTATION GUIDELINES

### När varje del avslutas ska följande dokumenteras:

1. **Technical Documentation** (`PHASE-X.X-TECHNICAL.md`):
   - Implementation details
   - Code structure
   - API integrations
   - State management approach
   - Performance considerations

2. **User Documentation** (`PHASE-X.X-USER-GUIDE.md`):
   - How to use the feature
   - Screenshots/GIFs
   - Common workflows
   - Troubleshooting

3. **Testing Documentation** (`PHASE-X.X-TESTING.md`):
   - Test coverage
   - Test scenarios
   - Known issues
   - Bug fixes

4. **Deployment Documentation** (`PHASE-X.X-DEPLOYMENT.md`):
   - Build instructions
   - Environment variables
   - Deployment steps
   - Rollback procedures

---

## 🎯 PHASE 2-6 SUMMARY

### PHASE 2: Restaurant Dashboard (3-4 veckor)
- Restaurant order management
- Menu CRUD
- Daily revenue stats
- Profile settings

### PHASE 3: Courier Interface (3-4 veckor)
- Active deliveries list
- GPS tracking UI
- Route visualization
- Payment overview
- Performance metrics

### PHASE 4: Customer Ordering (4-5 veckor)
- Restaurant browsing
- Menu browsing
- Shopping cart
- Checkout
- Order tracking
- Order history

### PHASE 5: Real-time Features (2 veckor)
- WebSocket integration refinement
- Live notifications
- Live order status
- Live GPS tracking on maps
- Push notifications

### PHASE 6: Mobile Apps (6-8 veckor)
- React Native setup
- Courier app (iOS + Android)
- Customer app (iOS + Android)
- Push notifications
- Offline support

---

## 📊 TOTAL PROJECT ESTIMATE

**Phase 1 (Admin Dashboard):** 4-6 veckor
**Phase 2-4:** 10-13 veckor
**Phase 5-6:** 8-10 veckor

**Total:** 22-29 veckor (5.5-7 månader)

---

## APPENDIX

### A. Git Workflow
- Feature branches från develop
- Pull requests med review
- CI/CD runs på varje PR
- Merge till main efter godkännande

### B. Code Style Guide
- ESLint konfiguration
- Prettier formatting
- Naming conventions
- File organization

### C. API Reference
- Complete endpoint list
- Request/response examples
- Error codes
- Rate limiting

### D. Environment Setup
- Development
- Staging
- Production
- Environment variables

---

**Dokument uppdaterat:** 2025-12-02
**Nästa uppdatering:** Efter varje phase completion
**Maintainers:** Development Team
