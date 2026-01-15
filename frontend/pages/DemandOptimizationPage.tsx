import { useContext, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../contexts/AppContext";
import { getOptimizationUploads, OptimizationUpload } from "../services/api";
import axios from "axios";
import { Snackbar, Alert } from "@mui/material";
import DemandOptimizationCharts from "../components/shared/DemandOptimizationCharts";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  BatteryCharging,
  Coins,
  Fuel,
  Gauge,
  Leaf,
  Sun,
  Zap,
  Users,
  AlertCircle,
  ArrowLeft,
  ArrowUp,
} from "lucide-react";
import InlineOptimizationSetup from "../components/shared/InlineOptimizationSetup";

const DemandOptimizationPage = () => {
  const appContext = useContext(AppContext);
  if (!appContext) {
    return <div>Loading...</div>; // Safety check
  }
  const { currentUser, theme, selectedSite } = appContext;
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get common config from location state (from Optimization Configuration) or localStorage
  const locationConfig = (location.state as any)?.commonConfig;
  const locationFile = (location.state as any)?.uploadedFile;
  
  // Check localStorage for saved config
  const savedConfig = useMemo(() => {
    try {
      const saved = localStorage.getItem('optimizationConfig');
      if (saved) {
        return JSON.parse(saved);
      }
      const emsSaved = localStorage.getItem('ems_common_config');
      if (!emsSaved) return null;
      const parsed = JSON.parse(emsSaved);
      return parsed?.formData || null;
    } catch {
      return null;
    }
  }, []);

  // Use location config first, then saved config, then null
  const commonConfig = locationConfig || savedConfig;
  const uploadedFile = locationFile;

  // Demand-specific form data (only curtailment penalties)
  const [demandSpecificData, setDemandSpecificData] = useState({
    curtail_penalty_load3: 18.0,
    curtail_penalty_load4: 10.0,
    curtail_penalty_load5: 8.0,
  });

  // Merged form data (common + demand-specific) for API call
  const [mergedFormData, setMergedFormData] = useState<any>(null);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [plotUrl, setPlotUrl] = useState<string | null>(null);
  const [savedUploads, setSavedUploads] = useState<OptimizationUpload[]>([]);
  const [savedUploadName, setSavedUploadName] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use backend proxy instead of direct AI service call to avoid CORS issues
  const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api/v1'
    : import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const OPTIMIZE_URL = `${API_BASE_URL}/demand-optimize`;

  const controlWrapperClass = "form-control space-y-2";
  const labelClass = "label-text text-sm font-medium text-base-content/70 mb-1.5";
  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-base-content placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:border-gray-300";
  const selectClass =
    "w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:border-gray-300";
  const fileInputClass =
    "file-input w-full rounded-lg border border-gray-200 bg-white text-base-content focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:border-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20";
  const sectionPanelClass = "space-y-4 rounded-2xl border border-base-200/60 bg-base-100/70 p-5 shadow-sm";

  const formatNumber = (
    value: number | string | null | undefined,
    maximumFractionDigits = 2
  ): string => {
    if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) {
      return "-";
    }
    const numericValue = Number(value);
    return numericValue.toLocaleString("en-IN", {
      maximumFractionDigits,
    });
  };

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    const numericValue = Number(value);
    return numericValue.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const formatPercent = (
    value: number | string | null | undefined,
    maximumFractionDigits = 1
  ): string => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "-";
    }
    return `${formatNumber(Number(value), maximumFractionDigits)}%`;
  };

  const formatKWh = (value: number | string | null | undefined, digits = 2): string => {
    const formatted = formatNumber(value, digits);
    return formatted === "-" ? "-" : `${formatted} kWh`;
  };

  // Basic file-type guard to avoid sending HTML/error downloads as CSV
  const validateUploadedFile = (file: File) => {
    const name = file.name.toLowerCase();
    const type = (file.type || "").toLowerCase();
    const isCsv = name.endsWith(".csv") || type.includes("csv");
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") || type.includes("excel");
    return isCsv || isExcel;
  };

  const getServerErrorMessage = (err: any) => {
    const data = err?.response?.data;
    if (data?.message) return data.message;
    if (data?.details?.message) return data.details.message;
    if (typeof data === "string") return data;
    return err?.message || "An unexpected error occurred";
  };

  // Handle config from inline setup
  const handleInlineConfigReady = (config: any) => {
    // Store config in localStorage (without file, as files can't be serialized)
    const { uploadedFile: file, ...configWithoutFile } = config;
    localStorage.setItem('optimizationConfig', JSON.stringify(configWithoutFile));
    
    const merged = {
      ...config,
      ...demandSpecificData,
      objective_type: "cost",
      uploadedFile: config.uploadedFile || uploadedFile || null,
    };
    setMergedFormData(merged);
  };

  // Initialize mergedFormData with defaults immediately or from config
  const getDefaultMergedData = useMemo(() => {
    if (commonConfig) {
      return {
        ...commonConfig,
        ...demandSpecificData,
        objective_type: "cost", // Demand optimization only supports cost
        uploadedFile: uploadedFile || null,
      };
    } else {
      // If no common config, use defaults (for backward compatibility)
      return {
        weather: "Sunny",
        objective_type: "cost",
        num_days: 1,
        time_resolution_minutes: 60,
        profile_type: "Auto detect",
        grid_connection: 2500,
        solar_connection: 2000,
        battery_capacity: 40,
        battery_voltage: 100,
        diesel_capacity: 2200,
        electrolyzer_capacity: 1000.0,
        fuel_cell_capacity: 1000.0,
        h2_tank_capacity: 100.0,
        fuel_cell_efficiency_percent: 0.60,
        fuel_price: 90,
        pv_energy_cost: 2.85,
        battery_om_cost: 6.085,
        fuel_cell_om_cost: 1.5,
        electrolyzer_om_cost: 0.5,
        ...demandSpecificData,
        upload_id: "",
      };
    }
  }, [commonConfig, demandSpecificData, uploadedFile]);

  // Merge common config with demand-specific data
  useEffect(() => {
    setMergedFormData(getDefaultMergedData);
  }, [getDefaultMergedData]);

  useEffect(() => {
    const loadUploads = async () => {
      try {
        const uploads = await getOptimizationUploads(selectedSite?.id);
        if (uploads.length > 0 || !selectedSite?.id) {
          setSavedUploads(uploads);
          return;
        }
        const fallbackUploads = await getOptimizationUploads();
        setSavedUploads(fallbackUploads);
      } catch (err) {
        console.warn("Failed to load saved uploads:", err);
      }
    };
    loadUploads();
  }, [selectedSite]);

  useEffect(() => {
    if (!mergedFormData || mergedFormData.uploadedFile || mergedFormData.upload_id) return;
    if (!savedUploads.length) return;
    const latestUpload = savedUploads[0];
    if (!latestUpload?.id) return;
    setSavedUploadName(latestUpload.file_name || "Saved upload");
    setMergedFormData((prev: any) => ({
      ...prev,
      upload_id: latestUpload.id,
    }));
  }, [mergedFormData, savedUploads]);

  useEffect(() => {
    const savedResponse = localStorage.getItem("demandOptimizationResponse");
    if (!savedResponse) return;

    const parsed = JSON.parse(savedResponse);
    setResponse(parsed);
    if (parsed.chart_data) {
      if (Array.isArray(parsed.chart_data)) {
        setChartData(parsed.chart_data);
      } else {
        setChartData(parsed.chart_data.time_series || []);
      }
    }
    if (parsed.plot_base64 && !parsed.chart_data) {
      setPlotUrl(`data:image/png;base64,${parsed.plot_base64}`);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setDemandSpecificData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mergedFormData) {
      if (!validateUploadedFile(file)) {
        setError("Please upload a valid CSV or Excel file (not HTML/download pages).");
        setOpen(true);
        return;
      }
      setMergedFormData(prev => ({
        ...prev,
        uploadedFile: file
      }));
    }
  };

  const handleSubmit = async () => {
    if (!mergedFormData) {
      setError("Please configure optimization parameters first in Optimization Configuration");
      setOpen(true);
      return;
    }

    // Basic client-side validation
    const validResolutions = [15, 30, 60];
    if (!validResolutions.includes(Number(mergedFormData.time_resolution_minutes))) {
      setError("Time resolution must be 15, 30, or 60 minutes");
      setOpen(true);
      return;
    }
    if (mergedFormData.num_days < 1 || mergedFormData.num_days > 30) {
      setError("Number of days must be between 1 and 30");
      setOpen(true);
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);
    setOpen(false);
    
    // Start progress simulation
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          // Slow down near the end, wait for actual completion
          return prev;
        }
        // Increment progress with some randomness to make it feel natural
        // Cap at 100 to prevent exceeding 100%
        return Math.min(100, prev + Math.random() * 15 + 5);
      });
    }, 500);

    try {
      // Get auth token
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Cancel any in-flight request before starting a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add file if uploaded
      if (mergedFormData.uploadedFile) {
        formDataToSend.append('file', mergedFormData.uploadedFile);
      }
      
      // Add all form parameters (merged common + demand-specific)
      Object.keys(mergedFormData).forEach((key) => {
        if (key !== "uploadedFile") {
          formDataToSend.append(key, String(mergedFormData[key]));
        }
      });

      // Call the Python API
      const res = await axios.post(
        OPTIMIZE_URL,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      );

      if (res.data.status === "success") {
        setResponse(res.data);
        // Handle new chart_data structure (with time_series and metadata) or old array structure
        if (res.data.chart_data) {
          if (Array.isArray(res.data.chart_data)) {
            // Old structure - convert to new structure for backward compatibility
            setChartData(res.data.chart_data);
          } else {
            // New structure already
            setChartData(res.data.chart_data.time_series || []);
          }
        }
        // Only set plotUrl if chart_data is not available (backward compatibility)
        if (res.data.plot_base64 && !res.data.chart_data) {
          setPlotUrl(`data:image/png;base64,${res.data.plot_base64}`);
        } else {
          setPlotUrl(null);
        }
        localStorage.setItem(
          "demandOptimizationResponse",
          JSON.stringify(res.data)
        );
      } else {
        setError(res.data.message || "Optimization failed");
        setOpen(true);
      }

    } catch (err: any) {
      if (axios.isCancel && axios.isCancel(err)) {
        // Swallow cancellation errors
        return;
      }
      if (err.response?.data?.message) {
        setError(err.response.data.message || getServerErrorMessage(err));
      } else {
        setError(getServerErrorMessage(err));
      }
      setOpen(true);
    } finally {
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Complete progress bar
      setProgress(100);
      // Small delay to show 100% before hiding
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const summary = response?.summary;
  const displayWeather = summary?.Weather ?? mergedFormData?.weather ?? "Sunny";
  const displayProfile = summary?.Notes?.Profile_Type ?? mergedFormData?.profile_type ?? "Auto detect";
  const displayResolution = summary?.Resolution_min ?? mergedFormData?.time_resolution_minutes ?? 60;
  const displayDays = summary?.Optimization_Period_days ?? mergedFormData?.num_days ?? 1;

  const formattedBreakdown = useMemo(() => {
    if (!response?.summary?.Costs?.Breakdown) return [];
    const breakdown = response.summary.Costs.Breakdown;
    
    // Helper function to format labels (replace underscores with spaces)
    const formatLabel = (label: string) => {
      return label.replace(/_/g, ' ');
    };
    
    if (Array.isArray(breakdown)) {
      return breakdown.map((item: any) => ({
        label: formatLabel(item.label),
        value: item.value,
      }));
    }
    if (breakdown && typeof breakdown === "object") {
      return Object.entries(breakdown).map(([label, value]) => ({
        label: formatLabel(label),
        value,
      }));
    }
    return [];
  }, [response]);

  const loadBreakdown = useMemo(() => {
    if (!summary?.Load?.Per_Load_Breakdown) return [];
    return Object.entries(summary.Load.Per_Load_Breakdown).map(([loadId, data]: [string, any]) => ({
      loadId: parseInt(loadId),
      ...data
    }));
  }, [summary]);

  const keyMetrics = useMemo(() => {
    if (!summary) {
      return [
        {
          title: "Ready to Optimize",
          value: "Configure inputs",
          subtext: "Adjust parameters or upload CSV with 5 load profiles to generate results.",
          accent: "from-slate-500 to-slate-600",
          icon: Zap,
        },
        {
          title: "Weather Profile",
          value: displayWeather,
          subtext: "Impacts available solar resource and dispatch mix.",
          accent: "from-sky-500 to-cyan-500",
          icon: Sun,
        },
        {
          title: "Time Horizon",
          value: `${displayDays} day${displayDays > 1 ? "s" : ""}`,
          subtext: `${displayResolution}-minute resolution`,
          accent: "from-indigo-500 to-purple-500",
          icon: Gauge,
        },
        {
          title: "Load Profiles",
          value: "5 Loads",
          subtext: "2 Critical + 3 Curtailable",
          accent: "from-amber-500 to-orange-500",
          icon: Users,
        },
      ];
    }

    const costPerKwh = summary.Costs?.Cost_per_kWh_INR;
    const totalCO2kg = summary.Emissions?.Total_CO2_kg;
    const servedKWh = summary.Load?.Total_Served_kWh;
    const co2Intensity = servedKWh && totalCO2kg ? Number(totalCO2kg) / Number(servedKWh) : null;
    const totalCurtailed = summary.Load?.Total_Curtailed_kWh || 0;
    const totalDemand = summary.Load?.Total_Demand_kWh || 0;
    const curtailmentPercent = totalDemand > 0 ? (totalCurtailed / totalDemand) * 100 : 0;
    
    return [
      {
        title: "Total Optimized Cost",
        value: summary.Costs?.TOTAL_COST_INR != null ? `₹${formatNumber(summary.Costs.TOTAL_COST_INR, 0)}` : "-",
        subtext: costPerKwh ? `₹${formatNumber(costPerKwh, 2)} per kWh` : "Includes grid, diesel & storage costs",
        accent: "from-emerald-500 via-emerald-500 to-emerald-600",
        icon: Coins,
      },
      {
        title: "Load Served",
        value: formatPercent(summary.Load?.Served_Percent),
        subtext: `${formatKWh(summary.Load?.Total_Served_kWh)} of ${formatKWh(summary.Load?.Total_Demand_kWh)}`,
        accent: "from-blue-500 to-indigo-500",
        icon: Users,
      },
      {
        title: "Load Curtailed",
        value: formatKWh(totalCurtailed, 0),
        subtext: `${formatPercent(curtailmentPercent, 1)} of total demand`,
        accent: "from-red-500 to-pink-500",
        icon: AlertCircle,
      },
      {
        title: "Grid Imports",
        value: formatKWh(summary.Grid?.Import_kWh, 0),
        subtext: summary.Grid?.Energy_Cost_INR != null ? `₹${formatNumber(summary.Grid.Energy_Cost_INR, 0)}` : "Includes peak tariff impact",
        accent: "from-sky-500 to-blue-500",
        icon: Gauge,
      },
      {
        title: "Grid Exports",
        value: formatKWh(summary.Grid?.Export_kWh, 0),
        subtext: summary.Grid?.Export_kWh != null && summary.Grid.Export_kWh > 0 ? "Energy exported to grid" : "No exports",
        accent: "from-green-500 to-emerald-500",
        icon: ArrowUp,
      },
      {
        title: "Battery Cycling (Charging & Discharging)",
        value: `${formatKWh(summary.Battery?.Charged_kWh, 0)} / ${formatKWh(summary.Battery?.Discharged_kWh, 0)}`,
        subtext: `${formatNumber(summary.Battery?.Capacity_kWh, 0)} kWh • ${formatNumber(summary.Battery?.Voltage_V, 0)} V`,
        accent: "from-violet-500 to-purple-500",
        icon: BatteryCharging,
      },
      {
        title: "CO₂ Emissions",
        value: totalCO2kg != null ? `${formatNumber(totalCO2kg, 2)} kg` : "-",
        subtext: co2Intensity != null ? `${formatNumber(co2Intensity, 4)} kg CO₂/kWh` : "Emission intensity",
        accent: "from-teal-500 to-emerald-500",
        icon: Leaf,
      },
    ];
  }, [summary, displayWeather, displayDays, displayResolution]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 pb-12">
      <div className="rounded-3xl border border-base-200/60 bg-base-100/95 shadow-xl shadow-sky-100/30">
        <div className="space-y-8 p-7 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => navigate('/optimization-setup')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Setup
              </button>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-primary/70">
                Demand Optimization
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-base-content md:text-3xl">
                Configure Demand Optimization
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-base-content/70 md:text-[0.95rem]">
                Optimize energy demand patterns across multiple loads with priority-based curtailment. 
                Manages critical vs. flexible loads and determines optimal load serving strategy to minimize total cost.
              </p>
            </div>
            {mergedFormData && (
              <div className="grid gap-2 text-right md:text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  Configuration from Setup
                </span>
                <span className="text-base font-semibold text-base-content capitalize">
                  {mergedFormData.num_days} day{mergedFormData.num_days > 1 ? "s" : ""} • {mergedFormData.time_resolution_minutes}-minute resolution
                </span>
                <span className="text-sm text-base-content/60">
                  Weather: <span className="capitalize">{mergedFormData.weather}</span> · Profile: <span className="capitalize">{mergedFormData.profile_type}</span>
                </span>
              </div>
            )}
          </div>

          {/* Purpose and Usage Info Box */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Purpose & Usage</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>When to use:</strong> Manage energy demand across multiple loads (critical and flexible) with different priorities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>What it does:</strong> Uses MILP optimization to determine which loads to serve or curtail based on penalties, ensuring critical loads are always served</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Output:</strong> Per-load dispatch analysis, curtailment decisions, cost breakdown, and 7-subplot visualization charts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Note:</strong> Requires 5 load profiles in your data file. Loads 1-2 are critical (always served), Loads 3-5 can be curtailed based on penalties</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {!commonConfig && (
            <div className="mb-6">
              <InlineOptimizationSetup 
                onConfigReady={handleInlineConfigReady}
                compact={true}
              />
            </div>
          )}

          {/* Demand-Specific: Curtailment Penalties */}
          <div className={sectionPanelClass}>
            <h3 className="text-lg font-semibold mb-4">Curtailment Penalties (Rs/kWh)</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Set penalties for curtailing each non-critical load. Higher penalties prioritize serving that load.
              Loads 1-2 are critical (always served), while Loads 3-5 can be curtailed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={controlWrapperClass}>
                <label className="label">
                  <span className={labelClass}>Load 3 (High Priority) - Rs/kWh</span>
                </label>
                <input
                  type="number"
                  name="curtail_penalty_load3"
                  value={demandSpecificData.curtail_penalty_load3}
                  onChange={handleInputChange}
                  className={inputClass}
                  step="0.1"
                />
                <label className="label">
                  <span className="label-text-alt">Office lighting & HVAC</span>
                </label>
              </div>

              <div className={controlWrapperClass}>
                <label className="label">
                  <span className={labelClass}>Load 4 (Medium Priority) - Rs/kWh</span>
                </label>
                <input
                  type="number"
                  name="curtail_penalty_load4"
                  value={demandSpecificData.curtail_penalty_load4}
                  onChange={handleInputChange}
                  className={inputClass}
                  step="0.1"
                />
                <label className="label">
                  <span className="label-text-alt">Residential</span>
                </label>
              </div>

              <div className={controlWrapperClass}>
                <label className="label">
                  <span className={labelClass}>Load 5 (Low Priority) - Rs/kWh</span>
                </label>
                <input
                  type="number"
                  name="curtail_penalty_load5"
                  value={demandSpecificData.curtail_penalty_load5}
                  onChange={handleInputChange}
                  className={inputClass}
                  step="0.1"
                />
                <label className="label">
                  <span className="label-text-alt">EV/Flexible</span>
                </label>
              </div>
            </div>
          </div>

          {/* Display Common Configuration (Read-only) */}
          {mergedFormData && (
            <div className={sectionPanelClass}>
              <h3 className="text-lg font-semibold mb-4">Common Configuration (from Optimization Configuration)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-base-content/60">Weather:</span>
                  <span className="ml-2 font-semibold capitalize">{mergedFormData.weather}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Days:</span>
                  <span className="ml-2 font-semibold">{mergedFormData.num_days}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Resolution:</span>
                  <span className="ml-2 font-semibold">{mergedFormData.time_resolution_minutes} min</span>
                </div>
                <div>
                  <span className="text-base-content/60">Profile:</span>
                  <span className="ml-2 font-semibold capitalize">{mergedFormData.profile_type}</span>
                </div>
                <div>
                  <span className="text-base-content/60">Grid:</span>
                  <span className="ml-2 font-semibold">{mergedFormData.grid_connection} kW</span>
                </div>
                <div>
                  <span className="text-base-content/60">Solar:</span>
                  <span className="ml-2 font-semibold">{mergedFormData.solar_connection} kW</span>
                </div>
                <div>
                  <span className="text-base-content/60">Battery:</span>
                  <span className="ml-2 font-semibold">
                    {(mergedFormData.battery_capacity * mergedFormData.battery_voltage).toFixed(2)} kWh
                  </span>
                </div>
                <div>
                  <span className="text-base-content/60">Diesel:</span>
                  <span className="ml-2 font-semibold">{mergedFormData.diesel_capacity} kW</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {!mergedFormData.uploadedFile && !uploadedFile && !mergedFormData.upload_id && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Currently no data uploaded. If you want to upload,{' '}
                    <button
                      onClick={() => {
                        // Scroll to inline setup if it exists, or navigate to optimization configuration
                        const inlineSetup = document.querySelector('[data-inline-setup]');
                        if (inlineSetup) {
                          inlineSetup.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          // Try to expand it if it's collapsed
                          const expandButton = inlineSetup.querySelector('button');
                          if (expandButton) expandButton.click();
                        } else {
                          navigate('/optimization-setup', { state: { commonConfig: mergedFormData } });
                        }
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      click here
                    </button>
                  </p>
                )}
                {(mergedFormData.uploadedFile || uploadedFile || mergedFormData.upload_id) && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Custom data file uploaded: {(mergedFormData.uploadedFile || uploadedFile)?.name || savedUploadName || 'Saved upload'}
                  </p>
                )}
                <button
                  onClick={() => navigate('/optimization-setup', { state: { commonConfig: mergedFormData } })}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Edit common parameters →
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center pt-4 space-y-3">
            <button
              onClick={handleSubmit}
              className="relative btn h-12 min-h-12 rounded-2xl border-none bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-10 text-base font-semibold text-white shadow-lg shadow-indigo-300/40 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 overflow-hidden"
              disabled={loading || !mergedFormData}
            >
              {loading && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out"
                  style={{ 
                    width: `${progress}%`,
                    transition: 'width 0.3s ease-out'
                  }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Optimizing... {Math.round(progress)}%
                  </>
                ) : (
                  "Run Demand Optimization"
                )}
              </span>
            </button>
            {loading && (
              <div className="w-full max-w-md">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2">
                  Processing optimization... This may take a few moments
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {response && (
        <div className="space-y-8">
          {/* Optimization Summary - Use Recharts if chart_data is available, otherwise fallback to image */}
          {(response.chart_data || plotUrl) && (
            <div className="rounded-3xl border border-base-200/70 bg-base-100/95 shadow-xl shadow-purple-100/40">
              <div className="space-y-4 p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-purple-500/80">
                      Dispatch Charts
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-base-content md:text-2xl">
                      Demand Optimization Results Visualization
                    </h3>
                    <p className="mt-2 text-sm text-base-content/70">
                      7-subplot visualization: Power flow, costs, and per-load analysis (Loads 1-5)
                    </p>
                  </div>
                  <span className="rounded-full border border-purple-400/30 bg-purple-50 px-4 py-1 text-xs font-semibold text-purple-600">
                    {response.chart_data && typeof response.chart_data === 'object' && response.chart_data.time_series ? 'Interactive charts' : 'Multi-load analysis'}
                  </span>
                </div>
                {response.chart_data && typeof response.chart_data === 'object' && response.chart_data.time_series ? (
                  <DemandOptimizationCharts chartData={response.chart_data} theme={theme} />
                ) : plotUrl ? (
                  <div className="flex justify-center overflow-x-auto">
                    <img
                      src={plotUrl}
                      alt="Demand Optimization Results"
                      className="max-w-full rounded-2xl shadow-lg"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Per-Load Breakdown */}
          {loadBreakdown.length > 0 && (
            <div className="rounded-3xl border border-base-200/70 bg-base-100/95 shadow-xl shadow-blue-100/40">
              <div className="space-y-4 p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-blue-500/80">
                      Load Analysis
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-base-content md:text-2xl">
                      Per-Load Breakdown
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                  {loadBreakdown.map((load) => (
                    <div
                      key={load.loadId}
                      className={`rounded-2xl border p-4 shadow-inner ${
                        load.Type === "CRITICAL"
                          ? "border-red-300 bg-red-50 dark:bg-red-900/20"
                          : "border-orange-300 bg-orange-50 dark:bg-orange-900/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">Load {load.loadId}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          load.Type === "CRITICAL"
                            ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                            : "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                        }`}>
                          {load.Type}
                        </span>
                      </div>
                      <p className="text-xs text-base-content/60 mb-1">Demand</p>
                      <p className="text-lg font-semibold">{formatKWh(load.Demand_kWh)}</p>
                      <p className="text-xs text-base-content/60 mt-2 mb-1">Served</p>
                      <p className="text-base font-semibold">{formatKWh(load.Served_kWh)}</p>
                      <p className="text-xs text-green-600">{formatPercent(load.Served_Percent)}</p>
                      {load.Type === "CURTAILABLE" && (
                        <>
                          <p className="text-xs text-base-content/60 mt-2 mb-1">Curtailed</p>
                          <p className="text-base font-semibold text-red-600">{formatKWh(load.Curtailed_kWh)}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {formattedBreakdown.length > 0 && (
            <div className="rounded-3xl border border-base-200/70 bg-base-100/95 shadow-xl shadow-emerald-100/40">
              <div className="space-y-4 p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-emerald-500/80">
                      Cost Analytics
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-base-content md:text-2xl">
                      Cost Breakdown
                    </h3>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-50 px-4 py-1 text-xs font-semibold text-emerald-600">
                    {formatCurrency(summary?.Costs?.TOTAL_COST_INR)}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {formattedBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-base-200/70 bg-base-200/70 p-4 shadow-inner"
                    >
                      <p className="text-sm text-base-content/60">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold text-base-content">
                        ₹{item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white shadow-2xl ring-1 ring-white/15">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.45em] text-white/70">
                    Optimization overview
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold md:text-3xl">Demand Optimization</h3>
                  <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                    Multi-load optimization with prioritization. Critical loads (1-2) are always served,
                    while curtailable loads (3-5) can be reduced based on cost and curtailment penalties.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-right shadow-inner backdrop-blur md:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                    Current scenario
                  </p>
                  <p className="mt-1 text-lg font-semibold capitalize">
                    {response.summary.Weather} · {response.summary.Notes?.Profile_Type}
                  </p>
                  <p className="text-xs text-white/70">
                    {response.summary.Optimization_Period_days} day{response.summary.Optimization_Period_days > 1 ? "s" : ""} ·{" "}
                    {response.summary.Resolution_min}-minute resolution
                  </p>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {keyMetrics.map((metric) => {
                  const IconComponent = metric.icon;
                  return (
                    <div
                      key={metric.title}
                      className={`rounded-2xl bg-gradient-to-br ${metric.accent} p-5 shadow-lg ring-1 ring-white/20 overflow-hidden`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                            {metric.title}
                          </p>
                          <p className="mt-3 text-2xl font-semibold text-white md:text-3xl leading-tight">
                            {metric.value}
                          </p>
                          <p className="mt-2 text-sm text-white/80 break-words">{metric.subtext}</p>
                        </div>
                        <IconComponent className="h-8 w-8 shrink-0 text-white/85 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="rounded-3xl border border-base-200/70 bg-base-100/95 shadow-xl shadow-primary/10">
            <div className="space-y-4 p-6 md:p-8">
              <div>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-primary/70">
                  Narrative Summary
                </p>
                <h3 className="mt-2 text-xl font-semibold text-base-content md:text-2xl">
                  Key Insights
                </h3>
              </div>
              <div className="space-y-4">
                <div className="alert alert-info">
                  <div>
                    <h4 className="font-bold">Load Distribution</h4>
                    <p className="leading-relaxed">
                      Total demand of{" "}
                      <span className="font-semibold">
                        {response.summary.Load?.Total_Demand_kWh} kWh
                      </span>{" "}
                      was optimized across {response.summary.Optimization_Period_days} days.
                      Critical loads (1-2) were fully served, while curtailable loads (3-5)
                      had {formatKWh(response.summary.Load?.Total_Curtailed_kWh)} curtailed
                      ({formatPercent((response.summary.Load?.Total_Curtailed_kWh / response.summary.Load?.Total_Demand_kWh) * 100)} of total).
                    </p>
                  </div>
                </div>
                <div className="alert alert-success">
                  <div>
                    <h4 className="font-bold">Cost Analysis</h4>
                    <p>
                      Total optimized cost: ₹
                      {response.summary.Costs?.TOTAL_COST_INR} for{" "}
                      {response.summary.Optimization_Period_days} days with{" "}
                      {response.summary.Resolution_min}-minute resolution.
                    </p>
                    <p className="mt-2">
                      Cost of energy: ₹
                      {response.summary.Costs?.Cost_per_kWh_INR}
                    </p>
                    {response.summary.Costs?.Curtailment_Cost_INR > 0 && (
                      <p className="mt-2">
                        Curtailment penalties: ₹
                        {response.summary.Costs?.Curtailment_Cost_INR}
                      </p>
                    )}
                  </div>
                </div>
                <div className="alert alert-warning">
                  <div>
                    <h4 className="font-bold">Weather Impact</h4>
                    <p>
                      Analysis performed under{" "}
                      <span className="font-semibold">
                        {response.summary.Weather}
                      </span>{" "}
                      conditions, influencing solar generation profiles and
                      storage strategy.
                    </p>
                  </div>
                </div>
                {response.summary.Hydrogen && (
                  <div className="alert alert-accent">
                    <div>
                      <h4 className="font-bold">Hydrogen System</h4>
                      <p>
                        Electrolyzer consumed{" "}
                        {
                          response.summary.Hydrogen
                            ?.Energy_to_Electrolyzer_kWh
                        }{" "}
                        kWh and Fuel Cell generated{" "}
                        {
                          response.summary.Hydrogen
                            ?.Energy_from_Fuel_Cell_kWh
                        }{" "}
                        kWh.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default DemandOptimizationPage;

