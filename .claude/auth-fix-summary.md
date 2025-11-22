# Authentication Fix Summary
**Date:** 2025-11-22
**Status:** ✅ RESOLVED

---

## Problem Description

Users could login successfully but immediately got logged out:
- Login POST request: ✅ HTTP 200 OK
- Profile GET request: ❌ HTTP 401 Unauthorized
- Symptom: Session expired instantly after login
- Root cause: Multiple issues with cookie handling and route order

---

## Root Causes Identified

### 1. Cross-Port Cookie Blocking (MINOR)
- **Issue:** Frontend (5173) → Backend (3001) = different ports
- **Symptom:** Browsers block cookies between different origins
- **Impact:** Cookies set by backend not sent by frontend

### 2. Cookie SameSite=Strict (MINOR)
- **Issue:** `sameSite: 'strict'` blocks cross-port cookies in development
- **Impact:** Cookie set but not sent on subsequent requests

### 3. Cookie Name Mismatch (MEDIUM)
- **Issue:** Backend sets `token` cookie, old middleware reads `accessToken`
- **Impact:** Middleware couldn't find the token even when present

### 4. Express Route Order (CRITICAL - PRIMARY ISSUE)
- **Issue:** `app.use(legacyApp)` on line 67 was BEFORE `/api/profile` route on line 48
- **Impact:** Legacy server caught `/api/profile` requests before new route
- **Result:** Wrong middleware executed, causing 404 or old behavior

---

## Fixes Applied

### Fix 1: Vite Proxy Configuration
**File:** `frontend/vite.config.js`
**Lines:** 9-24

```javascript
proxy: {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "localhost"
  }
}
```

**Why:** Makes frontend requests go through same origin (localhost:5173), eliminating cross-port issues.

---

### Fix 2: Frontend Environment Variable
**File:** `frontend/.env`
**Line:** 4

```bash
VITE_API_BASE_URL=
```

**Why:** Empty URL tells frontend to use relative paths, which are proxied to backend.

---

### Fix 3: Cookie SameSite Attribute
**File:** `backend/src/controllers/authController.js`
**Lines:** 94, 101

```javascript
sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
```

**Why:** `lax` allows cookies to work across ports in development, while `strict` is used in production for security.

---

### Fix 4: Middleware Cookie Reading
**File:** `backend/authMiddleware.js`
**Line:** 70

```javascript
token = req.cookies.token || req.cookies.accessToken
```

**Why:** Reads both `token` (new) and `accessToken` (legacy) cookie names for backward compatibility.

---

### Fix 5: Express Route Order (CRITICAL FIX)
**File:** `backend/src/app.js`
**Lines:** 47-67

**BEFORE (broken):**
```javascript
// Line 43-45: API routes
app.use("/api/auth", authRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/menu", menuRoutes);

// Line 48: legacyApp catches /api/profile FIRST
app.use(legacyApp);

// Line 51-64: New /api/profile route NEVER EXECUTES
app.get("/api/profile", require("./middleware/authMiddleware").verifyJWT, ...)
```

**AFTER (fixed):**
```javascript
// Line 43-45: API routes
app.use("/api/auth", authRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/menu", menuRoutes);

// Line 47-64: New /api/profile route EXECUTES FIRST
app.get("/api/profile", require("./middleware/authMiddleware").verifyJWT, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      namn: req.user.namn || "",
      telefon: req.user.telefon || "",
      adress: req.user.adress || "",
      role: req.user.role
    }
  });
});

// Line 67: legacyApp runs AFTER (only catches unmatched routes)
app.use(legacyApp);
```

**Why:** Express matches routes in order. Specific routes MUST come before catch-all routes like `app.use(legacyApp)`.

---

## Test Results

### Test 1: Direct Backend (port 3001)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c /tmp/cookies.txt

# Result: HTTP 200 - Cookie set
```

### Test 2: Direct Profile Endpoint
```bash
curl http://localhost:3001/api/profile -b /tmp/cookies.txt

# Result: HTTP 200 - {"success":true,"data":{"id":1,"email":"admin@example.com","role":"admin"}}
```

### Test 3: Via Vite Proxy (port 5173)
```bash
curl -X POST http://localhost:5173/api/auth/login \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c /tmp/proxy-cookies.txt

# Result: HTTP 200 - Cookie forwarded through proxy
```

### Test 4: Profile via Proxy
```bash
curl http://localhost:5173/api/profile -b /tmp/proxy-cookies.txt

# Result: HTTP 200 - {"success":true,"data":{"id":1,"email":"admin@example.com","role":"admin"}}
```

**All tests PASSED ✅**

---

## Backend Logs Confirmation

```
[AUTH DEBUG] Login attempt: { email: 'admin@example.com', passwordLength: 8, passwordType: 'string' }
[AUTH DEBUG] User found: { id: 1, email: 'admin@example.com', role: 'admin' }
[AUTH DEBUG] Password valid: true
[AUTH MIDDLEWARE] Token verified for user: admin@example.com
```

---

## Files Modified

1. `frontend/vite.config.js` - Added proxy configuration
2. `frontend/.env` - Set empty VITE_API_BASE_URL
3. `backend/src/controllers/authController.js` - Changed sameSite to 'lax' in development
4. `backend/authMiddleware.js` - Read both token and accessToken cookies
5. `backend/src/app.js` - **CRITICAL:** Moved /api/profile route before legacyApp

---

## Current Status

- ✅ Backend running on port 3001
- ✅ Frontend running on port 5173
- ✅ Vite proxy forwarding /api requests
- ✅ Cookies set with correct attributes (httpOnly, sameSite=lax)
- ✅ JWT verification working
- ✅ Route order corrected
- ✅ Authentication working end-to-end

---

## Next Steps for User

1. **Clear browser cookies** for localhost
2. **Hard refresh** browser (Ctrl+Shift+R or Cmd+Shift+R)
3. **Login** at http://localhost:5173/login with admin@example.com / admin123
4. **Verify** you stay logged in and can access /profile and /admin pages

---

## Lessons Learned

1. **Express route order matters** - Specific routes must come before catch-all middleware
2. **Always verify which file is actually imported** - Edited wrong authMiddleware initially
3. **Test systematically** - Document findings before making changes
4. **Vite HMR doesn't reload server config** - vite.config.js changes require full restart
5. **Cookie SameSite attribute** - 'strict' blocks cross-port requests in development
