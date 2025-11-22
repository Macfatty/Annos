const pool = require("./db");

async function migrateRestaurangSlug() {
  try {
    // Kontrollera om kolumnen restaurant_slug finns
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'restaurant_slug'
        AND table_schema = 'public'
      )
    `);

    if (!columnExists.rows[0].exists) {
      // Lägg till kolumnen restaurant_slug
      await pool.query("ALTER TABLE users ADD COLUMN restaurant_slug VARCHAR(100)");
      console.log("Lade till restaurant_slug-kolumn");
    }

    console.log("Migrering klar");
  } catch (error) {
    console.error("Fel vid migrering av restaurant_slug:", error);
  } finally {
    await pool.end();
  }
}

// Kör migrering om scriptet körs direkt
if (require.main === module) {
  migrateRestaurangSlug();
}

module.exports = { migrateRestaurangSlug };
