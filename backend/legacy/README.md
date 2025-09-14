# Legacy Files

This directory contains legacy files that are no longer used in the current system but are kept for historical reference.

## Files

### `initDB.js`
- **Purpose**: Original SQLite database initialization script
- **Status**: Deprecated - replaced by PostgreSQL setup
- **Date**: Pre-migration to PostgreSQL
- **Description**: Creates SQLite tables for users and orders with the old schema structure

## Current Database Setup

The system now uses:
- **Primary Database**: PostgreSQL (see `../createTables.js`)
- **Fallback**: SQLite (automatic fallback if PostgreSQL unavailable)
- **Migration**: See `../POSTGRESQL_MIGRATION_SUMMARY.md` for details

## Why These Files Are Archived

1. **Schema Evolution**: The database schema has evolved significantly
2. **PostgreSQL Migration**: System migrated from SQLite to PostgreSQL
3. **Modern Implementation**: Current table creation is handled by `createTables.js`
4. **Historical Reference**: Kept for understanding the evolution of the system

## Usage

These files should **NOT** be used in production or development. They are kept only for:
- Historical reference
- Understanding system evolution
- Potential rollback scenarios (though not recommended)

For current database setup, use:
- `../createTables.js` - PostgreSQL table creation
- `../db.js` - Database connection configuration
- `../skapaAdmin.js` - Admin user creation
