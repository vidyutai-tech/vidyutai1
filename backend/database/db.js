/**
 * Database Module - MongoDB Implementation
 * Uses Mongoose for MongoDB connection and operations
 */

const { connectMongo, isMongoConnected, closeMongo } = require('./mongodb-connection');

/**
 * Ensure database is initialized (MongoDB connected)
 */
async function ensureInitialized() {
  try {
    if (isMongoConnected()) {
      console.log('🗄️ MongoDB already connected.');
      return;
    }

    console.log('🗄️ Initializing MongoDB connection...');
    await connectMongo();
    console.log('🗄️ MongoDB initialization finished.');
  } catch (error) {
    console.error('❌ Critical error in ensureInitialized:', error.message);
    // Don't throw - allow the app to continue (for Vercel compatibility)
  }
}

/**
 * Setup database (for manual initialization)
 */
async function setupDatabase() {
  try {
    console.log('🔧 Setting up MongoDB...');
    await connectMongo();
    console.log('✅ MongoDB setup complete!');
  } catch (error) {
    console.error('❌ MongoDB setup failed:', error);
    throw error;
  }
}

/**
 * Get database type
 */
function getDbType() {
  return 'mongodb';
}

/**
 * Close database connections
 */
async function closeDatabase() {
  await closeMongo();
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
  closeDatabase,
  ensureInitialized,
  isInitialized: isMongoConnected,
  getDbType,
  // Note: getDatabase is deprecated for MongoDB - use models directly
  getDatabase: () => {
    console.warn('⚠️ getDatabase() is deprecated. Use Mongoose models directly.');
    return null;
  }
};
