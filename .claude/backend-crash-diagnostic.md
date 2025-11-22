# Backend Crash Diagnostic
**Date:** 2025-11-22
**Issue:** Backend crashes when attempting login
**Status:** 🔴 Backend starts but crashes on first request

---

## Current Situation

- ✅ Frontend running: `npm run dev` (port 5173)
- ⚠️ Backend running: `npm start` but crashes
- ⚠️ PostgreSQL: Shows "active (exited)" - possibly not fully running
- ❌ Port 3001: Nothing listening (backend died)

---

## PostgreSQL Status Analysis

```
● postgresql.service - PostgreSQL RDBMS
     Active: active (exited) since Fri 2025-11-21 18:19:20 CET; 21h ago
```

**Problem:** Status shows "active (exited)" which is unusual for PostgreSQL.

**What this means:**
- The systemd service is "active" but the process has "exited"
- This might mean:
  - PostgreSQL started but then stopped
  - No actual database processes running
  - Socket-based activation (waits for connection)
  - Or PostgreSQL isn't actually running

---

## Most Likely Crash Causes

### Cause 1: Database Connection Failure 🔴 MOST LIKELY
**Symptoms:**
- Backend starts successfully
- Crashes on first database query (during login)
- Error about "connection refused" or "ECONNREFUSED" to database

**Why:**
- PostgreSQL might not be fully running
- Database credentials wrong in `.env`
- Database doesn't exist
- Wrong host/port for database

---

### Cause 2: Missing Environment Variables 🟡 POSSIBLE
**Symptoms:**
- Backend starts but crashes on login
- Error about undefined values
- JWT_SECRET or DATABASE_URL missing

**Why:**
- `.env` file missing variables
- `.env` file not loaded properly
- Required variables not set

---

### Cause 3: Unhandled Exception in Login Route 🟡 POSSIBLE
**Symptoms:**
- Backend crashes specifically on `/api/auth/login`
- No error handling in login code
- Exception kills the process

**Why:**
- Bug in authentication logic
- Password comparison fails
- No try-catch wrapper

---

### Cause 4: Database Connection Pool Exhausted 🟢 UNLIKELY
**Symptoms:**
- Works first time, fails after
- "Too many connections" error

---

## Diagnostic Steps to Run

### Step 1: Check Backend Terminal Output ⭐ MOST IMPORTANT

**Look for these error patterns:**

**Database connection error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: password authentication failed for user "postgres"
Error: database "annos_db" does not exist
```

**Environment variable error:**
```
Error: JWT_SECRET is not defined
TypeError: Cannot read property 'JWT_SECRET' of undefined
```

**Login route error:**
```
Error in login route: ...
Unhandled rejection: ...
```

---

### Step 2: Verify PostgreSQL is ACTUALLY Running

```bash
# Check PostgreSQL process (more reliable than systemctl)
ps aux | grep postgres

# Should see multiple postgres processes like:
# postgres: main process
# postgres: checkpointer
# postgres: writer
# postgres: wal writer

# If you see nothing or only grep, PostgreSQL is NOT running
```

**If not running, start it:**
```bash
sudo systemctl start postgresql
# Then check again:
ps aux | grep postgres
```

---

### Step 3: Test Database Connection Directly

```bash
# Try connecting to PostgreSQL
psql -U postgres -l

# If that fails, try:
sudo -u postgres psql -l

# Check if your database exists
psql -U postgres -c "\l" | grep annos
```

**If connection fails:**
- PostgreSQL is not running properly
- Credentials are wrong
- PostgreSQL not configured correctly

---

### Step 4: Check Backend Environment File

```bash
# View backend .env file (without showing passwords)
cat backend/.env | grep -E "DATABASE|JWT|PORT" | sed 's/=.*/=***/'

# Should have:
# DATABASE_URL=***
# JWT_SECRET=***
# PORT=***
```

**Required variables:**
- `DATABASE_URL` or `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`
- `JWT_SECRET`
- `PORT` (should be 3001)

---

### Step 5: Test Backend API Directly (Without Frontend)

```bash
# If backend is running, test directly:
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

# If backend crashes, you'll see the error in backend terminal
```

---

## Solution Options (Without Code Changes)

### Solution 1: Restart PostgreSQL Properly ⭐ RECOMMENDED

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Verify it's actually running
ps aux | grep postgres

# Should see multiple postgres processes

# Check status
sudo systemctl status postgresql
# Should show: "active (running)" NOT "active (exited)"

# Restart backend
cd backend
npm start
```

---

### Solution 2: Verify Database Exists and Is Accessible

```bash
# Connect as postgres user
sudo -u postgres psql

# Inside psql:
\l                          # List all databases
\c annos_db                # Connect to your database (replace with actual name)
\dt                        # List tables
\q                         # Quit

# If database doesn't exist, create it:
sudo -u postgres createdb annos_db
```

---

### Solution 3: Check Backend Environment Variables

```bash
# Navigate to backend
cd backend

# Check .env file exists
ls -la .env

# Verify required variables are set
cat .env

# Make sure these are present:
# - DATABASE_URL or DB_* variables
# - JWT_SECRET
# - PORT=3001
```

---

### Solution 4: Run Backend with Detailed Logging

```bash
cd backend

# Run with debug output
DEBUG=* npm start

# Or if using node directly:
NODE_ENV=development node src/server.js

# Watch for specific error messages when login is attempted
```

---

### Solution 5: Check Database Connection in Backend Logs

**When backend starts, look for:**

✅ **Good startup:**
```
Server running on port 3001
Database connected successfully
PostgreSQL connected
```

❌ **Bad startup (crashes):**
```
Server running on port 3001
Error: connect ECONNREFUSED 127.0.0.1:5432
Connection terminated
```

---

## Quick Fix Checklist

Run these in order:

1. **Check backend terminal for error message** 👀
   - What does it say when it crashes?

2. **Verify PostgreSQL is running:**
   ```bash
   ps aux | grep postgres
   ```

3. **Restart PostgreSQL if needed:**
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Check database exists:**
   ```bash
   sudo -u postgres psql -c "\l" | grep annos
   ```

5. **Verify backend .env file:**
   ```bash
   cat backend/.env
   ```

6. **Restart backend and watch logs:**
   ```bash
   cd backend && npm start
   ```

7. **Try login and check backend terminal for crash error**

---

## What I Need to See Next

To help you further, please provide:

1. **Backend terminal output when it crashes** (the error message)
2. **PostgreSQL process check:** Output of `ps aux | grep postgres`
3. **Backend .env check:** Does `backend/.env` exist and have DATABASE_URL/JWT_SECRET?

---

## Most Likely Fix

Based on PostgreSQL status "active (exited)", I suspect:

1. **PostgreSQL isn't fully running**
2. **Backend can't connect to database**
3. **Backend crashes on first database query (during login)**

**Try this:**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify it's running
ps aux | grep postgres

# Restart backend
cd backend
npm start

# Try login again
```
