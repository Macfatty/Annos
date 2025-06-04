const request = require('supertest');
const app = require('./server');
const { db } = require('./orderDB');
const jwt = require('jsonwebtoken');

const SECRET = 'hemligKod123';

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
      ]
    };

    const token = jwt.sign({ userId: 1 }, SECRET);
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
  });

  test('POST /api/order returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/order')
      .send({});
    expect(res.statusCode).toBe(401);
  });
});
