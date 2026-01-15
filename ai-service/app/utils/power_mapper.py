from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional

import pandas as pd


def slice_hours(df: pd.DataFrame, hours: int) -> pd.DataFrame:
    """Return the last N hours of data (or empty frame)."""
    if df.empty:
        return pd.DataFrame()
    return df.tail(hours).reset_index(drop=True)


def _has(row: pd.Series, name: str) -> bool:
    return name in row and pd.notnull(row[name])


def remap_time(df: pd.DataFrame, end_time: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """
    Remap rows into frontend-friendly time series with a shifted timeline ending 'now'.
    Handles both residential and plant sheets with normalized column names.
    """
    if df.empty:
        return []

    # Use fixed local timezone so frontend sees consistent solar hours in production
    now = end_time or datetime.now(ZoneInfo("Asia/Kolkata"))
    total = len(df)
    out: List[Dict[str, Any]] = []

    for i, row in df.iterrows():
        t = now - timedelta(hours=(total - 1 - i))

        # Common normalized column names after excel_loader normalization
        pv = (
            float(row["pv_used_kw"])
            if _has(row, "pv_used_kw")
            else float(row["pv_kw"])
            if _has(row, "pv_kw")
            else float(row["pv"])
            if _has(row, "pv")
            else 0.0
        )

        load = (
            float(row["load_demand_kw"])
            if _has(row, "load_demand_kw")
            else float(row["load_kw"])
            if _has(row, "load_kw")
            else float(row["load"])
            if _has(row, "load")
            else 0.0
        )

        # Battery: prefer explicit power (+discharge/-charge); else discharge - charge
        if _has(row, "battery_power_discharging_charging_kw"):
            battery = float(row["battery_power_discharging_charging_kw"])
        else:
            discharge = float(row["discharge_power_kw"]) if _has(row, "discharge_power_kw") else float(row["battery_discharge_kw"]) if _has(row, "battery_discharge_kw") else 0.0
            charge = float(row["charge_power_kw"]) if _has(row, "charge_power_kw") else float(row["battery_charge_kw"]) if _has(row, "battery_charge_kw") else 0.0
            battery = discharge - charge

        # Grid: prefer grid_power; else import-export; else balance equation
        if _has(row, "grid_power_kw"):
            grid = float(row["grid_power_kw"])
        else:
            grid_import = float(row["grid_import_kw"]) if _has(row, "grid_import_kw") else 0.0
            grid_export = float(row["grid_export_kw"]) if _has(row, "grid_export_kw") else 0.0
            if grid_import or grid_export:
                grid = grid_import - grid_export
            else:
                grid = load - pv - battery

        out.append(
            {
                "label": f"{t.strftime('%Y-%m-%d')} {t.hour}h",
                "time": f"{t.hour}h",
                "dateOnly": t.strftime("%Y-%m-%d"),
                "isMidnight": t.hour == 0,
                "pv": pv,
                "load": load,
                "battery": battery,
                "grid": grid,
            }
        )

    return out
