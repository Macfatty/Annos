const pool = require('./db');

const createTables = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      namn VARCHAR(255),
      telefon VARCHAR(20),
      adress VARCHAR(500),
      role VARCHAR(50) DEFAULT 'customer',
      restaurant_slug VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      namn VARCHAR(255) NOT NULL,
      beskrivning VARCHAR(1000)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      restaurant_slug VARCHAR(100) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_address VARCHAR(500) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'received',
      payment_method VARCHAR(50) DEFAULT 'mock',
      payment_status VARCHAR(50) DEFAULT 'pending',
      items_total DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      discount_total DECIMAL(10,2) DEFAULT 0,
      grand_total DECIMAL(10,2) NOT NULL,
      customer_notes TEXT,
      order_json JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      assigned_courier_id BIGINT,
      delivered_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_item_options (
      id SERIAL PRIMARY KEY,
      order_item_id BIGINT NOT NULL,
      typ VARCHAR(50) NOT NULL,
      label VARCHAR(255) NOT NULL,
      price_delta DECIMAL(10,2) NOT NULL,
      custom_note VARCHAR(500),
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    );

    -- Refresh tokens table for secure token rotation
    -- DO NOT MODIFY THIS TABLE - See docs/TOKEN_FLOW.md
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      token VARCHAR(500) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      revoked BOOLEAN DEFAULT FALSE,
      revoked_at TIMESTAMP,
      replaced_by_token VARCHAR(500),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Index for fast token lookup
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
  `;

  try {
    await pool.query(query);
    console.log('✅ Tabeller skapade i PostgreSQL');
  } catch (err) {
    console.error('❌ Fel vid skapande av tabeller:', err.stack);
    throw err; // Kasta felet så att startup kan hantera det
  }
};

// Kör createTables om scriptet anropas direkt
if (require.main === module) {
  createTables();
}

module.exports = { createTables };