const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
require('dotenv').config();
const { ensureInitialized } = require('./database/db');

// Import routes
const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const metricsRoutes = require('./routes/metrics');
const alertsRoutes = require('./routes/alerts');
const mlAlertsRoutes = require('./routes/ml-alerts');
const assetsRoutes = require('./routes/assets');
const predictionsRoutes = require('./routes/predictions');
const mlPredictionsRoutes = require('./routes/ml-predictions');
const actionsRoutes = require('./routes/actions');
const insightsRoutes = require('./routes/insights');
const wizardRoutes = require('./routes/wizard');
const planningRoutes = require('./routes/planning');
const optimizationRoutes = require('./routes/optimization');
const xaiRoutes = require('./routes/xai');
const gdprRoutes = require('./routes/gdpr');
const caseStudiesRoutes = require('./routes/case-studies');

// Cache for legacy route (shared with case-studies route logic)
const legacyCache = new Map();
const LEGACY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getLegacyCached(key) {
  const cached = legacyCache.get(key);
  if (cached && Date.now() - cached.timestamp < LEGACY_CACHE_TTL) {
    return cached.data;
  }
  legacyCache.delete(key);
  return null;
}

function setLegacyCache(key, data) {
  legacyCache.set(key, { data, timestamp: Date.now() });
}

async function retryWithBackoffLegacy(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
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

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Ensure database is initialized (tables + seed) before routes
// For Vercel serverless, initialization happens on first request
// For regular server, initialize immediately
if (process.env.VERCEL) {
  // On Vercel, initialize asynchronously (non-blocking)
  ensureInitialized().catch(error => {
    console.error('⚠️ Database initialization warning:', error.message);
  });
} else {
  // For local/server, initialize synchronously on startup
  (async () => {
    try {
      await ensureInitialized();
    } catch (error) {
      console.error('⚠️ Database initialization warning:', error.message);
    }
  })();
}

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      process.env.CORS_ORIGIN || "http://localhost:5173",
      "http://localhost:5173",
      "http://localhost:3000"
    ].filter(Boolean), // Remove undefined values
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());

