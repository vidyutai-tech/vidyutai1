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
  price: number;
  load1_demand?: number;
  load1_served?: number;
  load1_curtailed?: number;
  load2_demand?: number;
  load2_served?: number;
  load2_curtailed?: number;
  load3_demand?: number;
  load3_served?: number;
  load3_curtailed?: number;
  load4_demand?: number;
  load4_served?: number;
  load4_curtailed?: number;
  load5_demand?: number;
  load5_served?: number;
  load5_curtailed?: number;
}

interface DemandOptimizationChartsProps {
  chartData: {
    time_series: ChartDataPoint[];
    metadata: {
      num_days: number;
      time_resolution_minutes: number;
      pv_energy_cost: number;
      battery_om_cost: number;
      fuel_cell_om_cost: number;
      electrolyzer_om_cost: number;
      critical_loads: number[];
      curtailable_loads: number[];
    };
  };
  theme?: 'light' | 'dark';
}

const DemandOptimizationCharts: React.FC<DemandOptimizationChartsProps> = ({
  chartData,
  theme = 'light'
}) => {
  const { time_series, metadata } = chartData;
  const textColor = theme === 'dark' ? '#E5E7EB' : '#374151';
  const gridColor = theme === 'dark' ? '#374151' : '#E5E7EB';
  const bgColor = theme === 'dark' ? '#1F2937' : '#FFFFFF';

  // Colors matching the Python matplotlib charts
  const colors = {
    load: '#010103',
    grid: '#0863D1',
    diesel: '#72394F',
    battery: '#8938F3',
    solar: '#6BF520',
    h2: '#17becf',
    served: '#2ca02c',
    curt: '#d62728',
    price: '#CA3510'
  };

  const formatTime = (hours: number) => {
    const days = Math.floor(hours / 24);
    const hoursInDay = hours % 24;
    if (days > 0) {
      return `Day ${days + 1}, ${Math.floor(hoursInDay)}h`;
    }
    return `${Math.floor(hoursInDay)}h`;
  };

  // Create constant cost data for chart 2
  const costData = time_series.map(point => ({
    ...point,
    pv_cost: metadata.pv_energy_cost,
    battery_om_cost: metadata.battery_om_cost,
    fuel_cell_om_cost: metadata.fuel_cell_om_cost,
    electrolyzer_om_cost: metadata.electrolyzer_om_cost
  }));

  return (
    <div className="space-y-8">
      {/* Chart 1: Power Flow from All Components */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Power Flow from All Components
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={time_series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              label={{ value: 'Power (kW)', angle: -90
                , position: 'insideLeft', offset: 5, fill: textColor }}
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
              strokeWidth={2.5}
              dot={false}
              name="Total Load Demand"
            />
            <Line
              type="monotone"
              dataKey="grid_power"
              stroke={colors.grid}
              strokeWidth={1.8}
              dot={false}
              name="Grid Power"
            />
            <Line
              type="monotone"
              dataKey="diesel_power"
              stroke={colors.diesel}
              strokeWidth={1.8}
              dot={false}
              name="Diesel Gen"
            />
            <Line
              type="monotone"
              dataKey="pv_used"
              stroke={colors.solar}
              strokeWidth={1.8}
              dot={false}
              name="Solar PV"
            />
            <Line
              type="monotone"
              dataKey="net_battery_power"
              stroke={colors.battery}
              strokeWidth={1.8}
              dot={false}
              name="Battery Power"
            />
            <Line
              type="monotone"
              dataKey="net_h2_power"
              stroke={colors.h2}
              strokeWidth={1.8}
              dot={false}
              name="Hydrogen System Power"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Energy Cost of Grid and Other Components */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Energy Cost of Grid and Other Components
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={costData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              label={{ value: 'Cost (INR/kWh)', angle: -90, position: 'insideLeft', offset: 5, fill: textColor }}
              tickFormatter={(value) => Math.round(Number(value)).toString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: bgColor,
                border: `1px solid ${gridColor}`,
                borderRadius: '8px'
              }}
              labelFormatter={(value) => `Time: ${formatTime(Number(value))}`}
              formatter={(value: number, name: string) => [Number(value).toFixed(2) + ' INR/kWh', name]}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="price"
              stroke={colors.price}
              strokeWidth={2.0}
              dot={false}
              name="Grid Price (time-varying)"
            />
            <Line
              type="monotone"
              dataKey="pv_cost"
              stroke={colors.solar}
              strokeDasharray="5 5"
              strokeWidth={1.8}
              dot={false}
              name={`PV Cost (${metadata.pv_energy_cost} INR/kWh)`}
            />
            <Line
              type="monotone"
              dataKey="battery_om_cost"
              stroke={colors.battery}
              strokeDasharray="5 5"
              strokeWidth={1.8}
              dot={false}
              name={`Battery O&M (${metadata.battery_om_cost} INR/kWh)`}
            />
            <Line
              type="monotone"
              dataKey="fuel_cell_om_cost"
              stroke={colors.h2}
              strokeDasharray="5 5"
              strokeWidth={1.8}
              dot={false}
              name={`Fuel Cell O&M (${metadata.fuel_cell_om_cost} INR/kWh)`}
            />
            <Line
              type="monotone"
              dataKey="electrolyzer_om_cost"
              stroke="#6b7280"
              strokeDasharray="5 5"
              strokeWidth={1.8}
              dot={false}
              name={`Electrolyzer O&M (${metadata.electrolyzer_om_cost} INR/kWh)`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Charts 3-7: Individual Load Charts (Loads 1-5) */}
      {[1, 2, 3, 4, 5].map((loadId) => {
        const isCritical = metadata.critical_loads.includes(loadId);
        const loadTitle = `Load ${loadId} (${isCritical ? 'Critical' : 'Curtailable'})`;
        
        return (
          <div key={loadId}>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {loadTitle}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={time_series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 5, fill: textColor }}
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
                  dataKey={`load${loadId}_demand`}
                  stroke={colors.load}
                  strokeWidth={2}
                  dot={false}
                  name={`Load ${loadId} Demand`}
                />
                <Line
                  type="monotone"
                  dataKey={`load${loadId}_served`}
                  stroke={colors.served}
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name={`Load ${loadId} Served`}
                />
                {!isCritical && (
                  <Line
                    type="monotone"
                    dataKey={`load${loadId}_curtailed`}
                    stroke={colors.curt}
                    strokeDasharray="2 2"
                    strokeWidth={2}
                    dot={false}
                    name={`Load ${loadId} Curtailed`}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};

export default DemandOptimizationCharts;

