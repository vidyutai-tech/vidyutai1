/**
 * Unified Database Adapter
 * Supports both SQLite (local development) and PostgreSQL (production)
 * Automatically selects based on DATABASE_URL environment variable
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const postgresDb = require('./postgres-db');

// Determine which database to use
const USE_POSTGRES = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.STORAGE_URL || process.env.POSTGRES_HOST);
const DB_TYPE = USE_POSTGRES ? 'postgresql' : 'sqlite';

let sqliteDb = null;
let dbType = null;

/**
 * Initialize the appropriate database
 */
async function initializeDatabase() {
  if (dbType) {
    return; // Already initialized
  }

  if (USE_POSTGRES) {
    console.log('🗄️ Using PostgreSQL database');
    console.log('Environment check:', {
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      STORAGE_URL: !!process.env.STORAGE_URL,
      POSTGRES_HOST: !!process.env.POSTGRES_HOST,
      VERCEL: !!process.env.VERCEL
    });
    try {
      postgresDb.initializePostgres();
      dbType = 'postgresql';
      console.log('✅ PostgreSQL initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL:', error.message);
      console.error('Error stack:', error.stack);
      // Fallback to SQLite if PostgreSQL fails (for development)
      if (!process.env.VERCEL && !process.env.DATABASE_URL) {
        console.log('⚠️ Falling back to SQLite');
        initializeSQLite();
      } else {
        throw error;
      }
    }
  } else {
    console.log('🗄️ Using SQLite database');
    initializeSQLite();
  }
}

function initializeSQLite() {
  const DB_PATH = process.env.VERCEL ? ':memory:' : path.join(__dirname, 'vidyutai.db');
  
  try {
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma('foreign_keys = ON');
    dbType = 'sqlite';
    console.log('✅ SQLite database connection established');
  } catch (error) {
    console.error('❌ Failed to initialize SQLite:', error);
    throw error;
  }
}

/**
 * Get database instance (for SQLite) or pool (for PostgreSQL)
 */
function getDatabase() {
  if (dbType === 'postgresql') {
    return postgresDb.getPostgresPool();
  } else if (dbType === 'sqlite') {
    if (!sqliteDb) {
      initializeSQLite();
    }
    return sqliteDb;
  } else {
    // Auto-initialize if not already done
    if (USE_POSTGRES) {
      postgresDb.initializePostgres();
      dbType = 'postgresql';
      return postgresDb.getPostgresPool();
    } else {
      initializeSQLite();
      return sqliteDb;
    }
  }
}

/**
 * Execute a query (unified interface)
 */
async function query(sql, params = []) {
  await initializeDatabase();
  
  if (dbType === 'postgresql') {
    // PostgreSQL uses parameterized queries with $1, $2, etc.
    // Convert ? placeholders to $1, $2 format if needed
    let pgSql = sql;
    if (sql.includes('?')) {
      let paramIndex = 1;
      pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    }
    const result = await postgresDb.query(pgSql, params);
    return {
      rows: result.rows,
      changes: result.rowCount || 0
    };
  } else {
    // SQLite - query is typically for SELECT, use all() instead
    const db = getDatabase();
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return {
      rows: rows,
      changes: 0
    };
  }
}

/**
 * Convert SQLite ? placeholders to PostgreSQL $1, $2 format
 */
function convertToPostgresParams(sql) {
  if (!sql.includes('?')) {
    return sql; // Already in PostgreSQL format or no params
  }
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * Get a single row
 */
async function get(sql, params = []) {
  try {
    await initializeDatabase();
    
    if (dbType === 'postgresql') {
      const pgSql = convertToPostgresParams(sql);
      const result = await postgresDb.query(pgSql, params);
      return result.rows[0] || null;
    } else {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      return stmt.get(...params) || null;
    }
  } catch (error) {
    console.error('Database get() error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Get all rows
 */
async function all(sql, params = []) {
  await initializeDatabase();
  
  if (dbType === 'postgresql') {
    const pgSql = convertToPostgresParams(sql);
    const result = await postgresDb.query(pgSql, params);
    return result.rows;
  } else {
    const db = getDatabase();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 */
async function run(sql, params = []) {
  try {
    await initializeDatabase();
    
    if (dbType === 'postgresql') {
      const pgSql = convertToPostgresParams(sql);
      const result = await postgresDb.query(pgSql, params);
      return {
        lastInsertRowid: null, // PostgreSQL doesn't have this concept
        changes: result.rowCount || 0
      };
    } else {
      const db = getDatabase();
      const stmt = db.prepare(sql);
      return stmt.run(...params);
    }
  } catch (error) {
    console.error('Database run() error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Execute raw SQL (for schema creation)
 */
async function exec(sql) {
  await initializeDatabase();
  
  if (dbType === 'postgresql') {
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await postgresDb.query(statement.trim());
        } catch (error) {
          // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    }
  } else {
    const db = getDatabase();
    db.exec(sql);
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  await initializeDatabase();
  
  if (dbType === 'postgresql') {
    return await postgresDb.tableExists(tableName);
  } else {
    const db = getDatabase();
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    return !!row;
  }
}

/**
 * Check if database is initialized
 */
async function isInitialized() {
  try {
    await initializeDatabase();
    const tables = ['users', 'sites', 'assets', 'load_profiles', 'user_profiles', 'planning_recommendations', 'optimization_configs'];
    const checks = await Promise.all(tables.map(table => tableExists(table)));
    return checks.every(exists => exists);
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}

/**
 * Close database connections
 */
async function closeDatabase() {
  if (dbType === 'postgresql') {
    await postgresDb.closePool();
  } else if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
    console.log('✅ SQLite database connection closed');
  }
  dbType = null;
}

module.exports = {
  initializeDatabase,
  getDatabase,
  query,
  get,
  all,
  run,
  exec,
  tableExists,
  isInitialized,
  closeDatabase,
  getDbType: () => dbType
};

