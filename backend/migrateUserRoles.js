const pool = require("./db");

async function migrateUserRoles() {
  try {
    // Kontrollera om kolumnen role finns
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'role'
        AND table_schema = 'public'
      )
    `);

    if (!columnExists.rows[0].exists) {
      // Lägg till kolumnen role
      await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'customer'");
      console.log("Lade till role-kolumn");
    }

    // Kontrollera om isAdmin-kolumnen finns
    const isAdminExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'isAdmin'
        AND table_schema = 'public'
      )
    `);

    if (isAdminExists.rows[0].exists) {
      // Uppdatera roller baserat på isAdmin
      await pool.query(`
        UPDATE users SET role = CASE WHEN isAdmin = 1 THEN 'admin' ELSE 'customer' END
      `);
      console.log("Uppdaterade roller baserat på isAdmin");
    }

    console.log("Migrering klar");
  } catch (error) {
    console.error("Fel vid migrering av användarroller:", error);
  } finally {
    await pool.end();
  }
}

// Kör migrering om scriptet körs direkt
if (require.main === module) {
  migrateUserRoles();
}

module.exports = { migrateUserRoles };
