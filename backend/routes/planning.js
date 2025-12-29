const express = require('express');
const router = express.Router();
const { getUserId } = require('./wizard');
const PlanningRecommendationModel = require('../database/models/planningRecommendations');
const { v4: uuidv4 } = require('uuid');

/**
 * Technical Sizing Calculation
 * Based on total daily consumption, calculates system sizing
 * Similar to CaseStudy1 solar-battery-calculation
 * Optionally saves to database if save=true and user is authenticated
 */
router.post('/technical-sizing', async (req, res) => {
  try {
    const { 
      total_energy_consumption_kwh, 
      use_case = 'commercial', 
      include_hydrogen = false,
      save = false, // Optional: save to database
      load_profile_id,
      site_id,
      preferred_sources = ['solar', 'battery'],
      primary_goals,
      primary_goal, // Backward compatibility
      allow_diesel = false
    } = req.body;

    if (!total_energy_consumption_kwh || total_energy_consumption_kwh <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid total_energy_consumption_kwh. Must be > 0'
      });
    }

    // Calculate system sizing based on daily consumption
    // Following standard solar-battery sizing methodology
    const dailyConsumption = parseFloat(total_energy_consumption_kwh);
    
    // Average power requirement
    const averagePower = dailyConsumption / 24; // kW
    
    // Peak power estimation (considering load diversity)
    // Residential: higher peak-to-average ratio (evening peak)
    // Commercial: moderate peak during business hours
    // Industrial: more consistent load
    const peakToAvgRatio = {
      residential: 2.5,
      commercial: 1.8,
      industrial: 1.3,
    }[use_case] || 1.8;
    const peakPower = averagePower * peakToAvgRatio; // kW

    // Solar sizing: Based on daily energy requirement and peak sun hours
    // Formula: Solar Capacity (kW) = Daily Energy (kWh) / (Peak Sun Hours × System Efficiency)
    // Assuming 5 peak sun hours per day and 85% system efficiency (inverter + wiring losses)
    const peakSunHours = 5;
    const systemEfficiency = 0.85;
    const solarCapacity = dailyConsumption / (peakSunHours * systemEfficiency);

    // Battery sizing: Based on backup requirements
    // For residential: typically 1 day backup (24 hours)
    // For commercial: 8-12 hours backup
    // For industrial: 4-8 hours backup
    const backupHours = {
      residential: 24,
      commercial: 12,
      industrial: 8,
    }[use_case] || 12;
    const batteryCapacity = averagePower * backupHours;

    // Inverter sizing: Peak load + 25% safety margin
    const inverterCapacity = peakPower * 1.25;

    // Grid connection: Same as peak power
    const gridConnection = peakPower;

    // Diesel backup: 1.1x peak power
    const dieselCapacity = peakPower * 1.1;

    // Hydrogen system (if requested)
    let hydrogenSystem = null;
    if (include_hydrogen) {
      hydrogenSystem = {
        electrolyzer_capacity_kw: solarCapacity * 0.2, // 20% of solar for hydrogen production
        fuel_cell_capacity_kw: peakPower * 0.5, // 50% of peak for long-duration backup
        h2_tank_capacity_kg: batteryCapacity / 33.3, // 1 kg H2 ≈ 33.3 kWh
      };
    }

    // Economic analysis
    const solarCostPerKW = 40000; // Rs/kW
    const batteryCostPerKWh = 8000; // Rs/kWh
    const inverterCostPerKW = 8000; // Rs/kW
    const dcConverterCostPerKW = 1500; // Rs/kW
    const installationPercent = 0.10; // 10% of equipment cost

    const solarCost = solarCapacity * solarCostPerKW;
    const batteryCost = batteryCapacity * batteryCostPerKWh;
    const inverterCost = inverterCapacity * inverterCostPerKW;
    const dcConverterCost = solarCapacity * dcConverterCostPerKW;

    const equipmentCost = solarCost + batteryCost + inverterCost + dcConverterCost;
    const installationCost = equipmentCost * installationPercent;
    let totalCapex = equipmentCost + installationCost;

    // Add hydrogen costs if applicable
    let hydrogenCapex = 0;
    if (include_hydrogen && hydrogenSystem) {
      const electrolyzerCostPerKW = 50000; // Rs/kW
      const fuelCellCostPerKW = 60000; // Rs/kW
      const h2TankCostPerKg = 5000; // Rs/kg

      hydrogenCapex = 
        (hydrogenSystem.electrolyzer_capacity_kw * electrolyzerCostPerKW) +
        (hydrogenSystem.fuel_cell_capacity_kw * fuelCellCostPerKW) +
        (hydrogenSystem.h2_tank_capacity_kg * h2TankCostPerKg);
      
      totalCapex += hydrogenCapex;
    }

    // OPEX: O&M costs
    const annualOMPercent = 0.03; // 3% of equipment cost per year
    const annualOM = (solarCost + batteryCost) * annualOMPercent;
    const monthlyOM = annualOM / 12;

    // Savings calculation (vs grid-only)
    const gridTariff = 8.5; // Rs/kWh average
    const solarLCOE = 2.85; // Rs/kWh for solar
    const monthlyCost = dailyConsumption * 30 * solarLCOE;
    const monthlyGridCost = dailyConsumption * 30 * gridTariff;
    const monthlySavings = monthlyGridCost - monthlyCost - monthlyOM;
    const annualSavings = monthlySavings * 12;

    // Payback period (ensure it's a valid number)
    const paybackPeriodYears = annualSavings > 0 ? totalCapex / annualSavings : 0;

    // Carbon emissions
    // More realistic calculation: Only solar-generated energy offsets grid emissions
    const gridEmissionFactor = 0.82; // kg CO2 per kWh (Indian grid average)
    const solarEmissionFactor = 0.05; // kg CO2 per kWh (lifecycle - manufacturing + installation)
    const annualConsumption = dailyConsumption * 365;
    
    // Calculate actual solar generation (considering peak sun hours and system efficiency)
    // Reuse peakSunHours and systemEfficiency from above
    const annualSolarGeneration = solarCapacity * peakSunHours * 365 * systemEfficiency;
    
    // Grid emissions if all energy came from grid
    const annualGridEmissions = annualConsumption * gridEmissionFactor;
    
    // Actual emissions: solar-generated energy has lower emissions, rest from grid
    const solarEnergyUsed = Math.min(annualSolarGeneration, annualConsumption);
    const gridEnergyUsed = Math.max(0, annualConsumption - solarEnergyUsed);
    const solarEmissions = solarEnergyUsed * solarEmissionFactor;
    const gridEmissions = gridEnergyUsed * gridEmissionFactor;
    const totalEmissions = solarEmissions + gridEmissions;
    
    // CO2 reduction
    const annualCO2Reduction = annualGridEmissions - totalEmissions;
    const carbonOffsetPercent = (annualCO2Reduction / annualGridEmissions) * 100;
    const lifetimeCO2Reduction = (annualCO2Reduction * 25) / 1000; // tonnes over 25 years

    const technicalAnalysis = {
      solar_capacity_kw: solarCapacity,
      battery_capacity_kwh: batteryCapacity,
      inverter_capacity_kw: inverterCapacity,
      grid_connection_kw: gridConnection,
      diesel_capacity_kw: dieselCapacity,
      dc_converter_capacity_kw: solarCapacity,
      battery_voltage_v: use_case === 'residential' ? 48 : use_case === 'commercial' ? 96 : 480,
      daily_consumption_kwh: dailyConsumption,
      peak_power_kw: peakPower,
      average_power_kw: averagePower,
      hydrogen_system: hydrogenSystem,
      recommendations: [
        `Solar capacity ${solarCapacity.toFixed(2)} kW can generate ${(solarCapacity * 5).toFixed(2)} kWh/day (5 sun-hours)`,
        `Battery ${batteryCapacity.toFixed(2)} kWh provides ${(batteryCapacity / averagePower).toFixed(1)} hours of backup`,
        `Inverter ${inverterCapacity.toFixed(2)} kW handles peak load with 25% safety margin`,
        hydrogenSystem ? `Hydrogen system provides long-duration backup with ${hydrogenSystem.h2_tank_capacity_kg.toFixed(2)} kg H2 storage` : null,
      ].filter(Boolean),
    };

    const economicAnalysis = {
      solar_cost_rs: solarCost,
      battery_cost_rs: batteryCost,
      inverter_cost_rs: inverterCost,
      dc_converter_cost_rs: dcConverterCost,
      installation_cost_rs: installationCost,
      hydrogen_capex_rs: hydrogenCapex,
      total_capex: totalCapex,
      annual_om_cost_rs: annualOM,
      monthly_om_cost_rs: monthlyOM,
      monthly_savings: monthlySavings,
      annual_savings: annualSavings,
      payback_period_years: paybackPeriodYears,
      cost_breakdown: {
        'Solar Panels': solarCost,
        'Battery Storage': batteryCost,
        'Inverter': inverterCost,
        'DC-DC Converter': dcConverterCost,
        'Installation (10%)': installationCost,
        ...(include_hydrogen && hydrogenCapex > 0 ? { 'Hydrogen System': hydrogenCapex } : {}),
      },
    };

    const emissionsAnalysis = {
      annual_co2_reduction_kg: annualCO2Reduction,
      carbon_offset_percentage: carbonOffsetPercent,
      lifetime_co2_reduction_tonnes: lifetimeCO2Reduction,
      grid_emission_factor_kg_per_kwh: gridEmissionFactor,
      solar_emission_factor_kg_per_kwh: solarEmissionFactor,
    };

    const responseData = {
      success: true,
      data: {
        technical_analysis: technicalAnalysis,
        economic_analysis: economicAnalysis,
        emissions_analysis: emissionsAnalysis,
        input: {
          daily_consumption_kwh: dailyConsumption,
          use_case,
          include_hydrogen,
        },
      },
    };

    // Optionally save to database if requested
    if (save) {
      try {
        const userId = getUserId(req);
        if (!userId) {
          console.warn('⚠️ Cannot save planning recommendation: User not authenticated');
          return res.json({
            ...responseData,
            saved: false,
            warning: 'User not authenticated. Calculation completed but not saved.'
          });
        }

        if (!load_profile_id) {
          console.warn('⚠️ Cannot save planning recommendation: load_profile_id missing');
          return res.json({
            ...responseData,
            saved: false,
            warning: 'load_profile_id is required to save. Calculation completed but not saved.'
          });
        }

        // Support both primary_goals (array) and primary_goal (single) for backward compatibility
        // Validate primary_goals - must be one of: savings, self_sustainability, reliability, carbon_reduction
        const validGoals = ['savings', 'self_sustainability', 'reliability', 'carbon_reduction'];
        let goals = primary_goals || (primary_goal ? [primary_goal] : ['savings']);
        
        // Filter out invalid goals and default to 'savings' if none are valid
        goals = goals.filter(g => validGoals.includes(g));
        if (goals.length === 0) {
          goals = ['savings']; // Default to savings if no valid goals provided
        }

        const recommendation = {
          id: uuidv4(),
          user_id: userId,
          site_id: site_id || null,
          load_profile_id,
          preferred_sources: Array.isArray(preferred_sources) ? preferred_sources : [preferred_sources],
          primary_goals: goals,
          allow_diesel: allow_diesel || false,
          technical_sizing: technicalAnalysis,
          economic_analysis: economicAnalysis,
          emissions_analysis: emissionsAnalysis,
          scenario_link: null,
          status: 'draft'
        };

        const createResult = await PlanningRecommendationModel.create(recommendation);
        
        if (createResult && createResult.changes > 0) {
          console.log('✅ Planning recommendation saved from technical-sizing endpoint');
          responseData.saved = true;
          responseData.recommendation_id = recommendation.id;
        } else {
          console.warn('⚠️ Planning recommendation create returned no changes');
          responseData.saved = false;
          responseData.warning = 'Failed to save recommendation';
        }
      } catch (saveError) {
        console.error('❌ Error saving planning recommendation:', saveError);
        responseData.saved = false;
        responseData.warning = `Calculation completed but save failed: ${saveError.message}`;
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error('Technical sizing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate technical sizing',
      message: error.message,
    });
  }
});

module.exports = router;

