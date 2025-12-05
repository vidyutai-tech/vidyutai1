// Vercel serverless function entry point
// For Express apps on Vercel, we can export the app directly
// Vercel will automatically wrap it in a serverless function handler
// Force rebuild to clear cache - Dec 5, 2024
const app = require('../backend/server');

// Export the Express app - Vercel handles the serverless wrapper
module.exports = app;

