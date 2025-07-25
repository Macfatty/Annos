const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./orders.sqlite");

const email = "admin@example.com";
const losenord = "admin123";
const namn = "Admin Test";
const telefon = "0700000000";
const adress = "Testgatan 1";
const restaurangSlug = process.argv[2] || "campino";

bcrypt.hash(losenord, 10, (err, hash) => {
  if (err) return console.error("❌ Fel vid hash:", err);

  const sql = `INSERT INTO users (email, password, namn, telefon, adress, role, restaurangSlug) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(sql, [email, hash, namn, telefon, adress, 'admin', restaurangSlug], function (err) {
    if (err) {
      return console.error("❌ Kunde inte skapa användare:", err.message);
    }
    console.log(`✅ Användare skapad med ID ${this.lastID} för slug ${restaurangSlug}`);
    db.close();
  });
});
