# 🗺️ Implementation Roadmap - Multi-Tenant System

**Datum:** 2025-11-23
**Status:** PLANNING PHASE
**Estimated Total Time:** ~40-50 timmar (fördelat över 5 faser)

---

## 📋 Översikt - Features att Implementera

### Användarhistorier:

1. ✅ **Som admin** vill jag kunna lägga till nya restauranger lätt och deras meny
2. ✅ **Som admin** vill jag kunna ge ut roller som kurir-roll och restaurang-roll
3. ✅ **Som kund** ska jag kunna bli medlem
4. ✅ **Som admin** vill jag kunna administrera kunder men INTE se personnummer/känslig info utan kryptering (GDPR)
5. ✅ **Som kurir** ska jag ha tillgång till min historik och INTE andras historik
6. ✅ **Som restaurang** ska jag endast kunna se orders som kommit in till vår restaurang och INTE andras
7. ✅ **Som restaurang** vill jag kunna kontakta admin för hjälp med problem
8. ✅ **Som admin** vill jag se kurir-kontrakt och relevant info i kurir-profil när de får kurir-rollen
9. ✅ **Som kund** ska jag INTE ha tillgång till eller se det kurir och restaurang ser

---

## 🎯 PHASE 1: Roll & Permission System (Foundation) - FÖRBÄTTRAD

**Prioritet:** 🔴 KRITISK - Måste göras först
**Estimerad tid:** ~9-12 timmar
**Komplexitet:** MEDIUM
**Kompatibilitet:** ✅ **100% Bakåtkompatibel** (Se: `.claude/PHASE1_COMPATIBILITY_ANALYSIS.md`)

### Mål:
Implementera ett robust permission-baserat autentiseringssystem med granulära behörigheter, audit logging, och säkerhet enligt industry standards.

### Förbättringar från Original Plan:
- ✅ Permission-baserat system istället för bara roller
- ✅ Audit logging för GDPR compliance
- ✅ Rate limiting på känsliga endpoints
- ✅ JWT blacklist för logout
- ✅ Performance-optimerad med caching
- ✅ Gradvis migration utan breaking changes

---

### Tasks:

#### 1.1 Backend - Permission System Foundation (2-3h)

**Befintlig Status:**
- ✅ `users` tabell har redan `role` (VARCHAR) och `restaurant_slug`
- ✅ `verifyJWT` och `verifyRole` middleware finns redan
- ✅ Admin inherit fungerar redan (authMiddleware.js:102)

**Vad vi lägger till:**

**A. Skapa permissions-tabeller:**
```sql
-- Permissions tabell
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,     -- 'orders:view:all', 'orders:view:own'
  description TEXT,
  category VARCHAR(50),                  -- 'orders', 'menu', 'users'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role-permission mapping (använder role VARCHAR, inte FK)
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,        -- 'admin', 'restaurant', 'courier', 'customer'
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_name, permission_id)
);

-- Index för snabbare lookups
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
```

**B. Seed initial permissions:**
```sql
-- Order permissions
INSERT INTO permissions (name, description, category) VALUES
  ('orders:view:all', 'View all orders across restaurants', 'orders'),
  ('orders:view:own', 'View only own restaurant/courier orders', 'orders'),
  ('orders:create', 'Create new orders', 'orders'),
  ('orders:update:status', 'Update order status', 'orders'),
  ('orders:cancel', 'Cancel orders', 'orders'),

-- Menu permissions
  ('menu:view', 'View restaurant menu', 'menu'),
  ('menu:edit', 'Edit restaurant menu', 'menu'),
  ('menu:create', 'Create menu items', 'menu'),

-- User permissions
  ('users:view', 'View user list', 'users'),
  ('users:manage', 'Manage user accounts and roles', 'users'),
  ('users:delete', 'Delete user accounts', 'users'),

-- Customer data permissions
  ('customers:view', 'View customer list (masked data)', 'customers'),
  ('customers:decrypt', 'Decrypt sensitive customer data', 'customers'),
  ('customers:export', 'Export customer data (GDPR)', 'customers');

-- Map permissions to roles
INSERT INTO role_permissions (role_name, permission_id)
SELECT 'admin', id FROM permissions;  -- Admin har ALLA

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'restaurant', id FROM permissions
WHERE name IN ('orders:view:own', 'orders:update:status', 'menu:view', 'menu:edit');

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'courier', id FROM permissions
WHERE name IN ('orders:view:own', 'orders:update:status');

INSERT INTO role_permissions (role_name, permission_id)
SELECT 'customer', id FROM permissions
WHERE name IN ('orders:view:own', 'orders:create', 'menu:view');
```

**C. Migration script:**
```bash
# Skapa: backend/migrations/001_permissions_system.js
node backend/migrations/001_permissions_system.js
```

**Tasks:**
- [ ] Skapa `backend/migrations/001_permissions_system.js`
- [ ] Kör migration på development DB
- [ ] Verifiera att tabeller skapades korrekt
- [ ] Verifiera att permissions seedades

---

#### 1.2 Backend - PermissionService (2-3h)

**Skapa: `backend/src/services/permissionService.js`**

