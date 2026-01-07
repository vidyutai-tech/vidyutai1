import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Zap, Battery, Grid, Save, Home, School, Factory, Building2, Power, FileText, History, Plus, TrendingUp, DollarSign, Leaf, Trash2 } from 'lucide-react';
import { PrimaryGoal, SiteType } from '../types';
import { saveSiteTypeAndWorkflow, savePlanningStep2 } from '../services/api';
import Card from '../components/ui/Card';
import ApplianceSelector from '../components/shared/ApplianceSelector';
import { LoadProfileProvider, LoadProfileContext } from '../contexts/LoadProfileContext';
import { getUseCaseTemplate, UseCaseTemplate } from '../utils/useCaseTemplates';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PlanningWizardContent: React.FC = () => {
  const navigate = useNavigate();
  const loadProfileContext = useContext(LoadProfileContext);
  if (!loadProfileContext) throw new Error('LoadProfileContext required');
  
  const { appliances, totalDailyConsumptionKWh, peakLoad, useCase, setUseCase, initializeAppliancesFromTemplate, clearAppliances } = loadProfileContext;
  
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPreviousPlans, setShowPreviousPlans] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null); // Track current plan being edited

  // Step 0 State (Use Case Selection)
  const [selectedUseCase, setSelectedUseCase] = useState<'residential' | 'commercial' | 'industrial'>('residential');
  const [planName, setPlanName] = useState<string>('');

  // Step 1 State
  const [preferredSources, setPreferredSources] = useState<string[]>(['solar', 'battery', 'grid']);
  // Primary goals are now static - all 4 goals are automatically included (always set to all goals)
  const [primaryGoals, setPrimaryGoals] = useState<PrimaryGoal[]>(['savings', 'self_sustainability', 'reliability', 'carbon_reduction']);
  const [allowDiesel] = useState(false); // Kept for API compatibility but not shown in UI
  const [includeHydrogen] = useState(false); // Kept for API compatibility but not shown in UI

  // Step 3 State (Technical Sizing & Economic Analysis)
  const [technicalSizing, setTechnicalSizing] = useState<any>(null);
  const [economicAnalysis, setEconomicAnalysis] = useState<any>(null);
  const [emissionsAnalysis, setEmissionsAnalysis] = useState<any>(null);
  const [loadProfileId, setLoadProfileId] = useState<string | null>(null);
  const [flaskResponse, setFlaskResponse] = useState<any>(null); // Flask-style response with plots

  const useCaseOptions = [
    { 
      value: 'residential' as const, 
      label: 'Residential', 
      icon: <Home className="w-8 h-8" />, 
      description: 'Home energy system',
      powerLevel: '2 kW',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      value: 'commercial' as const, 
      label: 'Commercial', 
      icon: <Building2 className="w-8 h-8" />, 
      description: 'Office/Retail building',
      powerLevel: '20 kW',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      value: 'industrial' as const, 
      label: 'Industrial', 
      icon: <Factory className="w-8 h-8" />, 
      description: 'Manufacturing facility',
      powerLevel: '200 kW',
      color: 'from-orange-500 to-red-500'
    },
  ];

  const sourceOptions = [
    { id: 'solar', label: 'Solar PV', icon: <Zap className="w-6 h-6" /> },
    { id: 'battery', label: 'Battery', icon: <Battery className="w-6 h-6" /> },
    { id: 'grid', label: 'Grid Supply', icon: <Grid className="w-6 h-6" /> },
  ];

  const goalOptions: { value: PrimaryGoal; label: string; description: string }[] = [
    { value: 'savings', label: 'Cost Savings', description: 'Minimize energy costs' },
    { value: 'self_sustainability', label: 'Self-Sustainability', description: 'Maximize renewable energy usage' },
    { value: 'reliability', label: 'Reliability', description: 'Ensure continuous power supply' },
    { value: 'carbon_reduction', label: 'Carbon Reduction', description: 'Minimize environmental impact' },
  ];

  const handleStep0Next = async () => {
    if (!planName.trim()) {
      setError('Please enter a plan name');
      return;
    }

    setError('');
    // Clear ALL previous data when starting a new plan or changing use case
    clearAppliances();
    // Clear previous recommendations to prevent showing old data
    setTechnicalSizing(null);
    setEconomicAnalysis(null);
    setEmissionsAnalysis(null);
    setFlaskResponse(null);
    setLoadProfileId(null); // CRITICAL: Clear load profile ID so new one is created with correct use case
    setCurrentPlanId(null); // Clear any saved plan association
    // Set new use case and initialize appliances
    setUseCase(selectedUseCase);
    initializeAppliancesFromTemplate(selectedUseCase);
    setStep(1);
  };

  const handleSourceToggle = (sourceId: string) => {
    setPreferredSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  // handleGoalToggle removed - primary goals are now static

  const handleStep1Next = () => {
    if (preferredSources.length === 0) {
      setError('Please select at least one energy source');
      return;
    }
    // Primary goals are now static, no validation needed

    setError('');
    setStep(2);
  };

  const handleStep2Next = () => {
    if (appliances.length === 0) {
      setError('Please add at least one appliance');
      return;
    }

    if (totalDailyConsumptionKWh < 0.1) {
      setError('Total consumption is too low. Please add more appliances or increase usage hours.');
      return;
    }

    setError('');
    setStep(3);
  };

  const handleGenerateRecommendation = async () => {
    setIsLoading(true);
    setError('');
    
    // Clear any previous recommendation data before generating new one
    // This ensures we don't show stale data from previous use case
    setTechnicalSizing(null);
    setEconomicAnalysis(null);
    setEmissionsAnalysis(null);
    setFlaskResponse(null);

    try {
      // Validate input
      if (!totalDailyConsumptionKWh || totalDailyConsumptionKWh <= 0) {
        throw new Error('Please enter a valid daily energy consumption (must be greater than 0)');
      }

      if (appliances.length === 0) {
        throw new Error('Please add at least one appliance to create a load profile');
      }
      
      // Validate use case is set correctly
      if (!useCase || !selectedUseCase) {
        console.warn('⚠️ Use case not set, defaulting to residential');
        setUseCase('residential');
      }

      // Call backend technical sizing API
      // Use full URL for localhost, relative URL for production
      const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const API_BASE_URL = isLocalhost 
        ? 'http://localhost:5001/api/v1' 
        : (import.meta.env.VITE_API_BASE_URL || '/api/v1');
      const token = localStorage.getItem('jwt');

      // Step 1: Always create a NEW load profile to ensure it matches current use case and appliances
      // CRITICAL: Don't reuse old loadProfileId as it may contain appliances from different use case
      console.log('📝 Creating new load profile for current use case:', useCase);
      let currentLoadProfileId: string;
      try {
        // Convert ApplianceUsage to Appliance format expected by backend
        const mapCategory = (applianceName: string, priority: string): 'lighting' | 'fans' | 'it' | 'cooling_heating' | 'cleaning' | 'kitchen_misc' => {
          const name = applianceName.toLowerCase();
          if (name.includes('led') || name.includes('light') || name.includes('bulb') || name.includes('tube')) return 'lighting';
          if (name.includes('fan')) return 'fans';
          if (name.includes('computer') || name.includes('laptop') || name.includes('monitor') || name.includes('printer')) return 'it';
          if (name.includes('ac') || name.includes('heater') || name.includes('cooling') || name.includes('heating')) return 'cooling_heating';
          if (name.includes('washing') || name.includes('vacuum') || name.includes('clean')) return 'cleaning';
          return 'kitchen_misc';
        };
        
        const backendAppliances = appliances.map((app) => ({
          category: mapCategory(app.appliance, app.priority),
          name: app.appliance,
          power_rating: app.rating / 1000, // Convert W to kW
          quantity: app.quantity,
          avg_hours: app.hoursPerDay,
        }));
        
        const loadProfileResult = await savePlanningStep2({
          name: planName || `Load Profile - ${useCase} - ${new Date().toLocaleDateString()}`,
          appliances: backendAppliances
        });
        currentLoadProfileId = loadProfileResult.load_profile.id;
        setLoadProfileId(currentLoadProfileId); // Store for potential future use
        console.log('✅ New load profile created:', currentLoadProfileId, 'for use case:', useCase);
      } catch (loadProfileError: any) {
        console.error('❌ Failed to save load profile:', loadProfileError);
        // Extract the actual error message
        const errorMessage = loadProfileError.message || 'Unknown error occurred while saving load profile';
        throw new Error(errorMessage);
      }

      // Step 2: Call backend proxy which forwards to AI service for Flask-style response
      // Use backend proxy (same pattern as other endpoints) instead of direct AI service call
      const aiServiceRequest = {
        load_profile_id: currentLoadProfileId,
        total_daily_energy_kwh: totalDailyConsumptionKWh,
        preferred_sources: preferredSources.length > 0 ? preferredSources : ['solar', 'battery'],
        primary_goals: primaryGoals.length > 0 ? primaryGoals : ['savings'],
        primary_goal: primaryGoals.length > 0 ? primaryGoals[0] : 'savings', // Backward compatibility
        allow_diesel: allowDiesel,
      };

      console.log('📤 Calling backend proxy for planning recommendation:', {
        url: `${API_BASE_URL}/wizard/planning/step3`,
        body: aiServiceRequest
      });

      const aiResponse = await fetch(`${API_BASE_URL}/wizard/planning/step3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(aiServiceRequest)
      });

      let backendResponse;
      try {
        backendResponse = await aiResponse.json();
      } catch (parseError) {
        console.error('❌ Failed to parse backend response as JSON:', parseError);
        throw new Error(`Backend returned invalid response (${aiResponse.status})`);
      }

      if (!aiResponse.ok) {
        const errorMsg = backendResponse.error || backendResponse.detail || `Backend error (${aiResponse.status})`;
        console.error('❌ Backend error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Backend returns { success: true, flask_response: {...}, ... }
      // Extract the Flask-style response from the backend response
      const flaskResult = backendResponse.flask_response || backendResponse;
      
      if (!flaskResult || !flaskResult['Technical Analysis']) {
        console.warn('⚠️ No Flask response in backend response, using full response');
      }
      
      console.log('✅ Flask-style response received from backend');
      
      // Store Flask response for display
      setFlaskResponse(flaskResult);
      
      // Also extract data for legacy display compatibility
      if (flaskResult['Technical Analysis']) {
        const tech = flaskResult['Technical Analysis'];
        const econ = flaskResult['Economic Analysis'];
        const capitalGen = flaskResult['Capital Cost & Annual Generation'];
        const payback = flaskResult['Simple Payback Period'];
        const carbon = flaskResult['Carbon Emission'];

        // Calculate peak power from daily consumption (average load * 2 for peak estimate)
        const peak_power_kw = (totalDailyConsumptionKWh / 24) * 2;
        
        setTechnicalSizing({
          solar_capacity_kw: parseFloat(tech['Solar Panel Power Rating (kW)'] || '0'),
          battery_capacity_kwh: parseFloat(tech['Battery Energy (kWh)'] || '0'),
          battery_nominal_voltage_v: parseInt(tech['Battery Nominal Voltage (V)'] || '12'),
          battery_capacity_ah: parseFloat(tech['Battery Capacity (kAh)'] || '0') * 1000,
          inverter_capacity_kw: parseFloat(tech['Inverter Rating (kVA)'] || '0'),
          dc_converter_capacity_kw: parseFloat(tech['DC-DC Converter Rating (kW)'] || '0'),
          grid_connection_kw: peak_power_kw,
          peak_power_kw: peak_power_kw,
          totalDailyConsumptionKWh: totalDailyConsumptionKWh, // Store consumption for display
          recommendations: [
            `Install ${tech['Solar Panel Power Rating (kW)']} kW solar PV system`,
            `Install ${tech['Battery Energy (kWh)']} kWh battery storage (${tech['Battery Capacity (kAh)']} kAh at ${tech['Battery Nominal Voltage (V)']}V)`,
            `Inverter rating: ${tech['Inverter Rating (kVA)']} kVA`,
            `DC-DC converter rating: ${tech['DC-DC Converter Rating (kW)']} kW`
          ]
        });

        setEconomicAnalysis({
          ...econ,
          capital_cost_dual_mode_rs: parseFloat(capitalGen['Capital Cost Dual Mode (Rs)'] || '0'),
          capital_cost_on_grid_rs: parseFloat(capitalGen['Capital Cost On-Grid (Rs)'] || '0'),
          simple_payback_dual_mode_years: parseFloat(payback['Dual Mode System (years)'] || '0'),
          simple_payback_on_grid_years: parseFloat(payback['On-Grid System (years)'] || '0'),
          flask_response: flaskResult
        });

        // Calculate derived emission values for UI display
        const dualModeEmissions = parseFloat(carbon['Dual Mode System (Ton)'] || '0');
        const onGridEmissions = parseFloat(carbon['On-Grid System (Ton)'] || '0');
        // Estimate CO2 reduction (simplified calculation)
        const annualCo2ReductionKg = (onGridEmissions - dualModeEmissions) * 1000;
        const carbonOffsetPercentage = onGridEmissions > 0 ? ((onGridEmissions - dualModeEmissions) / onGridEmissions) * 100 : 0;
        const lifetimeCo2ReductionTonnes = annualCo2ReductionKg * 25 / 1000;
        
        setEmissionsAnalysis({
          carbon_emission_dual_mode_ton: dualModeEmissions,
          carbon_emission_on_grid_ton: onGridEmissions,
          annual_co2_reduction_kg: annualCo2ReductionKg,
          carbon_offset_percentage: carbonOffsetPercentage,
          lifetime_co2_reduction_tonnes: lifetimeCo2ReductionTonnes,
        });
      }
    } catch (err: any) {
      console.error('❌ Error generating recommendation:', err);
      // Show more helpful error messages
      let errorMessage = err.message || 'Failed to generate recommendation';
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on port 5001.';
      } else if (err.message?.includes('JSON')) {
        errorMessage = 'Server returned invalid response. Please check backend logs.';
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedPlans = () => {
    const plans: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('plan_')) {
        try {
          const planData = JSON.parse(localStorage.getItem(key) || '{}');
          plans.push({ id: key, ...planData });
        } catch (e) {
          console.error('Failed to parse plan:', key);
        }
      }
    }
    // Sort by creation date (newest first)
    plans.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setSavedPlans(plans);
  };

  // Helper function to get count directly from localStorage
  const getSavedPlansCount = () => {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('plan_')) count++;
    }
    return count;
  };

  // Load saved plans on component mount
  useEffect(() => {
    loadSavedPlans();
  }, []);

  // Helper function to clean up old plans when storage is getting full
  const cleanupOldPlans = (keepCount: number = 10) => {
    try {
      const plans: any[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('plan_')) {
          try {
            const planData = JSON.parse(localStorage.getItem(key) || '{}');
            plans.push({ id: key, createdAt: planData.createdAt || 0 });
          } catch (e) {
            // Remove corrupted plans
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by creation date (oldest first)
      plans.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      
      // Remove oldest plans if we have more than keepCount
      if (plans.length > keepCount) {
        const plansToRemove = plans.slice(0, plans.length - keepCount);
        plansToRemove.forEach(plan => {
          localStorage.removeItem(plan.id);
          console.log(`🗑️ Cleaned up old plan: ${plan.id}`);
        });
        return plansToRemove.length;
      }
      return 0;
    } catch (error) {
      console.error('Error cleaning up old plans:', error);
      return 0;
    }
  };

  // Helper function to optimize flaskResponse for storage
  // Note: We keep plots data as it's relatively small (JSON arrays) and useful for display
  // Main optimization is automatic cleanup of old plans
  const optimizeFlaskResponseForStorage = (flaskResp: any) => {
    if (!flaskResp) return null;
    // Keep full flaskResponse including plots - they're relatively small
    // The real optimization is cleanup of old plans
    return flaskResp;
  };

  const handleSavePlan = () => {
    // Validate that we have required data before saving
    if (!flaskResponse && !technicalSizing) {
      setError('Cannot save plan: No recommendation data available. Please generate a recommendation first.');
      return;
    }

    // Ensure economicAnalysis has the required fields, fallback to flaskResponse if needed
    let economicAnalysisToSave = economicAnalysis;
    if (!economicAnalysisToSave?.capital_cost_dual_mode_rs && flaskResponse?.['Capital Cost & Annual Generation']) {
      const capitalGen = flaskResponse['Capital Cost & Annual Generation'];
      economicAnalysisToSave = {
        ...economicAnalysisToSave,
        capital_cost_dual_mode_rs: parseFloat(capitalGen['Capital Cost Dual Mode (Rs)'] || '0'),
        capital_cost_on_grid_rs: parseFloat(capitalGen['Capital Cost On-Grid (Rs)'] || '0'),
      };
    }

    if (!economicAnalysisToSave?.simple_payback_dual_mode_years && flaskResponse?.['Simple Payback Period']) {
      const payback = flaskResponse['Simple Payback Period'];
      economicAnalysisToSave = {
        ...economicAnalysisToSave,
        simple_payback_dual_mode_years: parseFloat(payback['Dual Mode System (years)'] || '0'),
        simple_payback_on_grid_years: parseFloat(payback['On-Grid System (years)'] || '0'),
      };
    }

    // Optimize flaskResponse for storage (remove plots data to save space)
    const optimizedFlaskResponse = optimizeFlaskResponseForStorage(flaskResponse);

    // Save to localStorage
    const planData = {
      planName,
      useCase,
      powerLevel: useCaseOptions.find(u => u.value === useCase)?.powerLevel,
      appliances,
      totalDailyConsumptionKWh: technicalSizing?.totalDailyConsumptionKWh ?? totalDailyConsumptionKWh,
      preferredSources,
      primaryGoals,
      technicalSizing,
      economicAnalysis: economicAnalysisToSave, // Use validated economicAnalysis
      emissionsAnalysis,
      flaskResponse: optimizedFlaskResponse, // Save optimized Flask-style response (without plots data)
      createdAt: currentPlanId ? savedPlans.find(p => p.id === currentPlanId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Use existing plan ID if editing, otherwise create new one
    const planId = currentPlanId || `plan_${Date.now()}`;
    
    try {
      localStorage.setItem(planId, JSON.stringify(planData));
      setCurrentPlanId(planId); // Track this as current plan
      setError(''); // Clear any previous errors
    } catch (error: any) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
        console.warn('⚠️ Storage quota exceeded, cleaning up old plans...');
        
        // Clean up old plans (keep only the 10 most recent)
        const cleanedCount = cleanupOldPlans(10);
        
        if (cleanedCount > 0) {
          // Try saving again after cleanup
          try {
            localStorage.setItem(planId, JSON.stringify(planData));
            setCurrentPlanId(planId);
            setError(`Storage was full. Cleaned up ${cleanedCount} old plan(s). Your plan has been saved.`);
            setTimeout(() => setError(''), 5000); // Clear message after 5 seconds
          } catch (retryError: any) {
            // Still failing - suggest manual cleanup
            setError(`Unable to save plan: Storage is full. Please delete some old plans manually. (Cleaned ${cleanedCount} plans)`);
          }
        } else {
          // No old plans to clean - storage is truly full
          setError('Unable to save plan: Storage is full. Please delete some old plans manually or clear browser data.');
        }
        return;
      }
      // Other errors
      setError(`Failed to save plan: ${error.message || 'Unknown error'}`);
      console.error('❌ Error saving plan:', error);
    }
    
    // Refresh saved plans list and show "My Saved Plans" view
    loadSavedPlans();
    
    // Clear current wizard state and show saved plans
    setStep(0);
    setShowPreviousPlans(true);
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      localStorage.removeItem(planId);
      loadSavedPlans();
    }
  };

  const handleLoadPlan = async (plan: any) => {
    // Clear existing state first to avoid accumulation
    loadProfileContext.clearAppliances();
    setPlanName('');
    setTechnicalSizing(null);
    setEconomicAnalysis(null);
    setEmissionsAnalysis(null);
    setFlaskResponse(null);
    
    // Set current plan ID to track this plan
    setCurrentPlanId(plan.id);
    
    // Load plan data into wizard
    setPlanName(plan.planName);
    setSelectedUseCase(plan.useCase);
    setUseCase(plan.useCase);
    setPreferredSources(plan.preferredSources || []);
    // Primary goals are now static - always use all 4 goals
    setPrimaryGoals(['savings', 'self_sustainability', 'reliability', 'carbon_reduction']);
    
    // Load appliances into context (after clearing)
    if (plan.appliances && Array.isArray(plan.appliances)) {
      plan.appliances.forEach((app: any) => {
      loadProfileContext.addAppliance(app);
    });
    }
    
    // Restore technical sizing, ensuring consumption value is preserved
    if (plan.technicalSizing) {
      setTechnicalSizing({
        ...plan.technicalSizing,
        // Always use saved consumption value, not recalculated one
        totalDailyConsumptionKWh: plan.totalDailyConsumptionKWh ?? plan.technicalSizing.totalDailyConsumptionKWh
      });
    } else {
      setTechnicalSizing(null);
    }
    
    setEconomicAnalysis(plan.economicAnalysis);
    setEmissionsAnalysis(plan.emissionsAnalysis);
    
    // Check if flaskResponse exists - if not, automatically regenerate it
    if (!plan.flaskResponse && plan.technicalSizing && plan.totalDailyConsumptionKWh) {
      // Plan is missing flaskResponse - automatically regenerate it
      console.log('🔄 Plan missing flaskResponse - automatically regenerating...');
      setIsLoading(true);
      setError('');
      
      try {
        // Wait a bit for state to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Regenerate recommendation using the same logic as handleGenerateRecommendation
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        const API_BASE_URL = isLocalhost 
          ? 'http://localhost:5001/api/v1' 
          : (import.meta.env.VITE_API_BASE_URL || '/api/v1');
        const token = localStorage.getItem('jwt');

        // Save load profile if needed
        let currentLoadProfileId = loadProfileId;
        if (!currentLoadProfileId && plan.appliances && plan.appliances.length > 0) {
          try {
            const mapCategory = (applianceName: string): 'lighting' | 'fans' | 'it' | 'cooling_heating' | 'cleaning' | 'kitchen_misc' => {
              const name = applianceName.toLowerCase();
              if (name.includes('led') || name.includes('light') || name.includes('bulb') || name.includes('tube')) return 'lighting';
              if (name.includes('fan')) return 'fans';
              if (name.includes('computer') || name.includes('laptop') || name.includes('monitor') || name.includes('printer')) return 'it';
              if (name.includes('ac') || name.includes('heater') || name.includes('cooling') || name.includes('heating')) return 'cooling_heating';
              if (name.includes('washing') || name.includes('vacuum') || name.includes('clean')) return 'cleaning';
              return 'kitchen_misc';
            };
            
            const backendAppliances = plan.appliances.map((app: any) => ({
              category: mapCategory(app.appliance || app.name),
              name: app.appliance || app.name,
              power_rating: (app.rating || app.power_rating || 0) / 1000, // Convert W to kW
              quantity: app.quantity || 1,
              avg_hours: app.hoursPerDay || app.avg_hours || 8,
            }));
            
            const loadProfileResult = await savePlanningStep2({
              name: plan.planName || `Load Profile - ${new Date().toLocaleDateString()}`,
              appliances: backendAppliances
            });
            currentLoadProfileId = loadProfileResult.load_profile.id;
            setLoadProfileId(currentLoadProfileId);
          } catch (loadProfileError) {
            console.warn('⚠️ Could not save load profile, using existing ID if available');
          }
        }

        // Call API to regenerate recommendation
        const aiServiceRequest = {
          load_profile_id: currentLoadProfileId || plan.loadProfileId,
          total_daily_energy_kwh: plan.totalDailyConsumptionKWh || plan.technicalSizing.totalDailyConsumptionKWh,
          preferred_sources: plan.preferredSources || ['solar', 'battery'],
          primary_goals: ['savings', 'self_sustainability', 'reliability', 'carbon_reduction'],
          primary_goal: 'savings',
          allow_diesel: false,
        };

        const aiResponse = await fetch(`${API_BASE_URL}/wizard/planning/step3`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(aiServiceRequest)
        });

        const backendResponse = await aiResponse.json();

        if (!aiResponse.ok) {
          throw new Error(backendResponse.error || backendResponse.detail || 'Failed to regenerate recommendation');
        }
        
        const flaskResult = backendResponse.flask_response || backendResponse;
        
        if (flaskResult && flaskResult['Technical Analysis']) {
          // Extract data from flask response
          const tech = flaskResult['Technical Analysis'];
          const econ = flaskResult['Economic Analysis'];
          const capitalGen = flaskResult['Capital Cost & Annual Generation'];
          const payback = flaskResult['Simple Payback Period'];
          const carbon = flaskResult['Carbon Emission'];
          
          // Prepare economicAnalysis object with all required fields
          const updatedEconomicAnalysis = {
            ...plan.economicAnalysis, // Preserve existing fields
            ...econ, // Add Flask economic analysis fields
            capital_cost_dual_mode_rs: parseFloat(capitalGen['Capital Cost Dual Mode (Rs)'] || '0'),
            capital_cost_on_grid_rs: parseFloat(capitalGen['Capital Cost On-Grid (Rs)'] || '0'),
            simple_payback_dual_mode_years: parseFloat(payback['Dual Mode System (years)'] || '0'),
            simple_payback_on_grid_years: parseFloat(payback['On-Grid System (years)'] || '0'),
          };

          // Prepare emissionsAnalysis
          const dualModeEmissions = parseFloat(carbon['Dual Mode System (Ton)'] || '0');
          const onGridEmissions = parseFloat(carbon['On-Grid System (Ton)'] || '0');
          const updatedEmissionsAnalysis = {
            ...plan.emissionsAnalysis, // Preserve existing fields
            carbon_emission_dual_mode_ton: dualModeEmissions,
            carbon_emission_on_grid_ton: onGridEmissions,
            annual_co2_reduction_kg: (onGridEmissions - dualModeEmissions) * 1000,
            carbon_offset_percentage: onGridEmissions > 0 ? ((onGridEmissions - dualModeEmissions) / onGridEmissions) * 100 : 0,
          };

          // Optimize flaskResponse for storage (remove plots data)
          const optimizedFlaskResponse = optimizeFlaskResponseForStorage(flaskResult);

          // Update plan with flaskResponse and all derived data
          const updatedPlanData = {
            ...plan,
            flaskResponse: optimizedFlaskResponse,
            economicAnalysis: updatedEconomicAnalysis,
            emissionsAnalysis: updatedEmissionsAnalysis,
            updatedAt: new Date().toISOString(),
          };
          
          try {
            localStorage.setItem(plan.id, JSON.stringify(updatedPlanData));
          } catch (error: any) {
            if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
              // Clean up old plans and try again
              cleanupOldPlans(10);
              try {
                localStorage.setItem(plan.id, JSON.stringify(updatedPlanData));
              } catch (retryError) {
                console.error('❌ Still unable to save after cleanup:', retryError);
              }
            } else {
              throw error;
            }
          }
          
          // Update state
          setFlaskResponse(flaskResult);
          
          const peak_power_kw = ((plan.totalDailyConsumptionKWh || plan.technicalSizing.totalDailyConsumptionKWh) / 24) * 2;
          
          setTechnicalSizing({
            solar_capacity_kw: parseFloat(tech['Solar Panel Power Rating (kW)'] || '0'),
            battery_capacity_kwh: parseFloat(tech['Battery Energy (kWh)'] || '0'),
            battery_nominal_voltage_v: parseInt(tech['Battery Nominal Voltage (V)'] || '12'),
            battery_capacity_ah: parseFloat(tech['Battery Capacity (kAh)'] || '0') * 1000,
            inverter_capacity_kw: parseFloat(tech['Inverter Rating (kVA)'] || '0'),
            dc_converter_capacity_kw: parseFloat(tech['DC-DC Converter Rating (kW)'] || '0'),
            grid_connection_kw: peak_power_kw,
            peak_power_kw: peak_power_kw,
            totalDailyConsumptionKWh: plan.totalDailyConsumptionKWh || plan.technicalSizing.totalDailyConsumptionKWh,
            recommendations: [
              `Install ${tech['Solar Panel Power Rating (kW)']} kW solar PV system`,
              `Install ${tech['Battery Energy (kWh)']} kWh battery storage (${tech['Battery Capacity (kAh)']} kAh at ${tech['Battery Nominal Voltage (V)']}V)`,
              `Inverter rating: ${tech['Inverter Rating (kVA)']} kVA`,
              `DC-DC converter rating: ${tech['DC-DC Converter Rating (kW)']} kW`
            ]
          });

          setEconomicAnalysis(updatedEconomicAnalysis);
          setEmissionsAnalysis(updatedEmissionsAnalysis);
          
          // Refresh saved plans list
          loadSavedPlans();
          
          console.log('✅ Successfully regenerated and saved flaskResponse for plan');
        }
      } catch (regenerateError: any) {
        console.error('❌ Failed to regenerate flaskResponse:', regenerateError);
        setError(`Failed to regenerate recommendation: ${regenerateError.message || 'Unknown error'}`);
        // Still proceed to show what we have
        setFlaskResponse(plan.flaskResponse || null);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Plan already has flaskResponse - just restore it
      setFlaskResponse(plan.flaskResponse);
    }
    
    // Go to results step if recommendation exists
    if (plan.technicalSizing || plan.flaskResponse) {
      setStep(3);
    } else {
      setStep(2);
    }
    
    setShowPreviousPlans(false);
  };

  const handleProceedToOptimization = () => {
    // Navigate with planning data
    navigate('/optimization-setup', {
      state: {
        planningData: {
          useCase,
          totalDailyConsumptionKWh,
          peakLoad,
          technicalSizing,
          economicAnalysis,
        }
      }
    });
  };

  // Show saved plans view
  if (showPreviousPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Saved Plans</h1>
              <p className="text-gray-600 dark:text-gray-400">View and manage your energy planning plans</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete all but the 10 most recent plans? This will free up storage space.`)) {
                    const cleaned = cleanupOldPlans(10);
                    loadSavedPlans();
                    if (cleaned > 0) {
                      alert(`Cleaned up ${cleaned} old plan(s).`);
                    } else {
                      alert('No old plans to clean up.');
                    }
                  }
                }}
                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/40 flex items-center space-x-2"
                title="Clean up old plans to free storage space"
              >
                <Trash2 className="w-5 h-5" />
                <span>Clean Old Plans</span>
              </button>
              <button
                onClick={() => {
                  setShowPreviousPlans(false);
                  setStep(0);
                  setCurrentPlanId(null); // Reset current plan ID for new plan
                  loadProfileContext.clearAppliances();
                  setPlanName('');
                  setTechnicalSizing(null);
                  setEconomicAnalysis(null);
                  setEmissionsAnalysis(null);
                  setPreferredSources(['solar', 'battery', 'grid']);
                  setPrimaryGoals(['savings', 'self_sustainability', 'reliability', 'carbon_reduction']); // Static - always all 4 goals
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Plan</span>
              </button>
            </div>
          </div>

          {savedPlans.length === 0 ? (
            <Card>
              <div className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Plans Yet</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first energy planning plan to get started</p>
                <button
                  onClick={() => setShowPreviousPlans(false)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Create Your First Plan
                </button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPlans.map((plan) => (
                <Card key={plan.id}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {plan.planName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {new Date(plan.createdAt).toLocaleDateString()} at {new Date(plan.createdAt).toLocaleTimeString()}
                        </p>
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                          {plan.useCase?.charAt(0).toUpperCase() + plan.useCase?.slice(1)} • {plan.powerLevel}
                        </span>
                      </div>
                    </div>
                    
                    {plan.economicAnalysis && (
                      <div className="space-y-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily Consumption</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {plan.totalDailyConsumptionKWh?.toFixed(2)} kWh
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total CAPEX</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {(() => {
                              // Try multiple possible field names for CAPEX
                              const capex = plan.economicAnalysis?.capital_cost_dual_mode_rs 
                                || plan.economicAnalysis?.total_capex
                                || plan.flaskResponse?.['Capital Cost & Annual Generation']?.['Capital Cost Dual Mode (Rs)']
                                || 0;
                              const capexNum = typeof capex === 'string' ? parseFloat(capex.replace(/[^\d.-]/g, '')) : Number(capex);
                              if (isNaN(capexNum) || capexNum === 0) return 'N/A';
                              return `₹${(capexNum / 100000).toFixed(2)} L`;
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payback Period</p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {(() => {
                              // Try multiple possible field names for payback
                              const payback = plan.economicAnalysis?.simple_payback_dual_mode_years
                                || plan.economicAnalysis?.payback_period_years
                                || plan.flaskResponse?.['Simple Payback Period']?.['Dual Mode System (years)']
                                || null;
                              if (!payback || isNaN(Number(payback))) return 'N/A';
                              const paybackNum = typeof payback === 'string' ? parseFloat(payback) : Number(payback);
                              return `${paybackNum.toFixed(1)} years`;
                            })()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleLoadPlan(plan)}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Energy Advisory Assistance</h1>
            <p className="text-gray-600 dark:text-gray-400">Design your optimal energy management system</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setCurrentPlanId(null); // Reset when viewing all plans
                loadSavedPlans();
                setShowPreviousPlans(true);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 flex items-center space-x-2"
            >
              <History className="w-5 h-5" />
              <span>View Saved Plans ({savedPlans.length || getSavedPlansCount()})</span>
            </button>
            <button
              onClick={() => navigate('/main-options')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Back to Main Options
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[0, 1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {step > s ? <Check className="w-6 h-6" /> : s + 1}
                  </div>
                  <span className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {s === 0 ? 'Use Case' : s === 1 ? 'Preferences' : s === 2 ? 'Load Profile' : 'Results'}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`w-24 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Step 0: Use Case Selection */}
        {step === 0 && (
          <Card>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Select Use Case & Power Level
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose the type of energy system you want to design
                  </p>
                </div>
                <button
                  onClick={() => {
                    loadSavedPlans();
                    setShowPreviousPlans(true);
                  }}
                  className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-900/40 flex items-center space-x-2"
                >
                  <History className="w-5 h-5" />
                  <span>Saved Plans ({getSavedPlansCount()})</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="My Energy Plan"
                  />
                </div>

                {/* Use Case Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Use Case & Power Level
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {useCaseOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          // When use case changes, clear ALL data to prevent showing old recommendations
                          if (selectedUseCase !== option.value) {
                            console.log(`🔄 Use case changed from ${selectedUseCase} to ${option.value} - clearing all data`);
                            setTechnicalSizing(null);
                            setEconomicAnalysis(null);
                            setEmissionsAnalysis(null);
                            setFlaskResponse(null);
                            setLoadProfileId(null); // CRITICAL: Clear load profile ID so new one is created
                            setCurrentPlanId(null);
                            clearAppliances();
                            setError(''); // Clear any errors
                          }
                          setSelectedUseCase(option.value);
                        }}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          selectedUseCase === option.value
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:scale-102'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-3">
                          <div className={`p-4 rounded-xl bg-gradient-to-br ${option.color} text-white`}>
                            {option.icon}
                          </div>
                          <div className="text-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                              {option.label}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {option.description}
                            </p>
                            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                              {option.powerLevel} System
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Use Case Description */}
                {selectedUseCase && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {useCaseOptions.find(u => u.value === selectedUseCase)?.label} System Details
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {(() => {
                        const template = getUseCaseTemplate(selectedUseCase);
                        return template ? template.typical_load : '';
                      })()}
                    </p>
                  </div>
                )}

                {/* Next Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleStep0Next}
                    disabled={!planName.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <span>Next: Energy Sources</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 1: Energy Sources & Preferences */}
        {step === 1 && (
          <Card>
            <div className="p-8">
              <button
                onClick={() => setStep(0)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 flex items-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </button>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Energy Sources & Preferences
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Select your preferred energy sources and primary goal
              </p>

              <div className="space-y-6">
                {/* Preferred Sources */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Preferred Energy Sources
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sourceOptions.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => handleSourceToggle(source.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          preferredSources.includes(source.id)
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className={`p-2 rounded-lg ${
                            preferredSources.includes(source.id)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {source.icon}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {source.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Goal - Static Display */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Primary Goals
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goalOptions.map((goal) => (
                      <div
                        key={goal.value}
                        className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {goal.label}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {goal.description}
                            </p>
                          </div>
                            <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleStep1Next}
                    disabled={preferredSources.length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <span>Next: Add Appliances</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Appliances & Load Profile */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </button>

                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Build Your Load Profile
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add appliances to calculate your energy consumption
                    </p>
                  </div>
                  <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">
                    {useCase.charAt(0).toUpperCase() + useCase.slice(1)} • {useCaseOptions.find(u => u.value === useCase)?.powerLevel}
                  </span>
                </div>
              </div>
            </Card>

            {/* Appliance Selector Component */}
            <ApplianceSelector />

            {/* Next Button */}
            <div className="flex justify-end">
              <button
                onClick={handleStep2Next}
                disabled={appliances.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>Generate Recommendation</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Technical Sizing & Economic Analysis */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <button
                  onClick={() => setStep(2)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Load Profile
                </button>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  System Recommendation
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Based on your {
                    // Always prefer saved consumption from technicalSizing if available
                    // This ensures consistency when viewing saved plans
                    (technicalSizing?.totalDailyConsumptionKWh ?? totalDailyConsumptionKWh).toFixed(2)
                  } kWh/day consumption
                  {useCase && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                      ({useCase.charAt(0).toUpperCase() + useCase.slice(1)})
                    </span>
                  )}
                </p>

                {/* Show warning if recommendation exists but use case doesn't match */}
                {technicalSizing && useCase && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300 text-sm">
                    ℹ️ Recommendation generated for <strong>{useCase.charAt(0).toUpperCase() + useCase.slice(1)}</strong> use case
                  </div>
                )}

                {!technicalSizing && (
                  <div className="text-center py-12">
                    <button
                      onClick={handleGenerateRecommendation}
                      disabled={isLoading}
                      className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 mx-auto"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Calculating...</span>
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-5 h-5" />
                          <span>Generate Recommendation</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Flask-style Response Display */}
            {flaskResponse ? (
              <>
                    {/* Technical Analysis */}
                <Card title="Technical Analysis">
                  <div className="p-6">
                    <div className="space-y-3">
                          {Object.entries(flaskResponse['Technical Analysis'] || {}).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{key}:</span>
                              <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                      </div>
                          ))}
                    </div>
                  </div>
                </Card>

                {/* Economic Analysis */}
                <Card title="Economic Analysis">
                  <div className="p-6">
                        <div className="overflow-x-auto mb-6">
                          <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="p-3 text-left border border-gray-300 dark:border-gray-600">Parameter</th>
                                <th className="p-3 text-right border border-gray-300 dark:border-gray-600">Dual Mode (Rs)</th>
                                <th className="p-3 text-right border border-gray-300 dark:border-gray-600">On-Grid (Rs)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">Solar Panel Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Solar Panel Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Solar Panel Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">Battery Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Battery Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">0</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">Inverter Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Inverter Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Inverter Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">DC-DC Converter Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['DC-DC Converter Cost (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">0</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">Installation Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Installation Cost Dual Mode (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Installation Cost On-Grid (Rs)'] || '0').toLocaleString()}
                                </td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="p-3 border border-gray-300 dark:border-gray-600">Annual O&M Cost</td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Annual O&M Cost Dual Mode (Rs)'] || '0').toLocaleString()}
                                </td>
                                <td className="p-3 text-right border border-gray-300 dark:border-gray-600">
                                  {parseFloat(flaskResponse['Economic Analysis']?.['Annual O&M Cost On-Grid (Rs)'] || '0').toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                    </div>
                  </div>
                </Card>

                {/* Capital Cost & Annual Generation */}
                  <Card title="Capital Cost & Annual Generation">
                    <div className="p-6">
                      <div className="space-y-3">
                          {Object.entries(flaskResponse['Capital Cost & Annual Generation'] || {}).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{key}:</span>
                              <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                        </div>
                          ))}
                        </div>
                        </div>
                    </Card>

                    {/* Plots */}
                    {flaskResponse['Plots'] && (
                      <Card title="Analysis Plots">
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.entries(flaskResponse['Plots']).map(([key, plotData]: [string, any]) => {
                            // Check if plot data exists or if we need to regenerate it
                            if (plotData && typeof plotData === 'object' && plotData.data && Array.isArray(plotData.data)) {
                              // Plot data exists - render with Recharts
                              return (
                                <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{plotData.title || key}</h4>
                                  <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={plotData.data} margin={{ left: 20, right: 10, top: 10, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                          dataKey="name" 
                                          tick={{ fill: 'currentColor' }}
                                          label={{ value: plotData.xLabel, position: 'insideBottom', offset: -2 }}
                                        />
                                        <YAxis 
                                          tick={{ fill: 'currentColor' }}
                                          label={{ value: plotData.yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                                        />
                                        <Tooltip 
                                          contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px'
                                          }}
                                          formatter={(value: any) => {
                                            if (key.includes('Capital Cost')) {
                                              // Check yLabel to determine unit (Thousands or Cr)
                                              const yLabel = plotData.yLabel || '';
                                              if (yLabel.includes('Thousands')) {
                                                return `₹${Number(value).toFixed(2)}K`;
                                              } else if (yLabel.includes('Cr')) {
                                                return `₹${value} Cr`;
                                              }
                                              return `₹${Number(value).toFixed(2)}K`; // Default to thousands
                                            }
                                            if (key.includes('Payback')) return `${value} years`;
                                            if (key.includes('Carbon')) return `${value} Kiloton`;
                                            return `₹${value}/kWh`;
                                          }}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                          {plotData.data.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                        </div>
                        </div>
                              );
                            } else if (plotData && typeof plotData === 'object' && plotData.type && !plotData.data) {
                              // Plot metadata exists but data is missing (optimized storage) - show message
                              return (
                                <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{plotData.title || key}</h4>
                                  <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                    <p>Plot data will be regenerated when you view this plan</p>
                                  </div>
                                </div>
                              );
                            } else if (plotData && typeof plotData === 'object' && plotData.type === 'bar' && plotData.data) {
                              // Legacy check - keep for compatibility
                              return (
                                <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{plotData.title}</h4>
                                  <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={plotData.data} margin={{ left: 20, right: 10, top: 10, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis 
                                          dataKey="name" 
                                          tick={{ fill: 'currentColor' }}
                                          label={{ value: plotData.xLabel, position: 'insideBottom', offset: -2 }}
                                        />
                                        <YAxis 
                                          tick={{ fill: 'currentColor' }}
                                          label={{ value: plotData.yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
                                        />
                                        <Tooltip 
                                          contentStyle={{ 
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px'
                                          }}
                                          formatter={(value: any) => {
                                            if (key.includes('Capital Cost')) {
                                              // Check yLabel to determine unit (Thousands or Cr)
                                              const yLabel = plotData.yLabel || '';
                                              if (yLabel.includes('Thousands')) {
                                                return `₹${Number(value).toFixed(2)}K`;
                                              } else if (yLabel.includes('Cr')) {
                                                return `₹${value} Cr`;
                                              }
                                              return `₹${Number(value).toFixed(2)}K`; // Default to thousands
                                            }
                                            if (key.includes('Payback')) return `${value} years`;
                                            if (key.includes('Carbon')) return `${value} Kiloton`;
                                            return `₹${value}/kWh`;
                                          }}
                                        />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                          {plotData.data.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                                          ))}
                                        </Bar>
                                      </BarChart>
                                    </ResponsiveContainer>
                        </div>
                        </div>
                              );
                            } else {
                              // Old base64 format - render as image (backward compatibility)
                              return (
                                <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                  <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{key}</h4>
                                  <img 
                                    src={`data:image/png;base64,${plotData}`} 
                                    alt={key}
                                    className="w-full h-auto rounded"
                                  />
                                </div>
                              );
                            }
                          })}
                      </div>
                    </div>
                  </Card>
                )}

                    {/* Cost of Energy Generation */}
                    <Card title="Cost of Energy and Grid Outage Effect">
                  <div className="p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          The Cost of Energy is defined as the average cost to produce one unit of electricity from the system. 
                          An installed solar system is connected to the grid, and during a grid outage, energy generation stops, 
                          with energy loss directly related to the outage duration.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Dual Mode System</h4>
                            <div className="space-y-2">
                              {Object.entries(flaskResponse['Cost of Energy Generation'] || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center py-1">
                                  <span className="text-gray-700 dark:text-gray-300 text-sm">{key}:</span>
                                  <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                        </div>
                              ))}
                      </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">On-Grid System</h4>
                            <div className="space-y-2">
                              {Object.entries(flaskResponse['On-Grid Cost of Energy Generation'] || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center py-1">
                                  <span className="text-gray-700 dark:text-gray-300 text-sm">{key}:</span>
                                  <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                          </div>
                              ))}
                        </div>
                      </div>
                        </div>
                      </div>
                    </Card>

                    {/* Simple Payback Period */}
                    <Card title="Simple Payback Period">
                      <div className="p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          The simple payback period is defined as the time an investment takes to generate an amount of money equal to its initial cost.
                        </p>
                        <div className="space-y-2">
                          {Object.entries(flaskResponse['Simple Payback Period'] || {}).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{key}:</span>
                              <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                          </div>
                          ))}
                        </div>
                      </div>
                    </Card>

                    {/* Carbon Emission */}
                    <Card title="Environment Effect">
                      <div className="p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Using renewable resources to generate energy will reduce fossil fuel burning for energy generation, 
                          ultimately saving carbon emissions.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Carbon Emission Comparison</h4>
                          {Object.entries(flaskResponse['Carbon Emission'] || {}).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">{key}:</span>
                              <span className="text-gray-900 dark:text-white font-semibold">{value}</span>
                          </div>
                          ))}
                    </div>
                  </div>
                </Card>
                  </>
                ) : null}

                {/* Action Buttons */}
                    {(flaskResponse || technicalSizing) && (
                    <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={handleSavePlan}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save Plan</span>
                  </button>
                  <button
                    onClick={handleProceedToOptimization}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <span>Proceed to Optimization</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper with LoadProfileProvider
const PlanningWizardPageEnhanced: React.FC = () => {
  return (
    <LoadProfileProvider>
      <PlanningWizardContent />
    </LoadProfileProvider>
  );
};

export default PlanningWizardPageEnhanced;

