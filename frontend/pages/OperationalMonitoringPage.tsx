import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar
} from 'recharts';

type Kpi = {
  label: string;
  value: string;
  sublabel?: string;
  color: string;
};

type Gauge = {
  label: string;
  value: number;
  suffix?: string;
  color: string;
  sublabel?: string;
};

type TimePoint = {
  time: string;
  power: number;
  pv: number;
  battery: number;
  grid: number;
};

type InverterPoint = {
  name: string;
  power: number;
  efficiency: number;
  temp: number;
};

const formatNumber = (n: number, digits = 1) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const generatePowerProfile = () => {
  const points: TimePoint[] = [];
  for (let h = 0; h < 24; h++) {
    const pvShape = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)); // 0 at 6h/18h, peak noon
    const pv = Math.round(pvShape * (800 + Math.random() * 400));
    const loadBase = 200 + Math.random() * 100;
    const load = loadBase + (pvShape > 0 ? 150 : 80) + Math.random() * 50;
    const battery = h >= 6 && h <= 17 ? -Math.min(pv * 0.6, 1200) : Math.min(1000, (pvShape < 0.1 ? 350 : 100));
    const grid = load - pv - battery;
    points.push({
      time: `${h}h`,
      power: Math.round(load),
      pv: Math.round(pv),
      battery: Math.round(battery),
      grid: Math.round(grid),
    });
  }
  return points;
};

const generateInverterData = () => {
  const inv: InverterPoint[] = [];
  for (let i = 1; i <= 6; i++) {
    inv.push({
      name: `INV-${i}`,
      power: Math.round(120 + Math.random() * 40),
      efficiency: Math.round(96 + Math.random() * 2),
      temp: Math.round(38 + Math.random() * 12),
    });
  }
  return inv;
};