```javascript
const pool = require('../config/database');

class PermissionService {
  /**
   * Hämta alla permissions för en user baserat på deras role
   * Använder caching för performance
   */
  static async getUserPermissions(userId) {
    try {
      const query = `
        SELECT DISTINCT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN users u ON rp.role_name = u.role
        WHERE u.id = $1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Get user permissions error:', error);
      throw error;
    }
  }

  /**
   * Kolla om user har specifik permission
   */
  static async hasPermission(userId, permissionName) {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permissionName);
    } catch (error) {
      console.error('Check permission error:', error);
      return false;
    }
  }

  /**
   * Check permission med admin override
   * Admin har automatiskt alla permissions
   */
  static async checkPermission(user, permissionName) {
    // Admin har alla permissions
    if (user.role === 'admin') {
      return true;
    }

    // Kolla specifik permission
    return await this.hasPermission(user.id || user.userId, permissionName);
  }

  /**
   * Hämta alla permissions för en role
   */
  static async getRolePermissions(roleName) {
    try {
      const query = `
        SELECT p.*
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_name = $1
        ORDER BY p.category, p.name
      `;
      const result = await pool.query(query, [roleName]);
      return result.rows;
    } catch (error) {
      console.error('Get role permissions error:', error);
      throw error;
    }
  }

  /**
   * Grant permission till role
   */
  static async grantPermission(roleName, permissionName) {
    try {
      const permResult = await pool.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permissionName]
      );

      if (permResult.rows.length === 0) {
        throw new Error(`Permission not found: ${permissionName}`);
      }

      const permissionId = permResult.rows[0].id;

      await pool.query(
        'INSERT INTO role_permissions (role_name, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleName, permissionId]
      );

      return true;
    } catch (error) {
      console.error('Grant permission error:', error);
      throw error;
    }
  }

  /**
   * Revoke permission från role
   */
  static async revokePermission(roleName, permissionName) {
    try {
      const permResult = await pool.query(
        'SELECT id FROM permissions WHERE name = $1',
        [permissionName]
      );

      if (permResult.rows.length === 0) {
        throw new Error(`Permission not found: ${permissionName}`);
      }

      const permissionId = permResult.rows[0].id;

      await pool.query(
        'DELETE FROM role_permissions WHERE role_name = $1 AND permission_id = $2',
        [roleName, permissionId]
      );

      return true;
    } catch (error) {
      console.error('Revoke permission error:', error);
      throw error;
    }
  }
}

module.exports = PermissionService;
```

**Tasks:**
- [ ] Skapa `backend/src/services/permissionService.js`
- [ ] Testa `getUserPermissions()` för varje role
- [ ] Testa `checkPermission()` med admin user
- [ ] Testa `checkPermission()` med restaurant user

---

#### 1.3 Backend - requirePermission Middleware (1-2h)

**Skapa: `backend/src/middleware/requirePermission.js`**

```javascript
const PermissionService = require('../services/permissionService');

/**
 * Middleware för att kräva specifik permission
 * Använd istället för verifyRole() för granulära permissions
 *
 * Exempel:
 * app.get('/api/admin/orders',
 *   verifyJWT,
 *   requirePermission('orders:view:all'),
 *   handler
 * );
 */
function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      // Kräver att verifyJWT har körts först
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      // Kolla permission
      const hasPermission = await PermissionService.checkPermission(
        req.user,
        permissionName
      );

      if (!hasPermission) {
        console.log(`[PERMISSION] Denied: User ${req.user.email || req.user.id} lacks permission: ${permissionName}`);

        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required_permission: permissionName
        });
      }

      console.log(`[PERMISSION] Granted: User ${req.user.email || req.user.id} has permission: ${permissionName}`);
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Failed to check permissions'
      });
    }
  };
}

/**
 * Middleware för att kräva NÅGON av flera permissions (OR)
 */
function requireAnyPermission(permissionNames) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Admin har alla permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Kolla om user har NÅGON av permissions
      for (const permissionName of permissionNames) {
        const hasPermission = await PermissionService.hasPermission(
          req.user.id || req.user.userId,
          permissionName
        );
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        error: 'Forbidden',
        required_permissions: permissionNames
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission
};
```

**Tasks:**
- [ ] Skapa `backend/src/middleware/requirePermission.js`
- [ ] Testa middleware på test-route
- [ ] Verifiera att admin får access
- [ ] Verifiera att restaurant får/nekar korrekt permission

---

#### 1.4 Backend - Audit Logging (1-2h)

**A. Skapa audit_logs tabell:**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,          -- 'DECRYPT_CUSTOMER_DATA', 'UPDATE_ORDER_STATUS'
  resource_type VARCHAR(50),             -- 'customer', 'order', 'user'
  resource_id INTEGER,                   -- ID för resourcen som påverkades
  details JSONB,                         -- Extra detaljer
  ip_address INET,                       -- Request IP
  user_agent TEXT,                       -- Browser/client info
  success BOOLEAN DEFAULT true,          -- Om action lyckades
  error_message TEXT,                    -- Om action misslyckades
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index för snabbare queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
```

**B. Skapa AuditService:**

**Skapa: `backend/src/services/auditService.js`**

