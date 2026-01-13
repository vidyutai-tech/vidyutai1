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
  label: string; // e.g., "2026-01-11 06h"
  time: string;
  power: number;
  pv: number;
  battery: number;
  grid: number;
  isMidnight: boolean;
  dateOnly: string;
};

type InverterPoint = {
  label: string;
  time: string;
  power: number;
  efficiency: number;
  frequency: number;
};

const formatNumber = (n: number, digits = 1) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const generatePowerProfiles = (range: '7d' | '30d') => {
  const days = range === '7d' ? 7 : 30;
  const points: TimePoint[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() - d);
    const dayLabel = dayDate.toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) {
      const pvShape = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)); // 0 at 6h/18h, peak noon
      const pv = Number((pvShape * (2500 + Math.random() * 800)).toFixed(1)); // peak ~3.3 MW
      const loadBase = 1800 + Math.random() * 500; // kW
      const load = Number((loadBase + (pvShape > 0 ? 400 : 250) + Math.random() * 120).toFixed(1));
      const battery = Number(
        (h >= 6 && h <= 17 ? -Math.min(pv * 0.35, 1800) : Math.min(1600, pvShape < 0.1 ? 600 : 250)).toFixed(1)
      );
      const grid = Number((load - pv - battery).toFixed(1));
      points.push({
        label: `${dayLabel} ${h}h`,
        time: `${h}h`,
        power: load,
        pv,
        battery,
        grid,
        isMidnight: h === 0,
        dateOnly: dayLabel,
      });
    }
  }
  return points.reverse();
};

const generateInverterSeries = (name: string) => {
  const now = new Date();
  const points: InverterPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const t = new Date(now);
    t.setHours(h, 0, 0, 0);
    const loadShape = Math.max(0.4, Math.sin(((h - 6) / 12) * Math.PI));
    const power = Number((400 + loadShape * 350 + Math.random() * 60).toFixed(1)); // kW
    const efficiency = Number((94 + Math.random() * 2).toFixed(2)); // ~94-96%
    const frequency = Number((49.5 + Math.random() * 1.0).toFixed(3)); // Hz range ~49.5-50.5
    points.push({
      label: `${t.toISOString().slice(0, 10)} ${h}h`,
      time: `${h}h`,
      power,
      efficiency,
      frequency,
    });
  }
  return { name, data: points };
};

