# Login Fix & New Issues Analysis
**Date:** 2025-11-22
**Status:** ✅ Login FIXED, ❌ New Issues Found

---

## Summary of Login Fix

### Problem
Backend was not running, causing connection refused errors when trying to login.

### Solution Applied
1. **Restarted PostgreSQL:**
   ```bash
   sudo systemctl restart postgresql
   ```
   - PostgreSQL now running with 6 processes (main, checkpointer, background writer, walwriter, autovacuum, replication launcher)

2. **Started Backend:**
   ```bash
   cd backend
   npm start
   ```
   - Backend successfully started on port 3001
   - Database connection established
   - All startup checks passed:
     - ✅ PostgreSQL connection OK
     - ✅ Database 'annos_dev' exists
     - ✅ Tables created
     - ✅ Sequences synchronized

3. **Verification:**
   - Backend logs show successful authentication:
     ```
     [AUTH DEBUG] Login attempt: { email: 'admin@example.com', passwordLength: 8, passwordType: 'string' }
     [AUTH DEBUG] User found: { id: 1, email: 'admin@example.com', role: 'admin' }
     [AUTH DEBUG] Password valid: true
     [AUTH MIDDLEWARE] Token verified for user: admin@example.com
     ```
   - Frontend proxy correctly forwarding cookies:
     ```
     [VITE PROXY] Set-Cookie: [
       'token=eyJ...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax',
       'refreshToken=eyJ...; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax'
     ]
     ```

### Result
✅ **Login now works successfully**
✅ **Authentication tokens being set correctly**
✅ **Backend and PostgreSQL both running**

---

## New Issues Discovered

### Issue 1: Restaurant Pages Not Accessible (CRITICAL)
**Error Message:**
```
Fel: VITE_API_BASE_URL saknas i .env. Ange adressen till backend.
```

**Affected Pages:**
- http://localhost:5173/campino?restaurang=campino
- http://localhost:5173/sunsushi?restaurang=sunsushi
- Any restaurant page

**Root Cause:**

Location: `frontend/src/App.jsx:75-81`

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

useEffect(() => {
  const fetchMeny = async () => {
    if (!BASE_URL) {  // ❌ This check is WRONG
      setError(
        "Fel: VITE_API_BASE_URL saknas i .env. Ange adressen till backend."
      );
      setLoading(false);
      return;
    }
    // ... fetch menu
  };
  fetchMeny();
}, [restaurant_slug]);
```

**Why This Happens:**
1. `frontend/.env` has `VITE_API_BASE_URL=` (empty string) - which is CORRECT for Vite proxy
2. Empty string is **falsy** in JavaScript
3. Check `if (!BASE_URL)` evaluates to `true` when BASE_URL is `""`
4. Code throws error before attempting fetch
5. Menu never loads, restaurant page crashes

**Files Affected:**
- `frontend/src/App.jsx:75` - Menu fetch (CRASHES)
- `frontend/src/pages/restaurant/RestaurangVy.jsx:23,46` - Order fetching
- `frontend/src/pages/restaurant/Restaurang.jsx:5` - Uses BASE_URL
- `frontend/src/pages/customer/MinaBeställningar.jsx:5` - Uses BASE_URL
- `frontend/src/pages/courier/KurirVy.jsx:4` - Uses BASE_URL

**Comparison with Working Code:**

❌ **Broken pattern (App.jsx:20,75):**
```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!BASE_URL) {
  setError("BASE_URL saknas");
  return;
}
```

✅ **Working pattern (apiClient.js:1):**
```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
// No check needed - empty string works fine for relative URLs
```

**Why apiClient.js Works:**
- Uses nullish coalescing operator `??` to default to `""`
- Doesn't check if BASE_URL is truthy
- Empty string + `/api/meny` = `/api/meny` (relative URL)
- Vite proxy intercepts and forwards to backend ✅

**Why App.jsx Fails:**
- Checks if BASE_URL is truthy (`if (!BASE_URL)`)
- Empty string is falsy → check fails
- Never reaches fetch() call
- Error shown to user ❌

---

### Issue 2: Admin Tab Not Visible
**Symptoms:**
- User is logged in as admin@example.com
- Backend confirms role is "admin"
- Admin button should appear in navigation
- But admin button is NOT visible

**Expected Behavior:**

Location: `frontend/src/App.jsx:201-205`

```javascript
{isAdmin && (
  <button onClick={() => navigate("/admin")}>
    🛠 Adminpanel
  </button>
)}
```

**Admin Detection Logic:**

Location: `frontend/src/hooks/useAuth.js:16`

```javascript
const isAdmin = role === "admin";
```

**How Role is Set:**

Location: `frontend/src/hooks/useAuth.js:54-57`

```javascript
const data = await fetchProfile();
setInloggad(true);
setRole(data.role || "");
setProfil(data);
```

**Possible Causes:**

1. **Profile fetch failing silently** (MOST LIKELY)
   - If `/api/profile` request fails, role never gets set
   - But backend logs show token verification succeeds
   - Need to check frontend console for errors

2. **Role not being returned in profile response**
   - Backend might not include role in response
   - Or response format might be different

3. **useAuth hook not executing after login**
   - Login might not trigger profile reload
   - State might not update after successful login

4. **Navigation path preventing admin button display**
   - Line 184: `{!["/", "/restaurang", "/login", "/register"].includes(path) && ...}`
   - If on one of these paths, navigation buttons don't show
   - But restaurant pages shouldn't be in this list

**Debug Steps Needed:**
1. Check browser console for errors when accessing restaurant pages
2. Check if profile is actually being fetched after login
3. Verify profile response includes `role: "admin"`
4. Check current path when admin button should appear

---

## Technical Analysis

### Architecture Overview

**Current Setup (Working for Login, Broken for Restaurant Pages):**

```
Frontend (5173)
    ↓
