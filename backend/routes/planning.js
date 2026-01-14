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

    // Determine primary goal (use first goal if multiple, default to savings)
    const validGoals = ['savings', 'self_sustainability', 'reliability', 'carbon_reduction'];
    let primaryGoal = 'savings';
    if (primary_goals && Array.isArray(primary_goals) && primary_goals.length > 0) {
      primaryGoal = primary_goals.find(g => validGoals.includes(g)) || primary_goals[0];
    } else if (primary_goal && validGoals.includes(primary_goal)) {
      primaryGoal = primary_goal;
    }

    // Solar sizing: Based on daily energy requirement and peak sun hours
    // Formula: Solar Capacity (kW) = Daily Energy (kWh) / (Peak Sun Hours × System Efficiency)
    // Old website uses ~77% system efficiency (matching: 9.90 kWh/day / 2.56 kW = 3.867 kWh/kW/day, 3.867/5 = 77.3%)
    const peakSunHours = 5;
    const systemEfficiency = 0.773; // 77.3% efficiency (matching old website)
    
    // Adjust solar capacity based on primary goal
    let solarMultiplier = 1.0;
    if (primaryGoal === 'self_sustainability') {
      solarMultiplier = 1.3; // 30% more solar for self-sustainability
    } else if (primaryGoal === 'carbon_reduction') {
      solarMultiplier = 1.2; // 20% more solar for carbon reduction
    } else if (primaryGoal === 'savings') {
      solarMultiplier = 0.9; // 10% less solar to reduce initial cost
    } else if (primaryGoal === 'reliability') {
      solarMultiplier = 1.1; // 10% more solar for reliability
    }
    
    const baseSolarCapacity = dailyConsumption / (peakSunHours * systemEfficiency);
    const solarCapacity = baseSolarCapacity * solarMultiplier;

    // Battery sizing: Based on backup requirements and primary goal
    // Old website uses a more conservative approach - battery capacity is typically less than daily consumption
    // For residential: ~0.8-0.9x daily consumption (considering depth of discharge and efficiency)
    // For commercial: ~0.6-0.7x daily consumption
    // For industrial: ~0.5-0.6x daily consumption
    const baseBatteryToDailyRatio = {
      residential: 0.83, // ~83% of daily consumption (matches old website: 8.21 kWh for 9.90 kWh/day)
      commercial: 0.65,
      industrial: 0.55,
    }[use_case] || 0.65;
    
    // Adjust battery capacity based on primary goal
    let batteryMultiplier = 1.0;
    if (primaryGoal === 'reliability') {
      batteryMultiplier = 1.5; // 50% more battery for reliability (longer backup)
    } else if (primaryGoal === 'self_sustainability') {
      batteryMultiplier = 1.3; // 30% more battery for self-sustainability
    } else if (primaryGoal === 'savings') {
      batteryMultiplier = 0.8; // 20% less battery to reduce cost
    } else if (primaryGoal === 'carbon_reduction') {
      batteryMultiplier = 1.2; // 20% more battery to reduce grid dependence
    }
    
    const batteryCapacity = dailyConsumption * baseBatteryToDailyRatio * batteryMultiplier;

    // Inverter sizing: Old website shows inverter = solar * 1.25 (e.g., 3.19 kVA for 2.56 kW solar)
    // This matches DC-DC converter rating, suggesting inverter is sized to handle solar output, not peak load
    const inverterCapacity = solarCapacity * 1.25;

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

    // DC-DC converter rating: Old website shows ~1.25x solar capacity (e.g., 3.19 kW for 2.56 kW solar)
    // Calculate once and reuse
    const dcConverterRating = solarCapacity * 1.25;
    
    const solarCost = solarCapacity * solarCostPerKW;
    const batteryCost = batteryCapacity * batteryCostPerKWh;
    const inverterCost = inverterCapacity * inverterCostPerKW;
    const dcConverterCost = dcConverterRating * dcConverterCostPerKW;

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

    // ===== DUAL MODE SYSTEM (with battery) =====
    const dualModeEquipmentCost = solarCost + batteryCost + inverterCost + dcConverterCost;
    const dualModeInstallationCost = dualModeEquipmentCost * installationPercent;
    const dualModeTotalCapex = dualModeEquipmentCost + dualModeInstallationCost;
    
    // Dual Mode O&M: 3% of (solar + battery) cost per year
    const dualModeAnnualOM = (solarCost + batteryCost) * 0.03;
    const dualModeMonthlyOM = dualModeAnnualOM / 12;

    // ===== ON-GRID SYSTEM (no battery, no DC-DC converter) =====
    const onGridEquipmentCost = solarCost + inverterCost; // No battery, no DC-DC converter
    const onGridInstallationCost = onGridEquipmentCost * installationPercent;
    const onGridTotalCapex = onGridEquipmentCost + onGridInstallationCost;
    
    // On-Grid O&M: 3% of solar cost only (no battery)
    const onGridAnnualOM = solarCost * 0.03;
    const onGridMonthlyOM = onGridAnnualOM / 12;

    // ===== ANNUAL GENERATION & REVENUE =====
    const annualConsumption = dailyConsumption * 365;
    // Old website uses different generation calculation - might account for system losses differently
    // For Dual Mode: battery storage allows better utilization
    // For On-Grid: direct grid connection, less losses
    const dualModeSystemEfficiency = 0.80; // Lower efficiency due to battery round-trip losses
    const onGridSystemEfficiency = 0.85; // Higher efficiency, direct grid connection
    
    const annualSolarGenerationDualMode = solarCapacity * peakSunHours * 365 * dualModeSystemEfficiency;
    const annualSolarGenerationOnGrid = solarCapacity * peakSunHours * 365 * onGridSystemEfficiency;
    
    // Grid tariff for revenue calculation
    const gridTariff = 8.0; // Rs/kWh (for selling excess solar)
    const gridPurchaseTariff = 8.5; // Rs/kWh (for buying from grid)
    const solarLCOE = 2.85; // Rs/kWh for solar
    
    // Annual revenue from solar generation
    // Dual Mode: lower generation due to battery losses
    const annualRevenueDualMode = annualSolarGenerationDualMode * gridTariff;
    // On-Grid: higher generation, better efficiency
    const annualRevenueOnGrid = annualSolarGenerationOnGrid * gridTariff;
    
    // Annual energy cost (grid purchases when solar insufficient)
    // Dual Mode: needs less grid energy due to battery backup
    const dualModeGridEnergyNeeded = Math.max(0, annualConsumption - annualSolarGenerationDualMode);
    const dualModeAnnualGridCost = dualModeGridEnergyNeeded * gridPurchaseTariff;
    
    // On-Grid: needs more grid energy (no battery backup)
    const onGridGridEnergyNeeded = Math.max(0, annualConsumption - annualSolarGenerationOnGrid);
    const onGridAnnualGridCost = onGridGridEnergyNeeded * gridPurchaseTariff;
    
    // Annual savings calculation
    // Dual Mode: Revenue from solar - Grid purchases - O&M
    const dualModeAnnualSavings = annualRevenueDualMode - dualModeAnnualGridCost - dualModeAnnualOM;
    const dualModeMonthlySavings = dualModeAnnualSavings / 12;
    const dualModePaybackPeriod = dualModeAnnualSavings > 0 ? dualModeTotalCapex / dualModeAnnualSavings : 0;
    
    // On-Grid: Revenue from solar - Grid purchases - O&M
    const onGridAnnualSavings = annualRevenueOnGrid - onGridAnnualGridCost - onGridAnnualOM;
    const onGridMonthlySavings = onGridAnnualSavings / 12;
    const onGridPaybackPeriod = onGridAnnualSavings > 0 ? onGridTotalCapex / onGridAnnualSavings : 0;

    // ===== CARBON EMISSIONS CALCULATION (matching old website) =====
    // Old website calculates LIFETIME (25-year) emissions including manufacturing
    const gridEmissionFactor = 0.82; // kg CO2 per kWh (Indian grid average)
    const solarEmissionFactor = 0.05; // kg CO2 per kWh (operational)
    const solarManufacturingFactor = 0.04; // kg CO2 per kWh capacity (manufacturing)
    const batteryManufacturingFactor = 150; // kg CO2 per kWh capacity (manufacturing)
    const systemLifetimeYears = 25;
    
    // Lifetime energy consumption
    const lifetimeConsumption = annualConsumption * systemLifetimeYears;
    
    // Dual Mode System - LIFETIME Emissions (25 years)
    // Solar manufacturing emissions (one-time)
    const dualModeSolarManufacturingEmissions = solarCapacity * solarManufacturingFactor * 1000; // Convert kW to kWh equivalent
    // Solar operational emissions: annual generation * solar factor * lifetime
    const dualModeSolarOperationalEmissions = annualSolarGenerationDualMode * solarEmissionFactor * systemLifetimeYears;
    // Grid emissions: grid purchases * grid factor * lifetime
    const dualModeGridEmissionsLifetime = dualModeGridEnergyNeeded * gridEmissionFactor * systemLifetimeYears;
    // Battery manufacturing emissions (one-time)
    const dualModeBatteryManufacturingEmissions = batteryCapacity * batteryManufacturingFactor;
    // Total Dual Mode LIFETIME emissions (in kg, convert to tonnes)
    const dualModeTotalEmissionsKgLifetime = dualModeSolarManufacturingEmissions + dualModeSolarOperationalEmissions + 
                                             dualModeGridEmissionsLifetime + dualModeBatteryManufacturingEmissions;
    const dualModeTotalEmissionsTon = dualModeTotalEmissionsKgLifetime / 1000;
    
    // On-Grid System - LIFETIME Emissions (25 years)
    // Solar manufacturing emissions (one-time)
    const onGridSolarManufacturingEmissions = solarCapacity * solarManufacturingFactor * 1000;
    // Solar operational emissions: annual generation * solar factor * lifetime
    const onGridSolarOperationalEmissions = annualSolarGenerationOnGrid * solarEmissionFactor * systemLifetimeYears;
    // Grid emissions: grid purchases * grid factor * lifetime (higher since no battery)
    const onGridGridEmissionsLifetime = onGridGridEnergyNeeded * gridEmissionFactor * systemLifetimeYears;
    // Total On-Grid LIFETIME emissions (in kg, convert to tonnes)
    const onGridTotalEmissionsKgLifetime = onGridSolarManufacturingEmissions + onGridSolarOperationalEmissions + 
                                          onGridGridEmissionsLifetime;
    const onGridTotalEmissionsTon = onGridTotalEmissionsKgLifetime / 1000;
    
    // Annual emissions (for display)
    const dualModeTotalEmissionsKgAnnual = dualModeTotalEmissionsKgLifetime / systemLifetimeYears;
    const onGridTotalEmissionsKgAnnual = onGridTotalEmissionsKgLifetime / systemLifetimeYears;
    
    // Carbon offset calculation (for display - based on Dual Mode vs pure grid)
    // NOTE: Carbon offset uses OPERATIONAL emissions only (not manufacturing) to match old website logic
    // Pure grid annual emissions (baseline)
    const pureGridEmissionsAnnual = annualConsumption * gridEmissionFactor;
    // Dual Mode annual OPERATIONAL emissions only (solar operational + grid purchases)
    // Exclude manufacturing emissions for carbon offset calculation
    const dualModeOperationalEmissionsAnnual = (dualModeSolarOperationalEmissions + dualModeGridEmissionsLifetime) / systemLifetimeYears;
    // Annual CO2 reduction (operational only)
    const annualCO2Reduction = pureGridEmissionsAnnual - dualModeOperationalEmissionsAnnual;
    // Carbon offset percentage: (Reduction / Baseline) * 100
    const carbonOffsetPercent = (annualCO2Reduction / pureGridEmissionsAnnual) * 100;
    // Lifetime CO2 reduction (25 years)
    const pureGridEmissionsLifetime = lifetimeConsumption * gridEmissionFactor;
    const lifetimeCO2Reduction = (pureGridEmissionsLifetime - dualModeTotalEmissionsKgLifetime) / 1000; // tonnes over 25 years

    // Calculate additional technical parameters (matching old website format)
    // Note: dcConverterRating already calculated above for cost calculation
    const batteryVoltage = use_case === 'residential' ? 12 : use_case === 'commercial' ? 48 : 480;
    const batteryCapacityAh = (batteryCapacity * 1000) / batteryVoltage; // Convert kWh to Ah
    const inverterRatingKVA = inverterCapacity; // kVA ≈ kW for most inverters
    
    // Generate goal-specific recommendations
    const goalRecommendations = {
      savings: [
        `Optimized for cost savings: Reduced solar and battery sizing to minimize initial investment`,
        `Focus on grid integration to reduce upfront costs while maintaining energy security`,
      ],
      self_sustainability: [
        `Maximized renewable energy: Increased solar capacity by 30% to maximize self-sufficiency`,
        `Enhanced battery storage by 30% to store excess solar generation`,
        `Reduced grid dependence for greater energy independence`,
      ],
      reliability: [
        `Enhanced reliability: Increased battery capacity by 50% for extended backup duration`,
        `Solar capacity increased by 10% to ensure consistent power generation`,
        `System designed to provide ${(batteryCapacity / averagePower).toFixed(1)} hours of backup power`,
      ],
      carbon_reduction: [
        `Carbon-optimized design: Increased solar capacity by 20% to minimize grid emissions`,
        `Enhanced battery storage by 20% to maximize renewable energy utilization`,
        `Reduced carbon footprint through greater renewable energy integration`,
      ],
    };

    const baseRecommendations = [
      `Solar capacity ${solarCapacity.toFixed(2)} kW can generate ${(solarCapacity * peakSunHours * systemEfficiency).toFixed(2)} kWh/day (5 sun-hours)`,
      `Battery ${batteryCapacity.toFixed(2)} kWh provides ${(batteryCapacity / averagePower).toFixed(1)} hours of backup`,
      `Inverter ${inverterCapacity.toFixed(2)} kVA sized to handle solar output with 25% safety margin`,
      hydrogenSystem ? `Hydrogen system provides long-duration backup with ${hydrogenSystem.h2_tank_capacity_kg.toFixed(2)} kg H2 storage` : null,
    ];

    const technicalAnalysis = {
      solar_capacity_kw: solarCapacity,
      battery_capacity_kwh: batteryCapacity,
      battery_capacity_ah: batteryCapacityAh,
      battery_voltage_v: batteryVoltage,
      inverter_capacity_kw: inverterCapacity,
      inverter_rating_kva: inverterRatingKVA,
      dc_converter_capacity_kw: dcConverterRating,
      grid_connection_kw: gridConnection,
      diesel_capacity_kw: dieselCapacity,
      daily_consumption_kwh: dailyConsumption,
      peak_power_kw: peakPower,
      average_power_kw: averagePower,
      hydrogen_system: hydrogenSystem,
      primary_goal: primaryGoal,
      recommendations: [
        ...(goalRecommendations[primaryGoal] || []),
        ...baseRecommendations,
      ].filter(Boolean),
    };

    const economicAnalysis = {
      // Dual Mode System
      dual_mode: {
        solar_cost_rs: solarCost,
        battery_cost_rs: batteryCost,
        inverter_cost_rs: inverterCost,
        dc_converter_cost_rs: dcConverterCost,
        installation_cost_rs: dualModeInstallationCost,
        total_capex: dualModeTotalCapex,
        annual_om_cost_rs: dualModeAnnualOM,
        monthly_om_cost_rs: dualModeMonthlyOM,
        monthly_savings: dualModeMonthlySavings,
        annual_savings: dualModeAnnualSavings,
        payback_period_years: dualModePaybackPeriod,
        annual_revenue_rs: annualRevenueDualMode,
      },
      // On-Grid System
      on_grid: {
        solar_cost_rs: solarCost,
        battery_cost_rs: 0,
        inverter_cost_rs: inverterCost,
        dc_converter_cost_rs: 0,
        installation_cost_rs: onGridInstallationCost,
        total_capex: onGridTotalCapex,
        annual_om_cost_rs: onGridAnnualOM,
        monthly_om_cost_rs: onGridMonthlyOM,
        monthly_savings: onGridMonthlySavings,
        annual_savings: onGridAnnualSavings,
        payback_period_years: onGridPaybackPeriod,
        annual_revenue_rs: annualRevenueOnGrid,
      },
      // Legacy fields (for backward compatibility - use Dual Mode values)
      solar_cost_rs: solarCost,
      battery_cost_rs: batteryCost,
      inverter_cost_rs: inverterCost,
      dc_converter_cost_rs: dcConverterCost,
      installation_cost_rs: dualModeInstallationCost,
      hydrogen_capex_rs: hydrogenCapex,
      total_capex: dualModeTotalCapex,
      annual_om_cost_rs: dualModeAnnualOM,
      monthly_om_cost_rs: dualModeMonthlyOM,
      monthly_savings: dualModeMonthlySavings,
      annual_savings: dualModeAnnualSavings,
      payback_period_years: dualModePaybackPeriod,
      cost_breakdown: {
        'Solar Panels': solarCost,
        'Battery Storage': batteryCost,
        'Inverter': inverterCost,
        'DC-DC Converter': dcConverterCost,
        'Installation (10%)': dualModeInstallationCost,
        ...(include_hydrogen && hydrogenCapex > 0 ? { 'Hydrogen System': hydrogenCapex } : {}),
      },
      // Additional fields
      annual_generation_kwh_dual_mode: annualSolarGenerationDualMode,
      annual_generation_kwh_on_grid: annualSolarGenerationOnGrid,
      annual_consumption_kwh: annualConsumption,
      grid_energy_needed_kwh_dual_mode: dualModeGridEnergyNeeded,
      grid_energy_needed_kwh_on_grid: onGridGridEnergyNeeded,
    };

    const emissionsAnalysis = {
      // Dual Mode System Emissions
      dual_mode: {
        total_emissions_kg: dualModeTotalEmissionsKgLifetime,
        total_emissions_ton: dualModeTotalEmissionsTon,
        solar_emissions_kg: (dualModeSolarManufacturingEmissions + dualModeSolarOperationalEmissions),
        grid_emissions_kg: dualModeGridEmissionsLifetime,
        battery_emissions_kg: dualModeBatteryManufacturingEmissions,
      },
      // On-Grid System Emissions
      on_grid: {
        total_emissions_kg: onGridTotalEmissionsKgLifetime,
        total_emissions_ton: onGridTotalEmissionsTon,
        solar_emissions_kg: (onGridSolarManufacturingEmissions + onGridSolarOperationalEmissions),
        grid_emissions_kg: onGridGridEmissionsLifetime,
        battery_emissions_kg: 0,
      },
      // Legacy fields (for backward compatibility)
      annual_co2_reduction_kg: annualCO2Reduction,
      carbon_offset_percentage: carbonOffsetPercent,
      lifetime_co2_reduction_tonnes: lifetimeCO2Reduction,
      grid_emission_factor_kg_per_kwh: gridEmissionFactor,
      solar_emission_factor_kg_per_kwh: solarEmissionFactor,
      battery_manufacturing_factor_kg_per_kwh: batteryManufacturingFactor,
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

