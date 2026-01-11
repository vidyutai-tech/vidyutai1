const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { getUserId } = require('./wizard');
const OptimizationResultsModel = require('../database/models/optimizationResults');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Basic server-side guard to reject non-CSV/Excel uploads (e.g., HTML error pages)
const isValidCsvOrExcel = (file) => {
  if (!file) return true; // allow no file
  const name = (file.originalname || '').toLowerCase();
  const type = (file.mimetype || '').toLowerCase();
  const looksLikeCsv = name.endsWith('.csv') || type.includes('csv');
  const looksLikeExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || type.includes('excel');
  // Some servers send text/html when an auth error page is downloaded
  const looksLikeHtml = type.includes('html') || name.endsWith('.html') || name.endsWith('.htm');
  if (looksLikeHtml) return false;
  return looksLikeCsv || looksLikeExcel;
};

// Helper function to forward multipart request to AI service
const forwardToAIService = async (req, endpoint) => {
  const formData = new FormData();
  
  // Add all form fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && req.body[key] !== null) {
      formData.append(key, String(req.body[key]));
    }
  });
  
  // Add file if present
  if (req.file) {
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'file',
      contentType: req.file.mimetype || 'application/octet-stream'
    });
  }
  
  const response = await axios.post(`${AI_SERVICE_URL}/api/v1${endpoint}`, formData, {
    timeout: 300000, // 5 minutes
    headers: {
      ...formData.getHeaders(),
      'Authorization': req.headers.authorization || ''
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  
  return response.data;
};

// Health check for optimization routes
router.get('/optimization-health', (req, res) => {
  res.json({ status: 'ok', service: 'optimization', timestamp: new Date().toISOString() });
});

// GET /api/v1/optimization/results - Get saved optimization results for current user
router.get('/results', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { type, site_id, limit = 50, offset = 0 } = req.query;
    
    const options = {
      optimizationType: type || null, // 'source' or 'demand'
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    let results;
    if (site_id) {
      results = await OptimizationResultsModel.getBySiteId(site_id, options);
    } else {
      results = await OptimizationResultsModel.getByUserId(userId, options);
    }

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching optimization results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization results',
      message: error.message
    });
  }
});

// GET /api/v1/optimization/results/:id - Get a specific optimization result
router.get('/results/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const result = await OptimizationResultsModel.getById(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Optimization result not found'
      });
    }

    // Verify user owns this result
    if (result.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this result'
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error fetching optimization result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch optimization result',
      message: error.message
    });
  }
});

// GET /api/v1/optimization/results/latest - Get latest optimization result for current user
router.get('/results/latest', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { type } = req.query;
    const result = await OptimizationResultsModel.getLatestByUserId(userId, type || null);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'No optimization results found'
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error fetching latest optimization result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest optimization result',
      message: error.message
    });
  }
});

// DELETE /api/v1/optimization/results/:id - Delete a specific optimization result
router.delete('/results/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const result = await OptimizationResultsModel.getById(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Optimization result not found'
      });
    }

    // Verify user owns this result
    if (result.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this result'
      });
    }

    await OptimizationResultsModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'Optimization result deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting optimization result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete optimization result',
      message: error.message
    });
  }
});

// Proxy route for source optimization
router.post('/optimize', upload.single('file'), async (req, res) => {
  try {
    if (!isValidCsvOrExcel(req.file)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Please upload a valid CSV or Excel file (not HTML pages).'
      });
    }

    const data = await forwardToAIService(req, '/optimize');
    
    // Save results to database if user is authenticated
    const userId = getUserId(req);
    if (userId && data.summary && data.chart_data) {
      try {
        // Extract input parameters from request body
        const inputParameters = {
          profile_type: req.body.profile_type,
          weather: req.body.weather,
          num_days: req.body.num_days,
          time_resolution_minutes: req.body.time_resolution_minutes,
          grid_connection: req.body.grid_connection,
          solar_connection: req.body.solar_connection,
          battery_capacity: req.body.battery_capacity,
          battery_voltage: req.body.battery_voltage,
          diesel_capacity: req.body.diesel_capacity,
          fuel_price: req.body.fuel_price,
          pv_energy_cost: req.body.pv_energy_cost,
          battery_om_cost: req.body.battery_om_cost,
          electrolyzer_capacity: req.body.electrolyzer_capacity,
          fuel_cell_capacity: req.body.fuel_cell_capacity,
          h2_tank_capacity: req.body.h2_tank_capacity,
          fuel_cell_efficiency_percent: req.body.fuel_cell_efficiency_percent,
          fuel_cell_om_cost: req.body.fuel_cell_om_cost,
          electrolyzer_om_cost: req.body.electrolyzer_om_cost
        };
        
        await OptimizationResultsModel.create({
          user_id: userId,
          site_id: req.body.site_id || null,
          optimization_type: 'source',
          input_parameters: inputParameters,
          summary: data.summary,
          chart_data: data.chart_data
        });
        
        console.log('✅ Source optimization results saved to database');
      } catch (dbError) {
        // Don't fail the request if database save fails
        console.error('⚠️ Failed to save source optimization results to database:', dbError.message);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in source optimization:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to run source optimization',
      message: error.message
    });
  }
});

