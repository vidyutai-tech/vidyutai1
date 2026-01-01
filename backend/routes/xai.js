const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// GET /api/v1/xai/models
router.get('/models', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/xai/models`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching XAI models:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch XAI models',
      message: error.message
    });
  }
});

// GET /api/v1/xai/feature-importance/:model_type
router.get('/feature-importance/:model_type', async (req, res) => {
  try {
    const { model_type } = req.params;
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/xai/feature-importance/${model_type}`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching feature importance:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch feature importance',
      message: error.message
    });
  }
});

// POST /api/v1/xai/local-explanation/:model_type
router.post('/local-explanation/:model_type', async (req, res) => {
  try {
    const { model_type } = req.params;
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/xai/local-explanation/${model_type}`, req.body, {
      timeout: 30000, // Longer timeout for AI processing
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error generating local explanation:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate local explanation',
      message: error.message
    });
  }
});

module.exports = router;

