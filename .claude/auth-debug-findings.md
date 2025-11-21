# Authentication Debug Findings - 2025-11-21

## Problem Summary
User gets logged in successfully on backend but immediately receives 401 Unauthorized when accessing `/api/profile`.

## Backend Logs Analysis

### What Works ✅
```
[AUTH DEBUG] Login attempt: {
  email: 'admin@example.com',
  passwordLength: 8,
  passwordType: 'string'
}
[AUTH DEBUG] User found: { id: 1, email: 'admin@example.com', role: 'admin' }
[AUTH DEBUG] Password valid: true
```
- Login credentials are correct
- User is found in database
- Password verification succeeds
- JWT token is generated

### What Fails ❌
- No `[AUTH MIDDLEWARE]` logs appear when `/api/profile` is called
- This means the cookie **never reaches** the backend on subsequent requests
- The middleware doesn't even execute

## Current Configuration

### CORS (backend/src/config/cors.js)
```javascript
{
  origin: "http://localhost:5173",    // ✅ Correct
  credentials: true,                   // ✅ Correct
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],  // ✅ Correct
  exposedHeaders: ['Set-Cookie']       // ✅ Correct
}
```

### Cookie Settings (backend/src/controllers/authController.js:91-95)
```javascript
res.cookie('token', result.token, {
  httpOnly: true,                      // ✅ Correct
  secure: false,                       // ✅ Correct (dev mode)
  sameSite: 'lax',                     // ⚠️ PROBLEM HERE
  maxAge: 24 * 60 * 60 * 1000
});
```

### Frontend API Client (frontend/src/services/apiClient.js:10)
```javascript
credentials: "include"  // ✅ Correct
```

## Root Cause Analysis

### Problem: sameSite='lax' + Cross-Port Requests

**Why it fails:**
1. Frontend runs on `http://localhost:5173`
2. Backend runs on `http://localhost:3001`
3. These are **different origins** (different ports)
4. `sameSite: 'lax'` blocks cookies on cross-site requests **in some contexts**
5. Modern browsers (Chrome, Firefox) treat different ports as "cross-site" for cookie purposes

**What happens:**
1. Login POST to `/api/auth/login` → Cookie is set ✅
2. Browser receives cookie with `sameSite: lax` ✅
3. Frontend tries GET `/api/profile` from different port ❌
4. Browser **refuses to send the cookie** because of `sameSite: lax`
5. Backend receives request **without cookie**
6. Middleware finds no token → 401 Unauthorized

## Solutions (in order of preference)

### Solution 1: sameSite='none' + secure=true (Requires HTTPS) ⭐
**Best for production, but requires HTTPS setup**
```javascript
res.cookie('token', result.token, {
  httpOnly: true,
  secure: true,              // REQUIRES HTTPS
  sameSite: 'none',          // Allows cross-site
  maxAge: 24 * 60 * 60 * 1000
});
```
**Problem:** Needs HTTPS locally (mkcert, nginx proxy, etc.)

### Solution 2: sameSite='none' + secure=false (Development only) ⚠️
**Works for local dev, NOT for production**
```javascript
res.cookie('token', result.token, {
  httpOnly: true,
  secure: false,
  sameSite: 'none',
  maxAge: 24 * 60 * 60 * 1000
});
```
**Problem:** Some modern browsers block `sameSite=none` without `secure=true`

### Solution 3: Run frontend and backend on same port (Vite Proxy) 🎯
**Best for development without HTTPS**

In `frontend/vite.config.js`:
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

Then update `frontend/.env`:
```bash
VITE_API_BASE_URL=  # Empty = use same origin
```

**Benefits:**
- No cross-origin issues
- Cookies work with `sameSite: 'lax'`
- Matches production setup (usually same domain)
- No HTTPS needed

### Solution 4: Use Authorization header instead of cookies
**More work, but more modern**
- Store token in localStorage
- Send as `Authorization: Bearer <token>`
- Update all API calls
- Update middleware

## Referenced Files

### Backend
- `backend/src/app.js:29` - cookie-parser middleware
- `backend/src/config/cors.js:8-15` - CORS configuration
- `backend/src/controllers/authController.js:91-95` - Cookie settings
- `backend/src/middleware/authMiddleware.js:68-71` - Cookie reading logic
- `backend/.env:9-10` - NODE_ENV and FRONTEND_ORIGIN

### Frontend
- `frontend/src/services/apiClient.js:10` - credentials: 'include'
- `frontend/src/services/auth/authService.js:113-151` - Login flow
- `frontend/.env:3` - VITE_API_BASE_URL

### Documentation
- `.github/workflows/ci.yml` - CI/CD checks
- `backend/POSTGRESQL_MIGRATION_SUMMARY.md:55` - Profile endpoint docs

## Recommended Action

**For development:** Use Solution 3 (Vite Proxy)
**For production:** Use Solution 1 (sameSite='none' + HTTPS)

This is a common issue when developing SPAs with separate frontend/backend servers.
