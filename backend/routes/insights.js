const express = require('express');
const router = express.Router();
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Proxy routes for dedicated insight endpoints (POST)
// These forward requests to the AI service's dedicated insight endpoints

router.post('/battery-rul', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/insights/battery-rul`, req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error generating battery RUL insights:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate battery RUL insights',
      message: error.message
    });
  }
});

router.post('/solar-degradation', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/insights/solar-degradation`, req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error generating solar degradation insights:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate solar degradation insights',
      message: error.message
    });
  }
});

router.post('/energy-loss', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/insights/energy-loss`, req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error generating energy loss insights:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate energy loss insights',
      message: error.message
    });
  }
});

router.post('/energy-forecast', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/insights/energy-forecast`, req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.json(response.data);
  } catch (error) {
    console.error('Error generating energy forecast insights:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to generate energy forecast insights',
      message: error.message
    });
  }
});

module.exports = router;

