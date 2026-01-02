const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const UserProfileModel = require('../database/models/userProfiles');
const LoadProfileModel = require('../database/models/loadProfiles');
const PlanningRecommendationModel = require('../database/models/planningRecommendations');
const OptimizationConfigModel = require('../database/models/optimizationConfigs');

// Helper to extract user ID from token (simplified - in production use proper JWT)
const getUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('[getUserId] No authorization header found');
    return null;
  }
  
  try {
    // Remove 'Bearer ' prefix if present
    let token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7).trim() 
      : authHeader.trim();
    
    if (!token) {
      console.log('[getUserId] Token is empty after processing');
      return null;
    }
    
    // Decode base64 encoded token (as created in auth.js)
    let decoded;
    try {
      const decodedString = Buffer.from(token, 'base64').toString('utf-8');
      decoded = JSON.parse(decodedString);
    } catch (e) {
      console.error('[getUserId] Failed to decode base64 token:', e.message);
      console.error('[getUserId] Token (first 50 chars):', token.substring(0, 50));
      // Try parsing as plain JSON (fallback)
      try {
        decoded = JSON.parse(token);
      } catch (e2) {
        console.error('[getUserId] Failed to parse token as JSON:', e2.message);
        return null;
      }
    }
    
    if (!decoded) {
      console.log('[getUserId] Decoded token is null or undefined');
      return null;
    }
    
    // Check for userId (the token uses 'userId' not 'user_id')
    if (!decoded.userId) {
      console.log('[getUserId] Decoded token does not contain userId. Keys:', Object.keys(decoded));
      return null;
    }
    
    // Check if token is expired (exp is in milliseconds)
    if (decoded.exp) {
      const now = Date.now();
      if (decoded.exp < now) {
        console.log('[getUserId] Token has expired. Exp:', new Date(decoded.exp), 'Now:', new Date(now));
        return null;
      }
    }
    
    console.log('[getUserId] Successfully extracted userId:', decoded.userId);
    return decoded.userId;
  } catch (e) {
    console.error('[getUserId] Unexpected error:', e.message);
    console.error('[getUserId] Stack:', e.stack);
    return null;
  }
};

// POST /api/v1/wizard/site-type - Step 1: Select site type and workflow
router.post('/site-type', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      console.error('No userId found in request. Auth header:', req.headers.authorization ? 'Present' : 'Missing');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'User authentication required. Please login again.'
      });
    }

    const { site_type, workflow_preference } = req.body;

    if (!site_type || !workflow_preference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Both site_type and workflow_preference are required'
      });
    }

    const validSiteTypes = ['home', 'college', 'small_industry', 'large_industry', 'power_plant', 'other'];
    const validWorkflows = ['plan_new', 'optimize_existing'];

    if (!validSiteTypes.includes(site_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid site_type',
        message: `site_type must be one of: ${validSiteTypes.join(', ')}`
      });
    }

    if (!validWorkflows.includes(workflow_preference)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow_preference',
        message: `workflow_preference must be one of: ${validWorkflows.join(', ')}`
      });
    }

    const profile = {
      id: uuidv4(),
      user_id: userId,
      site_type,
      workflow_preference
    };

    const result = await UserProfileModel.upsert(profile);
    
    if (!result) {
      throw new Error('Failed to save user profile to database');
    }

    // Fetch the saved profile to return complete data
    const savedProfile = await UserProfileModel.findByUserId(userId) || profile;

    res.json({
      success: true,
      profile: savedProfile
    });
  } catch (error) {
    console.error('Error in /wizard/site-type:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred while saving site type'
    });
  }
});

