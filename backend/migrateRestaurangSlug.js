const pool = require("./db");

async function migrateRestaurangSlug() {
  try {
    // Kontrollera om kolumnen restaurangSlug finns
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'restaurangSlug'
        AND table_schema = 'public'
      )
    `);

    if (!columnExists.rows[0].exists) {
      // Lägg till kolumnen restaurangSlug
      await pool.query("ALTER TABLE users ADD COLUMN restaurangSlug VARCHAR(100)");
      console.log("Lade till restaurangSlug-kolumn");
    }

    console.log("Migrering klar");
  } catch (error) {
    console.error("Fel vid migrering av restaurangSlug:", error);
  } finally {
    await pool.end();
  }
}

// Kör migrering om scriptet körs direkt
if (require.main === module) {
  migrateRestaurangSlug();
}

module.exports = { migrateRestaurangSlug };
