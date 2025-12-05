// Vercel serverless function entry point
// For Express apps on Vercel, we can export the app directly
// Vercel will automatically wrap it in a serverless function handler
// Force complete rebuild - Dec 5, 2024 - Clear all caches
const app = require('../backend/server');

// Export the Express app - Vercel handles the serverless wrapper
module.exports = app;

// Cache bust: 1764916352
