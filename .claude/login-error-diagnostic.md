# Login Error Diagnostic
**Date:** 2025-11-22
**Error Location:** http://localhost:5173/login
**Status:** ❌ Backend Connection Refused

---

## Error Message

```
3:40:12 PM [vite] http proxy error: /api/auth/login
Error: connect ECONNREFUSED 127.0.0.1:3001
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)
```

---

## What This Means

The **frontend is running** (port 5173) but the **backend is NOT running** (port 3001).

- ✅ Frontend: Running on localhost:5173
- ❌ Backend: NOT listening on localhost:3001
- 🔄 Vite Proxy: Trying to forward `/api/auth/login` → backend
- ❌ Connection: Refused (nothing is listening on port 3001)

---

## Possible Causes

### Option 1: Backend Server Never Started
**Likelihood:** 🔴 MOST LIKELY

The backend server was not started at all, or was stopped/crashed.

**Symptoms:**
- No `node` process running for backend
- Port 3001 is not in use
- No backend logs visible

---

### Option 2: Backend Crashed After Starting
**Likelihood:** 🟡 POSSIBLE

The backend started but crashed due to:
- Database connection error
- Missing environment variables
- Syntax error in backend code
- Port already in use (but freed now)

**Symptoms:**
- Backend logs show error before crash
- May have seen startup messages initially
- Error logs in terminal where backend was started

---

### Option 3: Backend Running on Different Port
**Likelihood:** 🟢 UNLIKELY

Backend is running but listening on a different port than expected.

**Symptoms:**
- Backend appears to be running
- Different port number in backend logs
- Environment variable PORT set to wrong value

---

### Option 4: Backend Process Killed/Stopped
**Likelihood:** 🟡 POSSIBLE

Backend was running earlier but:
- Process was manually killed (Ctrl+C)
- Terminal was closed
- System killed the process (out of memory, etc.)

**Symptoms:**
- Backend was working before
- No backend process found now
- Terminal where backend ran is closed

---

## Solution Options (Without Making Code Changes)

### Solution 1: Start the Backend Server ⭐ RECOMMENDED
**Steps:**
1. Open a new terminal
2. Navigate to backend directory: `cd backend`
3. Start the backend: `npm start` or `node src/server.js`
4. Wait for "Server running on port 3001" message
5. Try logging in again at http://localhost:5173/login

**Expected Output:**
```
Server running on port 3001
Database connected successfully
```

---

### Solution 2: Check Backend Logs (If Backend Was Running)
**Steps:**
1. Check the terminal where backend was started
2. Look for error messages before crash
3. Common errors:
   - `EADDRINUSE` → Port already taken
   - `Connection refused` → Database not running
   - `MODULE_NOT_FOUND` → Missing dependencies
4. Resolve the specific error shown
5. Restart backend

---

### Solution 3: Verify Backend Dependencies
**Steps:**
1. Navigate to backend: `cd backend`
2. Check if `node_modules` exists: `ls node_modules`
3. If missing, install: `npm install`
4. Start backend: `npm start`

---

### Solution 4: Check Database Connection
**Steps:**
1. Verify PostgreSQL is running: `sudo systemctl status postgresql` (Linux) or `brew services list` (Mac)
2. If not running, start it: `sudo systemctl start postgresql` or `brew services start postgresql`
3. Verify database exists: `psql -U postgres -l`
4. Check backend `.env` file has correct DB credentials
5. Start backend: `npm start`

---

### Solution 5: Check for Port Conflicts
**Steps:**
1. Check what's using port 3001: `lsof -i :3001` or `netstat -ano | findstr 3001`
2. If another process is using it, either:
   - Kill that process
   - Or change backend port in `backend/.env`: `PORT=3002`
   - Update frontend proxy in `frontend/vite.config.js` to match
3. Restart backend

---

## Quick Diagnostic Commands

```bash
# Check if backend is running
lsof -i :3001

# Check for any node backend processes
ps aux | grep "node.*backend"

# Try starting backend manually
cd backend && npm start

# Check backend dependencies installed
ls backend/node_modules | wc -l

# Check database is running (PostgreSQL)
sudo systemctl status postgresql
# OR for Mac:
brew services list | grep postgresql
```

---

## Verification Steps

After starting the backend, verify:

1. **Backend logs show:**
   ```
   Server running on port 3001
   Database connected successfully
   ```

2. **Port 3001 is in use:**
   ```bash
   lsof -i :3001
   # Should show: node process
   ```

3. **Backend responds directly:**
   ```bash
   curl http://localhost:3001/api/auth/login
   # Should return JSON (not connection refused)
   ```

4. **Login works through frontend:**
   - Go to http://localhost:5173/login
   - Enter credentials
   - Should redirect to home/dashboard

---

## Current System State

**Checked at:** 2025-11-22

- ✅ Frontend: Running on port 5173
- ❌ Backend: NOT running on port 3001
- ✅ Vite Proxy: Configured correctly in vite.config.js
- ❓ Database: Status unknown (check separately)

---

## Most Likely Solution

**START THE BACKEND SERVER:**

```bash
cd backend
npm start
```

Then try logging in again at http://localhost:5173/login
