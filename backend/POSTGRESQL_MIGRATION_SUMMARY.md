# PostgreSQL Migration Summary

## ✅ Completed Migration from SQLite to PostgreSQL

This document summarizes all the changes made to convert the Annos application from SQLite to PostgreSQL.

## 🔧 Database Connection Changes

### 1. Database Connection (`backend/db.js`)
- ✅ Already configured with PostgreSQL connection pool
- ✅ Uses environment variables for connection settings
- ✅ Includes connection error handling and logging

### 2. Package Dependencies (`backend/package.json`)
- ✅ `pg` module already installed (v8.16.3)
- ✅ `sqlite3` module still present for potential fallback

## 🔄 API Endpoint Conversions

### 1. `/api/register` Endpoint
**Before (SQLite):**
```javascript
db.get("SELECT id FROM users WHERE email = ?", [email], callback)
db.run("INSERT INTO users (...) VALUES (?, ?, ?, ?, ?)", [...], callback)
```

**After (PostgreSQL):**
```javascript
await pool.query("SELECT id FROM users WHERE email = $1", [email])
await pool.query("INSERT INTO users (...) VALUES ($1, $2, $3, $4, $5) RETURNING id", [...])
```

### 2. `/api/order` Endpoint
**Before (SQLite):**
```javascript
db.serialize(() => {
  db.run("BEGIN TRANSACTION");
  db.run("INSERT INTO orders (...) VALUES (?, ?, ...)", [...], function(err) {
    const orderId = this.lastID;
    // Nested callbacks for items and options
  });
});
```

**After (PostgreSQL):**
```javascript
const client = await pool.connect();
await client.query('BEGIN');
const orderResult = await client.query("INSERT INTO orders (...) VALUES ($1, $2, ...) RETURNING id", [...]);
const orderId = orderResult.rows[0].id;
// Sequential async/await for items and options
await client.query('COMMIT');
```

### 3. `/api/profile` Endpoint
**Before (SQLite):**
```javascript
db.get("SELECT ... FROM users WHERE id = ?", [userId], (err, user) => {
  db.all("SELECT * FROM orders WHERE customer_email = ?", [user.email], callback);
});
```

**After (PostgreSQL):**
```javascript
const userResult = await pool.query("SELECT ... FROM users WHERE id = $1", [userId]);
const ordersResult = await pool.query("SELECT * FROM orders WHERE customer_email = $1", [user.email]);
```

### 4. `/api/my-orders` Endpoint
**Before (SQLite):**
```javascript
db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
  db.all("SELECT * FROM orders WHERE customer_email = ?", [user.email], callback);
});
```

**After (PostgreSQL):**
```javascript
const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
const ordersResult = await pool.query("SELECT * FROM orders WHERE customer_email = $1", [user.email]);
```

### 5. `/api/orders` Endpoint (Alternative)
- ✅ Converted to use PostgreSQL with same pattern as `/api/my-orders`

## 🔐 Authentication Routes (`backend/routes/auth.js`)

### 1. Email Login (`/api/auth/login`)
**Before (SQLite):**
```javascript
db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
  // Callback-based error handling
});
```

**After (PostgreSQL):**
```javascript
const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
// Promise-based error handling with try/catch
```

### 2. Google OAuth (`/api/auth/google`)
**Before (SQLite):**
```javascript
db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
  if (!user) {
    db.run("INSERT INTO users (...) VALUES (?, ?, ?)", [...], function(err2) {
      handleUser(this.lastID);
    });
  }
});
```

**After (PostgreSQL):**
```javascript
const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
if (userResult.rows.length === 0) {
  const insertResult = await pool.query("INSERT INTO users (...) VALUES ($1, $2, $3) RETURNING id", [...]);
  handleUser(insertResult.rows[0].id);
}
```

### 3. Apple OAuth (`/api/auth/apple`)
- ✅ Converted using same pattern as Google OAuth

### 4. Refresh Token (`/api/auth/refresh`)
**Before (SQLite):**
```javascript
db.get("SELECT id, role FROM users WHERE id = ?", [payload.userId], (err, user) => {
  // Callback-based handling
});
```

**After (PostgreSQL):**
```javascript
const userResult = await pool.query("SELECT id, role FROM users WHERE id = $1", [payload.userId]);
// Promise-based handling
```

## 🛠️ Admin User Creation

