const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("./orders.sqlite");

const {
  ADMIN_EMAIL: email,
  ADMIN_PASSWORD: losenord,
  ADMIN_NAME: namn,
  ADMIN_PHONE: telefon,
  ADMIN_ADDRESS: adress,
} = process.env;

if (!email || !losenord || !namn) {
  console.error(
    "❌ Ange ADMIN_EMAIL, ADMIN_PASSWORD och ADMIN_NAME som miljövariabler"
  );
  process.exit(1);
}

bcrypt.hash(losenord, 10, (err, hash) => {
  if (err) return console.error("❌ Fel vid hash:", err);

  const sql = `INSERT INTO users (email, password, namn, telefon, adress) VALUES (?, ?, ?, ?, ?)`;
  db.run(sql, [email, hash, namn, telefon, adress], function (err) {
    if (err) {
      return console.error("❌ Kunde inte skapa användare:", err.message);
    }
    console.log(`✅ Användare skapad med ID ${this.lastID}`);
    db.close();
  });
});
