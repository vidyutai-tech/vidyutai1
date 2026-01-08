const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Case Studies Routes
 * These routes proxy requests to the Python AI service for case study calculations and visualizations
 */

// POST /api/v1/case-studies/solar-panel-degradation
// Calculate solar panel degradation over time and generate visualization plot
router.post('/solar-panel-degradation', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/solar-panel-degradation`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      timeout: 60000 // 60 seconds timeout
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error in solar panel degradation:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to calculate solar panel degradation',
      message: error.message,
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

