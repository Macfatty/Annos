const express = require('express');
const { verifyJWT } = require('./authMiddleware');
const { requirePermission, requireAnyPermission, requireAllPermissions } = require('./src/middleware/requirePermission');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

/**
 * Test Middleware
 *
 * Creates test routes to verify permission middleware works correctly
 */

// Helper to create test token
function createTestToken(userData) {
  return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Test route 1: Requires orders:view:all permission
app.get('/test/orders/all', verifyJWT, requirePermission('orders:view:all'), (req, res) => {
  res.json({
    success: true,
    message: 'You have permission to view all orders!',
    user: req.user
  });
});

// Test route 2: Requires orders:view:own permission (customer can access)
app.get('/test/orders/own', verifyJWT, requirePermission('orders:view:own'), (req, res) => {
  res.json({
    success: true,
    message: 'You have permission to view own orders!',
    user: req.user
  });
});

// Test route 3: Requires ANY of multiple permissions
app.post('/test/menu', verifyJWT, requireAnyPermission(['menu:create', 'menu:edit']), (req, res) => {
  res.json({
    success: true,
    message: 'You have permission to create or edit menu!',
    user: req.user
  });
});

// Test route 4: Requires ALL of multiple permissions
app.delete('/test/user', verifyJWT, requireAllPermissions(['users:view', 'users:delete']), (req, res) => {
  res.json({
    success: true,
    message: 'You have permission to view and delete users!',
    user: req.user
  });
});

// Start server
const PORT = 3999;
app.listen(PORT, () => {
  console.log(`\n🧪 Test server running on port ${PORT}\n`);

  // Generate test tokens
  const adminToken = createTestToken({ id: 1, userId: 1, email: 'admin@test.com', role: 'admin' });
  const customerToken = createTestToken({ id: 2, userId: 2, email: 'customer@test.com', role: 'customer' });
  const restaurantToken = createTestToken({ id: 3, userId: 3, email: 'restaurant@test.com', role: 'restaurant' });
  const courierToken = createTestToken({ id: 4, userId: 4, email: 'courier@test.com', role: 'courier' });

  console.log('📋 Test Commands:\n');

  console.log('1️⃣  Admin accessing orders:view:all (should PASS):');
  console.log(`curl -H "Authorization: Bearer ${adminToken}" http://localhost:${PORT}/test/orders/all\n`);

  console.log('2️⃣  Customer accessing orders:view:all (should FAIL - 403):');
  console.log(`curl -H "Authorization: Bearer ${customerToken}" http://localhost:${PORT}/test/orders/all\n`);

  console.log('3️⃣  Customer accessing orders:view:own (should PASS):');
  console.log(`curl -H "Authorization: Bearer ${customerToken}" http://localhost:${PORT}/test/orders/own\n`);

  console.log('4️⃣  Restaurant accessing menu:create (should PASS):');
  console.log(`curl -X POST -H "Authorization: Bearer ${restaurantToken}" http://localhost:${PORT}/test/menu\n`);

  console.log('5️⃣  Courier accessing menu:create (should FAIL - 403):');
  console.log(`curl -X POST -H "Authorization: Bearer ${courierToken}" http://localhost:${PORT}/test/menu\n`);

  console.log('6️⃣  Admin accessing users:delete (should PASS):');
  console.log(`curl -X DELETE -H "Authorization: Bearer ${adminToken}" http://localhost:${PORT}/test/user\n`);

  console.log('7️⃣  Customer accessing users:delete (should FAIL - 403):');
  console.log(`curl -X DELETE -H "Authorization: Bearer ${customerToken}" http://localhost:${PORT}/test/user\n`);

  console.log('\n💡 Press Ctrl+C to stop the test server\n');
});