const OperationalMonitoringPage: React.FC = () => {
  const [powerData, setPowerData] = useState<TimePoint[]>(() => generatePowerProfiles('7d'));
  const [inverterSeries, setInverterSeries] = useState<{ name: string; data: InverterPoint[] }[]>(() => [
    generateInverterSeries('INV-1'),
    generateInverterSeries('INV-2'),
    generateInverterSeries('INV-3'),
  ]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d'>('7d');

  const arraysPerf = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        name: `Array ${i + 1}`,
        perf: 90 + Math.random() * 8,
      })),
    [lastUpdated]
  );

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

  // Derived energy summaries (mocked from current data)
  const totals = useMemo(() => {
    const sum = powerData.reduce(
      (acc, p) => {
        acc.load += p.power;
        acc.pv += p.pv;
        acc.battery += p.battery;
        acc.grid += p.grid;
        return acc;
      },
      { load: 0, pv: 0, battery: 0, grid: 0 }
    );
    const netImportExport = sum.grid; // + import, - export (approx)
    return {
      load: sum.load,
      pv: sum.pv,
      battery: sum.battery,
      grid: sum.grid,
      netImportExport,
    };
  }, [powerData]);

  // Mock KPIs refreshed with the same cadence
  const kpis: Kpi[] = useMemo(() => {
    // Forecasts and accumulated totals (plant scale)
    const forecastPv = 52000 + Math.random() * 8000; // kWh
    const forecastLoad = 61000 + Math.random() * 9000; // kWh
    const accumulatedPv = totals.pv;
    const accumulatedLoad = totals.load;
    return [
      { label: "Today's Forecast (PV)", value: `${formatNumber(forecastPv, 0)} kWh`, color: '#22c55e' },
      { label: "Today's Forecast (Load)", value: `${formatNumber(forecastLoad, 0)} kWh`, color: '#0ea5e9' },
      { label: "Today's Accumulated (PV)", value: `${formatNumber(accumulatedPv, 0)} kWh`, color: '#f59e0b' },
      { label: "Today's Accumulated (Load)", value: `${formatNumber(accumulatedLoad, 0)} kWh`, color: '#a855f7' },
    ];
  }, [lastUpdated, totals.pv, totals.load]);

  const energyStats = useMemo(() => {
    const avg7 = 52000 + Math.random() * 5000; // kWh
    const avg30 = 50000 + Math.random() * 8000;
    const forecastTodayPv = 52000 + Math.random() * 8000;
    const forecastTodayLoad = 61000 + Math.random() * 9000;
    const expectedLoad = totals.load;
    return { avg7, avg30, forecastTodayPv, forecastTodayLoad, expectedLoad };
  }, [totals.load, lastUpdated]);

  const gridParams = useMemo(() => {
    const vRY = 408 + Math.random() * 10;
    return [
      { label: 'Voltage R-Y', value: `${formatNumber(vRY, 0)} V` },
      { label: 'Voltage Y-B', value: `${formatNumber(vRY + 2, 0)} V` },
      { label: 'Voltage B-R', value: `${formatNumber(vRY - 1, 0)} V` },
      { label: 'Frequency', value: `${formatNumber(49.9 + Math.random() * 0.3, 2)} Hz` },
      { label: 'Grid Import/Export', value: totals.grid >= 0 ? 'Importing' : 'Exporting' },
    ];
  }, [lastUpdated, totals.grid]);

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
      setPowerData(generatePowerProfiles(selectedRange));
      setInverterSeries([
        generateInverterSeries('INV-1'),
        generateInverterSeries('INV-2'),
        generateInverterSeries('INV-3'),
      ]);
      setLastUpdated(new Date());
    };
    refresh();
    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [selectedRange]);

  const chartColors = {
    load: '#010103',
    grid: '#0863D1',
    battery: '#8938F3',
    solar: '#6BF520',
  };

  // Limit X-axis tick dates to keep it readable (max ~6-7 labels)
  const allowedDates = useMemo(() => {
    const midnights = powerData.filter((p) => p.isMidnight);
    const uniqueDates = Array.from(new Set(midnights.map((p) => p.dateOnly)));
    if (uniqueDates.length <= 7) return new Set(uniqueDates);
    const target = 6;
    const step = Math.max(1, Math.ceil(uniqueDates.length / target));
    const picked: string[] = [];
    for (let i = 0; i < uniqueDates.length; i += step) {
      picked.push(uniqueDates[i]);
    }
    if (picked[picked.length - 1] !== uniqueDates[uniqueDates.length - 1]) {
      picked.push(uniqueDates[uniqueDates.length - 1]);
    }
    return new Set(picked);
  }, [powerData]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Solar Plant Energy Monitoring Dashboard</h2>
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

      {/* Second row: Yesterday & Avg 7d */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Yesterday's Energy</h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <li><strong>PV:</strong> {formatNumber(52000 + Math.random() * 5000, 0)} kWh</li>
            <li><strong>Load:</strong> {formatNumber(61000 + Math.random() * 6000, 0)} kWh</li>
            <li><strong>Grid Import:</strong> {formatNumber(15000 + Math.random() * 4000, 0)} kWh</li>
            <li><strong>Grid Export:</strong> {formatNumber(6000 + Math.random() * 2000, 0)} kWh</li>
            <li><strong>Battery Charge:</strong> {formatNumber(8000 + Math.random() * 2000, 0)} kWh</li>
            <li><strong>Battery Discharge:</strong> {formatNumber(8200 + Math.random() * 2000, 0)} kWh</li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 dark_border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Avg Last 7 Days' Energy</h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <li><strong>PV:</strong> {formatNumber(50000 + Math.random() * 4000, 0)} kWh</li>
            <li><strong>Load:</strong> {formatNumber(59000 + Math.random() * 5000, 0)} kWh</li>
            <li><strong>Grid Import:</strong> {formatNumber(14000 + Math.random() * 3000, 0)} kWh</li>
            <li><strong>Grid Export:</strong> {formatNumber(5500 + Math.random() * 1500, 0)} kWh</li>
            <li><strong>Battery Charge:</strong> {formatNumber(7600 + Math.random() * 1800, 0)} kWh</li>
            <li><strong>Battery Discharge:</strong> {formatNumber(7900 + Math.random() * 1800, 0)} kWh</li>
          </ul>
        </div>
      </div>

      {/* Third row: trend and forecast card */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Realtime power profile of different components</h3>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as '7d' | '30d')}
              className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={powerData} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={0}
                tickFormatter={(v, idx) => {
                  const point = powerData[idx];
                  if (!point) return '';
                  if (point.isMidnight && allowedDates.has(point.dateOnly)) {
                    return point.dateOnly;
                  }
                  return '';
                }}
              />
              <YAxis label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 10 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="pv" stackId="1" stroke={chartColors.solar} fill={chartColors.solar} fillOpacity={0.2} name="Solar PV (kW)" />
              <Area type="monotone" dataKey="battery" stackId="1" stroke={chartColors.battery} fill={chartColors.battery} fillOpacity={0.15} name="Battery (kW, +discharge/-charge)" />
              <Line type="monotone" dataKey="grid" stroke={chartColors.grid} strokeWidth={2.4} dot={false} name="Grid (kW, +import/-export)" />
              <Line type="monotone" dataKey="power" stroke={chartColors.load} strokeWidth={2.8} dot={false} name="Total Load (kW)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Today's Forecasted Power</h4>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p><strong>PV:</strong> {formatNumber(energyStats.forecastTodayPv, 0)} kW</p>
            <p><strong>Load:</strong> {formatNumber(energyStats.forecastTodayLoad, 0)} kW</p>
          </div>
        </div>
      </div>

      {/* Mid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Solar Array Performance</h4>
          <div className="space-y-3">
            {arraysPerf.map((arr) => (
              <div key={arr.name}>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>{arr.name}</span>
                  <span>{formatNumber(arr.perf, 1)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded">
                  <div
                    className="h-2 rounded"
                    style={{ width: `${arr.perf}%`, backgroundColor: '#22c55e' }}
                  />
                </div>
              </div>
            ))}
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
            <div className="text-sm text-gray-700 dark:text-gray-200">
              Grid is currently <strong>{totals.grid >= 0 ? 'Importing' : 'Exporting'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Inverter historical charts (one per row) */}
      {inverterSeries.map((series) => {
        const latest = series.data[series.data.length - 1];
        return (
          <div key={series.name} className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
            <div className="xl:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">{series.name} – Power / Efficiency / Frequency</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">Past 24h</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={series.data} margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    tickFormatter={(v, idx) => {
                      const point = series.data[idx];
                      if (!point) return '';
                      if (point.time === '0h') {
                        return point.label.split(' ')[0];
                      }
                      return '';
                    }}
                  />
                  <YAxis yAxisId="left" label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Eff / Freq', angle: 90, position: 'insideRight', offset: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="power" stroke="#0ea5e9" strokeWidth={2.2} dot={false} name="Power (kW)" />
                  <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2} dot={false} name="Efficiency (%)" />
                  <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#f97316" strokeWidth={2} dot={false} name="Frequency (Hz)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Current ({latest?.label || '--'})</h5>
              <div className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                <p><strong>Power Output:</strong> {latest ? formatNumber(latest.power, 1) : '--'} kW</p>
                <p><strong>Efficiency:</strong> {latest ? formatNumber(latest.efficiency, 2) : '--'} %</p>
                <p><strong>Frequency:</strong> {latest ? formatNumber(latest.frequency, 3) : '--'} Hz</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* System Alerts */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">System Alarms & Alerts</h4>
        <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
          {(() => {
            const low = arraysPerf.reduce(
              (acc, cur) => (cur.perf < acc.perf ? cur : acc),
              arraysPerf[0]
            );
            const lowItems = arraysPerf.filter((a) => a.perf < 95);
            return (
              <>
                <li className="flex items-start">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
                  {lowItems.length > 0
                    ? `${lowItems[0].name} Performance Low (${formatNumber(lowItems[0].perf, 1)}%) — Investigate soiling/IV curve`
                    : `${low.name} Performance OK (${formatNumber(low.perf, 1)}%)`}
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 mr-2" />
                  Battery SOC OK — No thermal or voltage alarms
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
                  Scheduled Maintenance Due — Next PM in {24 + Math.floor(Math.random() * 48)} hours
                </li>
              </>
            );
          })()}
        </ul>
      </div>
    </div>
  );
};

export default OperationalMonitoringPage;
