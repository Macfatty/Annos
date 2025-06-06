const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "orders.sqlite");
const db = new sqlite3.Database(dbPath);

// Skapa tabeller om de inte finns
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namn TEXT,
      telefon TEXT,
      email TEXT,
      adress TEXT,
      extraInfo TEXT,
      order_json TEXT,
      total REAL,
      restaurangSlug TEXT,
      status TEXT DEFAULT 'aktiv',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      namn TEXT,
      telefon TEXT,
      adress TEXT
    )
  `);
});

// Spara order
function sparaOrder(kund, order, callback) {
  const sql = `
    INSERT INTO orders (namn, telefon, email, adress, extraInfo, order_json, total, restaurangSlug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const jsonData = JSON.stringify(order.varor || []);
  const total = order.total || 0;
  const slug = order.restaurangSlug || "";

  db.run(
    sql,
    [
      kund.namn,
      kund.telefon,
      kund.email,
      kund.adress,
      kund.extraInfo || "",
      jsonData,
      total,
      slug,
    ],
    function (err) {
      if (err) return callback(err);
      callback(null, this.lastID);
    }
  );
}

// Hämta senaste order
function hamtaSenasteOrder(callback) {
  const sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1`;
  db.get(sql, [], (err, row) => {
    if (err) return callback(err);
    callback(null, row);
  });
}

// Markera order som klar
function markeraOrderSomKlar(orderId, callback) {
  const sql = `UPDATE orders SET status = 'klar' WHERE id = ?`;
  db.run(sql, [orderId], function (err) {
    if (err) return callback(err);
    callback(null);
  });
}

// Hämta dagens ordrar
function hamtaDagensOrdrar(callback) {
  const idag = new Date().toISOString().split("T")[0];
  const sql = `
    SELECT * FROM orders 
    WHERE DATE(created_at) = ?
    AND (status = 'aktiv' OR (status = 'klar' AND created_at >= datetime('now', '-5 minutes')))
    ORDER BY created_at DESC
  `;
  db.all(sql, [idag], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

module.exports = {
  sparaOrder,
  hamtaDagensOrdrar,
  hamtaSenasteOrder,
  markeraOrderSomKlar,
  db,
};