// CORS configuration - allow frontend URL from environment
const corsOptions = {
  origin: function (origin, callback) {
    // In production, be more permissive to handle multiple Netlify deployments
    const isProduction = process.env.NODE_ENV === 'production';
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
      "http://localhost:5173",
      "http://localhost:3000"
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // In production, allow any Netlify domain if FRONTEND_URL contains netlify
    if (isProduction && process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('netlify')) {
      // Allow any netlify.app domain
      if (origin.includes('.netlify.app') || origin.includes('netlify.app')) {
        callback(null, true);
        return;
      }
    }
    
    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log for debugging
      console.log(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VidyutAI Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', async (req, res) => {
  try {
    const { ensureInitialized, getDbType } = require('./database/db');
    await ensureInitialized();
    
  res.json({
    status: 'healthy',
      timestamp: new Date().toISOString(),
      database: getDbType ? getDbType() : 'unknown',
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasStorageUrl: !!process.env.STORAGE_URL,
        vercel: !!process.env.VERCEL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    timestamp: new Date().toISOString()
  });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/sites', sitesRoutes);
app.use('/api/v1/metrics', metricsRoutes);
app.use('/api/v1/alerts', alertsRoutes);
app.use('/api/v1/ml-alerts', mlAlertsRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/predictions', predictionsRoutes);
app.use('/api/v1/predict', mlPredictionsRoutes);
app.use('/api/v1/actions', actionsRoutes);
app.use('/api/v1/insights', insightsRoutes); // Dedicated insights endpoints
app.use('/api/v1/wizard', wizardRoutes);
app.use('/api/v1/planning', planningRoutes);
app.use('/api/v1', optimizationRoutes);
app.use('/api/v1/xai', xaiRoutes); // XAI routes - proxy to Python AI service
app.use('/api/v1/gdpr', gdprRoutes); // GDPR compliance routes
app.use('/api/v1/case-studies', caseStudiesRoutes); // Case studies routes

// Legacy route for backward compatibility (maintains old endpoint path)
// This allows the frontend to continue using /api/v1/solar-panel-degradation
// It has the same caching and retry logic as the case-studies route
app.post('/api/v1/solar-panel-degradation', async (req, res) => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  try {
    // Create cache key from request body
    const cacheKey = `solar-degradation-legacy-${JSON.stringify(req.body)}`;
    
    // Check cache first
    const cached = getLegacyCached(cacheKey);
    if (cached) {
      console.log('✅ Returning cached solar panel degradation result (legacy route)');
      return res.json(cached);
    }

    // Make request with retry logic
    const response = await retryWithBackoffLegacy(async () => {
      return await axios.post(`${AI_SERVICE_URL}/api/v1/solar-panel-degradation`, req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        timeout: 60000
      });
    });

    // Cache successful response
    setLegacyCache(cacheKey, response.data);
    
    return res.json(response.data);
  } catch (error) {
    console.error('Error in legacy solar panel degradation route:', error.message);
    
    // If 429 error, return cached data if available (even if expired)
    if (error.response?.status === 429) {
      const cacheKey = `solar-degradation-legacy-${JSON.stringify(req.body)}`;
      const cached = legacyCache.get(cacheKey);
      if (cached) {
        console.log('⚠️ Rate limited - returning stale cached data (legacy route)');
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

// Simulator endpoint (also available as /api/v1/simulate for convenience)
app.post('/api/v1/simulate', async (req, res) => {
  const { pvCurtail = 0, batteryTarget = 80, gridPrice = 5 } = req.body;

  // Generate mock simulation results
  const hours = 24;
  const cost = [];
  const emissions = [];

  for (let i = 0; i < hours; i++) {
    // Simulate cost based on parameters
    const baseCost = gridPrice * (100 + Math.random() * 50);
    const pvSavings = pvCurtail * 2;
    const batterySavings = (batteryTarget - 50) * 0.5;

    cost.push(parseFloat((baseCost - pvSavings - batterySavings).toFixed(2)));

    // Simulate emissions (kg CO2)
    const baseEmissions = 50 + Math.random() * 20;
    emissions.push(parseFloat((baseEmissions * (1 - pvCurtail / 100)).toFixed(2)));
  }

  res.json({
    success: true,
    cost,
    emissions,
    parameters: {
      pvCurtail,
      batteryTarget,
      gridPrice
    },
    summary: {
      totalCost: cost.reduce((a, b) => a + b, 0).toFixed(2),
      totalEmissions: emissions.reduce((a, b) => a + b, 0).toFixed(2),
      avgCostPerHour: (cost.reduce((a, b) => a + b, 0) / hours).toFixed(2)
    }
  });
});

// Import real-time simulator
const { getSimulator } = require('./services/realtime-simulator');
const { getDatabase } = require('./database/db');

// Socket.IO real-time updates
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('subscribe_site', async (siteId) => {
    socket.join(`site_${siteId}`);
    console.log(`Client ${socket.id} subscribed to site ${siteId}`);

    // Send initial data from database (latest available, not necessarily from last minute)
    try {
      const dbAdapter = require('./database/db-adapter');
      const latestData = await dbAdapter.all(`
      SELECT metric_type, metric_value, unit
      FROM timeseries_data
      WHERE site_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
      `, [siteId]);

    const metrics = {};
    latestData.forEach(row => {
      metrics[row.metric_type] = {
        value: row.metric_value,
        unit: row.unit
      };
    });

    // Only send initial data if we have metrics, otherwise will be updated by broadcast interval
    if (Object.keys(metrics).length > 0) {
      socket.emit('site_data', {
        siteId,
        timestamp: new Date().toISOString(),
        metrics,
        message: 'Connected to site updates - updates every 10 minutes'
      });
      }
    } catch (error) {
      console.error('Error fetching initial site data:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Real-time data updates from SQLite database
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SIMULATOR === 'true') {
  // Start the real-time simulator
  const simulator = getSimulator(600000); // 10 minute intervals
  simulator.start();

  // Broadcast latest data from database every 10 minutes
  setInterval(async () => {
    try {
      const dbAdapter = require('./database/db-adapter');
      const sites = await dbAdapter.all('SELECT id FROM sites WHERE status = ?', ['online']);

      for (const site of sites) {
      const siteId = site.id;

      // Get latest metrics from database
        // Calculate time 10 minutes ago
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const latestData = await dbAdapter.all(`
        SELECT metric_type, metric_value, unit
        FROM timeseries_data
        WHERE site_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 10
        `, [siteId, tenMinutesAgo]);

      if (latestData.length > 0) {
        const metrics = {};
        latestData.forEach(row => {
          metrics[row.metric_type] = {
            value: row.metric_value,
            unit: row.unit
          };
        });

        // Calculate derived metrics
        const pvGen = metrics.pv_generation?.value || 0;
        const netLoad = metrics.net_load?.value || 0;
        const gridDraw = metrics.grid_draw?.value || 0;
        const batteryDischarge = metrics.battery_discharge?.value || 0;

        const realtimeData = {
          timestamp: new Date().toISOString(),
          siteId,
          power: (pvGen + gridDraw + batteryDischarge).toFixed(2),
          energy: (netLoad * 0.5).toFixed(2), // Approximate energy
          efficiency: metrics.soc?.value ? (85 + (metrics.soc.value / 100) * 10).toFixed(2) : '85.00',
          cost: ((gridDraw * 0.1) + (batteryDischarge * 0.05)).toFixed(2),
          metrics: metrics
        };

        // Broadcast to site-specific room
        io.to(`site_${siteId}`).emit('metrics_update', realtimeData);

        // Also broadcast globally
        io.emit('metrics_update', realtimeData);
        
        // Check for power quality alerts and emit them
        try {
          const { checkPowerQualityForAlerts } = require('./services/power-quality-monitor');
          const alerts = checkPowerQualityForAlerts(siteId, metrics);
          alerts.forEach(alert => {
            io.to(`site_${siteId}`).emit('alert', alert);
            io.emit('alert', alert);
          });
        } catch (error) {
          console.error('Error checking power quality alerts:', error);
        }
      }
      }
    } catch (error) {
      console.error('Error broadcasting site data:', error);
    }
  }, 600000); // 10 minutes

  // Clean old data every 24 hours (keep last 48 hours)
  setInterval(() => {
    simulator.cleanOldData(48);
  }, 60 * 60 * 1000);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error middleware:', err.stack);
  // Ensure we always return JSON, even for errors
  if (!res.headersSent) {
  res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} was not found`
  });
});

// Export for Vercel serverless
module.exports = app;

// Start server (only when not on Vercel)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/v1`);
    console.log(`🔌 Socket.IO ready for real-time updates`);
  });
}

// For local imports that need io
module.exports.io = io;

