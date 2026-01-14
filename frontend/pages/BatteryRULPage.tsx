import React, { useState, useEffect, useMemo } from 'react';
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
  const [batteryCapacity, setBatteryCapacity] = useState<number>(100); // kWh
  const [dailyUsage, setDailyUsage] = useState<number>(50); // kWh/day

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

  // Convert hours to years (1 year = 8760 hours)
  const hoursToYears = (hours: number): number => {
    return hours / 8760;
  };

  // Calculate battery cycles based on capacity and daily usage
  // A battery cycle is one complete charge and discharge
  // Typically, we consider depth of discharge (DOD) - assume 80% DOD for lithium batteries
  const calculateCycles = (days: number): number => {
    if (batteryCapacity <= 0 || dailyUsage <= 0) return 0;
    const depthOfDischarge = 0.8; // 80% DOD (standard for lithium batteries)
    const usableCapacity = batteryCapacity * depthOfDischarge;
    
    // Cycles per day = daily usage / usable capacity per cycle
    // Cap at 2 cycles per day maximum (realistic limit)
    const cyclesPerDay = Math.min(dailyUsage / usableCapacity, 2);
    
    return cyclesPerDay * days;
  };

  // Generate cycles vs time data - create clean yearly data points with smooth curve
  const cyclesVsTimeData = useMemo(() => {
    if (batteryCapacity <= 0 || dailyUsage <= 0) return [];
    
    // Calculate cycles per day
    const depthOfDischarge = 0.8;
    const usableCapacity = batteryCapacity * depthOfDischarge;
    const cyclesPerDay = Math.min(dailyUsage / usableCapacity, 2);
    
    // Generate data points for up to 5 years, with quarterly granularity for smooth curve
    const dataPoints = [];
    const maxYears = 5;
    const pointsPerYear = 4; // Quarterly data points for smooth line
    
    for (let i = 0; i <= maxYears * pointsPerYear; i++) {
      const year = i / pointsPerYear;
      const days = year * 365;
      const cycles = cyclesPerDay * days;
      
      dataPoints.push({
        time_days: Math.round(days),
        time_years: Math.round(year * 100) / 100, // Round to 2 decimals for year
        cycles: Math.round(cycles * 100) / 100, // Round to 2 decimals
      });
    }
    
    return dataPoints;
  }, [batteryCapacity, dailyUsage]);

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
                        tickFormatter={(value) => Number(value).toFixed(2)}
                      />
                      <YAxis 
                        label={{ value: 'RUL (years)', angle: -90, position: 'insideLeft', offset: 0 }}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => Number(value).toFixed(2)}
                      />
                      <Tooltip 
                        content={({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const rulYears = hoursToYears(data.rul_hours);
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                                <p className="font-semibold text-gray-900 dark:text-white">Cycle: {formatNumber(Number(label))}</p>
                                <p style={{ color: payload[0].color }} className="text-sm">
                                  RUL: {formatNumber(rulYears, 2)} years ({formatNumber(data.rul_hours, 0)} hours)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Area 
                        type="monotone" 
                        dataKey={(item: any) => hoursToYears(item.rul_hours)}
                        name="Remaining Useful Life (years)"
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
                      ±{formatNumber(hoursToYears(batteryData.model_info.mae), 2)} years
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Training Samples</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">5,000</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Battery Configuration */}
            <Card className="mt-6">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Battery Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Battery Installed Capacity (kWh)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={batteryCapacity}
                      onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 100)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Daily Battery Usage (kWh/day)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={dailyUsage}
                      onChange={(e) => setDailyUsage(parseFloat(e.target.value) || 50)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                {batteryCapacity > 0 && dailyUsage > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Cycles per Day</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(calculateCycles(1), 3)} cycles/day
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Based on {dailyUsage} kWh/day usage from {batteryCapacity} kWh capacity (80% depth of discharge)
                    </p>
                    {dailyUsage > batteryCapacity * 0.8 * 2 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ Note: Daily usage exceeds realistic battery cycling (max ~2 cycles/day). Consider increasing battery capacity.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Cycles vs Time Chart */}
            {cyclesVsTimeData.length > 0 && (
              <Card className="mt-6">
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Battery Cycles vs Time
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Calculated cycles based on installed capacity and daily usage over time
                  </p>
                  
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cyclesVsTimeData}>
                        <defs>
                          <linearGradient id="colorCycles" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="time_years" 
                          type="number"
                          label={{ value: 'Time (years)', position: 'insideBottom', offset: -5 }}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const year = Number(value);
                            // Only show labels for whole years (within 0.25 tolerance)
                            const roundedYear = Math.round(year);
                            if (Math.abs(year - roundedYear) < 0.25) {
                              return roundedYear === 0 ? '0' : `Year ${roundedYear}`;
                            }
                            return '';
                          }}
                          domain={[0, 5]}
                          allowDecimals={false}
                        />
                        <YAxis 
                          label={{ value: 'Battery Cycles', angle: -90, position: 'insideLeft', offset: 0 }}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => Math.round(Number(value)).toString()}
                          domain={[0, 'auto']}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          content={({ active, payload, label }: any) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    Time: {formatNumber(Number(label), 2)} years ({formatNumber(data.time_days, 0)} days)
                                  </p>
                                  <p style={{ color: payload[0].color }} className="text-sm">
                                    Cycles: {formatNumber(data.cycles, 2)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Area 
                          type="monotone" 
                          dataKey="cycles" 
                          name="Battery Cycles"
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          fill="url(#colorCycles)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

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
                  {batteryCapacity > 0 && dailyUsage > 0 && (
                    <p>• At current usage rate ({formatNumber(calculateCycles(1), 2)} cycles/day), battery will complete {formatNumber(calculateCycles(365), 0)} cycles per year</p>
                  )}
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

