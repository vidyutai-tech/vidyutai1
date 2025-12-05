const { Pool } = require('pg');

// PostgreSQL database connection pool
let pool = null;

/**
 * Initialize PostgreSQL connection pool
 */
function initializePostgres() {
  if (pool) {
    return pool;
  }

  // Get connection string from environment
  // Supports DATABASE_URL, POSTGRES_URL (Vercel default), or individual params
  const connectionString = process.env.DATABASE_URL || 
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL || // Vercel Storage prefix
    (process.env.POSTGRES_HOST ? 
      `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || ''}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'vidyutai'}` :
      null
    );

  if (!connectionString) {
    const errorMsg = 'PostgreSQL connection string not found. Set DATABASE_URL, POSTGRES_URL, STORAGE_URL, or POSTGRES_* environment variables.';
    console.error('❌', errorMsg);
    console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('POSTGRES') || k.includes('DATABASE') || k.includes('STORAGE')).join(', '));
    throw new Error(errorMsg);
  }
  
  console.log('🔗 Connecting to PostgreSQL...');
  console.log('Connection string format:', connectionString.substring(0, 30) + '...' + connectionString.substring(connectionString.length - 20));

  pool = new Pool({
    connectionString,
    // Enable SSL for Neon and other cloud providers
    ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error:', err);
  });

  // Test connection
  pool.query('SELECT NOW()')
    .then((result) => {
      console.log('✅ PostgreSQL connection pool established');
      console.log('Database time:', result.rows[0].now);
    })
    .catch((err) => {
      console.error('❌ Failed to connect to PostgreSQL:', err.message);
      console.error('Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n')
      });
      throw err;
    });

  return pool;
}

/**
 * Get PostgreSQL connection pool
 */
function getPostgresPool() {
  if (!pool) {
    initializePostgres();
  }
  return pool;
}

/**
 * Execute a query
 */
async function query(text, params) {
  const pgPool = getPostgresPool();
  try {
    const result = await pgPool.query(text, params);
    return result;
  } catch (error) {
    console.error('PostgreSQL query error:', error);
    throw error;
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  const pgPool = getPostgresPool();
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const result = await query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)",
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Check if database is initialized
 */
async function isInitialized() {
  try {
    const tables = ['users', 'sites', 'assets', 'load_profiles', 'user_profiles', 'planning_recommendations', 'optimization_configs'];
    const checks = await Promise.all(tables.map(table => tableExists(table)));
    return checks.every(exists => exists);
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}

module.exports = {
  initializePostgres,
  getPostgresPool,
  query,
  transaction,
  closePool,
  tableExists,
  isInitialized
};

