const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "orders.sqlite");
const db = new sqlite3.Database(dbPath);

// Skapa backup av befintlig databas
function createBackup() {
  const backupPath = `${dbPath}.backup.${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`Backup skapad: ${backupPath}`);
  return backupPath;
}

// Migrera befintlig orders-tabell till ny struktur
function migrateOrdersTable() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Skapa ny orders-tabell med rätt struktur
      db.run(`
        CREATE TABLE orders_new (
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

      // Migrera data från befintlig orders-tabell
      db.all("SELECT * FROM orders", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`Migrerar ${rows.length} ordrar...`);

        const stmt = db.prepare(`
          INSERT INTO orders_new (
            id, restaurant_slug, customer_name, customer_phone, customer_address,
            customer_email, status, payment_method, payment_status,
            items_total, delivery_fee, discount_total, grand_total,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        rows.forEach((row, index) => {
          // Konvertera total från kr till öre
          const totalInOre = Math.round((row.total || 0) * 100);
          
          // Konvertera timestamp till epoch ms
          const createdAt = new Date(row.created_at).getTime();
          
          // Mappa status
          let status = 'received';
          if (row.status === 'klar') {
            status = 'delivered';
          } else if (row.status === 'aktiv') {
            status = 'received';
          }

          stmt.run([
            row.id,
            row.restaurangSlug || 'campino', // fallback
            row.namn || 'Okänd kund',
            row.telefon || '',
            row.adress || '',
            row.email || '',
            status,
            'mock', // standard betalningsmetod
            'pending',
            totalInOre,
            0, // delivery_fee
            0, // discount_total
            totalInOre, // grand_total
            createdAt,
            createdAt // updated_at
          ]);

          if ((index + 1) % 10 === 0) {
            console.log(`Migrerat ${index + 1}/${rows.length} ordrar`);
          }
        });

        stmt.finalize();
        console.log('Orders-migration klar');
        resolve();
      });
    });
  });
}

// Skapa nya tabeller
function createNewTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // order_items tabell
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit_price INTEGER NOT NULL, -- öre
          line_total INTEGER NOT NULL, -- öre
          FOREIGN KEY (order_id) REFERENCES orders_new(id) ON DELETE CASCADE
        )
      `);

      // order_item_options tabell
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

      // payouts tabell
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

      // Uppdatera users tabell om nödvändigt
      db.all('PRAGMA table_info(users)', (err, cols) => {
        if (!err) {
          const columnNames = cols.map(c => c.name);
          
          if (!columnNames.includes('role')) {
            db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'");
          }
          if (!columnNames.includes('restaurangSlug')) {
            db.run("ALTER TABLE users ADD COLUMN restaurangSlug TEXT");
          }
        }
        
        resolve();
      });
    });
  });
}

// Idempotent migration för assigned_courier_id kolumn
function ensureAssignedCourierId() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Kontrollera om kolumnen finns
      db.get("SELECT 1 FROM pragma_table_info('orders') WHERE name='assigned_courier_id' LIMIT 1", (err, row) => {
        if (err) {
          db.run("ROLLBACK");
          reject(err);
          return;
        }

        if (!row) {
          // Kolumnen saknas, lägg till den
          db.run("ALTER TABLE orders ADD COLUMN assigned_courier_id INTEGER", (err) => {
            if (err) {
              db.run("ROLLBACK");
              reject(err);
              return;
            }
            console.log('Lade till assigned_courier_id kolumn');
          });
        }

        // Skapa index idempotent
        db.run("CREATE INDEX IF NOT EXISTS idx_orders_assigned_status ON orders(assigned_courier_id, status)", (err) => {
          if (err) {
            db.run("ROLLBACK");
            reject(err);
            return;
          }
          
          db.run("COMMIT", (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });
    });
  });
}

// Skapa index
function createIndexes() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Orders index
      db.run("CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders_new(restaurant_slug, created_at)");
      db.run("CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders_new(status, created_at)");
      db.run("CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON orders_new(assigned_courier_id, status)");
      db.run("CREATE INDEX IF NOT EXISTS idx_orders_out_for_delivery ON orders_new(status) WHERE status = 'out_for_delivery'");

      // FK index
      db.run("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_order_item_options_item_id ON order_item_options(order_item_id)");

      // Payouts index
      db.run("CREATE INDEX IF NOT EXISTS idx_payouts_restaurant_period ON payouts(restaurant_slug, period_start)");

      resolve();
    });
  });
}

// Ersätt gamla tabellen
function replaceOldTable() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Ta bort gamla tabellen
      db.run("DROP TABLE IF EXISTS orders", (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Byt namn på nya tabellen
        db.run("ALTER TABLE orders_new RENAME TO orders", (err) => {
          if (err) {
            reject(err);
            return;
          }

          console.log('Databasstruktur uppdaterad');
          resolve();
        });
      });
    });
  });
}

// Huvudmigrationsfunktion
async function migrateDatabase() {
  try {
    console.log('Startar databas-migration...');
    
    // Skapa backup
    createBackup();
    
    // Migrera orders-tabell
    await migrateOrdersTable();
    
    // Skapa nya tabeller
    await createNewTables();
    
    // Skapa index
    await createIndexes();
    
    // Ersätt gamla tabellen
    await replaceOldTable();
    
    // Säkerställ assigned_courier_id kolumn (idempotent)
    await ensureAssignedCourierId();
    
    console.log('Migration slutförd framgångsrikt!');
    
  } catch (error) {
    console.error('Migration misslyckades:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Kör migration om scriptet körs direkt
if (require.main === module) {
  migrateDatabase()
    .then(() => {
      console.log('Databas-migration klar');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration fel:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase, ensureAssignedCourierId };
