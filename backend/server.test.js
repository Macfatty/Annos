const request = require('supertest');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_SECRET = SECRET;

const app = require('./server');
const { db } = require('./orderDB');

describe('API endpoints', () => {
  afterAll((done) => {
    db.close(done);
  });

  test('GET /api/meny returns a list of menu items', async () => {
    const res = await request(app).get('/api/meny');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('POST /api/order stores an order successfully', async () => {
    const newOrder = {
      kund: {
        namn: 'Test Testsson',
        telefon: '123456789',
        adress: 'Testgatan 1',
        ovrigt: 'Inga',
        email: `test_${Date.now()}@example.com`
      },
      order: [
        { id: 1, namn: 'MARGARITA', antal: 1, pris: 125, total: 125 }
      ],
      restaurangSlug: 'campino'
    };

    const token = jwt.sign({ userId: 1, role: 'admin', restaurangSlug: 'campino' }, SECRET);
    const res = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${token}`)
      .send(newOrder);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('orderId');

    const inserted = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM orders WHERE id = ?', [res.body.orderId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    expect(inserted).toBeDefined();
    expect(inserted.namn).toBe(newOrder.kund.namn);
    expect(inserted.restaurangSlug).toBe(newOrder.restaurangSlug);
  });

  test('POST /api/order works with cookie token', async () => {
    const newOrder = {
      kund: {
        namn: 'Cookie Testsson',
        telefon: '111222333',
        adress: 'Cookiegatan 3',
        ovrigt: 'Inga',
        email: `cookie_${Date.now()}@example.com`
      },
      order: [
        { id: 1, namn: 'MARGARITA', antal: 1, pris: 125, total: 125 }
      ],
      restaurangSlug: 'campino'
    };

    const token = jwt.sign({ userId: 1, role: 'admin', restaurangSlug: 'campino' }, SECRET);
    const res = await request(app)
      .post('/api/order')
      .set('Cookie', [`accessToken=${token}`])
      .send(newOrder);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('orderId');
  });

  test('PATCH /api/admin/orders/:id/klart marks order as done', async () => {
    const token = jwt.sign({ userId: 1, role: 'admin', restaurangSlug: 'campino' }, SECRET);

    const newOrder = {
      kund: {
        namn: 'Patch Test',
        telefon: '987654321',
        adress: 'Patchgatan 2',
        ovrigt: 'Inga',
        email: `patch_${Date.now()}@example.com`
      },
      order: [
        { id: 1, namn: 'MARGARITA', antal: 1, pris: 125, total: 125 }
      ],
      restaurangSlug: 'campino'
    };

    const createRes = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${token}`)
      .send(newOrder);

    const orderId = createRes.body.orderId;

    const patchRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/klart`)
      .set('Authorization', `Bearer ${token}`);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body).toHaveProperty('message', 'Order markerad som klar');

    const updated = await new Promise((resolve, reject) => {
      db.get('SELECT status FROM orders WHERE id = ?', [orderId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    expect(updated.status).toBe('klar');
  });

  test('POST /api/order returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/order')
      .send({});
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/admin/orders/today filters by slug', async () => {
    const token = jwt.sign({ userId: 1, role: 'admin', restaurangSlug: 'campino' }, SECRET);

    const order1 = {
      kund: {
        namn: 'Slug Test1',
        telefon: '000',
        adress: 'A',
        ovrigt: 'Inga',
        email: `slug1_${Date.now()}@example.com`
      },
      order: [{ id: 1, namn: 'MARGARITA', antal: 1, pris: 125, total: 125 }],
      restaurangSlug: 'campino'
    };

    const order2 = {
      kund: {
        namn: 'Slug Test2',
        telefon: '111',
        adress: 'B',
        ovrigt: 'Inga',
        email: `slug2_${Date.now()}@example.com`
      },
      order: [{ id: 1, namn: 'MARGARITA', antal: 1, pris: 125, total: 125 }],
      restaurangSlug: 'bistro'
    };

    await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${token}`)
      .send(order1);

    await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${token}`)
      .send(order2);

    const res = await request(app)
      .get('/api/admin/orders/today?slug=campino')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every(o => o.restaurangSlug === 'campino')).toBe(true);
  });

  test('GET /api/admin/orders/today returns 403 for wrong slug', async () => {
    const token = jwt.sign({ userId: 1, role: 'admin', restaurangSlug: 'campino' }, SECRET);
    const res = await request(app)
      .get('/api/admin/orders/today?slug=bistro')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
