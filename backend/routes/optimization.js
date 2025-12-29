const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configure multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

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

// Proxy route for source optimization
router.post('/optimize', upload.single('file'), async (req, res) => {
  try {
    const data = await forwardToAIService(req, '/optimize');
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

