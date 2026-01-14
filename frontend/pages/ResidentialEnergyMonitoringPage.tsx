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
  Legend
} from 'recharts';

type Kpi = {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
};

type Gauge = {
  label: string;
  value: number;
  suffix?: string;
  color: string;
  sublabel?: string;
};

type TimePoint = {
  label: string;   // e.g., "2026-01-11 06h"
  load: number;    // kW
  pv: number;      // kW
  battery: number; // kW (+ discharge, - charge)
  grid: number;    // kW (+ import, - export)
  isMidnight: boolean;
  dateOnly: string; // "2026-01-11"
};

const formatNumber = (n: number, digits = 1) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const getPowerApiBase = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1';
  }
  // Prefer dedicated AI service base; fall back to general API if explicitly set.
  const raw =
    import.meta.env.VITE_AI_SERVICE_BASE_URL ||
    import.meta.env.VITE_AI_BASE_URL || // documented in ENV_VARIABLES_CHECKLIST.md
    import.meta.env.VITE_API_BASE_URL ||
    '/api/v1';

  const trimmed = raw.replace(/\/$/, '');
  // Ensure we always target an /api/v1 base even if the provided env omits it.
  const hasApiVersion = /\/api\/v\d+$/i.test(trimmed);
  return hasApiVersion ? trimmed : `${trimmed}/api/v1`;
};

