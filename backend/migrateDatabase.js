const pool = require("./db");
const path = require("path");
const fs = require("fs");

// PostgreSQL behöver inte backup-funktion som SQLite
function createBackup() {
  console.log("PostgreSQL använder automatisk backup via pg_dump");
  return null;
}

// Migrera befintlig orders-tabell till ny struktur
async function migrateOrdersTable() {
  try {
    // Kontrollera om orders-tabellen finns
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Orders-tabellen finns inte, skapar den...');
      return;
    }

    // Hämta befintliga ordrar
    const result = await pool.query("SELECT * FROM orders");
    const rows = result.rows;

    console.log(`Migrerar ${rows.length} ordrar...`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
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

      // Uppdatera befintlig rad
      await pool.query(`
        UPDATE orders SET
          restaurant_slug = $1,
          customer_name = $2,
          customer_phone = $3,
          customer_address = $4,
          customer_email = $5,
          status = $6,
          payment_method = $7,
          payment_status = $8,
          items_total = $9,
          delivery_fee = $10,
          discount_total = $11,
          grand_total = $12,
          created_at = $13,
          updated_at = $14
        WHERE id = $15
      `, [
        row.restaurant_slug || 'campino',
        row.namn || 'Okänd kund',
        row.telefon || '',
        row.adress || '',
        row.email || '',
        status,
        'mock',
        'pending',
        totalInOre,
        0,
        0,
        totalInOre,
        createdAt,
        createdAt,
        row.id
      ]);

      if ((i + 1) % 10 === 0) {
        console.log(`Migrerat ${i + 1}/${rows.length} ordrar`);
      }
    }

    console.log('Orders-migration klar');
  } catch (error) {
    console.error('Fel vid migration av orders-tabell:', error);
    throw error;
  }
}

// Skapa nya tabeller
async function createNewTables() {
  try {
    // order_items tabell
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        line_total DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    // order_item_options tabell
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_item_options (
        id SERIAL PRIMARY KEY,
        order_item_id BIGINT NOT NULL,
        typ VARCHAR(50) NOT NULL CHECK (typ IN ('såser', 'kött', 'grönt', 'övrigt', 'drycker', 'valfri')),
        label VARCHAR(255) NOT NULL,
        price_delta DECIMAL(10,2) NOT NULL,
        custom_note VARCHAR(500),
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
      )
    `);

    // payouts tabell
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payouts (
        id SERIAL PRIMARY KEY,
        restaurant_slug VARCHAR(100) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        orders_count INTEGER NOT NULL,
        gross_revenue DECIMAL(10,2) NOT NULL,
        per_order_fee DECIMAL(10,2) NOT NULL,
        percent_fee DECIMAL(10,2) NOT NULL,
        net_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Uppdatera users tabell om nödvändigt
    const userColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
    `);
    
    const columnNames = userColumns.rows.map(c => c.column_name);
    
    if (!columnNames.includes('role')) {
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'customer'");
    }
    if (!columnNames.includes('restaurant_slug')) {
      await pool.query("ALTER TABLE users ADD COLUMN restaurant_slug VARCHAR(100)");
    }

    console.log('Nya tabeller skapade');
  } catch (error) {
    console.error('Fel vid skapande av nya tabeller:', error);
    throw error;
  }
}

// Idempotent migration för assigned_courier_id kolumn
async function ensureAssignedCourierId() {
  try {
    // Kontrollera om kolumnen finns
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'assigned_courier_id'
        AND table_schema = 'public'
      )
    `);

    if (!columnExists.rows[0].exists) {
      // Kolumnen saknas, lägg till den
      await pool.query("ALTER TABLE orders ADD COLUMN assigned_courier_id BIGINT");
      console.log('Lade till assigned_courier_id kolumn');
    }

    // Skapa index idempotent
    await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_assigned_status ON orders(assigned_courier_id, status)");
    console.log('Index för assigned_courier_id skapat');
  } catch (error) {
    console.error('Fel vid säkerställande av assigned_courier_id kolumn:', error);
    throw error;
  }
}

// Skapa index
async function createIndexes() {
  try {
    // Orders index
    await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_slug, created_at)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON orders(assigned_courier_id, status)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_out_for_delivery ON orders(status) WHERE status = 'out_for_delivery'");

    // FK index
    await pool.query("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_order_item_options_item_id ON order_item_options(order_item_id)");

    // Payouts index
    await pool.query("CREATE INDEX IF NOT EXISTS idx_payouts_restaurant_period ON payouts(restaurant_slug, period_start)");

    console.log('Index skapade');
  } catch (error) {
    console.error('Fel vid skapande av index:', error);
    throw error;
  }
}

// PostgreSQL behöver inte ersätta tabeller på samma sätt
async function replaceOldTable() {
  console.log('PostgreSQL använder befintliga tabeller, ingen ersättning behövs');
}

// Huvudmigrationsfunktion
async function migrateDatabase() {
  try {
    console.log('Startar PostgreSQL databas-migration...');
    
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
    
    console.log('PostgreSQL migration slutförd framgångsrikt!');
    
  } catch (error) {
    console.error('Migration misslyckades:', error);
    throw error;
  } finally {
    await pool.end();
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
