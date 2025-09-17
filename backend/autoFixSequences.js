require('dotenv').config();
const pool = require('./db'); // Använd samma pool som resten av applikationen

async function autoFixSequences() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Kontrollerar och synkroniserar sequences...');
    
    // Kontrollera att databasen existerar
    try {
      await client.query('SELECT 1');
    } catch (error) {
      if (error.code === '3D000') {
        console.log('⚠️  Databasen existerar inte ännu - hoppar över sequence-synkronisering');
        return;
      }
      throw error;
    }
    
    // Lista över tabeller med SERIAL PRIMARY KEY
    const tables = [
      { table: 'orders', sequence: 'orders_id_seq' },
      { table: 'order_items', sequence: 'order_items_id_seq' },
      { table: 'order_item_options', sequence: 'order_item_options_id_seq' }
    ];
    
    for (const { table, sequence } of tables) {
      try {
        // Hämta det högsta ID:t från tabellen
        const maxIdResult = await client.query(`SELECT MAX(id) as max_id FROM ${table}`);
        const maxId = maxIdResult.rows[0].max_id || 0;
        
        // Hämta nuvarande sequence-värde
        const currentSeqResult = await client.query(`SELECT last_value FROM ${sequence}`);
        const currentSeq = currentSeqResult.rows[0].last_value;
        
        // Om sequence är lägre än max ID, synkronisera
        if (currentSeq < maxId) {
          const nextId = maxId + 1;
          await client.query(`SELECT setval('${sequence}', $1, false)`, [nextId]);
          console.log(`✅ ${table}: Sequence synkroniserad från ${currentSeq} till ${nextId}`);
        } else {
          console.log(`✅ ${table}: Sequence redan synkroniserad (${currentSeq})`);
        }
        
      } catch (error) {
        console.log(`⚠️  Kunde inte kontrollera ${table}: ${error.message}`);
      }
    }
    
    console.log('🎉 Sequence-kontroll slutförd!');
    
  } catch (error) {
    console.error('❌ Fel vid sequence-kontroll:', error);
  } finally {
    client.release();
  }
}

module.exports = { autoFixSequences };