// Proxy route for demand optimization
// Use upload.any() to handle both file and non-file requests
router.post('/demand-optimize', upload.any(), async (req, res) => {
  try {
    if (req.files && req.files.length > 0 && !isValidCsvOrExcel(req.files[0])) {
      return res.status(400).json({
        status: 'error',
        success: false,
        error: 'Invalid file type',
        message: 'Please upload a valid CSV or Excel file (not HTML pages).'
      });
    }

    console.log('📥 Demand optimization request received:', {
      method: req.method,
      path: req.path,
      body: req.body,
      files: req.files,
      hasFile: req.files && req.files.length > 0,
      contentType: req.headers['content-type'],
      aiServiceUrl: AI_SERVICE_URL
    });
    
    // Set req.file for backward compatibility with forwardToAIService
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    
    // Try to forward to AI service
    try {
      const data = await forwardToAIService(req, '/demand-optimize');
      console.log('✅ Demand optimization completed successfully');
      
      // Save results to database if user is authenticated
      const userId = getUserId(req);
      if (userId && data.summary && data.chart_data) {
        try {
          // Extract input parameters from request body
          const inputParameters = {
            profile_type: req.body.profile_type,
            weather: req.body.weather,
            num_days: req.body.num_days,
            time_resolution_minutes: req.body.time_resolution_minutes,
            grid_connection: req.body.grid_connection,
            solar_connection: req.body.solar_connection,
            battery_capacity: req.body.battery_capacity,
            battery_voltage: req.body.battery_voltage,
            diesel_capacity: req.body.diesel_capacity,
            fuel_price: req.body.fuel_price,
            pv_energy_cost: req.body.pv_energy_cost,
            battery_om_cost: req.body.battery_om_cost,
            electrolyzer_capacity: req.body.electrolyzer_capacity,
            fuel_cell_capacity: req.body.fuel_cell_capacity,
            h2_tank_capacity: req.body.h2_tank_capacity,
            fuel_cell_efficiency_percent: req.body.fuel_cell_efficiency_percent,
            fuel_cell_om_cost: req.body.fuel_cell_om_cost,
            electrolyzer_om_cost: req.body.electrolyzer_om_cost,
            curtail_penalty_load3: req.body.curtail_penalty_load3,
            curtail_penalty_load4: req.body.curtail_penalty_load4,
            curtail_penalty_load5: req.body.curtail_penalty_load5
          };
          
          await OptimizationResultsModel.create({
            user_id: userId,
            site_id: req.body.site_id || null,
            optimization_type: 'demand',
            input_parameters: inputParameters,
            summary: data.summary,
            chart_data: data.chart_data
          });
          
          console.log('✅ Demand optimization results saved to database');
        } catch (dbError) {
          // Don't fail the request if database save fails
          console.error('⚠️ Failed to save demand optimization results to database:', dbError.message);
        }
      }
      
      return res.json(data);
    } catch (aiError) {
      // If AI service is not available (404 or connection error), return a helpful error
      if (aiError.response?.status === 404 || aiError.code === 'ECONNREFUSED') {
        console.warn('⚠️ AI service not available, returning error response');
        return res.status(503).json({
          status: 'error',
          success: false,
          error: 'AI service unavailable',
          message: 'The optimization service is currently unavailable. Please ensure the AI service is running.',
          details: {
            aiServiceUrl: AI_SERVICE_URL,
            endpoint: '/api/v1/demand-optimize',
            error: aiError.response?.status === 404 
              ? 'Endpoint not found (404)' 
              : 'Connection refused - service may not be running'
          }
        });
      }
      // Re-throw other errors
      throw aiError;
    }
  } catch (error) {
    console.error('❌ Error in demand optimization:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code,
      aiServiceUrl: AI_SERVICE_URL
    });
    res.status(error.response?.status || 500).json({
      status: 'error',
      success: false,
      error: 'Failed to run demand optimization',
      message: error.message,
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;

