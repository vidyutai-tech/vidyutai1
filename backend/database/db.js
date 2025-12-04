/**
 * Database Module - Unified Interface
 * Supports both SQLite (local) and PostgreSQL (production)
 * Automatically selects based on DATABASE_URL environment variable
 */

const dbAdapter = require('./db-adapter');
const path = require('path');
const fs = require('fs');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SCHEMA_POSTGRES_PATH = path.join(__dirname, 'schema-postgres.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

/**
 * Create tables from schema
 */
async function createTables() {
  try {
    let schema;
    
    // Determine which schema to use
    const usePostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
    const schemaPath = usePostgres ? SCHEMA_POSTGRES_PATH : SCHEMA_PATH;
    
    try {
      schema = fs.readFileSync(schemaPath, 'utf8');
    } catch (readError) {
      if (process.env.VERCEL) {
        console.log('⚠️ Cannot read schema file on Vercel, using inline schema');
        schema = getInlineSchema(usePostgres);
      } else {
        throw readError;
      }
    }
    
    await dbAdapter.exec(schema);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    throw error;
  }
}

/**
 * Get inline schema (fallback for Vercel)
 */
function getInlineSchema(usePostgres = false) {
  if (usePostgres) {
    // Minimal PostgreSQL schema
    return `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } else {
    // Minimal SQLite schema
    return `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'operator', 'viewer')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }
}

/**
 * Seed database with initial data
 */
async function seedDatabase() {
  try {
    let seed;
    try {
      seed = fs.readFileSync(SEED_PATH, 'utf8');
    } catch (readError) {
      if (process.env.VERCEL) {
        console.log('⚠️ Cannot read seed file on Vercel, creating default user');
        // Create at least one default user for testing
        try {
          const usePostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
          if (usePostgres) {
            await dbAdapter.run(
              `INSERT INTO users (id, email, password, name, role)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (email) DO NOTHING`,
              ['user-1', 'admin@vidyutai.com', 'admin123', 'Admin User', 'admin']
            );
          } else {
            await dbAdapter.run(
              `INSERT OR IGNORE INTO users (id, email, password, name, role)
               VALUES (?, ?, ?, ?, ?)`,
              ['user-1', 'admin@vidyutai.com', 'admin123', 'Admin User', 'admin']
            );
          }
          console.log('✅ Default admin user created');
        } catch (userError) {
          console.error('⚠️ Could not create default user:', userError.message);
        }
        return; // Skip full seed
      } else {
        throw readError;
      }
    }
    
    // Convert SQLite syntax to PostgreSQL if needed
    const usePostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
    if (usePostgres) {
      // Convert INSERT OR IGNORE to INSERT ... ON CONFLICT DO NOTHING
      seed = seed.replace(/INSERT OR IGNORE INTO (\w+) \(([^)]+)\) VALUES/gi, 
        'INSERT INTO $1 ($2) VALUES ON CONFLICT DO NOTHING');
      
      // For users table, add ON CONFLICT (email) if not present
      seed = seed.replace(/INSERT INTO users \(([^)]+)\) VALUES([^;]+);/gi, (match, cols, values) => {
        if (cols.includes('email') && !match.includes('ON CONFLICT')) {
          return `INSERT INTO users (${cols}) VALUES${values} ON CONFLICT (email) DO NOTHING;`;
        }
        return match;
      });
      
      // Convert ? placeholders to $1, $2, etc. (handled by adapter, but fix multi-value inserts)
      // The adapter will handle parameter conversion
    }
    
    await dbAdapter.exec(seed);
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
    // Don't throw on Vercel - allow app to continue
    if (!process.env.VERCEL) {
      throw error;
    }
  }
}

/**
 * Ensure database is initialized
 */
async function ensureInitialized() {
  try {
    await dbAdapter.initializeDatabase();
    
    if (!(await dbAdapter.isInitialized())) {
      console.log('🗄️ Database not initialized. Running setup...');
      try {
        await createTables();
        await seedDatabase();
        console.log('🗄️ Database initialization finished.');
      } catch (setupError) {
        console.error('⚠️ Warning: Error during database setup:', setupError.message);
        // On Vercel, try to continue with minimal schema
        if (process.env.VERCEL) {
          console.log('⚠️ Vercel environment detected. Using minimal schema.');
          try {
            const usePostgres = !!(process.env.DATABASE_URL || process.env.POSTGRES_HOST);
            const minimalSchema = getInlineSchema(usePostgres);
            await dbAdapter.exec(minimalSchema);
            console.log('✅ Minimal schema created for Vercel');
          } catch (minimalError) {
            console.error('❌ Failed to create minimal schema:', minimalError.message);
          }
        }
      }
    } else {
      console.log('🗄️ Database already initialized.');
    }
  } catch (error) {
    console.error('❌ Critical error in ensureInitialized:', error.message);
    // Don't throw - allow the app to continue
  }
}

/**
 * Setup database (for manual initialization)
 */
async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...');
    await dbAdapter.initializeDatabase();
    await createTables();
    await seedDatabase();
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Get database instance (for backward compatibility)
 * Note: This now returns the adapter, not the raw database
 */
function getDatabase() {
  return dbAdapter.getDatabase();
}

/**
 * Close database connections
 */
async function closeDatabase() {
  await dbAdapter.closeDatabase();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

module.exports = {
  setupDatabase,
  getDatabase,
  closeDatabase,
  initializeDatabase: dbAdapter.initializeDatabase,
  ensureInitialized,
  isInitialized: dbAdapter.isInitialized,
  // Export adapter methods for direct use
  query: dbAdapter.query,
  get: dbAdapter.get,
  all: dbAdapter.all,
  run: dbAdapter.run,
  exec: dbAdapter.exec
};
