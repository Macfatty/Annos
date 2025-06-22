// backend/initDB.js
// Skapar SQLite-databas med users- och orders-tabeller enligt projektets specifikationer.

const sqlite3 = require("sqlite3").verbose();

// Anslut till SQLite-databas (skapas om den inte finns)
const db = new sqlite3.Database("orders.sqlite", (err) => {
  if (err) {
    console.error("❌ Kunde inte öppna databas:", err.message);
    process.exit(1);
  }
});

// Skapa tabeller i en transaktion
db.serialize(() => {
  // Skapa users-tabell
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namn TEXT,
      email TEXT UNIQUE,
      telefon TEXT,
      adress TEXT,
      losenord TEXT,
      role TEXT DEFAULT 'customer'
    )`,
    (err) => {
      if (err) {
        console.error("❌ Fel vid skapande av users-tabell:", err.message);
      } else {
        console.log("✅ users-tabell skapad eller finns redan.");
      }
    }
  );

  // Skapa orders-tabell
  db.run(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      namn TEXT,
      email TEXT,
      telefon TEXT,
      adress TEXT,
      extraInfo TEXT,
      order_json TEXT,
      total INTEGER,
      restaurangSlug TEXT,
      status TEXT DEFAULT 'aktiv',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        console.error("❌ Fel vid skapande av orders-tabell:", err.message);
      } else {
        console.log("✅ orders-tabell skapad eller finns redan.");
      }
    }
  );
});

// Stäng anslutningen när allt är klart
db.close((err) => {
  if (err) {
    console.error("❌ Fel vid stängning av databasen:", err.message);
  } else {
    console.log("🟢 Databasen är klar och stängd.");
  }
});
