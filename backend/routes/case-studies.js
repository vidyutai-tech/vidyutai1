const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Case Studies Routes
 * These routes proxy requests to the Python AI service for case study calculations and visualizations
 */

// Simple in-memory cache to prevent duplicate requests (reduces 429 errors)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Retry helper with exponential backoff for 429 errors
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Only retry on 429 errors
      if (error.response?.status === 429 && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited (429), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

// POST /api/v1/case-studies/solar-panel-degradation
// Calculate solar panel degradation over time and generate visualization plot
router.post('/solar-panel-degradation', async (req, res) => {
  try {
    // Create cache key from request body
    const cacheKey = `solar-degradation-${JSON.stringify(req.body)}`;
    
    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('✅ Returning cached solar panel degradation result');
      return res.json(cached);
    }

    // Make request with retry logic
    const response = await retryWithBackoff(async () => {
      return await axios.post(`${AI_SERVICE_URL}/api/v1/solar-panel-degradation`, req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        timeout: 60000 // 60 seconds timeout
      });
    });

    // Cache successful response
    setCache(cacheKey, response.data);
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error in solar panel degradation:', error.message);
    
    // If 429 error, return cached data if available (even if expired)
    if (error.response?.status === 429) {
      const cacheKey = `solar-degradation-${JSON.stringify(req.body)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('⚠️ Rate limited - returning stale cached data');
        return res.json(cached.data);
      }
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to calculate solar panel degradation',
      message: error.response?.status === 429 
        ? 'Rate limit exceeded. Please try again in a few moments.'
        : error.message,
      details: error.response?.data || null
    });
  }
});

// Health check for case studies routes
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'case-studies', 
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;

