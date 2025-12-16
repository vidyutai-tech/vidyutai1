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
    max: 10, // Reduced from 20 to avoid connection pool exhaustion on Neon free tier
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 15000, // Increased to 15 seconds for Neon
    statement_timeout: 30000, // Query timeout: 30 seconds
    query_timeout: 30000, // Query timeout: 30 seconds
    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL pool error:', err);
  });

  // Test connection (async, but don't block initialization)
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
      // Don't throw here - let the first query fail if connection is bad
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
 * Execute a query with retry logic for connection issues
 */
async function query(text, params, retries = 2) {
  const pgPool = getPostgresPool();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await pgPool.query(text, params);
      return result;
    } catch (error) {
      // If it's a connection error and we have retries left, wait and retry
      if (attempt < retries && (
        error.message.includes('Connection terminated') ||
        error.message.includes('timeout') ||
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT'
      )) {
        const waitTime = (attempt + 1) * 1000; // 1s, 2s
        console.log(`⚠️ Connection error, retrying in ${waitTime}ms... (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error('PostgreSQL query error:', error.message);
      throw error;
    }
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

