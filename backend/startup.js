const { Pool } = require('pg');
require('dotenv').config();
const { createTables } = require('./createTables');
const { autoFixSequences } = require('./autoFixSequences');

// Konfiguration för anslutning till PostgreSQL
const dbConfig = {
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'asha',
  port: parseInt(process.env.DB_PORT || process.env.PGPORT) || 5432,
};

const dbName = process.env.DB_NAME || process.env.PGDATABASE || 'annos';

// Pool för anslutning till PostgreSQL (utan specifik databas först)
const adminPool = new Pool({
  ...dbConfig,
  database: 'postgres' // Anslut till default postgres-databas först
});

/**
 * Skapar databasen om den inte existerar
 */
async function ensureDatabaseExists() {
  const adminClient = await adminPool.connect();
  
  try {
    console.log(`   - Kontrollerar om databasen '${dbName}' existerar...`);
    
    // Kontrollera om databasen existerar
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (result.rows.length === 0) {
      console.log(`   - Skapar databasen '${dbName}'...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`   ✅ Databasen '${dbName}' skapad`);
    } else {
      console.log(`   ✅ Databasen '${dbName}' existerar redan`);
    }
    
  } catch (error) {
    console.error(`   ❌ Fel vid skapande av databas '${dbName}':`, error.message);
    throw error;
  } finally {
    adminClient.release();
  }
}

/**
 * Startup sequence enligt Separation of Concerns (SoC):
 * 1. Infrastructure Setup (databas)
 * 2. Data Migration (tabeller)
 * 3. Maintenance Tasks (sequence-synkronisering)
 * 4. Application Startup
 */
async function startupSequence() {
  try {
    console.log('🚀 Startar startup sequence...\n');
    
    // 1. INFRASTRUCTURE SETUP
    console.log('📋 Steg 1: Infrastructure Setup');
    console.log('   - Kontrollerar PostgreSQL-anslutning...');
    
    // Testa anslutning till PostgreSQL
    const adminClient = await adminPool.connect();
    await adminClient.query('SELECT 1');
    adminClient.release();
    console.log('   ✅ PostgreSQL-anslutning OK');
    
    // Skapa databas om den inte existerar
    await ensureDatabaseExists();
    
    // Testa anslutning till applikationsdatabas
    console.log('   - Kontrollerar anslutning till applikationsdatabas...');
    const appPool = require('./db'); // Använd samma pool som resten av applikationen
    const appClient = await appPool.connect();
    await appClient.query('SELECT 1');
    appClient.release();
    console.log('   ✅ Applikationsdatabas-anslutning OK\n');
    
    // 2. DATA MIGRATION
    console.log('📋 Steg 2: Data Migration');
    console.log('   - Skapar tabeller och sequences...');
    
    await createTables();
    console.log('   ✅ Tabeller och sequences skapade\n');
    
    // 3. MAINTENANCE TASKS
    console.log('📋 Steg 3: Maintenance Tasks');
    console.log('   - Synkroniserar sequences...');
    
    await autoFixSequences();
    console.log('   ✅ Sequences synkroniserade\n');
    
    // Stäng admin pool nu när vi inte behöver den längre
    await adminPool.end();
    
    // 4. APPLICATION STARTUP
    console.log('📋 Steg 4: Application Startup');
    console.log('   - Startar Express server...');
    
    // Importera och starta server
    const app = require("./src/app");
    const PORT = process.env.PORT || 3001;

    app.listen(PORT, () => {
      console.log(`   ✅ Servern körs på http://localhost:${PORT}`);
      console.log(`   ✅ Frontend: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}`);
      console.log(`   ✅ Admin Panel: ${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/admin`);
      console.log('\n🎉 Startup sequence slutförd!');
    });
    
  } catch (error) {
    console.error('💥 Startup sequence misslyckades:', error);
    process.exit(1);
  }
}

// Kör startup sequence om scriptet anropas direkt
if (require.main === module) {
  startupSequence();
}

module.exports = { startupSequence };
