// Set environment variables before loading the server
process.env.JWT_SECRET = "test-secret-key-for-testing-only";
process.env.NODE_ENV = "test";

const request = require("supertest");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

const app = require("./src/app");
const pool = require("./db");

describe("API endpoints", () => {
  afterAll(async () => {
    await pool.end();
  });

  test("GET /api/meny returns a list of menu items", async () => {
    const res = await request(app).get("/api/meny");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("POST /api/order stores an order successfully", async () => {
    const newOrder = {
      namn: "Test Testsson",
      telefon: "123456789",
      adress: "Testgatan 1",
      email: `test_${Date.now()}@example.com`,
      order: [
        { id: 1, namn: "MARGARITA", antal: 1, pris: 125, total: 125 }
      ],
      restaurant_slug: "campino"
    };

    const token = jwt.sign({ userId: 1, role: "admin", restaurant_slug: "campino" }, SECRET);
    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${token}`)
      .send(newOrder);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("orderId");

    const inserted = await pool.query("SELECT * FROM orders WHERE id = $1", [res.body.orderId]);

    expect(inserted.rows.length).toBeGreaterThan(0);
    expect(inserted.rows[0].customer_name).toBe(newOrder.namn);
    expect(inserted.rows[0].restaurant_slug).toBe(newOrder.restaurant_slug);
  });

  test("POST /api/order works with cookie token", async () => {
    const newOrder = {
      namn: "Cookie Testsson",
      telefon: "111222333",
      adress: "Cookiegatan 3",
      email: `cookie_${Date.now()}@example.com`,
      order: [
        { id: 1, namn: "MARGARITA", antal: 1, pris: 125, total: 125 }
      ],
      restaurant_slug: "campino"
    };

    const token = jwt.sign({ userId: 1, role: "admin", restaurant_slug: "campino" }, SECRET);
    const res = await request(app)
      .post("/api/order")
      .set("Cookie", [`accessToken=${token}`])
      .send(newOrder);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("orderId");
  });

  test("PUT /api/admin/orders/:id/klart marks order as done", async () => {
    const token = jwt.sign({ userId: 1, role: "admin", restaurant_slug: "campino" }, SECRET);

    const newOrder = {
      namn: "Patch Test",
      telefon: "987654321",
      adress: "Patchgatan 2",
      email: `patch_${Date.now()}@example.com`,
      order: [
        { id: 1, namn: "MARGARITA", antal: 1, pris: 125, total: 125 }
      ],
      restaurant_slug: "campino"
    };

    const createRes = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${token}`)
      .send(newOrder);

    const orderId = createRes.body.orderId;

    const patchRes = await request(app)
      .put(`/api/admin/orders/${orderId}/klart`)
      .set("Authorization", `Bearer ${token}`);

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body).toHaveProperty("message", "Order markerad som klar");

    const updated = await pool.query("SELECT status FROM orders WHERE id = $1", [orderId]);

    expect(updated.rows[0].status).toBe("delivered");
  });

  test("POST /api/order returns 401 without token", async () => {
    const res = await request(app)
      .post("/api/order")
      .send({});
    expect(res.statusCode).toBe(401);
  });

  test("POST /api/auth/login sets accessToken cookie without returning token", async () => {
    const email = `login_${Date.now()}@example.com`;
    const password = "Secret123";

    await request(app)
      .post("/api/auth/register")
      .send({
        email,
        password,
        namn: "Login Test",
        telefon: "0700000000",
        adress: "Login Street 1"
      });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data).not.toHaveProperty("token");

    const cookies = res.headers["set-cookie"];
    expect(Array.isArray(cookies)).toBe(true);

    const accessCookie = cookies.find(cookie => cookie.startsWith("accessToken="));
    const refreshCookie = cookies.find(cookie => cookie.startsWith("refreshToken="));

    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain("HttpOnly");
    expect(accessCookie).toContain("SameSite=Lax");
    expect(accessCookie).toContain("Max-Age=900");

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("Max-Age=604800");
    expect(refreshCookie).toContain("SameSite=Strict");

    const refreshRes = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [refreshCookie.split(";")[0]]);

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body).not.toHaveProperty("data");

    const refreshCookies = refreshRes.headers["set-cookie"];
    expect(Array.isArray(refreshCookies)).toBe(true);
    const rotatedAccessCookie = refreshCookies.find(cookie => cookie.startsWith("accessToken="));
    expect(rotatedAccessCookie).toBeDefined();
    expect(rotatedAccessCookie).toContain("Max-Age=900");
    expect(rotatedAccessCookie).toContain("SameSite=Lax");

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [
        accessCookie.split(";")[0],
        refreshCookie.split(";")[0]
      ]);

    expect(logoutRes.statusCode).toBe(200);

    const logoutCookies = logoutRes.headers["set-cookie"];
    expect(Array.isArray(logoutCookies)).toBe(true);
    const clearedAccessCookie = logoutCookies.find(cookie => cookie.startsWith("accessToken="));
    const clearedRefreshCookie = logoutCookies.find(cookie => cookie.startsWith("refreshToken="));

    expect(clearedAccessCookie).toBeDefined();
    expect(clearedAccessCookie).toContain("Max-Age=0");

    expect(clearedRefreshCookie).toBeDefined();
    expect(clearedRefreshCookie).toContain("Max-Age=0");
  });

  test("GET /api/admin/orders/today filters by slug", async () => {
    const token = jwt.sign({ userId: 1, role: "admin", restaurant_slug: "campino" }, SECRET);

    const order1 = {
      namn: "Slug Test1",
      telefon: "000",
      adress: "A",
      email: `slug1_${Date.now()}@example.com`,
      order: [{ id: 1, namn: "MARGARITA", antal: 1, pris: 125, total: 125 }],
      restaurant_slug: "campino"
    };

    const order2 = {
      namn: "Slug Test2",
      telefon: "111",
      adress: "B",
      email: `slug2_${Date.now()}@example.com`,
      order: [{ id: 1, namn: "MARGARITA", antal: 1, pris: 125, total: 125 }],
      restaurant_slug: "bistro"
    };

    await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${token}`)
      .send(order1);

    await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${token}`)
      .send(order2);

    const res = await request(app)
      .get("/api/admin/orders/today?slug=campino")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every(o => o.restaurant_slug === "campino")).toBe(true);
  });

  test("GET /api/admin/orders/today returns 403 for wrong slug", async () => {
    const token = jwt.sign({ userId: 1, role: "admin", restaurant_slug: "campino" }, SECRET);
    const res = await request(app)
      .get("/api/admin/orders/today?slug=bistro")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
