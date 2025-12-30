import React, { useState, useEffect, useContext } from 'react';
import { ChevronDown, ChevronUp, Settings, CheckCircle } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { getLoadProfiles, getPlanningRecommendations } from '../../services/api';
import Card from '../ui/Card';

interface OptimizationConfig {
  weather: string;
  num_days: number;
  time_resolution_minutes: number;
  profile_type: string;
  grid_connection: number;
  solar_connection: number;
  battery_capacity: number;
  battery_voltage: number;
  diesel_capacity: number;
  storage_type: string;
  phes_capacity: number;
  electrolyzer_capacity: number;
  fuel_cell_capacity: number;
  h2_tank_capacity: number;
  fuel_cell_efficiency_percent: number;
  fuel_price: number;
  pv_energy_cost: number;
  battery_om_cost: number;
  fuel_cell_om_cost: number;
  electrolyzer_om_cost: number;
  uploadedFile: File | null;
}

interface InlineOptimizationSetupProps {
  onConfigReady: (config: OptimizationConfig) => void;
  compact?: boolean;
}

const InlineOptimizationSetup: React.FC<InlineOptimizationSetupProps> = ({ 
  onConfigReady, 
  compact = false 
}) => {
  const { selectedSite } = useContext(AppContext)!;
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [loadProfiles, setLoadProfiles] = useState<any[]>([]);
  const [planningRecommendations, setPlanningRecommendations] = useState<any[]>([]);
  const [selectedLoadProfile, setSelectedLoadProfile] = useState<string>('');
  const [selectedPlanningRecommendation, setSelectedPlanningRecommendation] = useState<string>('');

  // Load saved config from localStorage or use defaults
  const getDefaultConfig = (): OptimizationConfig => ({
    weather: 'Sunny',
    num_days: 1,
    time_resolution_minutes: 60,
    profile_type: 'Auto detect',
    grid_connection: 2500,
    solar_connection: 2000,
    battery_capacity: 4000000,
    battery_voltage: 100,
    diesel_capacity: 2200,
    storage_type: 'battery',
    phes_capacity: 10000,
    electrolyzer_capacity: 1000.0,
    fuel_cell_capacity: 1000.0,
    h2_tank_capacity: 100.0,
    fuel_cell_efficiency_percent: 0.60,
    fuel_price: 90,
    pv_energy_cost: 2.85,
    battery_om_cost: 6.085,
    fuel_cell_om_cost: 1.5,
    electrolyzer_om_cost: 0.5,
    uploadedFile: null,
  });

  const [formData, setFormData] = useState<OptimizationConfig>(() => {
    const saved = localStorage.getItem('optimizationConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...getDefaultConfig(), ...parsed, uploadedFile: null };
      } catch {
        return getDefaultConfig();
      }
    }
    return getDefaultConfig();
  });

  // Initialize with saved/default config on mount
  useEffect(() => {
    onConfigReady(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [profiles, recommendations] = await Promise.all([
          getLoadProfiles(selectedSite?.id),
          getPlanningRecommendations(selectedSite?.id)
        ]);
        setLoadProfiles(profiles || []);
        setPlanningRecommendations(recommendations || []);
      } catch (err: any) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [selectedSite]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newData = {
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    };
    setFormData(newData);
    localStorage.setItem('optimizationConfig', JSON.stringify(newData));
    onConfigReady(newData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newData = { ...formData, uploadedFile: file };
      setFormData(newData);
      // Note: File can't be stored in localStorage, but we'll pass it to parent
      onConfigReady(newData);
    }
  };

  const handleApply = () => {
    // Validate
    if (formData.num_days < 1 || formData.num_days > 30) {
      setError('Number of days must be between 1 and 30');
      return;
    }
    
    const validResolutions = [15, 30, 60];
    if (!validResolutions.includes(formData.time_resolution_minutes)) {
      setError('Time resolution must be 15, 30, or 60 minutes');
      return;
    }

    setError('');
    localStorage.setItem('optimizationConfig', JSON.stringify(formData));
    onConfigReady(formData);
    if (compact) {
      setIsExpanded(false);
    }
  };

  const controlWrapperClass = "form-control space-y-2";
  const labelClass = "label-text text-sm font-medium text-base-content/70 mb-1.5";
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm";
  const selectClass = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm";
  const fileInputClass = "file-input w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20";

  return (
    <Card>
      <div className="p-4" data-inline-setup>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {compact ? 'Quick Setup' : 'Optimization Configuration'}
              </h3>
              {!isExpanded && formData && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formData.num_days} day{formData.num_days > 1 ? 's' : ''} • {formData.time_resolution_minutes}-min • {formData.weather}
                </p>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Basic Parameters - Compact Grid */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Parameters</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Weather</span>
                  </label>
                  <select
                    name="weather"
                    value={formData.weather}
                    onChange={handleInputChange}
                    className={selectClass}
                  >
                    <option value="Sunny">Sunny</option>
                    <option value="Cloudy">Cloudy</option>
                    <option value="Rainy">Rainy</option>
                  </select>
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Days</span>
                  </label>
                  <input
                    type="number"
                    name="num_days"
                    value={formData.num_days}
                    onChange={handleInputChange}
                    className={inputClass}
                    min="1"
                    max="30"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Resolution (min)</span>
                  </label>
                  <select
                    name="time_resolution_minutes"
                    value={formData.time_resolution_minutes}
                    onChange={handleInputChange}
                    className={selectClass}
                  >
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="60">60</option>
                  </select>
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Profile</span>
                  </label>
                  <select
                    name="profile_type"
                    value={formData.profile_type}
                    onChange={handleInputChange}
                    className={selectClass}
                  >
                    <option value="Auto detect">Auto</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* System Configuration - Compact Grid */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">System Configuration</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Grid (kW)</span>
                  </label>
                  <input
                    type="number"
                    name="grid_connection"
                    value={formData.grid_connection}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="100"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Solar (kW)</span>
                  </label>
                  <input
                    type="number"
                    name="solar_connection"
                    value={formData.solar_connection}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="100"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Battery (kWh)</span>
                  </label>
                  <input
                    type="number"
                    name="battery_capacity"
                    value={formData.battery_capacity / 1000}
                    onChange={(e) => {
                      const newData = {
                        ...formData,
                        battery_capacity: (parseFloat(e.target.value) || 0) * 1000
                      };
                      setFormData(newData);
                      localStorage.setItem('optimizationConfig', JSON.stringify(newData));
                      onConfigReady(newData);
                    }}
                    className={inputClass}
                    step="100"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Diesel (kW)</span>
                  </label>
                  <input
                    type="number"
                    name="diesel_capacity"
                    value={formData.diesel_capacity}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="100"
                  />
                </div>
              </div>
            </div>

            {/* Cost Parameters - Compact Grid */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cost Parameters</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Fuel Price (₹/L)</span>
                  </label>
                  <input
                    type="number"
                    name="fuel_price"
                    value={formData.fuel_price}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="1"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>PV Cost (₹/kWh)</span>
                  </label>
                  <input
                    type="number"
                    name="pv_energy_cost"
                    value={formData.pv_energy_cost}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="0.1"
                  />
                </div>

                <div className={controlWrapperClass}>
                  <label className="label">
                    <span className={labelClass}>Battery OM (₹/kWh)</span>
                  </label>
                  <input
                    type="number"
                    name="battery_om_cost"
                    value={formData.battery_om_cost}
                    onChange={handleInputChange}
                    className={inputClass}
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className={controlWrapperClass}>
              <label className="label">
                <span className={labelClass}>Load Data File (CSV) - Optional</span>
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className={fileInputClass}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload custom load profile data. If not provided, default profiles will be used.
              </p>
            </div>

            {/* Apply Button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configuration is saved automatically
              </p>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Apply Configuration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default InlineOptimizationSetup;

