const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "orders.sqlite");
const db = new sqlite3.Database(dbPath);

// Skapa tabeller om de inte finns (ny struktur)
db.serialize(() => {
  // Orders tabell med monetära belopp i öre
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_slug TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      customer_email TEXT,
      status TEXT DEFAULT 'received' CHECK (status IN ('received', 'accepted', 'in_progress', 'out_for_delivery', 'delivered')),
      payment_method TEXT DEFAULT 'mock' CHECK (payment_method IN ('swish', 'klarna', 'card', 'mock')),
      payment_status TEXT DEFAULT 'pending',
      items_total INTEGER NOT NULL, -- öre
      delivery_fee INTEGER DEFAULT 0, -- öre
      discount_total INTEGER DEFAULT 0, -- öre
      grand_total INTEGER NOT NULL, -- öre
      created_at INTEGER NOT NULL, -- epoch ms
      updated_at INTEGER NOT NULL, -- epoch ms
      assigned_courier_id INTEGER,
      delivered_at INTEGER -- epoch ms
    )
  `);

  // Order items tabell
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL, -- öre
      line_total INTEGER NOT NULL, -- öre
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  // Order item options tabell
  db.run(`
    CREATE TABLE IF NOT EXISTS order_item_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      typ TEXT NOT NULL CHECK (typ IN ('såser', 'kött', 'grönt', 'övrigt', 'drycker', 'valfri')),
      label TEXT NOT NULL,
      price_delta INTEGER NOT NULL, -- öre
      custom_note TEXT, -- max 140 tecken
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    )
  `);

  // Payouts tabell
  db.run(`
    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_slug TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      orders_count INTEGER NOT NULL,
      gross_revenue INTEGER NOT NULL, -- öre
      per_order_fee INTEGER NOT NULL, -- öre (45 kr = 4500)
      percent_fee INTEGER NOT NULL, -- öre (5% av gross_revenue)
      net_amount INTEGER NOT NULL, -- öre
      created_at INTEGER NOT NULL -- epoch ms
    )
  `);

  // Users tabell
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      namn TEXT,
      telefon TEXT,
      adress TEXT,
      role TEXT DEFAULT 'customer',
      restaurangSlug TEXT
    )
  `);

  // Skapa index
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_slug, created_at)");
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)");
  db.run("CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON orders(assigned_courier_id, status)");
  db.run("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_order_item_options_item_id ON order_item_options(order_item_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_payouts_restaurant_period ON payouts(restaurant_slug, period_start)");
});


// Hämta senaste order
function hamtaSenasteOrder(callback) {
  const sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1`;
  db.get(sql, [], (err, row) => {
    if (err) return callback(err);
    callback(null, row);
  });
}

// Markera order som levererad
function markeraOrderSomLevererad(orderId, callback) {
  const now = Date.now();
  const sql = `UPDATE orders SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ?`;
  db.run(sql, [now, now, orderId], function (err) {
    if (err) return callback(err);
    callback(null);
  });
}

// Hämta dagens ordrar
function hamtaDagensOrdrar(restaurangSlug, callback) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const sql = `
    SELECT * FROM orders
    WHERE restaurant_slug = ?
      AND created_at >= ?
      AND created_at <= ?
    ORDER BY created_at DESC
  `;
  db.all(sql, [restaurangSlug, todayStart.getTime(), todayEnd.getTime()], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// Hämta ordrar med status
function hamtaOrdrarMedStatus(restaurangSlug, status, callback) {
  const sql = `
    SELECT * FROM orders
    WHERE restaurant_slug = ?
      AND status = ?
    ORDER BY created_at DESC
  `;
  db.all(sql, [restaurangSlug, status], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// Uppdatera orderstatus
function uppdateraOrderStatus(orderId, newStatus, callback) {
  const now = Date.now();
  const sql = `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`;
  db.run(sql, [newStatus, now, orderId], function (err) {
    if (err) return callback(err);
    callback(null);
  });
}

// Hämta order med detaljer
function hamtaOrderMedDetaljer(orderId, callback) {
  const sql = `
    SELECT 
      o.*,
      oi.id as item_id,
      oi.name as item_name,
      oi.quantity,
      oi.unit_price,
      oi.line_total
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = ?
  `;
  
  db.all(sql, [orderId], (err, rows) => {
    if (err) return callback(err);
    
    if (rows.length === 0) {
      return callback(null, null);
    }
    
    // Gruppera items
    const order = {
      id: rows[0].id,
      restaurant_slug: rows[0].restaurant_slug,
      customer_name: rows[0].customer_name,
      customer_phone: rows[0].customer_phone,
      customer_address: rows[0].customer_address,
      customer_email: rows[0].customer_email,
      status: rows[0].status,
      payment_method: rows[0].payment_method,
      payment_status: rows[0].payment_status,
      items_total: rows[0].items_total,
      delivery_fee: rows[0].delivery_fee,
      discount_total: rows[0].discount_total,
      grand_total: rows[0].grand_total,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      assigned_courier_id: rows[0].assigned_courier_id,
      delivered_at: rows[0].delivered_at,
      items: []
    };
    
    rows.forEach(row => {
      if (row.item_id) {
        order.items.push({
          id: row.item_id,
          name: row.item_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
          line_total: row.line_total
        });
      }
    });
    
    callback(null, order);
  });
}

// Hämta kurirordrar
function hamtaKurirOrdrar(status, courierId, callback) {
  let sql, params;
  
  switch (status) {
    case 'pending':
      sql = `
        SELECT id, customer_name, customer_address, customer_phone, 
               grand_total, restaurant_slug, status, created_at
        FROM orders 
        WHERE status = 'out_for_delivery' AND assigned_courier_id IS NULL
        ORDER BY created_at ASC
      `;
      params = [];
      break;
    case 'mine':
      sql = `
        SELECT id, customer_name, customer_address, customer_phone, 
               grand_total, restaurant_slug, status, created_at
        FROM orders 
        WHERE assigned_courier_id = ? AND status IN ('out_for_delivery', 'delivered')
        ORDER BY created_at DESC
      `;
      params = [courierId];
      break;
    default:
      return callback(new Error('Ogiltig status'));
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// Tilldela order till kurir
function tilldelaOrderTillKurir(orderId, courierId, callback) {
  const now = Date.now();
  const sql = `
    UPDATE orders 
    SET assigned_courier_id = ?, updated_at = ?
    WHERE id = ? AND status = 'out_for_delivery' AND assigned_courier_id IS NULL
  `;
  
  db.run(sql, [courierId, now, orderId], function (err) {
    if (err) return callback(err);
    
    if (this.changes === 0) {
      return callback(new Error('Order kunde inte tilldelas (redan tilldelad eller fel status)'));
    }
    
    callback(null);
  });
}

module.exports = {
  hamtaDagensOrdrar,
  hamtaSenasteOrder,
  markeraOrderSomKlar: markeraOrderSomLevererad, // Behåll för bakåtkompatibilitet
  hamtaOrdrarMedStatus,
  uppdateraOrderStatus,
  hamtaOrderMedDetaljer,
  hamtaKurirOrdrar,
  tilldelaOrderTillKurir,
  markeraOrderSomLevererad,
  db,
};
