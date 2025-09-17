require('dotenv').config();
const pool = require('./db'); // Använd samma pool som resten av applikationen

async function fixOrdersSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Synkroniserar orders sequence...');
    
    // Hämta det högsta ID:t från orders-tabellen
    const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM orders');
    const maxId = maxIdResult.rows[0].max_id || 0;
    
    console.log(`📊 Högsta ID i orders-tabellen: ${maxId}`);
    
    // Uppdatera sequence till nästa tillgängliga ID
    const nextId = maxId + 1;
    await client.query(`SELECT setval('orders_id_seq', $1, false)`, [nextId]);
    
    console.log(`✅ Sequence uppdaterad till: ${nextId}`);
    
    // Verifiera att sequence fungerar
    const testResult = await client.query('SELECT nextval(\'orders_id_seq\') as next_id');
    console.log(`🧪 Nästa ID som kommer genereras: ${testResult.rows[0].next_id}`);
    
    // Återställ sequence till rätt värde (eftersom vi testade)
    await client.query(`SELECT setval('orders_id_seq', $1, false)`, [nextId]);
    
    console.log('✅ Sequence synkronisering slutförd!');
    
  } catch (error) {
    console.error('❌ Fel vid sequence synkronisering:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function fixOrderItemsSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Synkroniserar order_items sequence...');
    
    // Hämta det högsta ID:t från order_items-tabellen
    const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM order_items');
    const maxId = maxIdResult.rows[0].max_id || 0;
    
    console.log(`📊 Högsta ID i order_items-tabellen: ${maxId}`);
    
    // Uppdatera sequence till nästa tillgängliga ID
    const nextId = maxId + 1;
    await client.query(`SELECT setval('order_items_id_seq', $1, false)`, [nextId]);
    
    console.log(`✅ Order items sequence uppdaterad till: ${nextId}`);
    
  } catch (error) {
    console.error('❌ Fel vid order_items sequence synkronisering:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function fixOrderItemOptionsSequence() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Synkroniserar order_item_options sequence...');
    
    // Hämta det högsta ID:t från order_item_options-tabellen
    const maxIdResult = await client.query('SELECT MAX(id) as max_id FROM order_item_options');
    const maxId = maxIdResult.rows[0].max_id || 0;
    
    console.log(`📊 Högsta ID i order_item_options-tabellen: ${maxId}`);
    
    // Uppdatera sequence till nästa tillgängliga ID
    const nextId = maxId + 1;
    await client.query(`SELECT setval('order_item_options_id_seq', $1, false)`, [nextId]);
    
    console.log(`✅ Order item options sequence uppdaterad till: ${nextId}`);
    
  } catch (error) {
    console.error('❌ Fel vid order_item_options sequence synkronisering:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Startar sequence synkronisering...\n');
    
    await fixOrdersSequence();
    console.log('');
    
    await fixOrderItemsSequence();
    console.log('');
    
    await fixOrderItemOptionsSequence();
    console.log('');
    
    console.log('🎉 Alla sequences synkroniserade!');
    
  } catch (error) {
    console.error('💥 Fel vid sequence synkronisering:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Kör scriptet om det anropas direkt
if (require.main === module) {
  main();
}

module.exports = {
  fixOrdersSequence,
  fixOrderItemsSequence,
  fixOrderItemOptionsSequence
};
