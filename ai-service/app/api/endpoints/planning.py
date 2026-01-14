# ai-service/app/api/endpoints/planning.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
# Matplotlib removed - using JSON plot data instead to reduce memory usage
import numpy as np

from app.api.deps import get_current_user, get_current_user_optional
from app.models import pydantic_models as models

router = APIRouter()


# Request/Response Models
class PlanningRequest(BaseModel):
    load_profile_id: Optional[str] = "default"  # Optional, can be passed or use default
    total_daily_energy_kwh: Optional[float] = None  # Can be passed directly (this is Total_energy_consumption from Flask code)
    preferred_sources: Optional[List[str]] = ["solar", "battery"]  # e.g., ["solar", "battery", "grid"]
    primary_goal: Optional[str] = "savings"  # "savings", "self_sustainability", "reliability", "carbon_reduction"
    allow_diesel: bool = False


# NOTE: The previous structured models and helper calculations are unused now
# because the Flask-style response is generated directly by
# calculate_planning_response_flask_style. They are removed to reduce noise.


def calculate_planning_response_flask_style(total_daily_energy_kwh: float) -> Dict[str, Any]:
    """
    Re-implementation of the original Flask solar-battery-calculation logic.
    Matches calculations and response fields; plots are returned as JSON data instead of images.
    """
    # Inputs / constants
    Total_energy_consumption = total_daily_energy_kwh
    daily_solar_insolation = 5.02
    one_hour_outage_solar_insolation = 4.6
    two_hour_outage_solar_insolation = 4.2
    three_hour_outage_solar_insolation = 3.8

    local_load = Total_energy_consumption / 24
    battery_nominal_voltage = 12

    # Split day/night
    day_time_energy = Total_energy_consumption * (7.03 / 13.01)
    night_time_energy = Total_energy_consumption * (1 - 7.03 / 13.01)

    # Efficiencies
    n_module = 0.97
    n_temperature = 0.89
    n_dust = 0.95
    n_inverter = 0.9
    n_dcdc = 0.95
    n_charging = 0.9
    n_discharging = 0.9
    n_battery_roundtrip = n_charging * n_discharging
    battery_dod = 0.8

    n_panel = n_module * n_temperature * n_dust
    n_panel = 1  # explicit override in source snippet

    # PV sizing
    pv_energy_gen = (day_time_energy / (n_panel * n_inverter * n_dcdc)) + (
        night_time_energy / (n_panel * n_inverter * n_dcdc * n_battery_roundtrip)
    )
    pv_peak_power = pv_energy_gen / daily_solar_insolation

    # Battery sizing
    battery_energy = night_time_energy / (n_panel * n_inverter * n_dcdc * n_battery_roundtrip * battery_dod)
    battery_capacity = battery_energy / battery_nominal_voltage  # kAh

    # Inverter / DC-DC
    inverter_rating = pv_peak_power * 1.25
    dcdc_sizing = inverter_rating

    # Economics
    annual_interest_rate = 0.1
    pv_cost_perkW = 17846400 / 594.92
    pv_cost = pv_cost_perkW * pv_peak_power

    battery_cost_per_kWh = 17720000 / (177.2 * 12)
    battery_cost = battery_cost_per_kWh * battery_energy

    inverter_cost_per_kVA = 5949200 / 743.65
    inverter_cost = inverter_cost_per_kVA * inverter_rating

    dcdc_cost_per_kW = 991650 / 743.65
    dcdc_cost = dcdc_cost_per_kW * dcdc_sizing

    Installation_cost_dual_mode = 0.1 * (pv_cost + battery_cost)
    Installation_cost_on_grid = 0.1 * pv_cost

    annual_om_cost_dual_mode = 0.03 * (pv_cost + battery_cost)
    annual_om_cost_on_grid = 0.03 * pv_cost

    add_cap_inv_dual_mode_per_kVA = 1984000 / 743.65
    add_cap_inv_dual_mode = add_cap_inv_dual_mode_per_kVA * inverter_rating

    add_sc_inv_dual_mode_per_kVA = 2976000 / 743.65
    add_sc_inv_dual_mode = add_sc_inv_dual_mode_per_kVA * inverter_rating

    add_cap_inv_on_grid_per_kVA = 992000 / 743.65
    add_cap_inv_on_grid = add_cap_inv_on_grid_per_kVA * inverter_rating

    add_sc_inv_on_grid_per_kVA = 1388000 / 743.65
    add_sc_inv_on_grid = add_sc_inv_on_grid_per_kVA * inverter_rating

    add_cap_bat_dual_mode_per_kWh = 119000 / (12 * 177.2)
    add_cap_bat_dual_mode = add_cap_bat_dual_mode_per_kWh * battery_capacity

    add_sc_bat_dual_mode_per_kWh = 138800 / (12 * 177.2)
    add_sc_bat_dual_mode = add_sc_bat_dual_mode_per_kWh * battery_capacity

    capital_cost_dual_mode = pv_cost + battery_cost + inverter_cost + dcdc_cost + Installation_cost_dual_mode
    capital_cost_on_grid = pv_cost + inverter_cost + Installation_cost_on_grid

    annual_cost_on_grid = capital_cost_on_grid * annual_interest_rate + annual_om_cost_on_grid
    annual_cost_dual_mode = capital_cost_dual_mode * annual_interest_rate + annual_om_cost_dual_mode

    # Energy generation and cost
    T_on = 365 * pv_peak_power * daily_solar_insolation * n_panel * n_inverter
    cost_energy_on_grid = annual_cost_on_grid / T_on

    T_dual = 365 * pv_peak_power * daily_solar_insolation * n_panel * n_inverter * n_dcdc
    cost_energy_dual_mode = annual_cost_dual_mode / T_dual

    annual_revenue_on_grid = T_on * 8
    annual_revenue_dual_mode = T_dual * 8

    # Outage scenarios - on-grid
    T_on_onehour = 365 * pv_peak_power * one_hour_outage_solar_insolation * n_panel * n_inverter
    T_on_twohour = 365 * pv_peak_power * two_hour_outage_solar_insolation * n_panel * n_inverter
    T_on_threehour = 365 * pv_peak_power * three_hour_outage_solar_insolation * n_panel * n_inverter

    cost_energy_on_grid_onehour = annual_cost_on_grid / T_on_onehour
    cost_energy_on_grid_twohour = annual_cost_on_grid / T_on_twohour
    cost_energy_on_grid_threehour = annual_cost_on_grid / T_on_threehour

    T_on_night = 365 * pv_peak_power * daily_solar_insolation * n_panel * n_inverter
    cost_energy_on_grid_night = annual_cost_on_grid / T_on_night

    # Outage scenarios - dual mode (day)
    T_dual_onehour = 365 * (
        (daily_solar_insolation * local_load)
        + (pv_peak_power - (local_load / (n_dcdc * n_inverter)))
        * one_hour_outage_solar_insolation
        * n_inverter
        * n_dcdc
    )
    T_dual_twohour = 365 * (
        (daily_solar_insolation * local_load * n_panel)
        + (pv_peak_power * n_panel - (local_load / (n_dcdc * n_inverter * n_panel)))
        * two_hour_outage_solar_insolation
        * n_inverter
        * n_dcdc
    )
    T_dual_threehour = 365 * (
        (daily_solar_insolation * local_load * n_panel)
        + (pv_peak_power * n_panel - (local_load / (n_dcdc * n_inverter * n_panel)))
        * three_hour_outage_solar_insolation
        * n_inverter
        * n_dcdc
    )

    AS_one_hour = local_load * 365 * 1 * 29
    AS_two_hour = local_load * 365 * 2 * 29
    AS_three_hour = local_load * 365 * 3 * 29

    cost_energy_dual_mode_onehour = (annual_cost_dual_mode - AS_one_hour) / T_dual_onehour
    cost_energy_dual_mode_twohour = (annual_cost_dual_mode - AS_two_hour) / T_dual_twohour
    cost_energy_dual_mode_threehour = (annual_cost_dual_mode - AS_three_hour) / T_dual_threehour

    # Outage scenarios - dual mode (night)
    T_dual_night_onehour = 365 * (
        local_load * (daily_solar_insolation * n_panel + 1)
        + daily_solar_insolation * n_dcdc * n_inverter * (pv_peak_power * n_panel - (local_load / (n_dcdc * n_inverter * n_panel)))
    )
    T_dual_night_twohour = 365 * (
        local_load * n_panel * (daily_solar_insolation + 2)
        + daily_solar_insolation * n_dcdc * n_inverter * (pv_peak_power * n_panel - (local_load / (n_dcdc * n_inverter * n_panel)))
    )
    T_dual_night_threehour = 365 * (
        local_load * n_panel * (daily_solar_insolation + 3)
        + daily_solar_insolation * n_dcdc * n_inverter * (pv_peak_power * n_panel - (local_load / (n_dcdc * n_inverter * n_panel)))
    )

    Annual_battery_cost_onehour = local_load * 365 * 1 * 8
    Annual_battery_cost_twohour = local_load * 365 * 2 * 8
    Annual_battery_cost_threehour = local_load * 365 * 3 * 8

    cost_energy_dual_mode_night_onehour = (annual_cost_dual_mode + Annual_battery_cost_onehour - AS_one_hour) / T_dual_night_onehour
    cost_energy_dual_mode_night_twohour = (annual_cost_dual_mode + Annual_battery_cost_twohour - AS_two_hour) / T_dual_night_twohour
    cost_energy_dual_mode_night_threehour = (annual_cost_dual_mode + Annual_battery_cost_threehour - AS_three_hour) / T_dual_night_threehour

    # Simple payback
    Simple_payback_dual_mode = capital_cost_dual_mode / (annual_revenue_dual_mode - annual_om_cost_dual_mode)
    Simple_payback_on_grid = capital_cost_on_grid / (annual_revenue_on_grid - annual_om_cost_on_grid)

    # Carbon emission (Ton)
    Carbon_emmission_dual_mode = T_dual * 0.8 * 30 / 1000
    Carbon_emmission_on_grid = T_on * 0.8 * 30 / 1000

    # Plot data (JSON, not images)
    capital_cost_plot_data = {
        "type": "bar",
        "title": "Capital Cost Comparison of Dual Mode and On-Grid Systems",
        "xLabel": "System Type",
        "yLabel": "Capital Cost (Cr)",
        "data": [
            {"name": "Dual Mode System", "value": capital_cost_dual_mode / 1e7},
            {"name": "On-Grid System", "value": capital_cost_on_grid / 1e7},
        ],
    }

    daytime_outage_plot_data = {
        "type": "bar",
        "title": "Cost of Energy Generation for Different Daytime Outage Scenarios",
        "xLabel": "Duration of the Daytime Outage (hours)",
        "yLabel": "Cost of Energy (Rs/kWh)",
        "data": [
            {"name": "0", "value": cost_energy_dual_mode},
            {"name": "1", "value": cost_energy_dual_mode_onehour},
            {"name": "2", "value": cost_energy_dual_mode_twohour},
            {"name": "3", "value": cost_energy_dual_mode_threehour},
        ],
    }

    nighttime_outage_plot_data = {
        "type": "bar",
        "title": "Cost of Energy Generation for Different Nighttime Outage Scenarios",
        "xLabel": "Duration of the Nighttime Outage (hours)",
        "yLabel": "Cost of Energy (Rs/kWh)",
        "data": [
            {"name": "0", "value": cost_energy_dual_mode},
            {"name": "1", "value": cost_energy_dual_mode_night_onehour},
            {"name": "2", "value": cost_energy_dual_mode_night_twohour},
            {"name": "3", "value": cost_energy_dual_mode_night_threehour},
        ],
    }

    on_grid_daytime_outage_plot_data = {
        "type": "bar",
        "title": "Cost of Energy Generation for Different Daytime Outage Scenarios (On-Grid)",
        "xLabel": "Duration of the Daytime Outage (hours)",
        "yLabel": "Cost of Energy (Rs/kWh)",
        "data": [
            {"name": "0", "value": cost_energy_on_grid},
            {"name": "1", "value": cost_energy_on_grid_onehour},
            {"name": "2", "value": cost_energy_on_grid_twohour},
            {"name": "3", "value": cost_energy_on_grid_threehour},
        ],
    }

    simple_payback_plot_data = {
        "type": "bar",
        "title": "Simple Payback Period Comparison of Dual Mode and On-Grid Systems",
        "xLabel": "System Type",
        "yLabel": "Simple Payback Period (years)",
        "data": [
            {"name": "On-Grid System", "value": Simple_payback_on_grid},
            {"name": "Dual Mode System", "value": Simple_payback_dual_mode},
        ],
    }

    carbon_emission_plot_data = {
        "type": "bar",
        "title": "Carbon Emission Comparison of Dual Mode and On-Grid Systems",
        "xLabel": "System Type",
        "yLabel": "Carbon Emission (Kiloton)",
        "data": [
            {"name": "On-Grid System", "value": Carbon_emmission_on_grid / 1000},
            {"name": "Dual Mode System", "value": Carbon_emmission_dual_mode / 1000},
        ],
    }

    response = {
        "Technical Analysis": {
            "Solar Panel Power Rating (kW)": f"{pv_peak_power:.2f}",
            "Battery Energy (kWh)": f"{battery_energy:.2f}",
            "Battery Nominal Voltage (V)": battery_nominal_voltage,
            "Battery Capacity (kAh)": f"{battery_capacity:.2f}",
            "Inverter Rating (kVA)": f"{inverter_rating:.2f}",
            "DC-DC Converter Rating (kW)": f"{dcdc_sizing:.2f}",
        },
        "Economic Analysis": {
            "Solar Panel Cost (Rs)": f"{pv_cost:.2f}",
            "Battery Cost (Rs)": f"{battery_cost:.2f}",
            "Inverter Cost (Rs)": f"{inverter_cost:.2f}",
            "DC-DC Converter Cost (Rs)": f"{dcdc_cost:.2f}",
            "Installation Cost Dual Mode (Rs)": f"{Installation_cost_dual_mode:.2f}",
            "Installation Cost On-Grid (Rs)": f"{Installation_cost_on_grid:.2f}",
            "Annual O&M Cost Dual Mode (Rs)": f"{annual_om_cost_dual_mode:.2f}",
            "Annual O&M Cost On-Grid (Rs)": f"{annual_om_cost_on_grid:.2f}",
        },
        "Capital Cost & Annual Generation": {
            "Capital Cost Dual Mode (Rs)": f"{capital_cost_dual_mode:.2f}",
            "Capital Cost On-Grid (Rs)": f"{capital_cost_on_grid:.2f}",
            "Annual Energy Generation Dual Mode (kWh)": f"{T_dual:.2f}",
            "Annual Energy Generation On-Grid (kWh)": f"{T_on:.2f}",
            "Annual Revenue Dual Mode (Rs)": f"{annual_revenue_dual_mode:,.2f}",
            "Annual Revenue On-Grid (Rs)": f"{annual_revenue_on_grid:,.2f}",
        },
        "Cost of Energy Generation": {
            "Dual Mode Cost (Rs/kWh)": f"{cost_energy_dual_mode:.2f}",
            "Cost for 1 Hour Outage (Rs/kWh)": f"{cost_energy_dual_mode_onehour:.2f}",
            "Cost for 2 Hours Outage (Rs/kWh)": f"{cost_energy_dual_mode_twohour:.2f}",
            "Cost for 3 Hours Outage (Rs/kWh)": f"{cost_energy_dual_mode_threehour:.2f}",
            "Night Time 1 Hour Outage Cost (Rs/kWh)": f"{cost_energy_dual_mode_night_onehour:.2f}",
            "Night Time 2 Hours Outage Cost (Rs/kWh)": f"{cost_energy_dual_mode_night_twohour:.2f}",
            "Night Time 3 Hours Outage Cost (Rs/kWh)": f"{cost_energy_dual_mode_night_threehour:.2f}",
        },
        "On-Grid Cost of Energy Generation": {
            "On-Grid Cost (Rs/kWh)": f"{cost_energy_on_grid:.2f}",
            "Cost for 1 Hour Outage (Rs/kWh)": f"{cost_energy_on_grid_onehour:.2f}",
            "Cost for 2 Hours Outage (Rs/kWh)": f"{cost_energy_on_grid_twohour:.2f}",
            "Cost for 3 Hours Outage (Rs/kWh)": f"{cost_energy_on_grid_threehour:.2f}",
            "Night Time Outage Cost (Rs/kWh)": f"{cost_energy_on_grid_night:.2f}",
        },
        "Simple Payback Period": {
            "Dual Mode System (years)": f"{Simple_payback_dual_mode:.2f}",
            "On-Grid System (years)": f"{Simple_payback_on_grid:.2f}",
        },
        "Carbon Emission": {
            "Dual Mode System (Ton)": f"{Carbon_emmission_dual_mode:.2f}",
            "On-Grid System (Ton)": f"{Carbon_emmission_on_grid:.2f}",
        },
        "Plots": {
            "Capital Cost Comparison": capital_cost_plot_data,
            "Daytime Outage Cost": daytime_outage_plot_data,
            "Nighttime Outage Cost": nighttime_outage_plot_data,
            "On-Grid Daytime Outage Cost": on_grid_daytime_outage_plot_data,
            "Simple Payback Period Comparison": simple_payback_plot_data,
            "Carbon Emission Comparison": carbon_emission_plot_data,
        },
    }

    return response


# plot_to_base64 function removed - using JSON plot data instead to reduce memory usage


@router.post("/planning/recommend")
async def get_planning_recommendation(
    request: PlanningRequest,
    current_user: models.User = Depends(get_current_user_optional)
):
    """
    Generate planning recommendation based on load profile, preferred sources, and goals.
    Returns the exact Flask response structure matching the solar-battery-calculation endpoint.
    """
    try:
        # Flask requires total_daily_energy_kwh - no default fallback
        if request.total_daily_energy_kwh is None:
            raise HTTPException(
                status_code=400,
                detail="total_daily_energy_kwh is required"
            )
        
        # This corresponds to Total_energy_consumption in the Flask code
        Total_energy_consumption = request.total_daily_energy_kwh  # kWh per day
        
        if Total_energy_consumption <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid total_daily_energy_kwh. Must be greater than 0."
            )
        
        # Use defaults if not provided
        preferred_sources = request.preferred_sources or ["solar", "battery"]
        primary_goal = request.primary_goal or "savings"
        
        response = calculate_planning_response_flask_style(Total_energy_consumption)
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating planning recommendation: {str(e)}"
        )
