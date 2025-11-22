# API Architecture Documentation
**Project:** Annos Food Ordering Platform
**Date:** 2025-11-22
**Version:** 2.0 (Post-Migration)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Service Layer Structure](#service-layer-structure)
4. [API Client (apiClient.js)](#api-client-apiclientjs)
5. [Services](#services)
6. [Usage Guidelines](#usage-guidelines)
7. [Migration from Legacy Pattern](#migration-from-legacy-pattern)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

The Annos frontend uses a **centralized service layer architecture** for all API communications. This architecture provides:

- **Consistency**: All API calls go through the same client
- **Maintainability**: API logic is centralized, not scattered across components
- **Error Handling**: Uniform error handling and timeout management
- **Authentication**: Automatic credential inclusion and token management
- **Type Safety**: Clear interfaces for API operations
- **Testability**: Services can be mocked independently

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Components Layer                        │
│  (App.jsx, Login.jsx, RestaurangVy.jsx, etc.)               │
└────────────────────┬────────────────────────────────────────┘
                     │ Import from services/api.js
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Aggregator                        │
│                    (services/api.js)                         │
│   Re-exports all services for convenient importing           │
└────────────────────┬────────────────────────────────────────┘
                     │ Aggregates from:
        ┌────────────┼────────────┬──────────────┐
        ▼            ▼            ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ AuthService  │ │ OrderService │ │ MenuService │ │  apiClient   │
│   (auth/)    │ │  (orders/)   │ │   (menu/)   │ │ (Base Layer) │
└──────┬───────┘ └──────┬───────┘ └──────┬──────┘ └──────┬───────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                           │ All use:
                           ▼
              ┌──────────────────────────┐
              │      apiRequest()         │
              │  - Credentials: include   │
              │  - Timeout management     │
              │  - Error normalization    │
              │  - BASE_URL handling      │
              └────────────┬──────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   Vite Proxy      │
                 │  /api/* → :3001   │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │  Backend Server   │
                 │    (port 3001)    │
                 └───────────────────┘
```

---

## Architecture Principles

### 1. **Separation of Concerns**
- **Components**: Handle UI logic and user interactions
- **Services**: Handle API communication and data transformation
- **apiClient**: Handles low-level HTTP concerns (auth, timeout, errors)

### 2. **Single Responsibility**
- Each service handles one domain (Auth, Orders, Menu)
- Each service method does one thing
- Clear, descriptive function names

### 3. **DRY (Don't Repeat Yourself)**
- No duplicate fetch() calls in components
- Centralized error handling
- Shared BASE_URL and credential management

### 4. **Fail-Safe Defaults**
- Empty string for BASE_URL (works with Vite proxy)
- Automatic timeout (10 seconds default)
- Credentials always included

### 5. **Explicit Over Implicit**
- Clear service method names (fetchMenu vs getMenu)
- Explicit error throwing
- No silent failures

---

## Service Layer Structure

```
frontend/src/services/
├── api.js                 # Main entry point (aggregates all services)
├── apiClient.js           # Base HTTP client
├── auth/
│   └── authService.js     # Authentication & user profile
├── orders/
│   └── orderService.js    # Order management
└── menu/
    └── menuService.js     # Menu & restaurant data
```

### Why This Structure?

- **Scalability**: Easy to add new services (e.g., PaymentService)
- **Organization**: Related functions grouped together
- **Discoverability**: Clear where to find functionality
- **Testing**: Can mock entire services or individual methods

---

## API Client (apiClient.js)

The foundation of all API communication.

### Location
`frontend/src/services/apiClient.js`

### Core Function: `apiRequest()`

```javascript
async function apiRequest(endpoint, options = {})
```

**Features:**
- Automatic BASE_URL prepending (empty string for Vite proxy)
- Always includes `credentials: "include"` for cookies
- 10-second timeout by default (configurable)
- Normalizes errors with status codes
- Handles 401 (Unauthorized) automatically

**Parameters:**
- `endpoint` (string): API endpoint (e.g., `/api/menu`)
- `options` (object): Fetch options (method, headers, body, etc.)
  - `timeout` (number, optional): Custom timeout in milliseconds

**Returns:**
- `Promise<Response>`: Fetch Response object

**Example:**
```javascript
const res = await apiRequest("/api/menu?restaurang=campino");
const data = await res.json();
```

### Helper Function: `checkBackendHealth()`

```javascript
async function checkBackendHealth(retries = 2)
```

Checks if backend is available with retry logic.

**Returns:**
- `Promise<boolean>`: true if backend is healthy

**Usage:**
```javascript
const isHealthy = await checkBackendHealth();
if (!isHealthy) {
  // Show backend offline message
}
```

### Helper Function: `handleApiResponse()`

```javascript
async function handleApiResponse(response)
```

Extracts JSON from response or throws error.

**Returns:**
- `Promise<Object>`: Parsed JSON response

**Throws:**
- Error with status and message if response not OK

---

## Services

### 1. AuthService (`frontend/src/services/auth/authService.js`)

Handles authentication, registration, and user profile management.

#### Methods

**`fetchProfile()`**
```javascript
static async fetchProfile(): Promise<UserProfile>
```
Fetches the authenticated user's profile.

**Returns:**
```javascript
{
  id: number,
  email: string,
  namn: string,
  telefon: string,
  adress: string,
  role: "admin" | "customer" | "courier" | "restaurant"
}
```

**Errors:**
- Status 401: User not authenticated
- Status 0: Network error

---

**`updateProfile(profilData)`**
```javascript
static async updateProfile(profilData: Object): Promise<UserProfile>
```
Updates user profile.

**Parameters:**
```javascript
{
  namn?: string,
  telefon?: string,
  adress?: string
}
```

---

**`login(email, password)`**
```javascript
static async login(email: string, password: string): Promise<LoginResponse>
```
Logs in user with email and password.

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  user: UserProfile,
  token: string
}
```

**Side Effects:**
- Saves user data to localStorage
- Triggers storage event for cross-tab sync

---

**`register(userData)`**
```javascript
static async register(userData: Object): Promise<UserProfile>
```
Registers a new user.

**Parameters:**
```javascript
{
  namn: string,
  email: string,
  telefon: string,
  losenord: string
}
```

---

**`logout()`**
```javascript
static async logout(): Promise<boolean>
```
Logs out user and clears local data.

**Side Effects:**
- Clears localStorage (kundinfo, varukorg)
- Triggers storage event

---

**`loginWithGoogle(token)`**
```javascript
static async loginWithGoogle(token: string): Promise<UserProfile>
```
Logs in with Google OAuth token.

---

**`loginWithApple(token)`**
```javascript
static async loginWithApple(token: string): Promise<UserProfile>
```
Logs in with Apple OAuth token.

---

### 2. OrderService (`frontend/src/services/orders/orderService.js`)

Handles all order-related operations.

#### Methods

**`createOrder(orderData)`**
```javascript
static async createOrder(orderData: Object): Promise<Order>
```
Creates a new order.

**Parameters:**
```javascript
{
  restaurant_slug: string,
  items: Array<{
    name: string,
    quantity: number,
    base_price: number,
    options: Array<Option>
  }>,
  total: number,
  delivery_address: string,
  notes?: string
}
```

---

**`fetchUserOrders()`**
```javascript
static async fetchUserOrders(): Promise<Array<Order>>
```
Fetches all orders for the authenticated user.

---

**`fetchMyOrders()`**
```javascript
static async fetchMyOrders(): Promise<Array<Order>>
```
Fetches user's order history (same as fetchUserOrders but different endpoint).

---

**`fetchAdminOrders(restaurantSlug?, status?)`**
```javascript
static async fetchAdminOrders(
  restaurantSlug?: string,
  status?: string
): Promise<Array<Order>>
```
Fetches orders for admin view with optional filters.

**Parameters:**
- `restaurantSlug`: Filter by restaurant (optional)
- `status`: Filter by order status (optional)

**Example:**
```javascript
// All orders
const allOrders = await fetchAdminOrders();

// Orders for specific restaurant
const campinoOrders = await fetchAdminOrders("campino");

// Pending orders for specific restaurant
const pendingOrders = await fetchAdminOrders("campino", "pending");
```

---

**`fetchTodaysOrders(restaurantSlug)`**
```javascript
static async fetchTodaysOrders(restaurantSlug: string): Promise<Array<Order>>
```
Fetches today's orders for a restaurant.

---

**`fetchRestaurantOrders(restaurantSlug)`**
```javascript
static async fetchRestaurantOrders(restaurantSlug: string): Promise<Array<Order>>
```
Fetches all orders for a specific restaurant.

---

**`fetchCourierOrders(status?)`**
```javascript
static async fetchCourierOrders(status?: string): Promise<Array<Order>>
```
Fetches orders for courier with optional status filter.

**Example:**
```javascript
// All courier orders
const allOrders = await fetchCourierOrders();

// Only pending deliveries
const pendingOrders = await fetchCourierOrders("pending");
```

---

**`markOrderAsDone(orderId)`**
```javascript
static async markOrderAsDone(orderId: number): Promise<Order>
```
Marks order as done (status: "ready") - Restaurant endpoint.

---

**`markOrderAsReady(orderId)`**
```javascript
static async markOrderAsReady(orderId: number): Promise<Order>
```
Marks order as ready - Admin endpoint.

---

**`acceptOrder(orderId)`**
```javascript
static async acceptOrder(orderId: number): Promise<Order>
```
Courier accepts an order for delivery.

---

**`markOrderAsDelivered(orderId)`**
```javascript
static async markOrderAsDelivered(orderId: number): Promise<Order>
```
Courier marks order as delivered.

---

**`updateOrderStatus(orderId, status)`**
```javascript
static async updateOrderStatus(orderId: number, status: string): Promise<Order>
```
Updates order status - General endpoint.

---

**`updateAdminOrderStatus(orderId, status)`**
```javascript
static async updateAdminOrderStatus(orderId: number, status: string): Promise<Order>
```
Updates order status - Admin endpoint.

**Status values:**
- `"received"`: Order received by restaurant
- `"accepted"`: Restaurant accepted order
- `"in_progress"`: Order being prepared
- `"ready"`: Order ready for pickup
- `"out_for_delivery"`: Out for delivery
- `"delivered"`: Delivered to customer

---

**`fetchOrderDetails(orderId)`**
```javascript
static async fetchOrderDetails(orderId: number): Promise<Order>
```
Fetches detailed information for a specific order.

---

### 3. MenuService (`frontend/src/services/menu/menuService.js`)

Handles menu and restaurant data.

#### Methods

**`fetchMenu(restaurantSlug)`**
```javascript
static async fetchMenu(restaurantSlug: string): Promise<Array<MenuItem>>
```
Fetches menu for a specific restaurant.

**Returns:**
```javascript
[
  {
    id: number,
    namn: string,
    pris: number,
    beskrivning: string,
    ingredienser: string,
    restaurantSlug: string,
    kategori: string
  }
]
```

**Example:**
```javascript
const menu = await fetchMenu("campino");
```

---

**`fetchRestaurants()`**
```javascript
static async fetchRestaurants(): Promise<Array<Restaurant>>
```
Fetches all available restaurants.

---

**`fetchRestaurantDetails(restaurantSlug)`**
```javascript
static async fetchRestaurantDetails(restaurantSlug: string): Promise<Restaurant>
```
Fetches detailed information for a specific restaurant.

---

## Usage Guidelines

### How to Use Services in Components

**Good Pattern ✅**

```javascript
import { fetchMenu } from "../../services/api";

function MyComponent() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        const data = await fetchMenu("campino");
        setMenu(data);
        setError(null);
      } catch (err) {
        console.error("Menu fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  // Render logic...
}
```

**Bad Pattern ❌**

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function MyComponent() {
  useEffect(() => {
    fetch(`${BASE_URL}/api/menu?restaurang=campino`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => setMenu(data));
  }, []);
}
```

**Why it's bad:**
- No error handling
- No timeout management
- Duplicates BASE_URL logic
- Hard to test
- Hard to maintain

---

### Importing Services

**Option 1: Import from main aggregator (Recommended)**

```javascript
import { fetchMenu, login, createOrder } from "../../services/api";
```

**Option 2: Import from specific service**

```javascript
import { fetchMenu } from "../../services/menu/menuService";
import { login } from "../../services/auth/authService";
```

**Option 3: Import service class**

```javascript
import { MenuService } from "../../services/menu/menuService";

const menu = await MenuService.fetchMenu("campino");
```

---

## Migration from Legacy Pattern

### Before (Legacy Pattern)

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const res = await fetch(`${BASE_URL}/api/menu?restaurang=${slug}`, {
  credentials: "include",
});
const data = await res.json();
```

### After (Service Pattern)

```javascript
import { fetchMenu } from "../../services/api";

const data = await fetchMenu(slug);
```

### Benefits of Migration

1. **Less Code**: 4 lines → 1 line
2. **No BASE_URL Checks**: Service handles it
3. **Better Error Handling**: Automatic timeout and error normalization
4. **Consistent**: Same pattern everywhere
5. **Testable**: Easy to mock services

---

## Error Handling

### Error Structure

All service methods throw errors with the following structure:

```javascript
{
  message: string,
  status?: number,
  data?: Object
}
```

### Common Error Status Codes

- **0**: Network error (backend offline)
- **401**: Unauthorized (session expired)
- **404**: Not found
- **408**: Request timeout
- **500**: Server error

### Handling Errors in Components

```javascript
try {
  const data = await fetchMenu("campino");
  setMenu(data);
} catch (err) {
  if (err.status === 0) {
    setError("Backend är offline. Kontakta support.");
  } else if (err.status === 401) {
    navigate("/login");
  } else if (err.status === 404) {
    setError("Meny hittades inte.");
  } else {
    setError(err.message || "Ett fel uppstod");
  }
}
```

---

## Best Practices

### 1. **Always Handle Errors**

```javascript
// Good ✅
try {
  const data = await fetchMenu(slug);
  setMenu(data);
} catch (err) {
  console.error(err);
  setError(err.message);
}

// Bad ❌
const data = await fetchMenu(slug);
setMenu(data);
```

### 2. **Use Loading States**

```javascript
// Good ✅
const [loading, setLoading] = useState(true);

try {
  setLoading(true);
  const data = await fetchMenu(slug);
  setMenu(data);
} finally {
  setLoading(false);
}

// Bad ❌
const data = await fetchMenu(slug);
setMenu(data);
```

### 3. **Clear Errors on Success**

```javascript
// Good ✅
try {
  const data = await fetchMenu(slug);
  setMenu(data);
  setError(null); // Clear previous errors
} catch (err) {
  setError(err.message);
}
```

### 4. **Use Descriptive Variable Names**

```javascript
// Good ✅
const loadMenu = async () => { ... };
const handleLogin = async () => { ... };

// Bad ❌
const doIt = async () => { ... };
const func = async () => { ... };
```

### 5. **Don't Catch and Ignore**

```javascript
// Good ✅
try {
  await login(email, password);
} catch (err) {
  alert(err.message);
  // User sees the error
}

// Bad ❌
try {
  await login(email, password);
} catch (err) {
  // Silent failure - user confused
}
```

### 6. **Use Async/Await, Not Promises**

```javascript
// Good ✅
const data = await fetchMenu(slug);
setMenu(data);

// Bad ❌
fetchMenu(slug).then(data => setMenu(data));
```

### 7. **Clean Up on Unmount**

```javascript
// Good ✅
useEffect(() => {
  let cancelled = false;

  const loadMenu = async () => {
    try {
      const data = await fetchMenu(slug);
      if (!cancelled) setMenu(data);
    } catch (err) {
      if (!cancelled) setError(err.message);
    }
  };

  loadMenu();

  return () => {
    cancelled = true;
  };
}, [slug]);
```

---

## Common Patterns

### Pattern 1: Fetch Data on Mount

```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchMenu(slug);
      setData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [slug]);
```

### Pattern 2: Fetch Data on Button Click

```javascript
const handleLogin = async () => {
  try {
    setLoading(true);
    await login(email, password);
    navigate("/dashboard");
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 3: Refresh Data

```javascript
const refreshOrders = useCallback(async () => {
  try {
    const data = await fetchAdminOrders(restaurantSlug);
    setOrders(data);
  } catch (err) {
    console.error("Refresh failed:", err);
  }
}, [restaurantSlug]);

// Call every 30 seconds
useEffect(() => {
  refreshOrders();
  const interval = setInterval(refreshOrders, 30000);
  return () => clearInterval(interval);
}, [refreshOrders]);
```

### Pattern 4: Update After Mutation

```javascript
const handleAcceptOrder = async (orderId) => {
  try {
    await acceptOrder(orderId);
    // Refresh list after mutation
    await loadOrders();
  } catch (err) {
    alert(`Fel: ${err.message}`);
  }
};
```

---

## Testing Services

### Mocking Services

```javascript
// In your test file
jest.mock("../../services/api");

test("loads menu on mount", async () => {
  const mockMenu = [{ id: 1, namn: "Pizza" }];
  fetchMenu.mockResolvedValue(mockMenu);

  render(<MenuPage />);

  await waitFor(() => {
    expect(screen.getByText("Pizza")).toBeInTheDocument();
  });
});
```

### Testing Error Handling

```javascript
test("shows error when menu fetch fails", async () => {
  fetchMenu.mockRejectedValue(new Error("Network error"));

  render(<MenuPage />);

  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
```

---

## Conclusion

The service layer architecture provides a solid foundation for API communication in the Annos frontend. By following these guidelines and patterns, you ensure:

- **Maintainability**: Easy to update and extend
- **Consistency**: Same patterns everywhere
- **Reliability**: Proper error handling and timeouts
- **Testability**: Easy to mock and test
- **Developer Experience**: Clear, intuitive API

Always use services instead of direct `fetch()` calls, and follow the patterns documented here.