```javascript
const pool = require('../config/database');

class AuditService {
  /**
   * Logga en audit event
   * Fire-and-forget - ska ej blocka main flow
   */
  static async log(auditData) {
    const {
      userId,
      action,
      resourceType = null,
      resourceId = null,
      details = {},
      ipAddress = null,
      userAgent = null,
      success = true,
      errorMessage = null
    } = auditData;

    try {
      await pool.query(
        `INSERT INTO audit_logs
         (user_id, action, resource_type, resource_id, details, ip_address, user_agent, success, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          JSON.stringify(details),
          ipAddress,
          userAgent,
          success,
          errorMessage
        ]
      );
    } catch (error) {
      // Audit logging ska ALDRIG crashe main flow
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Helper för att logga från request
   */
  static async logFromRequest(req, action, resourceType, resourceId, details = {}, success = true, errorMessage = null) {
    return this.log({
      userId: req.user?.id || req.user?.userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success,
      errorMessage
    });
  }

  /**
   * Hämta audit logs med filter
   */
  static async getLogs(filters = {}) {
    try {
      const {
        userId = null,
        action = null,
        resourceType = null,
        startDate = null,
        endDate = null,
        limit = 100,
        offset = 0
      } = filters;

      let query = `
        SELECT al.*, u.email as user_email, u.name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (userId) {
        query += ` AND al.user_id = $${paramCount}`;
        params.push(userId);
        paramCount++;
      }

      if (action) {
        query += ` AND al.action = $${paramCount}`;
        params.push(action);
        paramCount++;
      }

      if (resourceType) {
        query += ` AND al.resource_type = $${paramCount}`;
        params.push(resourceType);
        paramCount++;
      }

      if (startDate) {
        query += ` AND al.created_at >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND al.created_at <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Rensa gamla audit logs (data retention)
   * Körs som cron job
   */
  static async cleanupOldLogs(retentionDays = 365) {
    try {
      const result = await pool.query(
        'DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL \'1 day\' * $1',
        [retentionDays]
      );

      console.log(`Cleaned up ${result.rowCount} old audit logs`);
      return result.rowCount;
    } catch (error) {
      console.error('Cleanup audit logs error:', error);
      throw error;
    }
  }
}

module.exports = AuditService;
```

**Tasks:**
- [ ] Skapa audit_logs tabell migration
- [ ] Skapa `backend/src/services/auditService.js`
- [ ] Testa logging för en action
- [ ] Verifiera att logs sparas i DB
- [ ] Testa getLogs() med olika filter

---

#### 1.5 Backend - Migrera Routes (2-3h)

**Strategy: Gradvis migration utan breaking changes**

**A. Skapa test-route med nya systemet:**
```javascript
// server.js
const { requirePermission } = require('./src/middleware/requirePermission');
const AuditService = require('./src/services/auditService');

// NY route med permission system (test)
app.get("/api/admin/orders/v2",
  verifyJWT,
  requirePermission('orders:view:all'),
  async (req, res) => {
    try {
      // Audit log
      await AuditService.logFromRequest(req, 'VIEW_ALL_ORDERS', 'order', null);

      const orders = await OrderService.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GAMLA route (behåll tills v2 verifierad)
app.get("/api/admin/orders",
  verifyJWT,
  verifyRole(["admin"]),
  async (req, res) => {
    const orders = await OrderService.getAllOrders();
    res.json(orders);
  }
);
```

**B. När v2 fungerar, ersätt gamla route:**
```javascript
// Ersätt gamla route
app.get("/api/admin/orders",
  verifyJWT,
  requirePermission('orders:view:all'),
  async (req, res) => {
    await AuditService.logFromRequest(req, 'VIEW_ALL_ORDERS', 'order', null);
    const orders = await OrderService.getAllOrders();
    res.json(orders);
  }
);
```

**C. Routes att migrera:**

```javascript
// 1. Admin Orders - orders:view:all
app.get("/api/admin/orders", verifyJWT, requirePermission('orders:view:all'), handler);

// 2. Restaurant Orders - orders:view:own + slug validation
app.get("/api/restaurant/:slug/orders",
  verifyJWT,
  requirePermission('orders:view:own'),
  verifyAdminForSlug,  // Behåll för restaurant isolation
  handler
);

// 3. Courier Orders - orders:view:own
app.get("/api/courier/orders",
  verifyJWT,
  requirePermission('orders:view:own'),
  handler
);

// 4. Update Order Status - orders:update:status
app.put("/api/orders/:id/status",
  verifyJWT,
  requirePermission('orders:update:status'),
  async (req, res) => {
    await AuditService.logFromRequest(req, 'UPDATE_ORDER_STATUS', 'order', req.params.id, {
      old_status: req.body.currentStatus,
      new_status: req.body.newStatus
    });
    // ... handler
  }
);

// 5. Create Order - orders:create
app.post("/api/orders",
  verifyJWT,
  requirePermission('orders:create'),
  handler
);
```

**Tasks:**
- [ ] Skapa v2 test-route för admin orders
- [ ] Testa att v2 fungerar med admin user
- [ ] Testa att v2 nekar non-admin user
- [ ] Ersätt gamla route med v2
- [ ] Migrera resterande routes enligt lista
- [ ] Lägg till audit logging på känsliga routes

---

#### 1.6 Backend - Extra Säkerhetsförbättringar (1-2h)

**A. Rate limiting på login:**
```javascript
// authMiddleware.js eller auth router
const loginLimiter = rateLimit(15 * 60 * 1000, 5); // 5 försök per 15 min

// routes/auth.js eller server.js
router.post('/login', loginLimiter, async (req, res) => {
  // ... login logic
});
```

**B. JWT Blacklist för logout (in-memory för development):**
```javascript
// authMiddleware.js
const blacklistedTokens = new Set();

// Cleanup gamla tokens varje 24h (JWT expires efter 24h ändå)
setInterval(() => {
  blacklistedTokens.clear();
}, 24 * 60 * 60 * 1000);

// Uppdatera verifyJWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.cookies) {
    token = req.cookies.token || req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  // ✅ NYTT: Kolla blacklist
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = token;  // Spara token för logout
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Logout endpoint
router.post('/logout', verifyJWT, (req, res) => {
  blacklistedTokens.add(req.token);
  res.clearCookie('token');
  res.clearCookie('accessToken');
  res.json({ message: 'Logged out successfully' });
});

module.exports = { verifyJWT, blacklistedTokens, /* ... */ };
```

**Tasks:**
- [ ] Lägg till loginLimiter på /login route
- [ ] Testa rate limiting (5 failed attempts)
- [ ] Lägg till JWT blacklist i verifyJWT
- [ ] Skapa /logout endpoint
- [ ] Testa logout-flow

---

#### 1.7 Frontend - Role Context & Hooks (2-3h)

**A. Skapa RoleContext:**

**Skapa: `frontend/src/contexts/RoleContext.jsx`**

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hämta user från localStorage eller API
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // I framtiden: hämta permissions från API
      setPermissions(userData.permissions || []);
    }
    setLoading(false);
  }, []);

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role || user.role === 'admin';
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;  // Admin har allt
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissionList.some(p => permissions.includes(p));
  };

  return (
    <RoleContext.Provider value={{
      user,
      setUser,
      permissions,
      setPermissions,
      loading,
      hasRole,
      hasPermission,
      hasAnyPermission
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}
```

**B. Skapa ProtectedRoute:**

**Skapa: `frontend/src/components/ProtectedRoute.jsx`**

```javascript
import { Navigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';

export function ProtectedRoute({ children, requiredRole = null, requiredPermission = null }) {
  const { user, hasRole, hasPermission, loading } = useRole();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
```

**C. Uppdatera routing:**

```javascript
// App.jsx eller router config
import { RoleProvider } from './contexts/RoleContext';
import { ProtectedRoute } from './components/ProtectedRoute';

<RoleProvider>
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    {/* Admin routes */}
    <Route path="/admin" element={
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    }>
      <Route path="orders" element={<AdminOrdersPage />} />
      <Route path="restaurants" element={<RestaurantsPage />} />
    </Route>

    {/* Restaurant routes */}
    <Route path="/restaurant/:slug" element={
      <ProtectedRoute requiredPermission="orders:view:own">
        <RestaurangVy />
      </ProtectedRoute>
    } />

    {/* Courier routes */}
    <Route path="/kurir-vy" element={
      <ProtectedRoute requiredRole="courier">
        <KurirVy />
      </ProtectedRoute>
    } />
  </Routes>
</RoleProvider>
```

**Tasks:**
- [ ] Skapa `RoleContext.jsx`
- [ ] Skapa `ProtectedRoute.jsx`
- [ ] Wrap App i RoleProvider
- [ ] Uppdatera routes att använda ProtectedRoute
- [ ] Testa routing för olika roles

---

### Acceptance Criteria:

**Backend:**
- ✅ Permissions-tabeller skapade och seedade
- ✅ PermissionService fungerar korrekt
- ✅ requirePermission middleware fungerar
- ✅ Admin har automatiskt alla permissions
- ✅ Audit logging fungerar på känsliga routes
- ✅ Rate limiting på /login fungerar
- ✅ Logout blacklistar JWT token
- ✅ Alla befintliga routes fortsätter fungera (bakåtkompatibilitet)

**Frontend:**
- ✅ RoleContext tillhandahåller user och permissions
- ✅ ProtectedRoute blockerar unauthorized access
- ✅ Routing fungerar för alla roles
- ✅ Admin ser alla vyer
- ✅ Restaurant ser endast sin vy
- ✅ Courier ser endast sin vy
- ✅ Customer ser endast sin vy

**Security:**
- ✅ 403 för unauthorized permission
- ✅ 401 för invalid/missing token
- ✅ Audit logs sparas för känsliga actions
- ✅ Rate limiting förhindrar brute force
- ✅ JWT blacklist förhindrar token reuse efter logout

**Performance:**
- ✅ Permission checks tar <50ms
- ✅ Audit logging är async och blockar ej
- ✅ Inga N+1 queries

---

### Migration Checklist:

**Pre-Migration:**
- [ ] Läs `.claude/PHASE1_COMPATIBILITY_ANALYSIS.md`
- [ ] Backup production database
- [ ] Testa migrations på staging först

**Migration Steps:**
1. [ ] Kör permissions-tabeller migration
2. [ ] Seed initial permissions
3. [ ] Testa PermissionService
4. [ ] Skapa test-route med requirePermission
5. [ ] Verifiera att test-route fungerar
6. [ ] Migrera EN route i taget
7. [ ] Verifiera efter varje migration
8. [ ] Lägg till audit logging
9. [ ] Lägg till rate limiting
10. [ ] Lägg till JWT blacklist
11. [ ] Uppdatera frontend routing
12. [ ] E2E test alla flows

**Rollback Plan:**
- [ ] Om något går fel: DROP nya tabeller
- [ ] Revert till gamla routes (de fungerar fortfarande)
- [ ] Inget data går förlorat (additive changes only)

---

## 🏪 PHASE 2: Restaurang Management System - FÖRENKLAD

**Prioritet:** 🟠 HÖG
**Estimerad tid:** ~8-10 timmar (reducerat från 10-12h)
**Komplexitet:** MEDIUM (reducerat från MEDIUM-HIGH)
**Beroenden:** PHASE 1
**Kompatibilitet:** ✅ **100% Bakåtkompatibel** (Se: `.claude/FULL_ROADMAP_COMPATIBILITY.md`)

### Mål:
Admin kan enkelt lägga till och hantera restauranger. Restauranger ser endast sina egna orders.

**VIKTIGT: Menyer behålls som JSON-filer (ingen DB migration)**

**Anledningar:**
- ✅ Befintlig menyhantering fungerar perfekt (JSON-filer)
- ✅ Frontend förväntar sig befintlig JSON-struktur
- ✅ Enklare implementation utan breaking changes
- ✅ Git version control för menyer
- ✅ Menyer ändras sällan (inte critical data)

### Tasks:

#### 2.1 Database - Restaurant Metadata (Förenklad)
- [ ] Skapa `restaurants` tabell för metadata
- [ ] ❌ SKIPPA `menu_items` tabell (behåll JSON)
- [ ] ❌ SKIPPA `menu_categories` tabell (behåll JSON)
- [ ] Verifiera att `orders.restaurant_slug` finns (borde redan finnas)

**SQL Schema:**
```sql
-- Endast restaurant metadata (EJ menu items)
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  logo_url TEXT,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  opening_hours JSONB,
  menu_file_path VARCHAR(255),  -- Pekar till JSON-fil (ex: "Data/menyer/campino.json")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed befintliga restauranger
INSERT INTO restaurants (slug, name, description, menu_file_path, is_active) VALUES
  ('campino', 'Campino', 'Italiensk pizza och pasta', 'Data/menyer/campino.json', true),
  ('sunsushi', 'SunSushi', 'Japansk sushi och asiatisk mat', 'Data/menyer/sunsushi.json', true)
ON CONFLICT (slug) DO NOTHING;
```

#### 2.2 Backend - Restaurant Management API (Förenklad)
- [ ] `POST /api/admin/restaurants` - Skapa restaurang (metadata only)
- [ ] `PUT /api/admin/restaurants/:id` - Uppdatera restaurang metadata
- [ ] `DELETE /api/admin/restaurants/:id` - Inaktivera restaurang (soft delete)
- [ ] `GET /api/admin/restaurants` - Lista alla restauranger
- [ ] **MENU MANAGEMENT (JSON-baserad):**
- [ ] `GET /api/admin/restaurants/:slug/menu/download` - Ladda ner JSON-fil
- [ ] `POST /api/admin/restaurants/:slug/menu/upload` - Upload ny JSON-fil
- [ ] `PUT /api/admin/restaurants/:slug/menu` - Uppdatera menu JSON direkt
- [ ] `POST /api/admin/restaurants/:slug/menu/backup` - Backup nuvarande menu

#### 2.3 Backend - Restaurant Isolation
- [ ] Uppdatera `fetchAdminOrders` att filtrera på `restaurant_id`
- [ ] Lägg till middleware `verifyRestaurantAccess`
- [ ] Säkerställ att restaurang-staff endast ser sina orders

**Exempel:**
```javascript
// Middleware som kollar att user har access till restaurang
const verifyRestaurantAccess = async (req, res, next) => {
  const { restaurantId } = req.params;
  const userRoles = await getUserRoles(req.user.userId);

  const hasAccess = userRoles.some(role =>
    role.role_name === 'admin' ||
    (role.role_name === 'restaurant_staff' && role.restaurant_id === restaurantId)
  );

  if (!hasAccess) return res.status(403).json({ error: 'Access denied' });
  next();
};
```

#### 2.4 Frontend - Admin Restaurant Management
- [ ] Skapa `/admin/restaurants` sida
- [ ] Lista alla restauranger
- [ ] Formulär för att lägga till ny restaurang
- [ ] Edit-modal för att uppdatera restaurang
- [ ] Aktivera/inaktivera restaurang

#### 2.5 Frontend - Admin Menu Management
- [ ] Skapa `/admin/restaurants/:id/menu` sida
- [ ] Lista menu items grupperade per kategori
- [ ] Formulär för att lägga till menu item
- [ ] Drag-and-drop för att ordna items
- [ ] Bulk upload (JSON/CSV)

#### 2.6 Frontend - Restaurant Staff Isolation
- [ ] Uppdatera `RestaurangVy` att använda user's restaurant_id
- [ ] Ta bort restaurant selector för restaurant_staff
- [ ] Verifiera att endast egna orders visas

**Acceptance Criteria:**
- ✅ Admin kan skapa ny restaurang med meny
- ✅ Admin kan uppdatera restaurang-info och meny
- ✅ Restaurang-staff ser endast sin restaurangs orders
- ✅ Restaurang-staff kan INTE byta till annan restaurang
- ✅ Orders filtreras korrekt per restaurang

---

## 🚚 PHASE 3: Kurir Management System

**Prioritet:** 🟠 HÖG
**Estimerad tid:** ~8-10 timmar
**Komplexitet:** MEDIUM
**Beroenden:** PHASE 1

### Mål:
Admin kan ge kurir-roll med kontrakt. Kurir ser endast sin egen historik.

### Tasks:

#### 3.1 Database - Courier System
- [ ] Skapa `courier_profiles` tabell
- [ ] Skapa `courier_contracts` tabell
- [ ] Lägg till `assigned_courier_id` på orders (kolla om finns)

**SQL Schema:**
```sql
CREATE TABLE courier_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  vehicle_type VARCHAR(50), -- bike, car, scooter
  license_number VARCHAR(50),
  vehicle_registration VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3,2),
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courier_contracts (
  id SERIAL PRIMARY KEY,
  courier_id INTEGER REFERENCES courier_profiles(id),
  contract_type VARCHAR(50), -- employee, freelance
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate INTEGER, -- öre
  delivery_rate INTEGER, -- öre per delivery
  contract_pdf_url TEXT,
  insurance_info JSONB,
  emergency_contact JSONB,
  signed_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 Backend - Courier Management API
- [ ] `POST /api/admin/couriers` - Skapa kurir-profil och ge roll
- [ ] `PUT /api/admin/couriers/:id` - Uppdatera kurir-profil
- [ ] `POST /api/admin/couriers/:id/contract` - Lägg till kontrakt
- [ ] `GET /api/admin/couriers/:id/contracts` - Hämta kurir-kontrakt
- [ ] `GET /api/admin/couriers` - Lista alla kurirer

#### 3.3 Backend - Courier Isolation
- [ ] Uppdatera `fetchCourierOrders` att filtrera på `assigned_courier_id`
- [ ] Lägg till middleware `verifyCourierOwnership`
- [ ] Säkerställ att kurir endast ser sina egna orders

**Exempel:**
```javascript
// Middleware som kollar att user är kuriren för denna order
const verifyCourierOwnership = async (req, res, next) => {
  const { orderId } = req.params;
  const order = await getOrderById(orderId);

  const isAdmin = req.user.role === 'admin';
  const isOwnOrder = order.assigned_courier_id === req.user.userId;

  if (!isAdmin && !isOwnOrder) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};
```

#### 3.4 Backend - Courier History Filter
- [ ] Uppdatera `getCourierOrders` med courier_id filter för historik
- [ ] Endast admin kan se alla kurirers historik
- [ ] Kurir ser endast sin egen historik

#### 3.5 Frontend - Admin Courier Management
- [ ] Skapa `/admin/couriers` sida
- [ ] Lista alla kurirer med status
- [ ] Formulär för att lägga till ny kurir
- [ ] Upload kontrakt-PDF
- [ ] Visa kurir-statistik (deliveries, rating)

#### 3.6 Frontend - Courier Profile View
- [ ] Skapa `/courier/profile` sida
- [ ] Visa kurir-info och kontrakt
- [ ] Visa statistik (antal leveranser, rating)
- [ ] Visa kontrakt-dokument (read-only)

#### 3.7 Frontend - Courier History Isolation
- [ ] Uppdatera `KurirVy` att filtrera på egen courier_id
- [ ] Historik visar endast egna levererade orders
- [ ] Verifiera att inga andra kurirers orders visas

**Acceptance Criteria:**
- ✅ Admin kan skapa kurir-profil med kontrakt
- ✅ Kurir kan se sitt kontrakt i profil
- ✅ Kurir ser endast sin egen historik
- ✅ Kurir kan INTE se andra kurirers orders eller historik
- ✅ Orders filtreras korrekt per kurir

---

## 👤 PHASE 4: Kund Management & GDPR

**Prioritet:** 🟡 MEDIUM
**Estimerad tid:** ~10-12 timmar
**Komplexitet:** HIGH (på grund av GDPR-krav)
**Beroenden:** PHASE 1

### Mål:
Kunder kan registrera sig som medlemmar. Admin kan administrera kunder men känslig data är krypterad enligt GDPR.

### Tasks:

#### 4.1 Database - Customer System
- [ ] Skapa `customers` tabell (separat från `users`)
- [ ] Implementera kryptering för känslig data
- [ ] Skapa `customer_consents` tabell för GDPR

**SQL Schema:**
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  -- KRYPTERAD DATA (använd pgcrypto)
  personal_number_encrypted BYTEA, -- personnummer
  address_encrypted BYTEA,
  phone_encrypted BYTEA,
  -- OKRYPTERAD DATA
  email VARCHAR(100) NOT NULL,
  preferences JSONB, -- dietary restrictions, etc
  loyalty_points INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customer_consents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  consent_type VARCHAR(50) NOT NULL, -- gdpr, marketing, analytics
  is_granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  ip_address INET
);
```

#### 4.2 Backend - Encryption Implementation
- [ ] Installera `crypto` library
- [ ] Skapa `encryptionService.js`
- [ ] Implementera `encrypt(data)` och `decrypt(data)` funktioner
- [ ] Använda AES-256-GCM encryption
- [ ] Spara encryption key i `.env` (ALDRIG i git!)

**Exempel:**
```javascript
// encryptionService.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

const decrypt = (encrypted, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

#### 4.3 Backend - Customer Registration API
- [ ] `POST /api/auth/register/customer` - Registrera kund
- [ ] `POST /api/customers/verify-email` - Verifiera email
- [ ] `GET /api/customers/profile` - Hämta profil (customer only)
- [ ] `PUT /api/customers/profile` - Uppdatera profil
- [ ] `POST /api/customers/consents` - Uppdatera GDPR-consent

#### 4.4 Backend - Admin Customer Management API
- [ ] `GET /api/admin/customers` - Lista kunder (UTAN känslig data)
- [ ] `GET /api/admin/customers/:id` - Hämta kund-detaljer
- [ ] `POST /api/admin/customers/:id/decrypt` - Dekryptera data (med audit log)
- [ ] `PUT /api/admin/customers/:id` - Uppdatera kund
- [ ] `DELETE /api/admin/customers/:id` - GDPR-delete (soft delete)

#### 4.5 Backend - GDPR Compliance
- [ ] Implementera audit logging för dekryptering
- [ ] Implementera "right to be forgotten" (data deletion)
- [ ] Implementera "right to data portability" (export)
- [ ] Auto-delete old data efter retention period

**Exempel:**
```javascript
// Admin måste ha specific permission för att dekryptera
router.post('/api/admin/customers/:id/decrypt',
  verifyJWT,
  checkPermission('decrypt_customer_data'),
  async (req, res) => {
    const { field } = req.body; // 'personal_number', 'address', etc

    // LOG AUDIT
    await logAudit({
      action: 'DECRYPT_CUSTOMER_DATA',
      user_id: req.user.userId,
      customer_id: req.params.id,
      field,
      timestamp: new Date(),
      ip_address: req.ip
    });

    // DEKRYPTERA
    const encrypted = await getEncryptedField(req.params.id, field);
    const decrypted = decrypt(encrypted.data, encrypted.iv, encrypted.authTag);

    res.json({ [field]: decrypted });
  }
);
```

#### 4.6 Frontend - Customer Registration
- [ ] Skapa `/register` sida
- [ ] Formulär med GDPR-consents
- [ ] Email-verifikation flow
- [ ] Welcome email

#### 4.7 Frontend - Customer Profile
- [ ] Skapa `/profile` sida för kunder
- [ ] Visa profil-info
- [ ] Uppdatera preferences
- [ ] Hantera GDPR-consents
- [ ] Export data-knapp
- [ ] Delete account-knapp

#### 4.8 Frontend - Admin Customer Management
- [ ] Skapa `/admin/customers` sida
- [ ] Lista kunder (maskerad känslig data)
- [ ] Sök och filtrera kunder
- [ ] "Decrypt"-knapp med confirmation (audit logged)
- [ ] Visa GDPR-consents
- [ ] Export customer data

**Acceptance Criteria:**
- ✅ Kund kan registrera sig som medlem
- ✅ Känslig data krypteras i databasen
- ✅ Admin ser INTE känslig data utan explicit dekryptering
- ✅ All dekryptering loggas i audit log
- ✅ Kund kan exportera sin data (GDPR)
- ✅ Kund kan ta bort sitt konto (GDPR)
- ✅ GDPR-consents hanteras korrekt

---

## 💬 PHASE 5: Support & Communication System

**Prioritet:** 🟢 LÅG
**Estimerad tid:** ~6-8 timmar
**Komplexitet:** MEDIUM
**Beroenden:** PHASE 1, PHASE 2

### Mål:
Restauranger kan kontakta admin för hjälp med problem.

### Tasks:

#### 5.1 Database - Support System
- [ ] Skapa `support_tickets` tabell
- [ ] Skapa `support_messages` tabell
- [ ] Skapa `support_categories` tabell

**SQL Schema:**
```sql
CREATE TABLE support_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50)
);

CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  restaurant_id INTEGER REFERENCES restaurants(id), -- NULL för kurir/kund
  category_id INTEGER REFERENCES support_categories(id),
  subject VARCHAR(200) NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to INTEGER REFERENCES users(id), -- admin user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE support_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id),
  sender_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT false, -- internal admin note
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5.2 Backend - Support API
- [ ] `POST /api/support/tickets` - Skapa ticket
- [ ] `GET /api/support/tickets` - Lista egna tickets
- [ ] `GET /api/support/tickets/:id` - Hämta ticket med messages
- [ ] `POST /api/support/tickets/:id/messages` - Skicka meddelande
- [ ] `PUT /api/support/tickets/:id/status` - Uppdatera status
- [ ] `GET /api/admin/support/tickets` - Admin: lista alla tickets
- [ ] `PUT /api/admin/support/tickets/:id/assign` - Admin: tilldela ticket

#### 5.3 Backend - Notification System
- [ ] Skicka email när ticket skapas
- [ ] Skicka email när admin svarar
- [ ] Skicka email när ticket resolved

#### 5.4 Frontend - Restaurant Support
- [ ] Skapa "Hjälp"-knapp i RestaurangVy
- [ ] Modal för att skapa ny ticket
- [ ] Lista egna tickets
- [ ] Chat-gränssnitt för att kommunicera med admin

#### 5.5 Frontend - Admin Support Panel
- [ ] Skapa `/admin/support` sida
- [ ] Lista alla tickets med filter (status, priority)
- [ ] Tilldela tickets till admins
- [ ] Chat-gränssnitt för att svara på tickets
- [ ] Markera ticket som resolved

**Acceptance Criteria:**
- ✅ Restaurang kan skapa support ticket
- ✅ Restaurang kan kommunicera med admin via ticket
- ✅ Admin ser alla support tickets
- ✅ Admin kan tilldela och svara på tickets
- ✅ Email-notifikationer skickas korrekt

---

## 🎯 Implementation Order (Rekommenderad)

### Sprint 1 (9-12 timmar):
**PHASE 1: Roll & Permission System** (FÖRBÄTTRAD)
- Kritisk foundation för allt annat
- Måste göras först
- Inkluderar permissions, audit logging, säkerhet

### Sprint 2 (8-10 timmar):
**PHASE 2: Restaurang Management** (FÖRENKLAD)
- Högt prioriterad
- Bygger på PHASE 1
- Behåller JSON-menyer (enklare implementation)

### Sprint 3 (8-10 timmar):
**PHASE 3: Kurir Management**
- Högt prioriterad
- Oberoende av PHASE 2

### Sprint 4 (10-12 timmar):
**PHASE 4: Kund Management & GDPR**
- Medium prioritet
- Komplex men viktig

### Sprint 5 (6-8 timmar):
**PHASE 5: Support System**
- Lägst prioritet
- Kan göras sist

### Sprint 6 (4-6 timmar) - OPTIONAL:
**PHASE 6: Performance & Scaling (Redis)**
- Låg prioritet
- Behövs ej förrän 6-12 månader framåt
- När traffic når 1000+ samtidiga användare

**Total Estimerad Tid (PHASE 1-5):** 41-52 timmar (5-7 arbetsdagar)
**Med PHASE 6 (framtida):** 45-58 timmar

---

## ⚠️ Viktiga Överväganden

### Security:
- ✅ ALDRIG spara encryption keys i git
- ✅ Använd environment variables
- ✅ Implementera rate limiting på känsliga endpoints
- ✅ Audit logging för all admin access
- ✅ HTTPS i produktion

### GDPR:
- ✅ Kryptera all känslig data
- ✅ Implementera "right to be forgotten"
- ✅ Implementera "right to data portability"
- ✅ Logga all access till känslig data
- ✅ Data retention policies

### Performance:
- ✅ Indexera `restaurant_id` och `assigned_courier_id` på orders
- ✅ Caching för menu items
- ✅ Pagination för customer lists
- ✅ Lazy loading för historik

### Testing:
- ✅ Unit tests för encryption/decryption
- ✅ Integration tests för permission system
- ✅ E2E tests för critical flows
- ✅ Security audit

---

## 🚀 PHASE 6: Performance & Scaling (Redis Integration)

**Prioritet:** 🟢 LÅG (Framtida optimering)
**Estimerad tid:** ~4-6 timmar
**Komplexitet:** LOW
**Beroenden:** PHASE 1-5 i produktion med high traffic
**Timeline:** 6-12 månader efter PHASE 1-5 live

### Mål:
Optimera performance för high traffic och multi-server setup med Redis caching.

### När Behövs Detta?

**Triggers:**
- ⏰ 1000+ samtidiga användare
- ⏰ Multiple server instances (load balancing)
- ⏰ DB queries > 100ms
- ⏰ Permission checks blir flaskhals

### Tasks:

#### 6.1 Infrastructure Setup (1h)
- [ ] Installera Redis server (Docker recommended)
- [ ] Installera Redis client library (`npm install redis`)
- [ ] Konfigurera Redis connection i `.env`
- [ ] Setup monitoring för Redis

**Installation:**
```bash
# Docker (REKOMMENDERAT)
docker run -d --name redis -p 6379:6379 redis:alpine

# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # optional
```

#### 6.2 Rate Limiting Migration (1h)
- [ ] Migrera från Map till Redis för rate limiting
- [ ] Shared rate limiting över multiple servers
- [ ] Testa med multiple server instances

**Implementation:**
```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

async function rateLimit(windowMs, maxRequests) {
  return async (req, res, next) => {
    const key = `ratelimit:${req.ip}:${req.path}`;
    const count = await client.incr(key);

    if (count === 1) {
      await client.expire(key, Math.ceil(windowMs / 1000));
    }

    if (count > maxRequests) {
      return res.status(429).json({ error: 'För många förfrågningar' });
    }

    next();
  };
}
```

#### 6.3 JWT Blacklist Migration (1h)
- [ ] Migrera från Set till Redis för JWT blacklist
- [ ] Persistent blacklist över server restarts
- [ ] Auto-cleanup med TTL

**Implementation:**
```javascript
// Blacklist token (24h TTL)
await client.setex(`blacklist:${token}`, 86400, '1');

// Check blacklist
const isBlacklisted = await client.get(`blacklist:${token}`);
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token revoked' });
}
```

#### 6.4 Permission Caching (1-2h)
- [ ] Cache user permissions i Redis (5 min TTL)
- [ ] Invalidate cache när permissions ändras
- [ ] Fallback till PostgreSQL om Redis unavailable

**Implementation:**
```javascript
// PermissionService.js
static async getUserPermissions(userId) {
  const cacheKey = `permissions:user:${userId}`;

  // Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Not in cache, query PostgreSQL
  const result = await pool.query('SELECT ...');
  const permissions = result.rows.map(row => row.name);

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(permissions));

  return permissions;
}
```

#### 6.5 Menu Caching (Optional, 1h)
- [ ] Cache menu data i Redis
- [ ] Invalidate när menu uppdateras
- [ ] 1 hour TTL (menyer ändras sällan)

#### 6.6 Session Management (Optional, 1h)
- [ ] Move sessions från memory till Redis
- [ ] Persistent sessions över server restarts

### Acceptance Criteria:

**Performance:**
- ✅ Permission checks < 10ms (från 20-50ms)
- ✅ Rate limiting fungerar över multiple servers
- ✅ JWT blacklist persistent över restarts
- ✅ Menu loading < 5ms (från 10-20ms)

**Reliability:**
- ✅ Graceful degradation om Redis går ner (fallback till PostgreSQL)
- ✅ Auto-reconnect vid Redis connection loss
- ✅ Monitoring och alerts för Redis health

**Scalability:**
- ✅ Support för multiple server instances
- ✅ Horizontal scaling utan shared memory issues

### Cost Estimate:

**Redis Cloud (Managed):**
- Free tier: 30MB (räcker för er use case)
- Paid tier: $5-10/månad för 100MB

**Self-hosted (Docker):**
- $0 (gratis)
- Kräver underhåll och monitoring

**Rekommendation:** Redis Cloud free tier för development, sedan paid tier för production.

### Migration Strategy:

```
STEG 1: Setup Redis (development)
STEG 2: Implementera rate limiting med Redis
STEG 3: Testa med single server
STEG 4: Implementera JWT blacklist med Redis
STEG 5: Implementera permission caching
STEG 6: Load test med multiple servers
STEG 7: Deploy till staging
STEG 8: Monitor performance improvements
STEG 9: Deploy till production
```

**NOTE:** Denna phase är OPTIONAL och behövs först när traffic når kritiska nivåer. PostgreSQL + in-memory caching räcker för första 6-12 månaderna.

---

## 📋 Next Steps

### Immediate Actions:
1. **Review denna plan** med teamet
2. **Prioritera features** om nödvändigt
3. **Sätt upp development environment** för PHASE 1
4. **Skapa git branch:** `feature/role-system`
5. **Börja med PHASE 1 tasks**

### Questions to Answer Before Starting:
- [ ] Vilka encryption libraries ska vi använda?
- [ ] Hur ska vi hantera encryption keys i produktion?
- [ ] Vilken data retention policy ska vi ha?
- [ ] Behöver vi external consent management platform?
- [ ] Hur ska vi hantera multi-restaurant chains?

---

**Status:** 📋 PLANNING COMPLETE - Ready to start PHASE 1

Vill du börja med PHASE 1 nu? 🚀
