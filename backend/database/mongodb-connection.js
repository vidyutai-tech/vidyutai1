/**
 * MongoDB Connection Module
 * Handles MongoDB connection using Mongoose
 */

const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB
 */
async function connectMongo() {
  if (isConnected) {
    console.log('🔄 Using existing MongoDB connection');
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    const errorMsg = 'MongoDB connection string not found. Set MONGODB_URI environment variable.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('🔗 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(mongoUri, {
      // Mongoose 8+ uses these defaults, but we can be explicit
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Get Mongoose connection
 */
function getMongoConnection() {
  return mongoose.connection;
}

/**
 * Check if connected to MongoDB
 */
function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Close MongoDB connection
 */
async function closeMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    console.log('✅ MongoDB connection closed');
  }
}

module.exports = {
  connectMongo,
  getMongoConnection,
  isMongoConnected,
  closeMongo
};