### Updated Script (`backend/skapaAdmin.js`)
**Before (SQLite):**
```javascript
const db = new sqlite3.Database("./orders.sqlite");
db.run("INSERT INTO users (...) VALUES (?, ?, ...)", [...], function(err) {
  console.log(`User created with ID ${this.lastID}`);
});
```

**After (PostgreSQL):**
```javascript
const pool = require("./db");
const result = await pool.query("INSERT INTO users (...) VALUES ($1, $2, ...) RETURNING id", [...]);
console.log(`User created with ID ${result.rows[0].id}`);
```

## 🧪 Test Updates (`backend/server.test.js`)

### Database Connection
**Before:**
```javascript
const { db } = require('./orderDB');
afterAll((done) => { db.close(done); });
```

**After:**
```javascript
const pool = require('./db');
afterAll(async () => { await pool.end(); });
```

### Test Queries
**Before:**
```javascript
const inserted = await new Promise((resolve, reject) => {
  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});
```

**After:**
```javascript
const inserted = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
```

## 📊 Key Changes Summary

### SQL Syntax Changes
- ✅ `?` placeholders → `$1, $2, $3...` placeholders
- ✅ `this.lastID` → `result.rows[0].id` with `RETURNING` clause
- ✅ `BEGIN TRANSACTION` → `BEGIN` + `COMMIT`
- ✅ `db.serialize()` → `async/await` with connection pooling

### Error Handling
- ✅ Callback-based → Promise-based with try/catch
- ✅ Consistent error logging across all endpoints
- ✅ Proper transaction rollback on errors

### Performance Improvements
- ✅ Connection pooling for better performance
- ✅ Sequential async/await instead of nested callbacks
- ✅ Proper resource cleanup with `client.release()`

## 🚀 Benefits Achieved

1. **Future-Ready**: Ready for AWS and cloud deployment
2. **Better Performance**: PostgreSQL offers superior performance and scalability
3. **Advanced Features**: Access to PostgreSQL's advanced features (JSON operations, full-text search, etc.)
4. **Production Ready**: Better suited for production environments
5. **Maintainable Code**: Cleaner async/await code instead of callback hell

## 🔧 Usage Instructions

### Running the Application
1. Ensure PostgreSQL is running
2. Set up environment variables in `.env`:
   ```
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=annos_dev
   DB_PASSWORD=your_password
   DB_PORT=5432
   ```
3. Start the server: `npm start`

### Creating Admin User
```bash
cd backend
node skapaAdmin.js [restaurant_slug]
```

### Running Tests
```bash
cd backend
npm test
```

## ✅ All Endpoints Converted

- ✅ `/api/register` - User registration
- ✅ `/api/login` - User login (in server.js)
- ✅ `/api/order` - Order creation
- ✅ `/api/profile` - User profile retrieval
- ✅ `/api/my-orders` - User's orders
- ✅ `/api/orders` - Alternative orders endpoint
- ✅ `/api/auth/login` - Auth route login
- ✅ `/api/auth/google` - Google OAuth
- ✅ `/api/auth/apple` - Apple OAuth
- ✅ `/api/auth/refresh` - Token refresh

## 🔧 Additional Files Converted

### Migration Scripts
- ✅ `backend/migrateDatabase.js` - Database migration script
- ✅ `backend/migrateUserRoles.js` - User roles migration
- ✅ `backend/migrateRestaurangSlug.js` - Restaurant slug migration
- ✅ `backend/tasks/generatePayouts.js` - Payout generation script

### Key Changes in Migration Scripts
- ✅ SQLite `db.serialize()` → PostgreSQL `async/await`
- ✅ SQLite `PRAGMA table_info()` → PostgreSQL `information_schema.columns`
- ✅ SQLite `db.run()` → PostgreSQL `pool.query()`
- ✅ SQLite `this.lastID` → PostgreSQL `RETURNING id`
- ✅ SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` → PostgreSQL `SERIAL PRIMARY KEY`
- ✅ SQLite `TEXT` → PostgreSQL `VARCHAR(255)` or `TEXT`
- ✅ SQLite `INTEGER` → PostgreSQL `INTEGER` (compatible)
- ✅ SQLite `CURRENT_TIMESTAMP` → PostgreSQL `NOW()`

The migration is complete and all endpoints and utility scripts are now using PostgreSQL with proper error handling, transactions, and modern async/await patterns.
