import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';

interface ChartDataPoint {
  time_hours: number;
  load_demand: number;
  grid_power: number;
  diesel_power: number;
  pv_used: number;
  net_battery_power: number;
  net_h2_power: number;
  battery_soc: number;
  h2_soc: number;
  price: number;
}

interface SourceOptimizationChartsProps {
  chartData: {
    time_series: ChartDataPoint[];
    metadata: {
      num_days: number;
      time_resolution_minutes: number;
      bess_min_soc_percent: number;
      bess_max_soc_percent: number;
      h2_min_soc_percent: number;
      h2_max_soc_percent: number;
    };
  };
  theme?: 'light' | 'dark';
}

const SourceOptimizationCharts: React.FC<SourceOptimizationChartsProps> = ({
  chartData,
  theme = 'light'
}) => {
  const { time_series, metadata } = chartData;
  const textColor = theme === 'dark' ? '#E5E7EB' : '#374151';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';
  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';

  // Dark, high-contrast palette for easy differentiation
  const colors = {
    load: '#1F2937',
    grid: '#2563EB',
    diesel: '#DC2626',
    battery: '#7C3AED',
    solar: '#F97316',
    h2: '#059669',
    price: '#92400e'
  };

  const formatTime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const hoursInDay = hours % 24;
    if (days > 0) {
      return `Day ${days + 1}, ${Math.floor(hoursInDay)}:${String(Math.floor((hoursInDay % 1) * 60)).padStart(2, '0')}`;
    }
    return `${Math.floor(hoursInDay)}:${String(Math.floor((hoursInDay % 1) * 60)).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Chart 1: Power Dispatch Strategy */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Optimal Power Dispatch Strategy ({metadata.num_days} Day{metadata.num_days > 1 ? 's' : ''}, {metadata.time_resolution_minutes}-min resolution)
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={time_series} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="time_hours"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickFormatter={formatTime}
              label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5, fill: textColor }}
            />
            <YAxis
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 0, dx: -10, fill: textColor }}
              tickFormatter={(value) => Math.round(Number(value)).toString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: bgColor,
                border: `1px solid ${gridColor}`,
                borderRadius: '8px'
              }}
              labelFormatter={(value) => `Time: ${formatTime(Number(value))}`}
              formatter={(value: number, name: string) => [Number(value).toFixed(2) + ' kW', name]}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="load_demand"
              stroke={colors.load}
              strokeWidth={3}
              dot={false}
              name="Load Demand"
            />
            <Line
              type="monotone"
              dataKey="grid_power"
              stroke={colors.grid}
              strokeWidth={2.5}
              dot={false}
              name="Grid Power"
            />
            <Line
              type="monotone"
              dataKey="diesel_power"
              stroke={colors.diesel}
              strokeWidth={2.5}
              dot={false}
              name="Diesel Gen"
            />
            <Line
              type="monotone"
              dataKey="pv_used"
              stroke={colors.solar}
              strokeWidth={2.5}
              dot={false}
              name="Solar PV"
            />
            <Line
              type="monotone"
              dataKey="net_battery_power"
              stroke={colors.battery}
              strokeWidth={2.5}
              dot={false}
              name="Battery Power"
            />
            <Line
              type="monotone"
              dataKey="net_h2_power"
              stroke={colors.h2}
              strokeWidth={2.5}
              dot={false}
              name="Hydrogen Sys Power"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

     
    </div>
  );
};

export default SourceOptimizationCharts;

