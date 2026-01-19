/**
 * Unified Database Adapter
 * MongoDB-based implementation using Mongoose
 * 
 * This adapter maintains backward compatibility by exposing similar methods
 * while internally using MongoDB. Models now use Mongoose schemas directly.
 */

const { connectMongo, isMongoConnected, closeMongo } = require('./mongodb-connection');

let dbType = null;

/**
 * Initialize the database (MongoDB)
 */
async function initializeDatabase() {
  if (dbType) {
    return; // Already initialized
  }

  console.log('🗄️ Using MongoDB database');

  try {
    await connectMongo();
    dbType = 'mongodb';
    console.log('✅ MongoDB initialized');
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * Check if database is initialized
 */
async function isInitialized() {
  try {
    await initializeDatabase();
    // For MongoDB, if we're connected, we're initialized
    return isMongoConnected();
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}

/**
 * Close database connections
 */
async function closeDatabase() {
  await closeMongo();
  dbType = null;
}

/**
 * Get database type
 */
function getDbType() {
  return dbType || 'mongodb';
}

module.exports = {
  initializeDatabase,
  isInitialized,
  closeDatabase,
  getDbType
};
