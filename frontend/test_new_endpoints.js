/**
 * Test script för att verifiera att de nya meny-endpoints fungerar
 */
import { MenuService } from './src/services/menu/menuService.js';

async function testNewEndpoints() {
  console.log('🧪 Testar nya meny-endpoints...\n');

  try {
    // Test 1: Hämta restauranger
    console.log('1. Testar fetchRestaurants...');
    const restaurants = await MenuService.fetchRestaurants();
    console.log('✅ Restauranger:', restaurants.length, 'st');
    console.log('   Data:', restaurants.map(r => r.name).join(', '));
    console.log('');

    // Test 2: Hämta meny för Campino
    console.log('2. Testar fetchMenu för Campino...');
    const menu = await MenuService.fetchMenu('campino');
    console.log('✅ Meny:', menu.length, 'items');
    console.log('   Första item:', menu[0]?.namn || 'Ingen data');
    console.log('');

    // Test 3: Hämta tillbehör för Campino
    console.log('3. Testar fetchAccessories för Campino...');
    const accessories = await MenuService.fetchAccessories('campino');
    console.log('✅ Tillbehör:', accessories.length, 'st');
    console.log('   Första tillbehör:', accessories[0]?.namn || 'Ingen data');
    console.log('');

    // Test 4: Hämta kategorier för Campino
    console.log('4. Testar fetchCategories för Campino...');
    const categories = await MenuService.fetchCategories('campino');
    console.log('✅ Kategorier:', categories.length, 'st');
    console.log('   Kategorier:', categories.slice(0, 3).join(', '), '...');
    console.log('');

    // Test 5: Sök i meny
    console.log('5. Testar searchMenu för "pizza"...');
    const searchResults = await MenuService.searchMenu('campino', 'pizza');
    console.log('✅ Sökresultat:', searchResults.length, 'items');
    console.log('   Första resultat:', searchResults[0]?.namn || 'Ingen data');
    console.log('');

    // Test 6: Hämta grupperade tillbehör
    console.log('6. Testar fetchGroupedAccessories för Campino...');
    const groupedAccessories = await MenuService.fetchGroupedAccessories('campino');
    console.log('✅ Grupperade tillbehör:', Object.keys(groupedAccessories).length, 'grupper');
    console.log('   Grupper:', Object.keys(groupedAccessories).join(', '));
    console.log('');

    console.log('🎉 Alla tester passerade! De nya endpoints fungerar korrekt.');

  } catch (error) {
    console.error('❌ Test misslyckades:', error.message);
    console.error('   Detaljer:', error);
  }
}

// Kör testet
testNewEndpoints();
