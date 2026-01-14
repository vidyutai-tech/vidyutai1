import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Loader } from 'lucide-react';
import Card from '../components/ui/Card';
import ActionableInsights from '../components/shared/ActionableInsights';
import { getSolarDegradationDashboard } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SolarDegradationPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [solarYears, setSolarYears] = useState(26);
  const [solarData, setSolarData] = useState<any>(null);

  useEffect(() => {
    loadSolarData();
  }, []);

  const loadSolarData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getSolarDegradationDashboard();
      setSolarData(data);
    } catch (err: any) {
      console.error('Solar Degradation error:', err);
      setError(err.message || 'Failed to load Solar Degradation data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) {
      return 'N/A';
    }
    return num.toLocaleString('en-IN', { maximumFractionDigits: decimals });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatNumber(entry?.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
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
            Solar Degradation Prediction
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Panel performance decline forecast using Gradient Boosting model
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-12 h-12 animate-spin text-amber-600" />
          </div>
        )}

        {!loading && solarData && (
          <>
            {/* Main Visualization */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Solar Panel Degradation Analysis
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Performance decline prediction over panel lifetime
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Forecast Horizon
                      </label>
                      <select
                        value={solarYears}
                        onChange={(e) => setSolarYears(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={6}>5 years</option>
                        <option value={11}>10 years</option>
                        <option value={16}>15 years</option>
                        <option value={21}>20 years</option>
                        <option value={26}>25 years</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Model Accuracy</p>
                      <p className="text-2xl font-bold text-amber-600">
                        R² = {solarData.model_info?.r2 !== undefined && solarData.model_info?.r2 !== null && !isNaN(solarData.model_info.r2)
                          ? ((solarData.model_info.r2) * 100).toFixed(1)
                          : 'N/A'}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={solarData.predictions?.slice(0, solarYears) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="age_years" 
                        label={{ value: 'Age (Years)', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => Number(value).toFixed(2)}
                      />
                      <YAxis 
                        label={{ value: 'Efficiency (%)', angle: -90, position: 'insideLeft', offset: 10 }}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => Number(value).toFixed(2)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency_current" 
                        name="Panel Efficiency"
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Model Type</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">Gradient Boosting</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mean Error</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {solarData.model_info?.mae !== undefined && solarData.model_info?.mae !== null && !isNaN(solarData.model_info.mae)
                        ? `±${formatNumber(solarData.model_info.mae, 3)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Training Samples</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">3,000</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Key Insights */}
            <Card className="mt-6">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Key Insights
                </h3>
                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                  <p>• Solar panels degrade naturally over time due to environmental exposure</p>
                  <p>• Dust accumulation can reduce efficiency by up to 15%</p>
                  <p>• High temperatures accelerate performance decline</p>
                  <p>• Regular cleaning and maintenance optimize long-term performance</p>
                  <p>• Expected lifetime: 25-30 years with 80% efficiency retention</p>
                </div>
              </div>
            </Card>

            {/* Actionable Insights - Isolated for Solar Degradation */}
            <div className="mt-6">
              <ActionableInsights 
                key="solar-degradation-insights"
                context="predictions" 
                predictionData={{
                  battery: null,
                  solar: solarData,
                  loss: null
                }}
                predictionSubType="solar"
                compact={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SolarDegradationPage;

