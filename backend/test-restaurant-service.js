/**
 * PHASE 2 Test Suite - Restaurant Service
 *
 * Tests the RestaurantService functionality
 * Run: node test-restaurant-service.js
 */

const RestaurantService = require('./src/services/restaurantService');
const fs = require('fs').promises;
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function success(message) {
  console.log(`${GREEN}✓${RESET} ${message}`);
  passed++;
}

function fail(message, error) {
  console.log(`${RED}✗${RESET} ${message}`);
  if (error) console.log(`  ${RED}Error:${RESET} ${error.message}`);
  failed++;
}

function info(message) {
  console.log(`${BLUE}ℹ${RESET} ${message}`);
}

async function runTests() {
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  PHASE 2 Test Suite - Restaurant Service${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}\n`);

  try {
    // Test 1: Get all restaurants
    info('Test 1: Get all restaurants');
    try {
      const restaurants = await RestaurantService.getAllRestaurants();
      if (Array.isArray(restaurants) && restaurants.length >= 2) {
        success('getAllRestaurants() returns array with restaurants');
      } else {
        fail('getAllRestaurants() did not return expected data');
      }
    } catch (error) {
      fail('getAllRestaurants() threw error', error);
    }

    // Test 2: Get restaurant by slug
    info('\nTest 2: Get restaurant by slug');
    try {
      const restaurant = await RestaurantService.getRestaurantBySlug('campino');
      if (restaurant && restaurant.slug === 'campino' && restaurant.namn === 'Campino') {
        success('getRestaurantBySlug("campino") returns correct restaurant');
      } else {
        fail('getRestaurantBySlug("campino") returned unexpected data');
      }
    } catch (error) {
      fail('getRestaurantBySlug("campino") threw error', error);
    }

    // Test 3: Get menu for restaurant
    info('\nTest 3: Get menu for restaurant');
    try {
      const menu = await RestaurantService.getMenu('campino');
      if (Array.isArray(menu) && menu.length > 0) {
        success('getMenu("campino") returns array with menu items');
        info(`  Found ${menu.length} menu items`);
      } else {
        fail('getMenu("campino") did not return expected menu data');
      }
    } catch (error) {
      fail('getMenu("campino") threw error', error);
    }

    // Test 4: Menu validation - valid menu
    info('\nTest 4: Menu validation - valid menu');
    try {
      const validMenu = [
        { id: 1, namn: 'Pizza Margherita', kategori: 'Pizza', pris: 89 },
        { id: 2, namn: 'Pizza Vesuvio', kategori: 'Pizza', pris: 95 }
      ];
      RestaurantService.validateMenuStructure(validMenu);
      success('validateMenuStructure() accepts valid menu');
    } catch (error) {
      fail('validateMenuStructure() rejected valid menu', error);
    }

    // Test 5: Menu validation - invalid menu (missing field)
    info('\nTest 5: Menu validation - invalid menu (missing field)');
    try {
      const invalidMenu = [
        { id: 1, namn: 'Pizza', kategori: 'Pizza' } // Missing 'pris'
      ];
      RestaurantService.validateMenuStructure(invalidMenu);
      fail('validateMenuStructure() should have rejected menu with missing field');
    } catch (error) {
      if (error.message.includes('Missing required field')) {
        success('validateMenuStructure() correctly rejects menu with missing field');
      } else {
        fail('validateMenuStructure() threw unexpected error', error);
      }
    }

    // Test 6: Menu validation - duplicate IDs
    info('\nTest 6: Menu validation - duplicate IDs');
    try {
      const duplicateMenu = [
        { id: 1, namn: 'Pizza 1', kategori: 'Pizza', pris: 89 },
        { id: 1, namn: 'Pizza 2', kategori: 'Pizza', pris: 95 } // Duplicate ID
      ];
      RestaurantService.validateMenuStructure(duplicateMenu);
      fail('validateMenuStructure() should have rejected menu with duplicate IDs');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        success('validateMenuStructure() correctly rejects menu with duplicate IDs');
      } else {
        fail('validateMenuStructure() threw unexpected error', error);
      }
    }

    // Test 7: Menu validation - invalid price
    info('\nTest 7: Menu validation - invalid price');
    try {
      const invalidPriceMenu = [
        { id: 1, namn: 'Pizza', kategori: 'Pizza', pris: -50 } // Negative price
      ];
      RestaurantService.validateMenuStructure(invalidPriceMenu);
      fail('validateMenuStructure() should have rejected menu with invalid price');
    } catch (error) {
      if (error.message.includes('must be a positive number')) {
        success('validateMenuStructure() correctly rejects menu with invalid price');
      } else {
        fail('validateMenuStructure() threw unexpected error', error);
      }
    }

    // Test 8: Get non-existent restaurant
    info('\nTest 8: Get non-existent restaurant');
    try {
      await RestaurantService.getRestaurantBySlug('nonexistent');
      fail('getRestaurantBySlug() should throw error for non-existent restaurant');
    } catch (error) {
      if (error.message.includes('not found')) {
        success('getRestaurantBySlug() correctly throws error for non-existent restaurant');
      } else {
        fail('getRestaurantBySlug() threw unexpected error', error);
      }
    }

    // Test 9: Check database structure
    info('\nTest 9: Check database structure');
    try {
      const pool = require('./db');
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'restaurants'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.map(r => r.column_name);
      const requiredColumns = ['id', 'slug', 'namn', 'address', 'phone', 'email', 'is_active', 'menu_file_path', 'created_at', 'updated_at'];

      const hasAllColumns = requiredColumns.every(col => columns.includes(col));

      if (hasAllColumns) {
        success('Database has all required columns from PHASE 2 migration');
        info(`  Columns: ${columns.join(', ')}`);
      } else {
        fail('Database is missing some required columns');
      }
    } catch (error) {
      fail('Failed to check database structure', error);
    }

    // Test 10: Check menu_versions table exists
    info('\nTest 10: Check menu_versions table exists');
    try {
      const pool = require('./db');
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'menu_versions'
        );
      `);

      if (result.rows[0].exists) {
        success('menu_versions table exists');
      } else {
        fail('menu_versions table does not exist');
      }
    } catch (error) {
      fail('Failed to check menu_versions table', error);
    }

    // Test 11: Graceful error handling for missing menu file
    info('\nTest 11: Graceful error handling for missing menu file');
    try {
      // Create temporary restaurant with non-existent menu file
      const pool = require('./db');
      await pool.query(`
        INSERT INTO restaurants (slug, namn, menu_file_path, is_active)
        VALUES ('test-missing-menu', 'Test Restaurant', 'Data/menyer/nonexistent.json', true)
        ON CONFLICT (slug) DO UPDATE SET menu_file_path = EXCLUDED.menu_file_path
      `);

      const menu = await RestaurantService.getMenu('test-missing-menu');

      // Clean up
      await pool.query(`DELETE FROM restaurants WHERE slug = 'test-missing-menu'`);

      if (Array.isArray(menu) && menu.length === 0) {
        success('getMenu() returns empty array for missing file (graceful error handling)');
      } else {
        fail('getMenu() did not handle missing file gracefully');
      }
    } catch (error) {
      fail('getMenu() threw error for missing file (should be graceful)', error);
    }

  } catch (error) {
    console.error(`\n${RED}Unexpected error during tests:${RESET}`, error);
  }

  // Summary
  console.log(`\n${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}  Test Results${RESET}`);
  console.log(`${BLUE}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${GREEN}Passed:${RESET} ${passed}`);
  console.log(`${RED}Failed:${RESET} ${failed}`);
  console.log(`${BLUE}Total:${RESET}  ${passed + failed}`);

  if (failed === 0) {
    console.log(`\n${GREEN}✓ All tests passed!${RESET}\n`);
  } else {
    console.log(`\n${RED}✗ Some tests failed${RESET}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});