const ResidentialEnergyMonitoringPage: React.FC = () => {
  const [powerData, setPowerData] = useState<TimePoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedRange, setSelectedRange] = useState<'yesterday' | '7d' | '30d'>('7d');
  const arraysPerf = useMemo(
    () =>
      Array.from({ length: 2 }, (_, i) => ({
        name: `String ${i + 1}`,
        perf: 90 + Math.random() * 7,
      })),
    [lastUpdated]
  );

  // Aggregates (assuming hourly points -> kWh when summed)
  const totals = useMemo(() => {
    const sum = powerData.reduce(
      (acc, p) => {
        acc.load += p.load;
        acc.pv += p.pv;
        acc.batteryCharge += p.battery < 0 ? -p.battery : 0;
        acc.batteryDischarge += p.battery > 0 ? p.battery : 0;
        acc.gridImport += p.grid > 0 ? p.grid : 0;
        acc.gridExport += p.grid < 0 ? -p.grid : 0;
        return acc;
      },
      { load: 0, pv: 0, batteryCharge: 0, batteryDischarge: 0, gridImport: 0, gridExport: 0 }
    );
    return sum;
  }, [powerData]);

  const kpis: Kpi[] = useMemo(() => {
    // Seeded daily baseline to keep forecasts stable for the day
    const todayStr = new Date().toISOString().slice(0, 10);
    const seededDaily = (seed: string, min: number, spread: number) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
      }
      const rand = Math.abs(Math.sin(hash));
      return min + rand * spread;
    };

    // Accumulation only for today up to current hour
    const now = new Date();
    const currentHour = now.getHours();
    const todaysPoints = powerData.filter((p) => {
      if (p.dateOnly !== todayStr) return false;
      const hourStr = p.label.split(' ')[1]?.replace('h', '');
      const hourNum = parseInt(hourStr, 10);
      if (Number.isNaN(hourNum)) return false;
      return hourNum <= currentHour;
    });

    const accumulatedPvRaw = todaysPoints.reduce((s, p) => s + p.pv, 0);
    const accumulatedLoadRaw = todaysPoints.reduce((s, p) => s + p.load, 0);

    // Forecasts stable per day, but not below current accumulated
    const forecastPv = Math.max(seededDaily(todayStr, 14, 3), accumulatedPvRaw * 1.2);
    const forecastLoad = Math.max(seededDaily(`${todayStr}-load`, 16, 3), accumulatedLoadRaw * 1.15);

    // Safety clamp: accumulated cannot exceed forecast
    const accumulatedPv = Math.min(accumulatedPvRaw, forecastPv);
    const accumulatedLoad = Math.min(accumulatedLoadRaw, forecastLoad);

    return [
      { label: "Today's Forecast (PV)", value: `${formatNumber(forecastPv, 1)} kWh`, color: '#22c55e' },
      { label: "Today's Forecast (Load)", value: `${formatNumber(forecastLoad, 1)} kWh`, color: '#0ea5e9' },
      { label: "Today's Accumulated (PV)", value: `${formatNumber(accumulatedPv, 1)} kWh`, color: '#f59e0b' },
      { label: "Today's Accumulated (Load)", value: `${formatNumber(accumulatedLoad, 1)} kWh`, color: '#a855f7' },
    ];
  }, [powerData]);

  const energyStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const seededDaily = (seed: string, min: number, spread: number) => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
      }
      const rand = Math.abs(Math.sin(hash));
      return min + rand * spread;
    };

    const now = new Date();
    const currentHour = now.getHours();
    const todaysPoints = powerData.filter((p) => {
      if (p.dateOnly !== todayStr) return false;
      const hourStr = p.label.split(' ')[1]?.replace('h', '');
      const hourNum = parseInt(hourStr, 10);
      if (Number.isNaN(hourNum)) return false;
      return hourNum <= currentHour;
    });

    const accumulatedPvRaw = todaysPoints.reduce((s, p) => s + p.pv, 0);
    const accumulatedLoadRaw = todaysPoints.reduce((s, p) => s + p.load, 0);

    const forecastTodayPv = Math.max(seededDaily(todayStr, 14, 3), accumulatedPvRaw * 1.2);
    const forecastTodayLoad = Math.max(seededDaily(`${todayStr}-load`, 16, 3), accumulatedLoadRaw * 1.15);

    const expectedLoad = totals.load;
    const avg7 = 14 + Math.random() * 2;
    const avg30 = 13 + Math.random() * 3;
    return { avg7, avg30, forecastTodayPv, forecastTodayLoad, expectedLoad };
  }, [powerData, totals.load, lastUpdated]);

  const batteryGauge: Gauge = useMemo(() => {
    const soc = 50 + Math.random() * 35;
    const charge = 0.5 + Math.random() * 0.8;
    return {
      label: 'Battery SOC',
      value: Math.round(soc),
      suffix: '%',
      color: '#10b981',
      sublabel: `Charging: ${formatNumber(charge, 1)} kW`,
    };
  }, [lastUpdated]);

  const gridParams = useMemo(() => {
    const voltage = 228 + Math.random() * 8;
    return [
      { label: 'Voltage (L-N)', value: `${formatNumber(voltage, 0)} V` },
      { label: 'Frequency', value: `${formatNumber(49.9 + Math.random() * 0.3, 2)} Hz` },
      { label: 'Grid Import', value: `${formatNumber(totals.gridImport, 1)} kWh` },
      { label: 'Grid Export', value: `${formatNumber(totals.gridExport, 1)} kWh` },
    ];
  }, [lastUpdated, totals.gridImport, totals.gridExport]);

  const envParams = useMemo(() => {
    return [
      { label: 'Irradiance', value: `${formatNumber(780 + Math.random() * 120, 0)} W/m²` },
      { label: 'Ambient Temp', value: `${formatNumber(29 + Math.random() * 4, 1)} °C` },
      { label: 'Module Temp', value: `${formatNumber(42 + Math.random() * 7, 1)} °C` },
      { label: 'Wind Speed', value: `${formatNumber(1.5 + Math.random() * 1.2, 1)} m/s` },
      { label: 'Humidity', value: `${formatNumber(45 + Math.random() * 15, 0)} %` },
    ];
  }, [lastUpdated]);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`${getPowerApiBase()}/mock/power/residential?range=${selectedRange}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        const normalized: TimePoint[] = data.map((p: any) => ({
          label: String(p.label ?? ''),
          load: Number(p.load ?? 0),
          pv: Number(p.pv ?? 0),
          battery: Number(p.battery ?? 0),
          grid: Number(p.grid ?? 0),
          isMidnight: Boolean(p.isMidnight),
          dateOnly: String(p.dateOnly ?? (p.label ?? '').split(' ')[0] ?? ''),
        }));
        setPowerData(normalized);
        setLastUpdated(new Date());
      } catch (e) {
        console.error('Failed to load residential power data', e);
      }
    };
    refresh();
    const id = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [selectedRange]);

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
    // Ensure last date is shown
    if (picked[picked.length - 1] !== uniqueDates[uniqueDates.length - 1]) {
      picked.push(uniqueDates[uniqueDates.length - 1]);
    }
    return new Set(picked);
  }, [powerData]);

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
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Residential Energy Monitoring Dashboard</h2>
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
            <li><strong>PV:</strong> {formatNumber(11 + Math.random() * 3, 1)} kWh</li>
            <li><strong>Load:</strong> {formatNumber(13 + Math.random() * 3, 1)} kWh</li>
            <li><strong>Grid Import:</strong> {formatNumber(4 + Math.random() * 2, 1)} kWh</li>
            <li><strong>Grid Export:</strong> {formatNumber(2 + Math.random() * 1.5, 1)} kWh</li>
            <li><strong>Battery Charge:</strong> {formatNumber(3 + Math.random() * 1.5, 1)} kWh</li>
            <li><strong>Battery Discharge:</strong> {formatNumber(3.5 + Math.random() * 1.5, 1)} kWh</li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Avg Last 7 Days' Energy</h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
            <li><strong>PV:</strong> {formatNumber(12 + Math.random() * 2, 1)} kWh</li>
            <li><strong>Load:</strong> {formatNumber(14 + Math.random() * 2, 1)} kWh</li>
            <li><strong>Grid Import:</strong> {formatNumber(4.5 + Math.random() * 1.5, 1)} kWh</li>
            <li><strong>Grid Export:</strong> {formatNumber(1.5 + Math.random() * 1.0, 1)} kWh</li>
            <li><strong>Battery Charge:</strong> {formatNumber(3.2 + Math.random() * 1.2, 1)} kWh</li>
            <li><strong>Battery Discharge:</strong> {formatNumber(3.8 + Math.random() * 1.2, 1)} kWh</li>
          </ul>
        </div>
      </div>

      {/* Third row: trend chart full width */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Realtime power profile of different components</h3>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as 'yesterday' | '7d' | '30d')}
              className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1"
            >
              <option value="yesterday">Yesterday (24h)</option>
              <option value="7d">Last 7 days (raw)</option>
              <option value="30d">Last 30 days (raw)</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={powerData} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
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
              <Line type="monotone" dataKey="pv" stroke={chartColors.solar} strokeWidth={2.4} dot={false} name="Solar PV (kW)" />
              <Line type="monotone" dataKey="battery" stroke={chartColors.battery} strokeWidth={2.4} dot={false} name="Battery (kW, +discharge/-charge)" />
              <Line type="monotone" dataKey="grid" stroke={chartColors.grid} strokeWidth={2.4} dot={false} name="Grid (kW, +import/-export)" />
              <Line type="monotone" dataKey="load" stroke={chartColors.load} strokeWidth={2.4} dot={false} name="Total Load (kW)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

     

      {/* Fourth row: PV, Env, Grid, Battery */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">PV Performance</h4>
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
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex flex-col items-center justify-center">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Battery Energy Storage</h4>
          <div className="w-full h-6 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${batteryGauge.value}%`, backgroundColor: '#10b981' }}
            />
          </div>
          <p className="text-2xl font-semibold mt-3 text-gray-900 dark:text-white">
            {batteryGauge.value}
            {batteryGauge.suffix}
          </p>
          {batteryGauge.sublabel && <p className="text-sm text-gray-500 mt-1">{batteryGauge.sublabel}</p>}
        </div>
      </div>

      {/* Fifth row: Inverter + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">Inverter Status & Performance</h4>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <p><strong>Inverter:</strong> Residential Hybrid INV-1</p>
            <p><strong>Status:</strong> Online — Operating nominally</p>
            <p><strong>Power Output:</strong> {formatNumber(1.8 + Math.random() * 0.6, 2)} kW</p>
            <p><strong>Efficiency:</strong> {formatNumber(96 + Math.random() * 2, 1)}%</p>
            <p><strong>Frequency:</strong> {formatNumber(49.9 + Math.random() * 0.3, 2)} Hz</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <h4 className="text-md font-semibold mb-3 text-gray-900 dark:text-white">System Alarms & Alerts</h4>
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
              {(() => {
                const lowItems = arraysPerf.filter((a) => a.perf < 95);
                if (lowItems.length > 0) {
                  return `${lowItems[0].name} Performance Low (${formatNumber(lowItems[0].perf, 1)}%) — Investigate cleaning`;
                }
                const low = arraysPerf.reduce((acc, cur) => (cur.perf < acc.perf ? cur : acc), arraysPerf[0]);
                return `${low.name} Performance OK (${formatNumber(low.perf, 1)}%)`;
              })()}
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
              Suggested: Clean panels within 3 days for optimal yield
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 mr-2" />
              Battery SOC OK — no alerts
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-2" />
              Maintenance due in {24 + Math.floor(Math.random() * 48)} hours
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResidentialEnergyMonitoringPage;
