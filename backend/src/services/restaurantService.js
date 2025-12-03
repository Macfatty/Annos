/**
 * Restaurant Service
 *
 * Handles restaurant management and menu operations
 * Follows PHASE 1 patterns: Service layer, caching, error handling
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const AuditService = require('./auditService');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'asha',
  password: process.env.DB_PASSWORD || 'asha',
  database: process.env.DB_NAME || 'annos_dev',
  port: process.env.DB_PORT || 5432,
});

class RestaurantService {
  /**
   * Get all restaurants (public - only active by default)
   */
  static async getAllRestaurants(includeInactive = false) {
    try {
      const query = includeInactive
        ? 'SELECT * FROM restaurants ORDER BY created_at DESC'
        : 'SELECT * FROM restaurants WHERE is_active = true ORDER BY created_at DESC';

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Get all restaurants error:', error);
      throw error;
    }
  }

  /**
   * Get restaurant by slug
   */
  static async getRestaurantBySlug(slug) {
    try {
      const result = await pool.query(
        'SELECT * FROM restaurants WHERE slug = $1',
        [slug]
      );

      if (result.rows.length === 0) {
        throw new Error(`Restaurant not found: ${slug}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get restaurant by slug error:', error);
      throw error;
    }
  }

  /**
   * Create new restaurant
   */
  static async createRestaurant(restaurantData, createdBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create restaurant record
      const result = await client.query(`
        INSERT INTO restaurants (
          slug, namn, beskrivning, address, phone, email,
          logo_url, banner_url, opening_hours, menu_file_path, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        restaurantData.slug,
        restaurantData.namn,
        restaurantData.beskrivning || null,
        restaurantData.address || null,
        restaurantData.phone || null,
        restaurantData.email || null,
        restaurantData.logo_url || null,
        restaurantData.banner_url || null,
        restaurantData.opening_hours ? JSON.stringify(restaurantData.opening_hours) : null,
        restaurantData.menu_file_path || `Data/menyer/${restaurantData.slug}.json`,
        restaurantData.is_active !== undefined ? restaurantData.is_active : true
      ]);

      const restaurant = result.rows[0];

      // 2. Create empty menu file if it doesn't exist
      const menuPath = path.join(__dirname, '../../', restaurant.menu_file_path);
      try {
        await fs.access(menuPath);
      } catch {
        // File doesn't exist, create it
        await fs.mkdir(path.dirname(menuPath), { recursive: true });
        await fs.writeFile(menuPath, JSON.stringify([], null, 2), 'utf8');
        console.log(`✅ Created menu file: ${restaurant.menu_file_path}`);
      }

      // 3. Audit log
      if (createdBy) {
        await AuditService.log({
          userId: createdBy,
          action: 'restaurant:create',
          resourceType: 'restaurant',
          resourceId: restaurant.id,
          details: { slug: restaurant.slug, namn: restaurant.namn }
        });
      }

      await client.query('COMMIT');

      return restaurant;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create restaurant error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update restaurant
   */
  static async updateRestaurant(slug, updateData, updatedBy = null) {
    try {
      // Build dynamic UPDATE query
      const updates = [];
      const values = [];
      let paramCounter = 1;

      const allowedFields = [
        'namn', 'beskrivning', 'address', 'phone', 'email',
        'logo_url', 'banner_url', 'opening_hours', 'is_active'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = $${paramCounter}`);
          // Convert opening_hours to JSON if it's an object
          if (field === 'opening_hours' && typeof updateData[field] === 'object') {
            values.push(JSON.stringify(updateData[field]));
          } else {
            values.push(updateData[field]);
          }
          paramCounter++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(slug); // For WHERE clause

      const query = `
        UPDATE restaurants
        SET ${updates.join(', ')}
        WHERE slug = $${paramCounter}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`Restaurant not found: ${slug}`);
      }

      // Audit log
      if (updatedBy) {
        await AuditService.log({
          userId: updatedBy,
          action: 'restaurant:update',
          resourceType: 'restaurant',
          resourceId: result.rows[0].id,
          details: { slug, updatedFields: Object.keys(updateData) }
        });
      }

      return result.rows[0];
    } catch (error) {
      console.error('Update restaurant error:', error);
      throw error;
    }
  }

  /**
   * Delete restaurant (soft delete)
   */
  static async deleteRestaurant(slug, deletedBy = null) {
    try {
      const result = await pool.query(
        'UPDATE restaurants SET is_active = false WHERE slug = $1 RETURNING *',
        [slug]
      );

      if (result.rows.length === 0) {
        throw new Error(`Restaurant not found: ${slug}`);
      }

      // Audit log
      if (deletedBy) {
        await AuditService.log({
          userId: deletedBy,
          action: 'restaurant:delete',
          resourceType: 'restaurant',
          resourceId: result.rows[0].id,
          details: { slug, soft_delete: true }
        });
      }

      return result.rows[0];
    } catch (error) {
      console.error('Delete restaurant error:', error);
      throw error;
    }
  }

  /**
   * Validate menu structure
   */
  static validateMenuStructure(menuData) {
    if (!Array.isArray(menuData)) {
      throw new Error('Menu must be an array');
    }

    const requiredFields = ['id', 'namn', 'kategori', 'pris'];
    const validFields = [
      'id', 'namn', 'kategori', 'pris', 'familjepris',
      'beskrivning', 'ingredienser', 'tillbehor', 'bild'
    ];

    for (let i = 0; i < menuData.length; i++) {
      const item = menuData[i];

      // Check required fields
      for (const field of requiredFields) {
        if (item[field] === undefined || item[field] === null || item[field] === '') {
          throw new Error(`Menu item ${i + 1}: Missing required field '${field}'`);
        }
      }

      // Validate types
      if (typeof item.id !== 'number') {
        throw new Error(`Menu item ${i + 1}: 'id' must be a number`);
      }

      if (typeof item.namn !== 'string') {
        throw new Error(`Menu item ${i + 1}: 'namn' must be a string`);
      }

      if (typeof item.pris !== 'number' || item.pris < 0) {
        throw new Error(`Menu item ${i + 1}: 'pris' must be a positive number`);
      }

      if (item.familjepris !== undefined && item.familjepris !== null) {
        if (typeof item.familjepris !== 'number' || item.familjepris < 0) {
          throw new Error(`Menu item ${i + 1}: 'familjepris' must be a positive number`);
        }
      }

      // Validate tillbehor is array of numbers
      if (item.tillbehor !== undefined) {
        if (!Array.isArray(item.tillbehor)) {
          throw new Error(`Menu item ${i + 1}: 'tillbehor' must be an array`);
        }
        for (const t of item.tillbehor) {
          if (typeof t !== 'number') {
            throw new Error(`Menu item ${i + 1}: 'tillbehor' must contain only numbers`);
          }
        }
      }

      // Check for unknown fields
      for (const key of Object.keys(item)) {
        if (!validFields.includes(key)) {
          console.warn(`Menu item ${i + 1}: Unknown field '${key}' (will be kept)`);
        }
      }
    }

    // Check for duplicate IDs
    const ids = menuData.map(item => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate menu item IDs found: ${[...new Set(duplicates)].join(', ')}`);
    }

    return true;
  }

  /**
   * Get menu for restaurant
   */
  static async getMenu(slug) {
    try {
      const restaurant = await this.getRestaurantBySlug(slug);

      if (!restaurant.menu_file_path) {
        return [];
      }

      const menuPath = path.join(__dirname, '../../', restaurant.menu_file_path);

      try {
        const menuContent = await fs.readFile(menuPath, 'utf8');
        const menu = JSON.parse(menuContent);

        // Validate structure (but don't throw, just warn)
        try {
          this.validateMenuStructure(menu);
        } catch (validationError) {
          console.warn(`Menu validation warning for ${slug}:`, validationError.message);
        }

        return menu;
      } catch (fileError) {
        if (fileError.code === 'ENOENT') {
          console.warn(`Menu file not found for ${slug}, returning empty menu`);
          return [];
        }
        throw fileError;
      }
    } catch (error) {
      console.error('Get menu error:', error);
      throw error;
    }
  }

  /**
   * Update menu for restaurant
   */
  static async updateMenu(slug, menuData, updatedBy = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Validate menu structure
      this.validateMenuStructure(menuData);

      // 2. Get restaurant
      const restaurant = await this.getRestaurantBySlug(slug);
      const menuPath = path.join(__dirname, '../../', restaurant.menu_file_path);

      // 3. Create backup directory if it doesn't exist
      const backupDir = path.join(path.dirname(menuPath), 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      // 4. Backup current menu (if exists)
      try {
        await fs.access(menuPath);
        const timestamp = Date.now();
        const backupPath = path.join(backupDir, `${slug}_${timestamp}.json`);
        await fs.copyFile(menuPath, backupPath);
        console.log(`✅ Backup created: ${backupPath}`);
      } catch {
        // File doesn't exist, no backup needed
        console.log('No existing menu to backup');
      }

      // 5. Save new menu
      await fs.writeFile(menuPath, JSON.stringify(menuData, null, 2), 'utf8');

      // 6. Create menu version record
      const currentVersion = await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM menu_versions WHERE restaurant_slug = $1',
        [slug]
      );

      const nextVersion = currentVersion.rows[0].next_version;

      await client.query(`
        INSERT INTO menu_versions (restaurant_slug, version, menu_json, created_by, notes)
        VALUES ($1, $2, $3, $4, $5)
      `, [slug, nextVersion, JSON.stringify(menuData), updatedBy, `Menu updated to version ${nextVersion}`]);

      // 7. Update restaurant timestamp
      await client.query(
        'UPDATE restaurants SET updated_at = NOW() WHERE slug = $1',
        [slug]
      );

      // 8. Audit log
      if (updatedBy) {
        await AuditService.log({
          userId: updatedBy,
          action: 'menu:update',
          resourceType: 'menu',
          resourceId: restaurant.id,
          details: {
            slug,
            version: nextVersion,
            items_count: menuData.length
          }
        });
      }

      await client.query('COMMIT');

      return {
        success: true,
        version: nextVersion,
        items_count: menuData.length
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Update menu error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get menu version history
   */
  static async getMenuVersions(slug, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT
          v.version,
          v.created_at,
          v.notes,
          u.email as created_by_email
        FROM menu_versions v
        LEFT JOIN users u ON v.created_by = u.id
        WHERE v.restaurant_slug = $1
        ORDER BY v.version DESC
        LIMIT $2
      `, [slug, limit]);

      return result.rows;
    } catch (error) {
      console.error('Get menu versions error:', error);
      throw error;
    }
  }

  /**
   * Restore menu to specific version
   */
  static async restoreMenuVersion(slug, version, restoredBy = null) {
    try {
      // Get the version
      const result = await pool.query(
        'SELECT menu_json FROM menu_versions WHERE restaurant_slug = $1 AND version = $2',
        [slug, version]
      );

      if (result.rows.length === 0) {
        throw new Error(`Menu version ${version} not found for ${slug}`);
      }

      const menuData = result.rows[0].menu_json;

      // Update menu (this will create a new version and backup)
      return await this.updateMenu(slug, menuData, restoredBy);
    } catch (error) {
      console.error('Restore menu version error:', error);
      throw error;
    }
  }
}

module.exports = RestaurantService;
