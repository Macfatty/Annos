const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "orders.sqlite");
const db = new sqlite3.Database(dbPath);

// Lägg till kolumnen role om den saknas
db.all("PRAGMA table_info(users)", (err, cols) => {
  if (err) {
    console.error(err);
    return db.close();
  }
  if (!cols.some((c) => c.name === "role")) {
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'", runUpdate);
  } else {
    runUpdate();
  }
});

function runUpdate() {
  db.run(
    "UPDATE users SET role = CASE WHEN isAdmin = 1 THEN 'admin' ELSE 'customer' END",
    (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("Migrering klar");
      }
      db.close();
    }
  );
}
