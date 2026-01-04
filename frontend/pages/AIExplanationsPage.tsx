import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, BarChart3, TrendingUp, Info, Loader, Zap, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ModelInfo {
  model_key: string;
  model_type: string;
  model_algorithm: string;
  features: string[];
  metrics: {
    r2: number;
    mae: number;
    rmse: number;
  };
  xai_support: {
    feature_importance: boolean;
    local_explanation: boolean;
    global_interpretability: boolean;
  };
}

interface FeatureImportance {
  feature: string;
  importance: number;
  importance_percent: number;
}

interface LocalExplanation {
  prediction: number;
  input_features: Record<string, number>;
  top_contributors: Array<{
    feature: string;
    contribution: number;
    importance: number;
    input_value: number;
  }>;
  explanation: string;
}

const AIExplanationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);
  const [localExplanation, setLocalExplanation] = useState<LocalExplanation | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'local'>('global');
  const [error, setError] = useState<string>('');

  // Use the same API base URL logic as other pages
  // For localhost, use absolute URL to backend (port 5001)
  // For production, use environment variable or relative path
  const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api/v1'  // Direct connection to backend
    : (import.meta.env.VITE_API_BASE_URL || '/api/v1');

  useEffect(() => {
    // Only load if we have a valid API URL
    if (API_BASE_URL) {
      loadAvailableModels();
    } else {
      setError('API base URL not configured. Please check your environment variables.');
    }
  }, []);

  useEffect(() => {
    if (selectedModel && activeTab === 'global') {
      loadFeatureImportance(selectedModel);
    }
  }, [selectedModel, activeTab]);

  const loadAvailableModels = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('jwt');
      const url = `${API_BASE_URL}/xai/models`;
      console.log('🔍 Fetching XAI models from:', url);
      console.log('🔍 API_BASE_URL:', API_BASE_URL);
      console.log('🔍 Full URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        // Try to get error message from JSON response
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        } else {
          // Non-JSON error response (likely HTML error page)
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 500));
          throw new Error(`Server error ${response.status}: ${response.statusText}. The endpoint may not be available or authentication failed.`);
        }
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response: ${contentType}`);
      }
      
      const data = await response.json();
      setModels(data.available_models || []);
      
      if (data.available_models && data.available_models.length > 0) {
        setSelectedModel(data.available_models[0].model_type);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load available models');
      console.error('Error loading models:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFeatureImportance = async (modelType: string) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${API_BASE_URL}/xai/feature-importance/${modelType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        // Try to get error message from JSON response
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        } else {
          // Non-JSON error response (likely HTML error page)
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 500));
          throw new Error(`Server error ${response.status}: ${response.statusText}. The endpoint may not be available or authentication failed.`);
        }
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response: ${contentType}`);
      }
      
      const data = await response.json();
      setFeatureImportance(data.feature_importance || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load feature importance');
      console.error('Error loading feature importance:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateLocalExplanation = async (modelType: string, sampleInput: Record<string, number>) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${API_BASE_URL}/xai/local-explanation/${modelType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sampleInput)
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        // Try to get error message from JSON response
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
        } else {
          // Non-JSON error response (likely HTML error page)
          const text = await response.text();
          console.error('Non-JSON error response:', text.substring(0, 500));
          throw new Error(`Server error ${response.status}: ${response.statusText}. The endpoint may not be available or authentication failed.`);
        }
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response: ${contentType}`);
      }
      
      const data = await response.json();
      setLocalExplanation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate local explanation');
      console.error('Error generating local explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLocalExplanation = () => {
    if (!selectedModel) return;
    
    const model = models.find(m => m.model_type === selectedModel);
    if (!model) return;

    // Generate sample input based on model type
    let sampleInput: Record<string, number> = {};
    
    if (selectedModel === 'battery-rul') {
      sampleInput = {
        cycle_count: 500,
        temperature_c: 25,
        voltage_v: 48,
        current_a: 20,
        soc_percent: 75,
        discharge_rate: 0.5,
        charge_rate: 0.5,
        age_days: 365
      };
    } else if (selectedModel === 'solar-degradation') {
      sampleInput = {
        age_years: 5,
        irradiance_wm2: 800,
        temperature_c: 35,
        dust_index: 30,
        humidity_percent: 60,
        tilt_angle_deg: 20,
        efficiency_initial: 18
      };
    } else if (selectedModel === 'energy-loss') {
      sampleInput = {
        load_kw: 200,
        voltage_v: 415,
        current_a: 300,
        power_factor: 0.9,
        cable_length_m: 200,
        transformer_load_percent: 75,
        ambient_temp_c: 30,
        frequency_hz: 50
      };
    }
    
    generateLocalExplanation(selectedModel, sampleInput);
  };

  const formatFeatureName = (name: string): string => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'];

  const selectedModelInfo = models.find(m => m.model_type === selectedModel);

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/ai-ml-insights')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to AI/ML Insights
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            AI Interpretations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Understand how AI models make decisions using Explainable AI (XAI) techniques
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Model Selection */}
        {models.length > 0 && (
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Model for Interpretation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((model) => (
                  <button
                    key={model.model_type}
                    onClick={() => setSelectedModel(model.model_type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedModel === model.model_type
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {formatFeatureName(model.model_type)}
                      </h4>
                      {model.xai_support.feature_importance && (
                        <Zap className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {model.model_algorithm}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      R²: {(model.metrics.r2 * 100).toFixed(1)}%
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        {selectedModel && (
          <div className="mb-6">
            <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setActiveTab('global');
                  setLocalExplanation(null);
                }}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'global'
                    ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-5 h-5 inline mr-2" />
                Global Interpretability
              </button>
              <button
                onClick={() => setActiveTab('local')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'local'
                    ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Brain className="w-5 h-5 inline mr-2" />
                Local Explanation
              </button>
            </div>
          </div>
        )}

        {/* Global Interpretability */}
        {activeTab === 'global' && selectedModel && (
          <div className="space-y-6">
            {loading ? (
              <Card>
                <div className="p-12 text-center">
                  <Loader className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading feature importance...</p>
                </div>
              </Card>
            ) : featureImportance.length > 0 ? (
              <>
                <Card>
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Global Feature Importance
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      This shows which features are most important for the model's predictions overall. 
                      Higher importance means the feature has more influence on predictions across all cases.
                    </p>
                    
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={featureImportance.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="feature" 
                          tickFormatter={formatFeatureName}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                        />
                        <Legend />
                        <Bar dataKey="importance" fill="#f97316" name="Importance" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Top Features
                      </h4>
                      <div className="space-y-3">
                        {featureImportance.slice(0, 5).map((item, index) => (
                          <div key={item.feature} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div 
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {formatFeatureName(item.feature)}
                              </span>
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {item.importance_percent.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card>
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                        Model Information
                      </h4>
                      {selectedModelInfo && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Algorithm:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {selectedModelInfo.model_algorithm}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">R² Score:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {(selectedModelInfo.metrics.r2 * 100).toFixed(2)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">MAE:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {selectedModelInfo.metrics.mae.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Features:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {selectedModelInfo.features.length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <div className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No feature importance data available. Please select a model.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Local Explanation */}
        {activeTab === 'local' && selectedModel && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Local Explanation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Understand which features contributed most to a specific prediction. 
                  This helps explain why the model made a particular decision for a given input.
                </p>
                <button
                  onClick={handleGenerateLocalExplanation}
                  disabled={loading}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Generate Explanation
                    </>
                  )}
                </button>
              </div>
            </Card>

            {localExplanation && (
              <>
                <Card>
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Prediction Explanation
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                      <p className="text-gray-800 dark:text-gray-200">
                        <strong>Prediction:</strong> {localExplanation.prediction.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {localExplanation.explanation}
                      </p>
                    </div>

                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                      Top Contributing Features
                    </h5>
                    <div className="space-y-3">
                      {localExplanation.top_contributors.map((contributor, index) => (
                        <div key={contributor.feature} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatFeatureName(contributor.feature)}
                            </span>
                            <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                              {Math.abs(contributor.contribution * 100).toFixed(1)}% contribution
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Input Value: {contributor.input_value.toFixed(2)}</span>
                            <span>Importance: {(contributor.importance * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${Math.abs(contributor.contribution * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Input Features
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(localExplanation.input_features).map(([feature, value]) => (
                        <div key={feature} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                            {formatFeatureName(feature)}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6">
          <div className="p-6">
            <div className="flex items-start">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  About XAI Interpretations
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>Global Interpretability:</strong> Shows which features are most important 
                    for the model's predictions across all cases. This helps understand the model's 
                    overall decision-making strategy.
                  </p>
                  <p>
                    <strong>Local Explanation:</strong> Explains why the model made a specific prediction 
                    for a given input. This helps understand individual decisions and builds trust in the model.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                    These interpretations use feature importance from tree-based models (Random Forest, 
                    Gradient Boosting) to provide meaningful insights into AI decision-making.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIExplanationsPage;
