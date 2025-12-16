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
router.post('/demand-optimize', upload.single('file'), async (req, res) => {
  try {
    const data = await forwardToAIService(req, '/demand-optimize');
    res.json(data);
  } catch (error) {
    console.error('Error in demand optimization:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to run demand optimization',
      message: error.message
    });
  }
});

module.exports = router;

