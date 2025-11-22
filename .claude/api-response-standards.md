# API Response Handling Standards
**Project:** Annos Food Ordering Platform
**Date:** 2025-11-22
**Purpose:** Etablera robusta, långsiktiga standarder för API-kommunikation

---

## Core Principle

> **"Transform data at boundaries, validate early, fail loudly"**

API responses ska transformeras till clean domain objects **så tidigt som möjligt** - i service layer, inte i komponenter eller hooks.

---

## Table of Contents

1. [Backend Response Standards](#backend-response-standards)
2. [Frontend Service Layer Responsibility](#frontend-service-layer-responsibility)
3. [Type Safety & Validation](#type-safety--validation)
4. [Error Handling Standards](#error-handling-standards)
5. [Testing Requirements](#testing-requirements)
6. [Real-World Examples](#real-world-examples)
7. [Migration Checklist](#migration-checklist)

---

## Backend Response Standards

### Rule 1: Consistent Response Structure

**ALL backend API endpoints MUST follow this structure:**

```javascript
// ✅ SUCCESS Response
{
  success: true,
  data: { ...actualData },
  message?: "Optional success message"
}

// ❌ ERROR Response
{
  success: false,
  message: "Error description",
  error?: "Error code or details"
}
```

### Rule 2: Document Response Shapes

**Every endpoint MUST be documented with its exact response structure:**

```javascript
/**
 * GET /api/profile
 *
 * @returns {Object} Response
 * @returns {boolean} response.success - Always true on success
 * @returns {Object} response.data - User profile object
 * @returns {number} response.data.id - User ID
 * @returns {string} response.data.email - User email
 * @returns {string} response.data.role - User role (admin|customer|courier|restaurant)
 * @returns {string} response.data.namn - User name
 * @returns {string} response.data.telefon - User phone
 * @returns {string} response.data.adress - User address
 *
 * @example Success
 * {
 *   success: true,
 *   data: {
 *     id: 1,
 *     email: "user@example.com",
 *     role: "admin",
 *     namn: "John Doe",
 *     telefon: "0701234567",
 *     adress: "Testgatan 1"
 *   }
 * }
 */
router.get('/profile', AuthController.getProfile);
```

### Rule 3: Never Change Response Structure

**NEVER do this:**
```javascript
// ❌ BAD: Inconsistent response structure
app.get('/api/profile', (req, res) => {
  const user = getUserById(req.user.id);
  res.json(user); // Sometimes just user object
});

app.get('/api/menu', (req, res) => {
  const menu = getMenu();
  res.json({ success: true, data: menu }); // Sometimes wrapped
});
```

**ALWAYS do this:**
```javascript
// ✅ GOOD: Consistent response structure
app.get('/api/profile', (req, res) => {
  const user = getUserById(req.user.id);
  res.json({
    success: true,
    data: user // Always wrapped
  });
});

app.get('/api/menu', (req, res) => {
  const menu = getMenu();
  res.json({
    success: true,
    data: menu // Always wrapped
  });
});
```

### Backend Checklist

Before merging any backend code:
- [ ] Response follows `{ success, data, message? }` structure
- [ ] JSDoc comment documents exact response shape
- [ ] Error responses follow `{ success: false, message }` structure
- [ ] No endpoint returns raw data without wrapper

---

## Frontend Service Layer Responsibility

### Rule 4: Service Layer Unwraps Responses

**The service layer is responsible for:**
1. Making HTTP requests
2. **Unwrapping API responses** (remove `success`, `data` wrapper)
3. Transforming to domain objects
4. Throwing meaningful errors
5. Returning clean data

**Components should NEVER see API wrapper structures.**

### Pattern: Unwrap at Service Layer

```javascript
// ❌ BAD: Component sees API structure
export class AuthService {
  static async fetchProfile() {
    const res = await apiRequest("/api/profile");
    return res.json(); // Returns: { success: true, data: { ...user } }
  }
}

// Component
const data = await fetchProfile();
console.log(data.data.namn); // ❌ Component knows about API structure!

// ✅ GOOD: Service unwraps, component sees clean data
export class AuthService {
  static async fetchProfile() {
    const res = await apiRequest("/api/profile");
    if (!res.ok) {
      throw new Error(`Profile fetch failed: ${res.status}`);
    }
    const response = await res.json();

    // ✅ Unwrap here, at the boundary
    return response.data; // Returns: { id, email, namn, ... }
  }
}

// Component
const user = await fetchProfile();
console.log(user.namn); // ✅ Component works with clean domain object!
```

### Pattern: Validate Response Structure

**Always validate the response structure before unwrapping:**

```javascript
// ✅ EXCELLENT: Validate before unwrapping
export class AuthService {
  static async fetchProfile() {
    const res = await apiRequest("/api/profile");

    if (!res.ok) {
      throw new Error(`Profile fetch failed: ${res.status}`);
    }

    const response = await res.json();

    // Validate structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }

    if (!response.success) {
      throw new Error(response.message || 'Request failed');
    }

    if (!response.data) {
      throw new Error('Missing data in response');
    }

    // Now safe to unwrap
    return response.data;
  }
}
```

### Pattern: Transform to Domain Objects

**For complex data, transform to typed domain objects:**

```javascript
// Define domain object
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.namn = data.namn || '';
    this.telefon = data.telefon || '';
    this.adress = data.adress || '';
    this.role = data.role || 'customer';
  }

  get isAdmin() {
    return this.role === 'admin';
  }

  get isCourier() {
    return this.role === 'courier';
  }

  get isComplete() {
    return !!(this.namn && this.email && this.telefon && this.adress);
  }
}

// Service returns domain object
export class AuthService {
  static async fetchProfile() {
    const res = await apiRequest("/api/profile");
    if (!res.ok) throw new Error(`Profile fetch failed`);

    const response = await res.json();
    if (!response.success || !response.data) {
      throw new Error('Invalid profile response');
    }

    // Transform to domain object
    return new User(response.data);
  }
}

// Component works with domain object
const user = await fetchProfile();
if (user.isAdmin) {
  // Show admin panel
}
if (!user.isComplete) {
  // Ask user to complete profile
}
```

### Frontend Service Checklist

Before merging any service code:
- [ ] Service unwraps API response (removes `{ success, data }` wrapper)
- [ ] Service validates response structure
- [ ] Service returns clean domain objects
- [ ] Service throws meaningful errors
- [ ] Components never see API wrapper structures
- [ ] JSDoc documents what the service returns (not what API returns)

---

## Type Safety & Validation

### Rule 5: Use JSDoc Types (Minimum)

**Even without TypeScript, use JSDoc for type safety:**

```javascript
/**
 * User profile object
 * @typedef {Object} UserProfile
 * @property {number} id - User ID
 * @property {string} email - Email address
 * @property {string} namn - Full name
 * @property {string} telefon - Phone number
 * @property {string} adress - Address
 * @property {('admin'|'customer'|'courier'|'restaurant')} role - User role
 */

/**
 * Fetch user profile
 * @returns {Promise<UserProfile>} User profile object
 * @throws {Error} If profile fetch fails
 */
export async function fetchProfile() {
  const res = await apiRequest("/api/profile");
  if (!res.ok) throw new Error(`Profile fetch failed`);

  const response = await res.json();
  if (!response.success || !response.data) {
    throw new Error('Invalid profile response');
  }

  return response.data; // JSDoc knows this returns UserProfile
}
```

**Benefits:**
- VS Code autocomplete works
- Type errors caught during development
- Documentation built-in
- Easy migration to TypeScript later

### Rule 6: Validate Critical Data

**For critical operations, validate data shape:**

```javascript
/**
 * Validate user profile structure
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid
 */
function isValidUserProfile(data) {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'number' &&
    typeof data.email === 'string' &&
    typeof data.role === 'string' &&
    ['admin', 'customer', 'courier', 'restaurant'].includes(data.role)
  );
}

export async function fetchProfile() {
  const res = await apiRequest("/api/profile");
  if (!res.ok) throw new Error(`Profile fetch failed`);

  const response = await res.json();
  if (!response.success || !response.data) {
    throw new Error('Invalid profile response');
  }

  // Validate before returning
  if (!isValidUserProfile(response.data)) {
    throw new Error('Invalid user profile structure');
  }

  return response.data;
}
```

### Rule 7: Use Zod or Similar for Complex Validation

**For production apps, use validation libraries:**

```javascript
import { z } from 'zod';

// Define schema
const UserProfileSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  namn: z.string().min(1),
  telefon: z.string().min(1),
  adress: z.string(),
  role: z.enum(['admin', 'customer', 'courier', 'restaurant'])
});

export async function fetchProfile() {
  const res = await apiRequest("/api/profile");
  if (!res.ok) throw new Error(`Profile fetch failed`);

  const response = await res.json();
  if (!response.success || !response.data) {
    throw new Error('Invalid profile response');
  }

  // Validate and parse
  try {
    const user = UserProfileSchema.parse(response.data);
    return user; // Guaranteed to match schema
  } catch (error) {
    console.error('Profile validation failed:', error);
    throw new Error('Invalid profile data from server');
  }
}
```

---

## Error Handling Standards

### Rule 8: Fail Loudly at Service Layer

**Don't silently return null or default values. Throw errors.**

```javascript
// ❌ BAD: Silent failure
export async function fetchProfile() {
  try {
    const res = await apiRequest("/api/profile");
    const response = await res.json();
    return response.data || null; // ❌ Silently returns null on error
  } catch (error) {
    return null; // ❌ Component doesn't know what failed
  }
}

// ✅ GOOD: Fail loudly
export async function fetchProfile() {
  const res = await apiRequest("/api/profile");

  if (!res.ok) {
    const err = new Error(`Profile fetch failed: ${res.status}`);
    err.status = res.status;
    throw err; // ✅ Caller knows exactly what failed
  }

  const response = await res.json();

  if (!response.success) {
    throw new Error(response.message || 'Profile fetch failed');
  }

  if (!response.data) {
    throw new Error('Missing profile data in response');
  }

  return response.data;
}
```

### Rule 9: Structured Error Objects

**Create error objects with useful information:**

```javascript
class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

export async function fetchProfile() {
  const res = await apiRequest("/api/profile");

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `HTTP ${res.status}`,
      res.status,
      errorData
    );
  }

  const response = await res.json();

  if (!response.success) {
    throw new ApiError(
      response.message || 'Request failed',
      res.status,
      response
    );
  }

  return response.data;
}

// Component can handle specific errors
try {
  const user = await fetchProfile();
} catch (error) {
  if (error instanceof ApiError && error.status === 401) {
    // Handle unauthorized
    navigate('/login');
  } else if (error instanceof ApiError && error.status === 404) {
    // Handle not found
    alert('Profile not found');
  } else {
    // Handle other errors
    console.error('Profile fetch failed:', error);
  }
}
```

---

## Testing Requirements

### Rule 10: Test Response Unwrapping

**Write tests for service layer response handling:**

```javascript
import { describe, test, expect, vi } from 'vitest';
import { AuthService } from '../authService';
import * as apiClient from '../apiClient';

describe('AuthService.fetchProfile', () => {
  test('unwraps successful response correctly', async () => {
    // Mock API response
    const mockResponse = {
      success: true,
      data: {
        id: 1,
        email: 'test@example.com',
        namn: 'Test User',
        role: 'customer'
      }
    };

    vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const user = await AuthService.fetchProfile();

    // Should return ONLY the data, not the wrapper
    expect(user).toEqual(mockResponse.data);
    expect(user.success).toBeUndefined(); // No wrapper properties
    expect(user.data).toBeUndefined();
  });

  test('throws error when data is missing', async () => {
    const mockResponse = {
      success: true,
      data: null // Missing data
    };

    vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    await expect(AuthService.fetchProfile()).rejects.toThrow('Missing data');
  });

  test('throws error on HTTP error', async () => {
    vi.spyOn(apiClient, 'apiRequest').mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' })
    });

    await expect(AuthService.fetchProfile()).rejects.toThrow();
  });
});
```

### Rule 11: Test Components with Clean Data

**Components should be tested with clean domain objects, not API wrappers:**

```javascript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MinProfil } from '../MinProfil';
import * as AuthService from '../services/api';

describe('MinProfil', () => {
  test('displays user profile correctly', async () => {
    // Mock service to return clean data (no API wrapper)
    vi.spyOn(AuthService, 'fetchProfile').mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      namn: 'Test User',
      telefon: '0701234567',
      adress: 'Testgatan 1',
      role: 'customer'
    });

    render(<MinProfil />);

    // Wait for profile to load
    await screen.findByDisplayValue('Test User');

    // Verify fields display correctly
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0701234567')).toBeInTheDocument();
  });
});
```

---

## Real-World Examples

### Example 1: AuthService (Complete)

```javascript
import { apiRequest } from "../apiClient";

/**
 * User profile object
 * @typedef {Object} UserProfile
 * @property {number} id
 * @property {string} email
 * @property {string} namn
 * @property {string} telefon
 * @property {string} adress
 * @property {('admin'|'customer'|'courier'|'restaurant')} role
 */

export class AuthService {
  /**
   * Fetch user profile
   * @returns {Promise<UserProfile>}
   * @throws {Error} If fetch fails or response invalid
   */
  static async fetchProfile() {
    const res = await apiRequest("/api/profile");

    if (!res.ok) {
      const err = new Error(`Profile fetch failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();

    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }

    if (!response.success) {
      throw new Error(response.message || 'Profile fetch failed');
    }

    if (!response.data) {
      throw new Error('Missing profile data in response');
    }

    // ✅ UNWRAP: Return clean domain object
    return response.data;
  }

  /**
   * Update user profile
   * @param {Object} profileData
   * @param {string} profileData.namn
   * @param {string} profileData.telefon
   * @param {string} profileData.adress
   * @returns {Promise<UserProfile>}
   * @throws {Error} If update fails
   */
  static async updateProfile(profileData) {
    const res = await apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });

    if (!res.ok) {
      const err = new Error(`Profile update failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Profile update failed');
    }

    // ✅ UNWRAP: Return clean domain object
    return response.data;
  }
}
```

### Example 2: MenuService (Complete)

```javascript
import { apiRequest } from "../apiClient";

/**
 * Menu item object
 * @typedef {Object} MenuItem
 * @property {number} id
 * @property {string} namn
 * @property {string} beskrivning
 * @property {number} pris
 * @property {string} kategori
 * @property {string} bild
 */

export class MenuService {
  /**
   * Fetch menu for restaurant
   * @param {string} restaurantSlug
   * @returns {Promise<MenuItem[]>}
   * @throws {Error} If fetch fails
   */
  static async fetchMenu(restaurantSlug) {
    const res = await apiRequest(`/api/meny?restaurang=${restaurantSlug}`);

    if (!res.ok) {
      const err = new Error(`Menu fetch failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();

    // Handle two response formats for backward compatibility
    if (Array.isArray(response)) {
      // Legacy format: API returns array directly
      return response;
    }

    if (response.success && response.data) {
      // New format: API returns { success, data }
      return response.data;
    }

    throw new Error('Invalid menu response format');
  }
}
```

### Example 3: OrderService (Complete)

```javascript
import { apiRequest } from "../apiClient";

/**
 * Order object
 * @typedef {Object} Order
 * @property {number} id
 * @property {string} restaurant_slug
 * @property {string} customer_name
 * @property {string} customer_phone
 * @property {string} customer_address
 * @property {number} grand_total
 * @property {string} status
 * @property {string} created_at
 */

export class OrderService {
  /**
   * Fetch user's orders
   * @returns {Promise<Order[]>}
   * @throws {Error} If fetch fails
   */
  static async fetchMyOrders() {
    const res = await apiRequest("/api/my-orders");

    if (!res.ok) {
      const err = new Error(`My orders fetch failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();

    // Validate and unwrap
    if (Array.isArray(response)) {
      // Legacy format
      return response;
    }

    if (response.success && Array.isArray(response.data)) {
      // New format
      return response.data;
    }

    throw new Error('Invalid orders response format');
  }

  /**
   * Create new order
   * @param {Object} orderData
   * @returns {Promise<Order>}
   * @throws {Error} If creation fails
   */
  static async createOrder(orderData) {
    const res = await apiRequest("/api/bestallning", {
      method: "POST",
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      const err = new Error(`Order creation failed: ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const response = await res.json();

    if (!response.success) {
      throw new Error(response.message || 'Order creation failed');
    }

    // ✅ UNWRAP
    return response.data || response;
  }
}
```

---

## Migration Checklist

### For Existing Code

When reviewing or refactoring existing API services:

#### Backend Review:
- [ ] Does endpoint return `{ success, data }` structure?
- [ ] Is response structure documented in JSDoc?
- [ ] Does error response return `{ success: false, message }`?
- [ ] Are all similar endpoints consistent?

#### Frontend Service Review:
- [ ] Does service unwrap `response.data` before returning?
- [ ] Does service validate response structure?
- [ ] Does service throw meaningful errors?
- [ ] Is return type documented in JSDoc?
- [ ] Do tests verify unwrapping works correctly?

#### Component Review:
- [ ] Does component receive clean domain objects?
- [ ] Does component access data directly (e.g., `user.namn` not `user.data.namn`)?
- [ ] Does component handle errors from service?
- [ ] No references to `success` or `data` wrapper properties?

### For New Code

When writing new API services:

- [ ] Follow backend response standard: `{ success, data, message? }`
- [ ] Document response structure in JSDoc
- [ ] Unwrap response in service layer
- [ ] Validate response structure
- [ ] Use typed JSDoc comments
- [ ] Write tests for unwrapping logic
- [ ] Components work with clean objects

---

## Common Mistakes to Avoid

### Mistake 1: Returning API Wrapper to Component

```javascript
// ❌ BAD
export async function fetchProfile() {
  const res = await apiRequest("/api/profile");
  return res.json(); // Returns { success, data }
}

// Component struggles
const profile = await fetchProfile();
console.log(profile.namn); // undefined! It's at profile.data.namn
```

### Mistake 2: Inconsistent Backend Responses

```javascript
// ❌ BAD: Different endpoints return different structures
app.get('/api/profile', (req, res) => {
  res.json({ success: true, data: user });
});

app.get('/api/menu', (req, res) => {
  res.json(menuItems); // Not wrapped!
});
```

### Mistake 3: Silent Failures

```javascript
// ❌ BAD: Hides errors
export async function fetchProfile() {
  try {
    const res = await apiRequest("/api/profile");
    return res.json().data || {};
  } catch {
    return {}; // Component doesn't know it failed!
  }
}
```

### Mistake 4: Component Knows About API Structure

```javascript
// ❌ BAD: Component depends on API wrapper
function MyComponent() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile().then(response => {
      setProfile(response.data); // Component knows about wrapper
    });
  }, []);

  return <div>{profile?.namn}</div>;
}
```

---

## Benefits of This Approach

### 1. **Maintainability**
- Change API structure in one place (service layer)
- Components unaffected by API changes
- Clear separation of concerns

### 2. **Reliability**
- Validation catches errors early
- Type safety prevents runtime errors
- Tests verify data transformations

### 3. **Developer Experience**
- Autocomplete works correctly
- Clear types and documentation
- Predictable data structures

### 4. **Debugging**
- Errors are specific and actionable
- Clear stack traces
- Easy to identify where transformation failed

### 5. **Scalability**
- Easy to migrate to TypeScript
- Easy to add new endpoints
- Consistent patterns across codebase

---

## Summary

### Golden Rules

1. **Backend:** Always return `{ success, data, message? }`
2. **Service Layer:** Always unwrap to `response.data`
3. **Components:** Never see API wrapper structures
4. **Validation:** Validate response structure at service layer
5. **Errors:** Fail loudly, throw meaningful errors
6. **Types:** Use JSDoc types minimum, TypeScript preferred
7. **Tests:** Test unwrapping logic
8. **Documentation:** Document response shapes

### Quick Reference

```javascript
// Backend (Controller)
res.json({
  success: true,
  data: userObject
});

// Frontend (Service)
const response = await res.json();
return response.data; // ✅ Unwrap here!

// Frontend (Component)
const user = await fetchProfile();
console.log(user.namn); // ✅ Clean access
```

---

**This document should be the standard for all API communication in the Annos project.**
