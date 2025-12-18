import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Battery, Loader } from 'lucide-react';
import Card from '../components/ui/Card';
import ActionableInsights from '../components/shared/ActionableInsights';
import { getBatteryRULDashboard } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BatteryRULPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [batteryCycles, setBatteryCycles] = useState(50);
  const [batteryData, setBatteryData] = useState<any>(null);

  useEffect(() => {
    loadBatteryData();
  }, []);

  const loadBatteryData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getBatteryRULDashboard();
      setBatteryData(data);
    } catch (err: any) {
      console.error('Battery RUL error:', err);
      setError(err.message || 'Failed to load Battery RUL data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-IN', { maximumFractionDigits: decimals });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatNumber(entry.value)}
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
            Battery RUL Prediction
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Remaining Useful Life prediction using Random Forest algorithm
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && batteryData && (
          <>
            {/* Main Visualization */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Battery Remaining Useful Life Prediction
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Predicting battery health degradation over usage cycles
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Data Points
                      </label>
                      <select
                        value={batteryCycles}
                        onChange={(e) => setBatteryCycles(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={20}>20 points</option>
                        <option value={50}>50 points</option>
                        <option value={100}>100 points</option>
                      </select>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Model Accuracy</p>
                      <p className="text-2xl font-bold text-green-600">
                        R² = {(batteryData.model_info.r2 * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={batteryData.predictions.slice(0, batteryCycles)}>
                      <defs>
                        <linearGradient id="colorRUL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="cycle_count" 
                        label={{ value: 'Charge/Discharge Cycles', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ value: 'RUL (hours)', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="rul_hours" 
                        name="Remaining Useful Life"
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fill="url(#colorRUL)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Model Type</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">Random Forest</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mean Error</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ±{formatNumber(batteryData.model_info.mae)} hours
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Training Samples</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">5,000</p>
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
                  <p>• Battery RUL decreases with usage cycles, temperature exposure, and age</p>
                  <p>• Maintaining optimal temperature (20-30°C) extends battery life significantly</p>
                  <p>• High discharge rates accelerate degradation</p>
                  <p>• Regular monitoring helps predict replacement needs and prevent failures</p>
                </div>
              </div>
            </Card>

            {/* Actionable Insights - Isolated for Battery RUL */}
            <div className="mt-6">
              <ActionableInsights 
                key="battery-rul-insights"
                context="predictions" 
                predictionData={{
                  battery: batteryData,
                  solar: null,
                  loss: null
                }}
                predictionSubType="battery"
                compact={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatteryRULPage;

