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
    // Try to call AI service
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/insights/energy-forecast`, req.body, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return res.json(response.data);
    } catch (aiError) {
      // If AI service is not available, return fallback insights
      if (aiError.response?.status === 404 || aiError.code === 'ECONNREFUSED' || aiError.code === 'ETIMEDOUT') {
        console.warn('⚠️ AI service not available for energy forecast insights, returning fallback');
        
        const forecastData = req.body?.forecast_data || req.body || {};
        const summary = forecastData.summary || {};
        const data = forecastData.data || [];
        
        // Generate fallback insights based on forecast data
        const peak = summary.peak || 0;
        const peakHour = summary.peak_hour || 12;
        const average = summary.average || 0;
        const minimum = summary.minimum || 0;
        const minHour = summary.min_hour || 22;
        const total24h = summary.total_24h || summary.total || 0;
        
        const insights = [];
        
        if (peak > 0) {
          insights.push({
            type: 'peak_demand',
            title: `Peak demand of ${peak.toFixed(1)} kW at ${peakHour}:00`,
            description: `Pre-charge battery by ${Math.max(peakHour - 2, 6)}:00 to support peak load`,
            priority: 'high',
            actionable: true
          });
        }
        
        if (peak > average && average > 0) {
          const loadShift = peak - average;
          const savingsPercent = Math.round((loadShift / peak) * 100);
          insights.push({
            type: 'load_shift',
            title: `Shift ${loadShift.toFixed(1)} kW load to off-peak hours`,
            description: `For ${savingsPercent}% cost savings`,
            priority: 'medium',
            actionable: true
          });
        }
        
        if (minimum > 0 && minHour !== undefined) {
          insights.push({
            type: 'battery_charging',
            title: `Minimum demand ${minimum.toFixed(1)} kW at ${minHour}:00`,
            description: `Best time for battery charging`,
            priority: 'low',
            actionable: true
          });
        }
        
        if (average > 0) {
          const peakRatio = peak > 0 ? ((peak - average) / average * 100).toFixed(0) : 0;
          insights.push({
            type: 'demand_analysis',
            title: `Average demand ${average.toFixed(1)} kW`,
            description: peak > 0 ? `Peak is ${peakRatio}% higher` : 'Monitor for optimization opportunities',
            priority: 'low',
            actionable: false
          });
        }
        
        if (total24h > 0) {
          const solarOffset = Math.round((total24h * 0.35) / 1000);
          insights.push({
            type: 'solar_recommendation',
            title: `Add solar PV to offset 30-40% of ${(total24h / 1000).toFixed(1)} kWh daily consumption`,
            description: `Estimated ${solarOffset} kW solar capacity needed`,
            priority: 'medium',
            actionable: true
          });
        }
        
        return res.json({
          success: true,
          insights: insights,
          generated_at: new Date().toISOString(),
          fallback: true,
          message: 'Using fallback insights. AI service is not available.'
        });
      }
      
      // Re-throw other errors
      throw aiError;
    }
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