Vite Proxy (vite.config.js)
    ↓ /api/* → localhost:3001
Backend (3001)
    ↓
PostgreSQL
```

**Expected Flow for Menu Fetch:**
```
App.jsx
  → fetch(`${BASE_URL}/api/meny?restaurang=campino`)
  → with BASE_URL="" becomes: fetch(`/api/meny?restaurang=campino`)
  → Vite proxy intercepts /api/*
  → Forwards to http://localhost:3001/api/meny?restaurang=campino
  → Backend responds with menu data
  ✅ Works perfectly (if check is removed)
```

**Actual Flow (Current):**
```
App.jsx
  → const BASE_URL = import.meta.env.VITE_API_BASE_URL
  → BASE_URL = "" (empty string from .env)
  → if (!BASE_URL) === if (!("")) === if (true)
  → setError("VITE_API_BASE_URL saknas")
  → return (early exit)
  ❌ Never reaches fetch()
```

**Why This Check Exists:**
- Likely added during development before Vite proxy was implemented
- Originally needed to ensure BASE_URL was set to backend URL
- Now obsolete and harmful with proxy setup

---

## Solution Options

### Option 1: Fix Empty String Check (RECOMMENDED - Requires Code Change)

**Change needed in App.jsx:75:**

```javascript
// ❌ CURRENT (broken):
if (!BASE_URL) {
  setError("Fel: VITE_API_BASE_URL saknas i .env. Ange adressen till backend.");
  setLoading(false);
  return;
}

// ✅ FIXED:
// Remove the check entirely, or change to:
// Empty string is valid for Vite proxy - no check needed
```

**Why this is the right fix:**
- Empty string is CORRECT value for Vite proxy setup
- Check is preventing valid configuration from working
- Other files (apiClient.js) already handle this correctly
- Minimal change, fixes root cause

**Files to update:**
1. `frontend/src/App.jsx:75-81` - Remove or fix check
2. Potentially other files with same pattern

---

### Option 2: Set VITE_API_BASE_URL to Explicit Value (Workaround - No Code Change)

**Change .env to:**

```bash
# Option A: Use current origin (will work with proxy)
VITE_API_BASE_URL=http://localhost:5173

# Option B: Point directly to backend (bypasses proxy, cookies might break)
VITE_API_BASE_URL=http://localhost:3001
```

**With Option A (http://localhost:5173):**
- Fetch becomes: `http://localhost:5173/api/meny`
- Same domain → proxy intercepts
- Forwarded to backend
- ✅ Should work

**With Option B (http://localhost:3001):**
- Fetch becomes: `http://localhost:3001/api/meny`
- Direct backend call (bypasses proxy)
- Cross-origin request
- ⚠️ CORS might block
- ⚠️ Cookies might not work (different ports)

**Pros:**
- No code changes needed
- Quick workaround

**Cons:**
- Not the intended design (empty string is correct)
- Doesn't fix underlying bug
- Option A is redundant (empty string does same thing)
- Option B might break cookies

---

### Option 3: Use apiClient Pattern Everywhere (RECOMMENDED - Requires Code Change)

**Replace direct fetch with centralized API client:**

**Current (App.jsx:83-84):**
```javascript
const res = await fetch(
  `${BASE_URL}/api/meny?restaurang=${restaurant_slug}`
);
```

**Improved:**
```javascript
import { apiRequest, handleApiResponse } from './services/apiClient';

const res = await apiRequest(`/api/meny?restaurang=${restaurant_slug}`);
const data = await handleApiResponse(res);
```

**Benefits:**
- Consistent API handling across all components
- Already handles BASE_URL correctly (`?? ""`)
- Includes timeout and error handling
- Centralized authentication logic
- Same pattern used in other components

**Files to update:**
- `frontend/src/App.jsx` - Use apiClient for menu fetch
- `frontend/src/pages/restaurant/RestaurangVy.jsx` - Already uses direct fetch
- `frontend/src/pages/restaurant/Restaurang.jsx` - Already uses direct fetch
- All other components using `${BASE_URL}/api/*` pattern

---

## Recommended Action Plan

### Immediate Fix (Minimal Changes)

**Step 1: Fix BASE_URL Check**

Edit `frontend/src/App.jsx:75-81`, remove the check:

```javascript
useEffect(() => {
  const fetchMeny = async () => {
    // Empty BASE_URL is valid for Vite proxy - no check needed
    try {
      const res = await fetch(
        `${BASE_URL}/api/meny?restaurang=${restaurant_slug}`
      );
      // ... rest of code
    } catch (err) {
      // ... error handling
    }
  };
  fetchMeny();
}, [restaurant_slug]);
```

**Step 2: Verify Admin Role Loading**

Add console.log in useAuth.js to debug:
```javascript
const data = await fetchProfile();
console.log("Profile loaded:", data); // Debug line
setInloggad(true);
setRole(data.role || "");
setProfil(data);
```

**Step 3: Test**
1. Restart frontend dev server (Vite might need restart)
2. Login as admin
3. Navigate to `/campino?restaurang=campino`
4. Check if menu loads
5. Check if admin button appears in navigation

---

### Long-term Refactoring (Optional)

1. **Migrate all API calls to apiClient.js**
   - Consistent BASE_URL handling
   - Centralized error handling
   - Better timeout and retry logic

2. **Remove BASE_URL from individual components**
   - Only import needed from apiClient.js
   - Reduces duplication
   - Easier to maintain

3. **Add better error boundaries**
   - Prevent crashes from affecting whole app
   - Show user-friendly errors

---

## Why These Issues Weren't Caught Before

1. **Different code patterns in different files**
   - apiClient.js uses `?? ""`  (correct)
   - App.jsx uses direct check (incorrect)
   - Inconsistency led to hidden bug

2. **Proxy setup changed environment variable meaning**
   - Originally `VITE_API_BASE_URL=http://localhost:3001` (full URL)
   - After proxy: `VITE_API_BASE_URL=` (empty for relative)
   - Old validation code wasn't updated

3. **Testing focused on login flow**
   - Login works through apiClient.js (correct pattern)
   - Restaurant pages use App.jsx (broken pattern)
   - Issue only appears when navigating to restaurants

---

## Files Summary

### Files Modified During Login Fix
1. ✅ `frontend/vite.config.js` - Proxy configuration
2. ✅ `frontend/.env` - Set `VITE_API_BASE_URL=`
3. ✅ `backend/src/controllers/authController.js` - sameSite: 'lax'
4. ✅ `backend/authMiddleware.js` - Read both token names
5. ✅ `backend/src/app.js` - Route order fix

### Files Needing Updates for Restaurant Pages
1. ❌ `frontend/src/App.jsx:75-81` - Remove BASE_URL check (CRITICAL)
2. ⚠️ Possibly other components with same pattern

### Files with Correct Pattern (No Changes Needed)
1. ✅ `frontend/src/services/apiClient.js` - Already correct
2. ✅ `frontend/src/hooks/useAuth.js` - Uses apiClient
3. ✅ `frontend/src/services/api.js` - Uses apiClient (likely)

---

## Current System State

**Working:**
- ✅ Backend running on port 3001
- ✅ Frontend running on port 5173
- ✅ PostgreSQL running (6 processes)
- ✅ Vite proxy configured and working
- ✅ Login flow functional
- ✅ JWT tokens being set correctly
- ✅ Authentication middleware working
- ✅ Cookie handling via proxy working

**Not Working:**
- ❌ Restaurant pages (blocked by BASE_URL check)
- ❌ Admin tab not visible (needs investigation)
- ❌ Any page that fetches menu data

**Next Steps:**
1. Fix BASE_URL check in App.jsx (1 line change)
2. Debug admin role loading (add console.log)
3. Test restaurant pages
4. Verify admin button appears
5. Document final state
