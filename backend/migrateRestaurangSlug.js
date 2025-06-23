const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "orders.sqlite");
const db = new sqlite3.Database(dbPath);

// Lägg till kolumnen restaurangSlug om den saknas

db.all("PRAGMA table_info(users)", (err, cols) => {
  if (err) {
    console.error(err);
    return db.close();
  }
  if (!cols.some((c) => c.name === "restaurangSlug")) {
    db.run("ALTER TABLE users ADD COLUMN restaurangSlug TEXT", closeDb);
  } else {
    closeDb();
  }
});

function closeDb() {
  console.log("Migrering klar");
  db.close();
}
