const pool = require("./db");
const bcrypt = require("bcrypt");

const email = "admin@example.com";
const losenord = "admin123";
const namn = "Admin Test";
const telefon = "0700000000";
const adress = "Testgatan 1";
const restaurangSlug = process.argv[2] || "campino";

async function createAdmin() {
  try {
    // Kontrollera om admin redan finns
    const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    
    if (existingAdmin.rows.length > 0) {
      console.log("❌ Admin-användare finns redan med denna e-post");
      return;
    }

    // Hasha lösenordet
    const hash = await bcrypt.hash(losenord, 10);

    // Skapa admin-användare
    const sql = `INSERT INTO users (email, password, namn, telefon, adress, role, restaurangSlug) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
    const result = await pool.query(sql, [email, hash, namn, telefon, adress, 'admin', restaurangSlug]);
    
    console.log(`✅ Admin-användare skapad med ID ${result.rows[0].id} för slug ${restaurangSlug}`);
    console.log(`📧 E-post: ${email}`);
    console.log(`🔑 Lösenord: ${losenord}`);
  } catch (error) {
    console.error("❌ Fel vid skapande av admin-användare:", error);
  } finally {
    await pool.end();
  }
}

createAdmin();
