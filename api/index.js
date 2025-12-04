// Vercel serverless function entry point
// For Express apps on Vercel, we can export the app directly
// Vercel will automatically wrap it in a serverless function handler
const app = require('../backend/server');

// Export the Express app - Vercel handles the serverless wrapper
module.exports = app;