const OperationalMonitoringPage: React.FC = () => {
  const [powerData, setPowerData] = useState<TimePoint[]>(() => generatePowerProfile());
  const [inverterData, setInverterData] = useState<InverterPoint[]>(() => generateInverterData());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock KPIs refreshed with the same cadence
  const kpis: Kpi[] = useMemo(() => {
    const currentPower = 750 + Math.random() * 250;
    const dailyEnergy = 4500 + Math.random() * 2200;
    const efficiency = 92 + Math.random() * 4;
    const availability = 97 + Math.random() * 2;
    return [
      { label: 'Current Power', value: `${formatNumber(currentPower, 1)} kW`, color: '#22c55e' },
      { label: "Today's Energy", value: `${formatNumber(dailyEnergy, 1)} kWh`, color: '#0ea5e9' },
      { label: 'System Efficiency', value: `${formatNumber(efficiency, 1)}%`, color: '#f59e0b' },
      { label: 'Plant Availability', value: `${formatNumber(availability, 1)}%`, color: '#a855f7' },
    ];
  }, [lastUpdated]);

  const batteryGauge: Gauge = useMemo(() => {
    const soc = 55 + Math.random() * 25;
    const charge = 50 + Math.random() * 80;
    return {
      label: 'Battery SOC',
      value: Math.round(soc),
      suffix: '%',
      color: '#10b981',
      sublabel: `Charging: ${formatNumber(charge, 0)} kW`,
    };
  }, [lastUpdated]);

  const gridParams = useMemo(() => {
    const vRY = 408 + Math.random() * 10;
    return [
      { label: 'Voltage R-Y', value: `${formatNumber(vRY, 0)} V` },
      { label: 'Voltage Y-B', value: `${formatNumber(vRY + 2, 0)} V` },
      { label: 'Voltage B-R', value: `${formatNumber(vRY - 1, 0)} V` },
      { label: 'Frequency', value: `${formatNumber(49.9 + Math.random() * 0.3, 2)} Hz` },
    ];
  }, [lastUpdated]);

  const envParams = useMemo(() => {
    return [
      { label: 'Irradiance', value: `${formatNumber(850 + Math.random() * 80, 0)} W/m²` },
      { label: 'Ambient Temp', value: `${formatNumber(30 + Math.random() * 5, 1)} °C` },
      { label: 'Module Temp', value: `${formatNumber(45 + Math.random() * 8, 1)} °C` },
      { label: 'Wind Speed', value: `${formatNumber(2.5 + Math.random() * 1.5, 1)} m/s` },
      { label: 'Humidity', value: `${formatNumber(40 + Math.random() * 15, 0)} %` },
    ];
  }, [lastUpdated]);

  // Refresh mock data every 15 minutes (and on mount)
  useEffect(() => {
    const refresh = () => {
      setPowerData(generatePowerProfile());
      setInverterData(generateInverterData());
      setLastUpdated(new Date());
    };
    refresh();
    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const chartColors = {
    load: '#010103',
    grid: '#0863D1',
    battery: '#8938F3',
    solar: '#6BF520',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Operational Monitoring Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => setLastUpdated(new Date())}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700"
        >
          Refresh Now
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            {kpi.sublabel && <p className="text-xs text-gray-500 mt-1">{kpi.sublabel}</p>}
          </div>
        ))}
      </div>

      {/* Power profile and battery gauge */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Real-Time Power Generation Profile</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={powerData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 10 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="pv" stackId="1" stroke={chartColors.solar} fill={chartColors.solar} fillOpacity={0.2} name="Solar PV" />
              <Area type="monotone" dataKey="battery" stackId="1" stroke={chartColors.battery} fill={chartColors.battery} fillOpacity={0.15} name="Battery Power" />
              <Line type="monotone" dataKey="grid" stroke={chartColors.grid} strokeWidth={2.4} dot={false} name="Grid Power" />
              <Line type="monotone" dataKey="power" stroke={chartColors.load} strokeWidth={2.8} dot={false} name="Total Load Demand" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Battery Energy Storage</h3>
          <div className="relative w-full h-36 flex items-center justify-center">
            <div className="w-64 h-6 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${batteryGauge.value}%`, backgroundColor: batteryGauge.color }}
              />
            </div>
          </div>
          <p className="text-3xl font-semibold mt-4 text-gray-900 dark:text-white">
            {batteryGauge.value}
            {batteryGauge.suffix}
          </p>
          {batteryGauge.sublabel && <p className="text-sm text-gray-500 mt-1">{batteryGauge.sublabel}</p>}
        </div>
      </div>

      {/* Mid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Solar Array Performance</h4>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => {
              const perf = 90 + Math.random() * 8;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>Array {i}</span>
                    <span>{formatNumber(perf, 1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded">
                    <div
                      className="h-2 rounded"
                      style={{ width: `${perf}%`, backgroundColor: '#22c55e' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Environmental Conditions</h4>
          <div className="space-y-2">
            {envParams.map((item) => (
              <div key={item.label} className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
                <span>{item.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Grid Parameters</h4>
          <div className="space-y-2">
            {gridParams.map((item) => (
              <div key={item.label} className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
                <span>{item.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Power Distribution</p>
            <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-200">
              <span className="inline-flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                Grid Export ~28%
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                Direct Load ~57%
              </span>
              <span className="inline-flex items-center">
                <span className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                Battery Charging ~15%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Inverter status and alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Inverter Status & Performance</h4>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={inverterData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 0 }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Efficiency / Temp', angle: 90, position: 'insideRight', offset: 0 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="power" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Power (kW)" />
              <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2} dot={false} name="Efficiency (%)" />
              <Line yAxisId="right" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} dot={false} name="Temp (°C)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">System Alarms & Alerts</h4>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
              Array 4 Performance Low — Investigate soiling/IV curve
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 mr-2" />
              Grid Sync Normal — All phases within ±1.5%
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 mr-2" />
              Battery System OK — No thermal or voltage alarms
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
              Scheduled Maintenance Due — Inverters PM in 48 hours
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OperationalMonitoringPage;