// GET /api/v1/wizard/profile - Get user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const profile = await UserProfileModel.findByUserId(userId);
    res.json({
      success: true,
      profile: profile || null
    });
  } catch (error) {
    console.error('Error in /wizard/profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/v1/wizard/planning/step1 - P1: Energy Sources & Preferences
router.post('/planning/step1', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { preferred_sources, primary_goals, primary_goal, allow_diesel } = req.body;

    if (!preferred_sources || !Array.isArray(preferred_sources) || preferred_sources.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'preferred_sources must be a non-empty array'
      });
    }

    // Support both primary_goals (array) and primary_goal (single) for backward compatibility
    const goals = primary_goals || (primary_goal ? [primary_goal] : null);
    
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'primary_goals must be a non-empty array'
      });
    }

    const validGoals = ['savings', 'self_sustainability', 'reliability', 'carbon_reduction'];
    const invalidGoals = goals.filter(g => !validGoals.includes(g));
    if (invalidGoals.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid primary_goals: ${invalidGoals.join(', ')}. Must be one of: ${validGoals.join(', ')}`
      });
    }

    // Store in session or return for frontend to hold until step 3
    res.json({
      success: true,
      data: {
        preferred_sources,
        primary_goals: goals,
        allow_diesel: allow_diesel || false
      }
    });
  } catch (error) {
    console.error('Error in /wizard/planning/step1:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/v1/wizard/planning/step2 - P2: Appliances & Load Profile
router.post('/planning/step2', async (req, res) => {
  try {
    console.log('[step2] Request received. Auth header present:', !!req.headers.authorization);
    
    const userId = getUserId(req);
    if (!userId) {
      console.error('[step2] Authentication failed - no userId extracted');
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Authentication required. Please login again.'
      });
    }
    
    console.log('[step2] Authenticated user:', userId);

    const { site_id, name, appliances } = req.body;

    if (!appliances || !Array.isArray(appliances)) {
      return res.status(400).json({
        success: false,
        error: 'appliances must be an array'
      });
    }

    // Calculate category totals and total daily energy
    const categories = {
      lighting: { power: 0, quantity: 0, hours: 0, total: 0 },
      fans: { power: 0, quantity: 0, hours: 0, total: 0 },
      it: { power: 0, quantity: 0, hours: 0, total: 0 },
      cooling_heating: { power: 0, quantity: 0, hours: 0, total: 0 },
      cleaning: { power: 0, quantity: 0, hours: 0, total: 0 },
      kitchen_misc: { power: 0, quantity: 0, hours: 0, total: 0 }
    };

    let totalDailyEnergy = 0;

    appliances.forEach(appliance => {
      const category = appliance.category || 'kitchen_misc';
      // Parse numeric values, handling both string and number inputs
      const power = parseFloat(appliance.power_rating) || 0;
      const quantity = parseInt(appliance.quantity) || 1;
      const hours = parseFloat(appliance.avg_hours) || 0;
      const energy = power * quantity * hours;

      if (categories[category]) {
        categories[category].power += power * quantity;
        categories[category].quantity += quantity;
        categories[category].hours += hours;
        categories[category].total += energy;
      }

      totalDailyEnergy += energy;
    });

    // Create load profile
    const loadProfile = {
      id: uuidv4(),
      user_id: userId,
      site_id: site_id || null,
      name: name || 'Default Load Profile',
      category_totals: categories,
      total_daily_energy_kwh: totalDailyEnergy,
      appliances
    };

    console.log('📝 Creating load profile:', {
      id: loadProfile.id,
      user_id: loadProfile.user_id,
      name: loadProfile.name,
      appliance_count: appliances.length,
      total_daily_energy_kwh: loadProfile.total_daily_energy_kwh
    });

    const result = await LoadProfileModel.create(loadProfile);
    
    if (!result) {
      console.error('❌ LoadProfileModel.create returned null/undefined');
      throw new Error('Database operation returned no result');
    }
    
    if (result.changes === 0) {
      console.error('❌ LoadProfileModel.create returned 0 changes');
      throw new Error('Failed to create load profile in database (no rows inserted)');
    }

    console.log('✅ Load profile created successfully:', loadProfile.id, 'Changes:', result.changes);

    res.json({
      success: true,
      load_profile: loadProfile
    });
  } catch (error) {
    console.error('❌ Error in /wizard/planning/step2:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to save load profile',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/v1/wizard/planning/step3 - P3: Planning Summary & Recommendation
router.post('/planning/step3', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { 
      load_profile_id, 
      site_id,
      preferred_sources, 
      primary_goals,
      primary_goal, // Backward compatibility
      allow_diesel,
      action // 'save' or 'proceed_to_optimization'
    } = req.body;

    // Support both primary_goals (array) and primary_goal (single) for backward compatibility
    const goals = primary_goals || (primary_goal ? [primary_goal] : null);
    
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'primary_goals must be a non-empty array'
      });
    }

    if (!load_profile_id) {
      return res.status(400).json({
        success: false,
        error: 'load_profile_id is required'
      });
    }

    // Fetch load profile to get total daily energy
    const loadProfile = await LoadProfileModel.findById(load_profile_id);
    if (!loadProfile) {
      return res.status(404).json({
        success: false,
        error: 'Load profile not found'
      });
    }

    // Parse JSON fields from database
    const totalDailyEnergy = loadProfile.total_daily_energy_kwh || 50.0;

    // Call AI service to generate planning recommendation
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const planningResponse = await fetch(`${AI_SERVICE_URL}/api/v1/planning/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        },
        body: JSON.stringify({
          load_profile_id,
          total_daily_energy_kwh: totalDailyEnergy,
          preferred_sources,
          primary_goal: goals[0], // AI service currently expects single goal, send first one
          primary_goals: goals, // Also send array for future compatibility
          allow_diesel
        }),
        timeout: 30000 // 30 second timeout
      });

      if (!planningResponse.ok) {
        const errorText = await planningResponse.text();
        console.error('AI Service error response:', errorText);
        throw new Error(`Planning service error: ${planningResponse.status} ${errorText}`);
      }

      const planningData = await planningResponse.json();

      // Handle Flask-style response structure
      // Transform Flask response to match database schema
      let technical_sizing = {};
      let economic_analysis = {};
      let emissions_analysis = {};

      if (planningData['Technical Analysis']) {
        // Flask-style response - transform it
        const tech = planningData['Technical Analysis'];
        const econ = planningData['Economic Analysis'];
        const capitalGen = planningData['Capital Cost & Annual Generation'];
        const costEnergy = planningData['Cost of Energy Generation'];
        const onGridCost = planningData['On-Grid Cost of Energy Generation'];
        const payback = planningData['Simple Payback Period'];
        const carbon = planningData['Carbon Emission'];

        technical_sizing = {
          solar_capacity_kw: parseFloat(tech['Solar Panel Power Rating (kW)'] || '0'),
          battery_capacity_kwh: parseFloat(tech['Battery Energy (kWh)'] || '0'),
          battery_nominal_voltage_v: parseInt(tech['Battery Nominal Voltage (V)'] || '12'),
          battery_capacity_ah: parseFloat(tech['Battery Capacity (kAh)'] || '0') * 1000, // Convert kAh to Ah
          inverter_capacity_kw: parseFloat(tech['Inverter Rating (kVA)'] || '0'),
          dc_converter_capacity_kw: parseFloat(tech['DC-DC Converter Rating (kW)'] || '0'),
          grid_connection_kw: 0, // Not in Flask response, set default
          diesel_capacity_kw: null,
          recommendations: []
        };

        economic_analysis = {
          solar_cost_rs: parseFloat(econ['Solar Panel Cost (Rs)'] || '0'),
          battery_cost_rs: parseFloat(econ['Battery Cost (Rs)'] || '0'),
          inverter_cost_rs: parseFloat(econ['Inverter Cost (Rs)'] || '0'),
          dc_converter_cost_rs: parseFloat(econ['DC-DC Converter Cost (Rs)'] || '0'),
          installation_cost_dual_mode_rs: parseFloat(econ['Installation Cost Dual Mode (Rs)'] || '0'),
          installation_cost_on_grid_rs: parseFloat(econ['Installation Cost On-Grid (Rs)'] || '0'),
          annual_om_cost_dual_mode_rs: parseFloat(econ['Annual O&M Cost Dual Mode (Rs)'] || '0'),
          annual_om_cost_on_grid_rs: parseFloat(econ['Annual O&M Cost On-Grid (Rs)'] || '0'),
          capital_cost_dual_mode_rs: parseFloat(capitalGen['Capital Cost Dual Mode (Rs)'] || '0'),
          capital_cost_on_grid_rs: parseFloat(capitalGen['Capital Cost On-Grid (Rs)'] || '0'),
          annual_energy_generation_dual_mode_kwh: parseFloat(capitalGen['Annual Energy Generation Dual Mode (kWh)'] || '0'),
          annual_energy_generation_on_grid_kwh: parseFloat(capitalGen['Annual Energy Generation On-Grid (kWh)'] || '0'),
          annual_revenue_dual_mode_rs: parseFloat(capitalGen['Annual Revenue Dual Mode (Rs)']?.replace(/,/g, '') || '0'),
          annual_revenue_on_grid_rs: parseFloat(capitalGen['Annual Revenue On-Grid (Rs)']?.replace(/,/g, '') || '0'),
          cost_energy_dual_mode_rs_per_kwh: parseFloat(costEnergy['Dual Mode Cost (Rs/kWh)'] || '0'),
          cost_energy_on_grid_rs_per_kwh: parseFloat(onGridCost['On-Grid Cost (Rs/kWh)'] || '0'),
          simple_payback_dual_mode_years: parseFloat(payback['Dual Mode System (years)'] || '0'),
          simple_payback_on_grid_years: parseFloat(payback['On-Grid System (years)'] || '0'),
          // Legacy fields
          total_capex: parseFloat(capitalGen['Capital Cost Dual Mode (Rs)'] || '0'),
          annual_opex: parseFloat(econ['Annual O&M Cost Dual Mode (Rs)'] || '0'),
          payback_period_years: parseFloat(payback['Dual Mode System (years)'] || '0'),
          npv_10_years: 0, // Not in Flask response
          roi_percentage: 0, // Not in Flask response
          monthly_savings: 0, // Not in Flask response
          // Store full Flask response for UI display
          flask_response: planningData
        };

        emissions_analysis = {
          carbon_emission_dual_mode_ton: parseFloat(carbon['Dual Mode System (Ton)'] || '0'),
          carbon_emission_on_grid_ton: parseFloat(carbon['On-Grid System (Ton)'] || '0'),
          annual_co2_reduction_kg: 0, // Not directly in Flask response
          carbon_offset_percentage: 0,
          lifetime_co2_reduction_tonnes: 0
        };
      } else {
        // Legacy response structure (backward compatibility)
        technical_sizing = planningData.technical_sizing || {};
        economic_analysis = planningData.economic_analysis || {};
        emissions_analysis = planningData.emissions_analysis || {};
      }

      // Create planning recommendation
      const recommendation = {
        id: uuidv4(),
        user_id: userId,
        site_id: site_id || null,
        load_profile_id,
        preferred_sources,
        primary_goals: goals,
        allow_diesel: allow_diesel || false,
        technical_sizing: technical_sizing,
        economic_analysis: economic_analysis,
        emissions_analysis: emissions_analysis,
        scenario_link: action === 'proceed_to_optimization' ? uuidv4() : null,
        status: action === 'save' ? 'saved' : 'draft'
      };

      const createResult = await PlanningRecommendationModel.create(recommendation);
      
      if (!createResult || createResult.changes === 0) {
        console.error('⚠️ Warning: Planning recommendation create returned no changes');
      }

      res.json({
        success: true,
        recommendation,
        action,
        saved: true,
        flask_response: planningData['Technical Analysis'] ? planningData : null // Pass Flask response if available
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      console.error('AI service error stack:', aiError.stack);
      
      // Generate fallback recommendation using basic calculations
      const peakLoad = totalDailyEnergy / 8; // Assume 8 hours peak usage
      
      const fallbackRecommendation = {
        id: uuidv4(),
        user_id: userId,
        site_id: site_id || null,
        load_profile_id,
        preferred_sources,
        primary_goals: goals,
        allow_diesel: allow_diesel || false,
        technical_sizing: {
          solar_capacity_kw: preferred_sources.includes('solar') ? Math.round((totalDailyEnergy * 0.6) / 5 * 100) / 100 : 0,
          battery_capacity_kwh: Math.round(totalDailyEnergy * 2 * 100) / 100,
          inverter_capacity_kw: Math.round(peakLoad * 1.2 * 100) / 100,
          grid_connection_kw: Math.round(peakLoad * 1.5 * 100) / 100,
          diesel_capacity_kw: (allow_diesel && preferred_sources.includes('diesel')) ? Math.round(peakLoad * 0.8 * 100) / 100 : null,
          recommendations: [
            preferred_sources.includes('solar') ? `Install ${Math.round((totalDailyEnergy * 0.6) / 5 * 100) / 100} kW solar PV system` : null,
            `Install ${Math.round(totalDailyEnergy * 2 * 100) / 100} kWh battery storage`,
            `Grid connection capacity: ${Math.round(peakLoad * 1.5 * 100) / 100} kW`
          ].filter(r => r !== null)
        },
        economic_analysis: {
          total_capex: Math.round((totalDailyEnergy * 100000) * 100) / 100,
          annual_opex: Math.round((totalDailyEnergy * 100000 * 0.02) * 100) / 100,
          payback_period_years: 8.5,
          npv_10_years: Math.round((totalDailyEnergy * 50000) * 100) / 100,
          roi_percentage: 12.5,
          monthly_savings: Math.round((totalDailyEnergy * 2000) * 100) / 100
        },
        emissions_analysis: {
          annual_co2_reduction_kg: Math.round((totalDailyEnergy * 365 * 0.77) * 100) / 100,
          carbon_offset_percentage: preferred_sources.includes('solar') ? 75.0 : 0.0,
          lifetime_co2_reduction_tonnes: Math.round((totalDailyEnergy * 365 * 0.77 * 25 / 1000) * 100) / 100
        },
        scenario_link: action === 'proceed_to_optimization' ? uuidv4() : null,
        status: action === 'save' ? 'saved' : 'draft'
      };

      const createResult = await PlanningRecommendationModel.create(fallbackRecommendation);
      
      if (!createResult || createResult.changes === 0) {
        console.error('⚠️ Warning: Fallback planning recommendation create returned no changes');
      }

      res.json({
        success: true,
        recommendation: fallbackRecommendation,
        action,
        saved: true,
        warning: `AI service unavailable (${aiError.message}), using calculated fallback data`
      });
    }
  } catch (error) {
    console.error('Error in /wizard/planning/step3:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/wizard/load-profiles - Get user's load profiles
router.get('/load-profiles', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { site_id } = req.query;
    const profiles = site_id 
      ? LoadProfileModel.findBySiteId(site_id)
      : LoadProfileModel.findByUserId(userId);

    res.json({
      success: true,
      load_profiles: profiles
    });
  } catch (error) {
    console.error('Error in /wizard/load-profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/wizard/planning-recommendations - Get user's planning recommendations
router.get('/planning-recommendations', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { site_id, load_profile_id } = req.query;
    let recommendations;

    if (load_profile_id) {
      recommendations = await PlanningRecommendationModel.findByLoadProfileId(load_profile_id);
    } else if (site_id) {
      recommendations = await PlanningRecommendationModel.findBySiteId(site_id);
    } else {
      recommendations = await PlanningRecommendationModel.findByUserId(userId);
    }

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error in /wizard/planning-recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /api/v1/wizard/optimization/setup - O1: Optimization Setup
router.post('/optimization/setup', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      site_id,
      load_profile_id,
      planning_recommendation_id,
      load_data,
      tariff_data,
      pv_parameters,
      battery_parameters,
      grid_parameters,
      objective
    } = req.body;

    if (!load_data || !tariff_data) {
      return res.status(400).json({
        success: false,
        error: 'load_data and tariff_data are required'
      });
    }

    const config = {
      id: uuidv4(),
      user_id: userId,
      site_id: site_id || null,
      load_profile_id: load_profile_id || null,
      planning_recommendation_id: planning_recommendation_id || null,
      load_data,
      tariff_data,
      pv_parameters: pv_parameters || null,
      battery_parameters: battery_parameters || null,
      grid_parameters: grid_parameters || null,
      objective: objective || 'combination'
    };

    OptimizationConfigModel.create(config);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error in /wizard/optimization/setup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/wizard/optimization/configs - Get user's optimization configs
router.get('/optimization/configs', (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { site_id } = req.query;
    const configs = site_id
      ? OptimizationConfigModel.findBySiteId(site_id)
      : OptimizationConfigModel.findByUserId(userId);

    res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error('Error in /wizard/optimization/configs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Export getUserId for use in other routes
module.exports = router;
module.exports.getUserId = getUserId;



