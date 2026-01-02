# ai-service/app/api/endpoints/planning.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import io
import base64

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


class TechnicalSizing(BaseModel):
    solar_capacity_kw: float  # pv_peak_power
    battery_capacity_kwh: float  # battery_energy
    battery_nominal_voltage_v: Optional[float] = None  # battery_nominal_voltage (extra field)
    battery_capacity_kah: Optional[float] = None  # battery_capacity in kAh (extra field)
    inverter_capacity_kw: float  # inverter_rating
    dc_converter_capacity_kw: Optional[float] = None  # dcdc_sizing (extra field)
    grid_connection_kw: float  # Required by frontend
    diesel_capacity_kw: Optional[float] = None
    recommendations: List[str]


class EconomicAnalysis(BaseModel):
    # Component costs
    solar_cost_rs: float  # pv_cost
    battery_cost_rs: float  # battery_cost
    inverter_cost_rs: float  # inverter_cost
    dc_converter_cost_rs: float  # dcdc_cost
    installation_cost_dual_mode_rs: float  # Installation_cost_dual_mode
    installation_cost_on_grid_rs: float  # Installation_cost_on_grid
    annual_om_cost_dual_mode_rs: float  # annual_om_cost_dual_mode
    annual_om_cost_on_grid_rs: float  # annual_om_cost_on_grid
    
    # Capital costs
    capital_cost_dual_mode_rs: float  # capital_cost_dual_mode
    capital_cost_on_grid_rs: float  # capital_cost_on_grid
    
    # Annual costs
    annual_cost_dual_mode_rs: float  # annual_cost_dual_mode
    annual_cost_on_grid_rs: float  # annual_cost_on_grid
    
    # Energy generation
    annual_energy_generation_dual_mode_kwh: float  # T_dual
    annual_energy_generation_on_grid_kwh: float  # T_on
    
    # Revenue
    annual_revenue_dual_mode_rs: float  # annual_revenue_dual_mode
    annual_revenue_on_grid_rs: float  # annual_revenue_on_grid
    
    # Cost of energy generation
    cost_energy_dual_mode_rs_per_kwh: float  # cost_energy_dual_mode
    cost_energy_on_grid_rs_per_kwh: float  # cost_energy_on_grid
    
    # Outage scenarios - Daytime
    cost_energy_dual_mode_1h_outage_rs_per_kwh: float
    cost_energy_dual_mode_2h_outage_rs_per_kwh: float
    cost_energy_dual_mode_3h_outage_rs_per_kwh: float
    cost_energy_on_grid_1h_outage_rs_per_kwh: float
    cost_energy_on_grid_2h_outage_rs_per_kwh: float
    cost_energy_on_grid_3h_outage_rs_per_kwh: float
    
    # Outage scenarios - Nighttime
    cost_energy_dual_mode_night_1h_outage_rs_per_kwh: float
    cost_energy_dual_mode_night_2h_outage_rs_per_kwh: float
    cost_energy_dual_mode_night_3h_outage_rs_per_kwh: float
    cost_energy_on_grid_night_outage_rs_per_kwh: float
    
    # Simple payback period
    simple_payback_dual_mode_years: float  # Simple_payback_dual_mode
    simple_payback_on_grid_years: float  # Simple_payback_on_grid
    
    # Legacy fields for backward compatibility
    total_capex: float
    annual_opex: float
    payback_period_years: float
    npv_10_years: float
    roi_percentage: float
    monthly_savings: float


class EmissionsAnalysis(BaseModel):
    carbon_emission_dual_mode_ton: float  # Carbon_emmission_dual_mode (in Ton)
    carbon_emission_on_grid_ton: float  # Carbon_emmission_on_grid (in Ton)
    # Legacy fields for backward compatibility
    annual_co2_reduction_kg: float
    carbon_offset_percentage: float
    lifetime_co2_reduction_tonnes: float


class PlanningResponse(BaseModel):
    technical_sizing: TechnicalSizing
    economic_analysis: EconomicAnalysis
    emissions_analysis: EmissionsAnalysis


def calculate_technical_sizing(
    total_daily_energy_kwh: float,
    preferred_sources: List[str],
    primary_goal: str,
    allow_diesel: bool
) -> TechnicalSizing:
    """
    Calculate technical sizing based on the exact formulas from the Flask code.
    Matches solar-battery-calculation endpoint logic.
    """
    # Solar insolation constants
    daily_solar_insolation = 5.02  # Daily solar insolation in [KWh/m^2/day]
    
    # Battery nominal voltage
    battery_nominal_voltage = 12  # Rated battery output voltage [V]
    
    # Local load calculation
    local_load = total_daily_energy_kwh / 24  # Local load [kW]
    
    # Dividing the total energy into day time and night time part
    # Day time energy ratio: 7.03/13.01
    day_time_energy = total_daily_energy_kwh * (7.03 / 13.01)
    night_time_energy = total_daily_energy_kwh * (1 - 7.03 / 13.01)
    
    # Efficiency of different components
    n_module = 0.97  # Efficiency of the module
    n_temperature = 0.89  # Efficiency of module due to high temperature
    n_dust = 0.95  # Efficiency of module due to dust
    n_inverter = 0.9  # Efficiency of the inverter
    n_dcdc = 0.95  # Efficiency of the DC-DC converter
    n_charging = 0.9  # Efficiency of the battery charging
    n_discharging = 0.9  # Efficiency of the battery discharging
    n_battery_roundtrip = n_charging * n_discharging  # Efficiency of the battery
    battery_dod = 0.8  # Depth of discharge of the battery
    
    n_panel = n_module * n_temperature * n_dust  # System efficiency of the PV system
    # Note: In Flask code, n_panel is set to 1 later, but we'll use the calculated value
    
    # Solar panel sizing
    # Energy generated by the PV system
    pv_energy_gen = (day_time_energy / (n_panel * n_inverter * n_dcdc)) + \
                    (night_time_energy / (n_panel * n_inverter * n_dcdc * n_battery_roundtrip))
    
    # Peak Power generated by the PV system
    pv_peak_power = pv_energy_gen / daily_solar_insolation
    
    # Calculating the battery sizing
    # Battery energy calculation - designed to power for one full night
    battery_energy = night_time_energy / (n_panel * n_inverter * n_dcdc * n_battery_roundtrip * battery_dod)
    
    # Battery capacity that is needed [kAh]
    battery_capacity = battery_energy / battery_nominal_voltage
    
    # Inverter sizing
    inverter_rating = pv_peak_power * 1.25  # Size of the inverter [kVA]
    
    # DC-DC converter sizing
    dcdc_sizing = inverter_rating
    
    # Grid connection - based on peak load (matching Node.js implementation)
    peak_load_kw = total_daily_energy_kwh / 8  # Assume 8 hours of peak usage
    grid_connection_kw = peak_load_kw
    
    # Diesel generator (if allowed and in preferred sources)
    diesel_capacity_kw = None
    if allow_diesel and "diesel" in preferred_sources:
        diesel_capacity_kw = local_load * 1.1  # Similar to Node.js implementation
    
    recommendations = []
    if "solar" in preferred_sources:
        recommendations.append(f"Install {pv_peak_power:.2f} kW solar PV system")
    if battery_energy > 0:
        recommendations.append(f"Install {battery_energy:.2f} kWh battery storage ({battery_capacity:.2f} kAh at {battery_nominal_voltage}V)")
    recommendations.append(f"Inverter rating: {inverter_rating:.2f} kVA")
    recommendations.append(f"DC-DC converter rating: {dcdc_sizing:.2f} kW")
    if diesel_capacity_kw:
        recommendations.append(f"Install {diesel_capacity_kw:.2f} kW diesel generator as backup")
    
    return TechnicalSizing(
        solar_capacity_kw=round(pv_peak_power, 2),
        battery_capacity_kwh=round(battery_energy, 2),
        battery_nominal_voltage_v=battery_nominal_voltage,
        battery_capacity_kah=round(battery_capacity, 2),
        inverter_capacity_kw=round(inverter_rating, 2),
        dc_converter_capacity_kw=round(dcdc_sizing, 2),
        grid_connection_kw=round(grid_connection_kw, 2),
        diesel_capacity_kw=round(diesel_capacity_kw, 2) if diesel_capacity_kw else None,
        recommendations=recommendations
    )


def calculate_economic_analysis(
    technical_sizing: TechnicalSizing,
    total_daily_energy_kwh: float
) -> EconomicAnalysis:
    """
    Calculate economic analysis matching the Flask code calculations exactly.
    """
    # Constants from Flask code
    annual_interest_rate = 0.1  # Annual interest rate
    
    # Solar insolation constants
    daily_solar_insolation = 5.02
    one_hour_outage_solar_insolation = 4.6
    two_hour_outage_solar_insolation = 4.2
    three_hour_outage_solar_insolation = 3.8
    
    # Efficiency factors (same as technical sizing)
    n_module = 0.97
    n_temperature = 0.89
    n_dust = 0.95
    n_inverter = 0.9
    n_dcdc = 0.95
    n_charging = 0.9
    n_discharging = 0.9
    n_battery_roundtrip = n_charging * n_discharging
    n_panel = n_module * n_temperature * n_dust
    # Note: Flask code sets n_panel = 1, but uses calculated value in some places
    
    # Local load
    local_load = total_daily_energy_kwh / 24  # Local load [kW]
    
    # Extract values from technical sizing
    pv_peak_power = technical_sizing.solar_capacity_kw
    battery_energy = technical_sizing.battery_capacity_kwh
    battery_capacity = technical_sizing.battery_capacity_kah
    inverter_rating = technical_sizing.inverter_capacity_kw
    dcdc_sizing = technical_sizing.dc_converter_capacity_kw
    battery_nominal_voltage = technical_sizing.battery_nominal_voltage_v
    
    # Cost calculations - matching Flask code exactly
    # Cost of the solar panel per kW
    pv_cost_perkW = 17846400 / 594.92
    pv_cost = pv_cost_perkW * pv_peak_power
    
    # Cost of the battery per kWh
    battery_cost_per_kWh = 17720000 / (177.2 * 12)
    battery_cost = battery_cost_per_kWh * battery_energy
    
    # Cost of the inverter per kVA
    inverter_cost_per_kVA = 5949200 / 743.65
    inverter_cost = inverter_cost_per_kVA * inverter_rating
    
    # Cost of the DC-DC converter per kW
    dcdc_cost_per_kW = 991650 / 743.65
    dcdc_cost = dcdc_cost_per_kW * dcdc_sizing
    
    # Installation cost of the system
    Installation_cost_dual_mode = 0.1 * (pv_cost + battery_cost)
    Installation_cost_on_grid = 0.1 * pv_cost
    
    # Annual operation and maintenance cost of the system
    annual_om_cost_dual_mode = 0.03 * (pv_cost + battery_cost)
    annual_om_cost_on_grid = 0.03 * pv_cost
    
    # Cost of additional components of inverter and DC-DC converter
    add_cap_inv_dual_mode_per_kVA = 1984000 / 743.65
    add_cap_inv_dual_mode = add_cap_inv_dual_mode_per_kVA * inverter_rating
    
    add_sc_inv_dual_mode_per_kVA = 2976000 / 743.65
    add_sc_inv_dual_mode = add_sc_inv_dual_mode_per_kVA * inverter_rating
    
    add_cap_inv_on_grid_per_kVA = 992000 / 743.65
    add_cap_inv_on_grid = add_cap_inv_on_grid_per_kVA * inverter_rating
    
    add_sc_inv_on_grid_per_kVA = 1388000 / 743.65
    add_sc_inv_on_grid = add_sc_inv_on_grid_per_kVA * inverter_rating
    
    # Cost of additional components of battery
    add_cap_bat_dual_mode_per_kWh = 119000 / (12 * 177.2)
    add_cap_bat_dual_mode = add_cap_bat_dual_mode_per_kWh * battery_capacity
    
    add_sc_bat_dual_mode_per_kWh = 138800 / (12 * 177.2)
    add_sc_bat_dual_mode = add_sc_bat_dual_mode_per_kWh * battery_capacity
    
    # Capital cost of the system
    capital_cost_dual_mode = pv_cost + battery_cost + inverter_cost + dcdc_cost + Installation_cost_dual_mode
    capital_cost_on_grid = pv_cost + inverter_cost + Installation_cost_on_grid
    
    # Annual cost of the system
    annual_cost_on_grid = capital_cost_on_grid * annual_interest_rate + annual_om_cost_on_grid
    annual_cost_dual_mode = capital_cost_dual_mode * annual_interest_rate + annual_om_cost_dual_mode
    
    # Cost of Energy generation
    # On-grid system
    # Total Energy generation (note: Flask code uses n_panel = 1 in calculations)
    T_on = 365 * pv_peak_power * daily_solar_insolation * 1 * n_inverter
    cost_energy_on_grid = annual_cost_on_grid / T_on
    
    # Dual mode system
    # Total Energy generation
    T_dual = 365 * pv_peak_power * daily_solar_insolation * 1 * n_inverter * n_dcdc
    cost_energy_dual_mode = annual_cost_dual_mode / T_dual
    
    # Annual revenue of the system considering the energy generation at no grid outage scenario
    annual_revenue_on_grid = T_on * 8  # Annual revenue at 8 Rs/kWh
    annual_revenue_dual_mode = T_dual * 8  # Annual revenue at 8 Rs/kWh
    
    # Considering the outage scenario
    # ON grid system - Day grid outage
    T_on_onehour = 365 * pv_peak_power * one_hour_outage_solar_insolation * 1 * n_inverter
    T_on_twohour = 365 * pv_peak_power * two_hour_outage_solar_insolation * 1 * n_inverter
    T_on_threehour = 365 * pv_peak_power * three_hour_outage_solar_insolation * 1 * n_inverter
    
    cost_energy_on_grid_onehour = annual_cost_on_grid / T_on_onehour
    cost_energy_on_grid_twohour = annual_cost_on_grid / T_on_twohour
    cost_energy_on_grid_threehour = annual_cost_on_grid / T_on_threehour
    
    # Night time grid outage - same for all durations
    T_on_night = 365 * pv_peak_power * daily_solar_insolation * 1 * n_inverter
    cost_energy_on_grid_night = annual_cost_on_grid / T_on_night
    
    # Dual mode System - Day time grid outage
    # Note: Flask code formulas have inconsistencies, using the pattern from the code
    T_dual_zero = 365 * ((daily_solar_insolation * local_load) + 
                         (pv_peak_power - (local_load / (n_dcdc * n_inverter))) * 
                         daily_solar_insolation * n_dcdc * n_inverter)
    
    T_dual_onehour = 365 * ((daily_solar_insolation * local_load) + 
                            (pv_peak_power - (local_load / (n_dcdc * n_inverter))) * 
                            one_hour_outage_solar_insolation * n_inverter * n_dcdc)
    
    T_dual_twohour = 365 * ((daily_solar_insolation * local_load * 1) + 
                            (pv_peak_power * 1 - (local_load / (n_dcdc * n_inverter * 1))) * 
                            two_hour_outage_solar_insolation * n_inverter * n_dcdc)
    
    T_dual_threehour = 365 * ((daily_solar_insolation * local_load * 1) + 
                              (pv_peak_power * 1 - (local_load / (n_dcdc * n_inverter * 1))) * 
                              three_hour_outage_solar_insolation * n_inverter * n_dcdc)
    
    # Annual secondary benefits of the system (savings from avoiding diesel generator)
    AS_one_hour = local_load * 365 * 1 * 29  # 29 rupees per kWh saved
    AS_two_hour = local_load * 365 * 2 * 29
    AS_three_hour = local_load * 365 * 3 * 29
    
    # Cost of Energy generation for dual mode day outages
    cost_energy_dual_mode_onehour = (annual_cost_dual_mode - AS_one_hour) / T_dual_onehour
    cost_energy_dual_mode_twohour = (annual_cost_dual_mode - AS_two_hour) / T_dual_twohour
    cost_energy_dual_mode_threehour = (annual_cost_dual_mode - AS_three_hour) / T_dual_threehour
    
    # Dual mode system - Night time grid outage
    T_dual_night_onehour = 365 * (local_load * (daily_solar_insolation * 1 + 1) + 
                                  daily_solar_insolation * n_dcdc * n_inverter * 
                                  (pv_peak_power * 1 - (local_load / (n_dcdc * n_inverter * 1))))
    
    T_dual_night_twohour = 365 * (local_load * 1 * (daily_solar_insolation + 2) + 
                                  daily_solar_insolation * n_dcdc * n_inverter * 
                                  (pv_peak_power * 1 - (local_load / (n_dcdc * n_inverter * 1))))
    
    T_dual_night_threehour = 365 * (local_load * 1 * (daily_solar_insolation + 3) + 
                                    daily_solar_insolation * n_dcdc * n_inverter * 
                                    (pv_peak_power * 1 - (local_load / (n_dcdc * n_inverter * 1))))
    
    # The cost of charging the battery for the night time outage
    Annual_battery_cost_onehour = local_load * 365 * 1 * 8  # 8 rupees per kWh from grid
    Annual_battery_cost_twohour = local_load * 365 * 2 * 8
    Annual_battery_cost_threehour = local_load * 365 * 3 * 8
    
    # Cost of Energy generation for dual mode night outages
    cost_energy_dual_mode_night_onehour = (annual_cost_dual_mode + Annual_battery_cost_onehour - AS_one_hour) / T_dual_night_onehour
    cost_energy_dual_mode_night_twohour = (annual_cost_dual_mode + Annual_battery_cost_twohour - AS_two_hour) / T_dual_night_twohour
    cost_energy_dual_mode_night_threehour = (annual_cost_dual_mode + Annual_battery_cost_threehour - AS_three_hour) / T_dual_night_threehour
    
    # Calculation of Simple Payback Period
    Simple_payback_dual_mode = capital_cost_dual_mode / (annual_revenue_dual_mode - annual_om_cost_dual_mode)
    Simple_payback_on_grid = capital_cost_on_grid / (annual_revenue_on_grid - annual_om_cost_on_grid)
    
    # Legacy fields for backward compatibility (using dual mode values)
    total_capex = capital_cost_dual_mode
    annual_opex = annual_om_cost_dual_mode
    payback_period_years = Simple_payback_dual_mode
    # NPV calculation (10 years, 10% discount rate matching annual_interest_rate)
    discount_rate = annual_interest_rate
    annual_savings = annual_revenue_dual_mode - annual_om_cost_dual_mode
    npv = -total_capex
    for year in range(1, 11):
        npv += annual_savings / ((1 + discount_rate) ** year)
    roi_percentage = (annual_savings / total_capex) * 100 if total_capex > 0 else 0
    monthly_savings = annual_savings / 12
    
    return EconomicAnalysis(
        solar_cost_rs=round(pv_cost, 2),
        battery_cost_rs=round(battery_cost, 2),
        inverter_cost_rs=round(inverter_cost, 2),
        dc_converter_cost_rs=round(dcdc_cost, 2),
        installation_cost_dual_mode_rs=round(Installation_cost_dual_mode, 2),
        installation_cost_on_grid_rs=round(Installation_cost_on_grid, 2),
        annual_om_cost_dual_mode_rs=round(annual_om_cost_dual_mode, 2),
        annual_om_cost_on_grid_rs=round(annual_om_cost_on_grid, 2),
        capital_cost_dual_mode_rs=round(capital_cost_dual_mode, 2),
        capital_cost_on_grid_rs=round(capital_cost_on_grid, 2),
        annual_cost_dual_mode_rs=round(annual_cost_dual_mode, 2),
        annual_cost_on_grid_rs=round(annual_cost_on_grid, 2),
        annual_energy_generation_dual_mode_kwh=round(T_dual, 2),
        annual_energy_generation_on_grid_kwh=round(T_on, 2),
        annual_revenue_dual_mode_rs=round(annual_revenue_dual_mode, 2),
        annual_revenue_on_grid_rs=round(annual_revenue_on_grid, 2),
        cost_energy_dual_mode_rs_per_kwh=round(cost_energy_dual_mode, 2),
        cost_energy_on_grid_rs_per_kwh=round(cost_energy_on_grid, 2),
        cost_energy_dual_mode_1h_outage_rs_per_kwh=round(cost_energy_dual_mode_onehour, 2),
        cost_energy_dual_mode_2h_outage_rs_per_kwh=round(cost_energy_dual_mode_twohour, 2),
        cost_energy_dual_mode_3h_outage_rs_per_kwh=round(cost_energy_dual_mode_threehour, 2),
        cost_energy_on_grid_1h_outage_rs_per_kwh=round(cost_energy_on_grid_onehour, 2),
        cost_energy_on_grid_2h_outage_rs_per_kwh=round(cost_energy_on_grid_twohour, 2),
        cost_energy_on_grid_3h_outage_rs_per_kwh=round(cost_energy_on_grid_threehour, 2),
        cost_energy_dual_mode_night_1h_outage_rs_per_kwh=round(cost_energy_dual_mode_night_onehour, 2),
        cost_energy_dual_mode_night_2h_outage_rs_per_kwh=round(cost_energy_dual_mode_night_twohour, 2),
        cost_energy_dual_mode_night_3h_outage_rs_per_kwh=round(cost_energy_dual_mode_night_threehour, 2),
        cost_energy_on_grid_night_outage_rs_per_kwh=round(cost_energy_on_grid_night, 2),
        simple_payback_dual_mode_years=round(Simple_payback_dual_mode, 2),
        simple_payback_on_grid_years=round(Simple_payback_on_grid, 2),
        total_capex=round(total_capex, 2),
        annual_opex=round(annual_opex, 2),
        payback_period_years=round(payback_period_years, 2),
        npv_10_years=round(npv, 2),
        roi_percentage=round(roi_percentage, 2),
        monthly_savings=round(monthly_savings, 2)
    )


def calculate_emissions_analysis(
    technical_sizing: TechnicalSizing,
    total_daily_energy_kwh: float
) -> EmissionsAnalysis:
    """
    Calculate CO2 emissions matching the Flask code.
    """
    # Constants
    daily_solar_insolation = 5.02
    n_inverter = 0.9
    n_dcdc = 0.95
    
    # Extract values
    pv_peak_power = technical_sizing.solar_capacity_kw
    
    # Total Energy generation (matching Flask code)
    T_dual = 365 * pv_peak_power * daily_solar_insolation * 1 * n_inverter * n_dcdc
    T_on = 365 * pv_peak_power * daily_solar_insolation * 1 * n_inverter
    
    # Carbon Emission calculation (matching Flask code)
    # Carbon_emmission_dual_mode = T_dual*0.8*30/1000
    Carbon_emmission_dual_mode = T_dual * 0.8 * 30 / 1000
    Carbon_emmission_on_grid = T_on * 0.8 * 30 / 1000
    
    # Legacy fields for backward compatibility
    # Use simplified calculation based on annual reduction
    grid_co2_kg_per_kwh = 0.82
    solar_co2_kg_per_kwh = 0.05
    annual_energy_kwh = total_daily_energy_kwh * 365
    
    grid_emissions_kg = annual_energy_kwh * grid_co2_kg_per_kwh
    solar_generation_kwh = technical_sizing.solar_capacity_kw * 5 * 365
    solar_emissions_kg = solar_generation_kwh * solar_co2_kg_per_kwh
    remaining_grid_energy_kwh = max(0, annual_energy_kwh - solar_generation_kwh)
    remaining_grid_emissions_kg = remaining_grid_energy_kwh * grid_co2_kg_per_kwh
    total_emissions_kg = solar_emissions_kg + remaining_grid_emissions_kg
    annual_co2_reduction_kg = grid_emissions_kg - total_emissions_kg
    carbon_offset_percentage = (annual_co2_reduction_kg / grid_emissions_kg) * 100 if grid_emissions_kg > 0 else 0
    lifetime_co2_reduction_tonnes = (annual_co2_reduction_kg * 25) / 1000
    
    return EmissionsAnalysis(
        carbon_emission_dual_mode_ton=round(Carbon_emmission_dual_mode, 2),
        carbon_emission_on_grid_ton=round(Carbon_emmission_on_grid, 2),
        annual_co2_reduction_kg=round(annual_co2_reduction_kg, 2),
        carbon_offset_percentage=round(carbon_offset_percentage, 2),
        lifetime_co2_reduction_tonnes=round(lifetime_co2_reduction_tonnes, 2)
    )


def plot_to_base64(fig):
    """Convert matplotlib figure to base64 string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=600, bbox_inches='tight')
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


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
        # Use the total_daily_energy_kwh from request if provided, otherwise use default
        # This corresponds to Total_energy_consumption in the Flask code
        Total_energy_consumption = request.total_daily_energy_kwh or 50.0  # kWh per day
        
        if Total_energy_consumption <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid total_daily_energy_kwh. Must be greater than 0."
            )
        
        # Use defaults if not provided
        preferred_sources = request.preferred_sources or ["solar", "battery"]
        primary_goal = request.primary_goal or "savings"
        
        # Calculate technical sizing
        technical_sizing = calculate_technical_sizing(
            total_daily_energy_kwh=Total_energy_consumption,
            preferred_sources=preferred_sources,
            primary_goal=primary_goal,
            allow_diesel=request.allow_diesel
        )
        
        # Calculate economic analysis
        economic_analysis = calculate_economic_analysis(
            technical_sizing=technical_sizing,
            total_daily_energy_kwh=Total_energy_consumption
        )
        
        # Calculate emissions analysis
        emissions_analysis = calculate_emissions_analysis(
            technical_sizing=technical_sizing,
            total_daily_energy_kwh=Total_energy_consumption
        )
        
        # Generate plots matching Flask code
        # Capital Cost Comparison Plot
        capital_cost_dual_mode_cr = economic_analysis.capital_cost_dual_mode_rs / 1e7
        capital_cost_on_grid_cr = economic_analysis.capital_cost_on_grid_rs / 1e7
        
        plt.rcParams['font.family'] = 'Times New Roman'
        plt.rcParams['font.size'] = 10
        fig1, ax1 = plt.subplots(figsize=(8, 6))
        systems = ['Dual Mode System', 'On-Grid System']
        capital_costs = [capital_cost_dual_mode_cr, capital_cost_on_grid_cr]
        bars = ax1.bar(systems, capital_costs, color=['lightblue', 'lightblue'])
        max_capital = max(capital_costs)
        for bar in bars:
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width() / 2, height + max_capital * 0.05, 
                    f'{height:.2f} Cr', ha='center', va='bottom', fontsize=10)
        ax1.set_ylabel('Capital Cost (INR Cr)', fontsize=11)
        ax1.set_title('Capital Cost Comparison of Dual Mode and On-Grid Systems', fontsize=12, pad=10)
        ax1.set_ylim(0, max_capital * 1.25)
        ax1.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        capital_cost_plot = plot_to_base64(fig1)
        plt.close(fig1)
        
        # Daytime Outage Cost Plot (Dual Mode)
        fig2, ax = plt.subplots(figsize=(8, 6))
        durations = [0, 1, 2, 3]
        costs = [
            economic_analysis.cost_energy_dual_mode_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_1h_outage_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_2h_outage_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_3h_outage_rs_per_kwh
        ]
        bars = ax.bar(durations, costs, color='lightblue', label='Dual mode system')
        max_cost = max(costs)
        for i, bar in enumerate(bars):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + max_cost * 0.03, 
                   f'{height:.2f}', ha='center', va='bottom', fontsize=10)
        ax.set_xlabel('Duration of the Daytime Outage (hours)', fontsize=11)
        ax.set_ylabel('Cost of Energy (Rs/kWh)', fontsize=11)
        ax.set_title('Cost of Energy Generation for Different Daytime Outage Scenarios', fontsize=12, pad=10)
        ax.set_ylim(0, max_cost * 1.15)
        ax.legend(fontsize=10)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        daytime_outage_plot = plot_to_base64(fig2)
        plt.close(fig2)
        
        # Nighttime Outage Cost Plot (Dual Mode)
        fig3, ax = plt.subplots(figsize=(8, 6))
        costs_night = [
            economic_analysis.cost_energy_dual_mode_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_night_1h_outage_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_night_2h_outage_rs_per_kwh,
            economic_analysis.cost_energy_dual_mode_night_3h_outage_rs_per_kwh
        ]
        bars = ax.bar(durations, costs_night, color='lightblue', label='Dual mode system')
        max_cost_night = max(costs_night)
        for i, bar in enumerate(bars):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + max_cost_night * 0.05, 
                   f'{height:.2f}', ha='center', va='bottom', fontsize=10)
        ax.set_xlabel('Duration of the Nighttime Outage (hours)', fontsize=11)
        ax.set_ylabel('Cost of Energy (Rs/kWh)', fontsize=11)
        ax.set_title('Cost of Energy Generation for Different Nighttime Outage Scenarios', fontsize=12, pad=10)
        ax.set_ylim(0, max_cost_night * 1.2)
        ax.legend(fontsize=10)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        nighttime_outage_plot = plot_to_base64(fig3)
        plt.close(fig3)
        
        # On-Grid Daytime Outage Cost Plot
        fig4, ax = plt.subplots(figsize=(8, 6))
        costs_on_grid = [
            economic_analysis.cost_energy_on_grid_rs_per_kwh,
            economic_analysis.cost_energy_on_grid_1h_outage_rs_per_kwh,
            economic_analysis.cost_energy_on_grid_2h_outage_rs_per_kwh,
            economic_analysis.cost_energy_on_grid_3h_outage_rs_per_kwh
        ]
        bars = ax.bar(durations, costs_on_grid, color='lightblue', label='On-grid system')
        max_cost_on_grid = max(costs_on_grid)
        y_max = max(max_cost_on_grid * 1.2, 6)  # Ensure at least 6, but scale if needed
        for i, bar in enumerate(bars):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + y_max * 0.04, 
                   f'{height:.2f}', ha='center', va='bottom', fontsize=10)
        ax.set_xlabel('Duration of the Daytime Outage (hours)', fontsize=11)
        ax.set_ylabel('Cost of Energy (Rs/kWh)', fontsize=11)
        ax.set_title('Cost of Energy Generation for Different Daytime Outage Scenarios', fontsize=12, pad=10)
        ax.set_ylim(0, y_max)
        ax.legend(fontsize=10)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        on_grid_daytime_outage_plot = plot_to_base64(fig4)
        plt.close(fig4)
        
        # Simple Payback Period Plot
        fig5, ax = plt.subplots(figsize=(8, 6))
        systems_payback = ['On-Grid System', 'Dual Mode System']
        payback_periods = [
            economic_analysis.simple_payback_on_grid_years,
            economic_analysis.simple_payback_dual_mode_years
        ]
        bars = ax.bar(systems_payback, payback_periods, color=['lightblue', 'lightblue'])
        max_payback = max(payback_periods)
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, height + max_payback * 0.05, 
                   f'{height:.2f} years', ha='center', va='bottom', fontsize=10)
        ax.set_ylabel('Simple Payback Period (years)', fontsize=11)
        ax.set_title('Simple Payback Period Comparison of Dual Mode and On-Grid Systems', fontsize=12, pad=10)
        ax.set_ylim(0, max_payback * 1.25)
        ax.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        simple_payback_plot = plot_to_base64(fig5)
        plt.close(fig5)
        
        # Carbon Emission Plot
        fig6, ax2 = plt.subplots(figsize=(8, 6))
        carbon_emission_dual_mode_Ton = emissions_analysis.carbon_emission_dual_mode_ton / 1000
        carbon_emission_on_grid_Ton = emissions_analysis.carbon_emission_on_grid_ton / 1000
        systems_carbon = ['On-Grid System', 'Dual Mode System']
        carbon_emmission = [carbon_emission_on_grid_Ton, carbon_emission_dual_mode_Ton]
        bars = ax2.bar(systems_carbon, carbon_emmission, color=['lightblue', 'lightblue'])
        max_carbon = max(carbon_emmission)
        for bar in bars:
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width() / 2, height + max_carbon * 0.05, 
                    f'{height:.2f} Kiloton', ha='center', va='bottom', fontsize=10)
        ax2.set_ylabel('Carbon Emission (Kiloton)', fontsize=11)
        ax2.set_title('Carbon Emission Comparison of Dual Mode and On-Grid Systems', fontsize=12, pad=10)
        ax2.set_ylim(0, max_carbon * 1.25)
        ax2.grid(axis='y', alpha=0.3, linestyle='--')
        plt.tight_layout()
        carbon_emission_plot = plot_to_base64(fig6)
        plt.close(fig6)
        
        # Build Flask-style response
        response = {
            "Technical Analysis": {
                "Solar Panel Power Rating (kW)": f"{technical_sizing.solar_capacity_kw:.2f}",
                "Battery Energy (kWh)": f"{technical_sizing.battery_capacity_kwh:.2f}",
                "Battery Nominal Voltage (V)": int(technical_sizing.battery_nominal_voltage_v) if technical_sizing.battery_nominal_voltage_v else 12,
                "Battery Capacity (kAh)": f"{technical_sizing.battery_capacity_kah:.2f}" if technical_sizing.battery_capacity_kah is not None else "0.00",
                "Inverter Rating (kVA)": f"{technical_sizing.inverter_capacity_kw:.2f}",
                "DC-DC Converter Rating (kW)": f"{technical_sizing.dc_converter_capacity_kw:.2f}" if technical_sizing.dc_converter_capacity_kw else "0.00"
            },
            "Economic Analysis": {
                "Solar Panel Cost (Rs)": f"{economic_analysis.solar_cost_rs:.2f}",
                "Battery Cost (Rs)": f"{economic_analysis.battery_cost_rs:.2f}",
                "Inverter Cost (Rs)": f"{economic_analysis.inverter_cost_rs:.2f}",
                "DC-DC Converter Cost (Rs)": f"{economic_analysis.dc_converter_cost_rs:.2f}",
                "Installation Cost Dual Mode (Rs)": f"{economic_analysis.installation_cost_dual_mode_rs:.2f}",
                "Installation Cost On-Grid (Rs)": f"{economic_analysis.installation_cost_on_grid_rs:.2f}",
                "Annual O&M Cost Dual Mode (Rs)": f"{economic_analysis.annual_om_cost_dual_mode_rs:.2f}",
                "Annual O&M Cost On-Grid (Rs)": f"{economic_analysis.annual_om_cost_on_grid_rs:.2f}"
            },
            "Capital Cost & Annual Generation": {
                "Capital Cost Dual Mode (Rs)": f"{economic_analysis.capital_cost_dual_mode_rs:.2f}",
                "Capital Cost On-Grid (Rs)": f"{economic_analysis.capital_cost_on_grid_rs:.2f}",
                "Annual Energy Generation Dual Mode (kWh)": f"{economic_analysis.annual_energy_generation_dual_mode_kwh:.2f}",
                "Annual Energy Generation On-Grid (kWh)": f"{economic_analysis.annual_energy_generation_on_grid_kwh:.2f}",
                "Annual Revenue Dual Mode (Rs)": f"{economic_analysis.annual_revenue_dual_mode_rs:,.2f}",
                "Annual Revenue On-Grid (Rs)": f"{economic_analysis.annual_revenue_on_grid_rs:,.2f}"
            },
            "Cost of Energy Generation": {
                "Dual Mode Cost (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_rs_per_kwh:.2f}",
                "Cost for 1 Hour Outage (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_1h_outage_rs_per_kwh:.2f}",
                "Cost for 2 Hours Outage (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_2h_outage_rs_per_kwh:.2f}",
                "Cost for 3 Hours Outage (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_3h_outage_rs_per_kwh:.2f}",
                "Night Time 1 Hour Outage Cost (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_night_1h_outage_rs_per_kwh:.2f}",
                "Night Time 2 Hours Outage Cost (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_night_2h_outage_rs_per_kwh:.2f}",
                "Night Time 3 Hours Outage Cost (Rs/kWh)": f"{economic_analysis.cost_energy_dual_mode_night_3h_outage_rs_per_kwh:.2f}"
            },
            "On-Grid Cost of Energy Generation": {
                "On-Grid Cost (Rs/kWh)": f"{economic_analysis.cost_energy_on_grid_rs_per_kwh:.2f}",
                "Cost for 1 Hour Outage (Rs/kWh)": f"{economic_analysis.cost_energy_on_grid_1h_outage_rs_per_kwh:.2f}",
                "Cost for 2 Hours Outage (Rs/kWh)": f"{economic_analysis.cost_energy_on_grid_2h_outage_rs_per_kwh:.2f}",
                "Cost for 3 Hours Outage (Rs/kWh)": f"{economic_analysis.cost_energy_on_grid_3h_outage_rs_per_kwh:.2f}",
                "Night Time Outage Cost (Rs/kWh)": f"{economic_analysis.cost_energy_on_grid_night_outage_rs_per_kwh:.2f}"
            },
            "Simple Payback Period": {
                "Dual Mode System (years)": f"{economic_analysis.simple_payback_dual_mode_years:.2f}",
                "On-Grid System (years)": f"{economic_analysis.simple_payback_on_grid_years:.2f}"
            },
            "Carbon Emission": {
                "Dual Mode System (Ton)": f"{emissions_analysis.carbon_emission_dual_mode_ton:.2f}",
                "On-Grid System (Ton)": f"{emissions_analysis.carbon_emission_on_grid_ton:.2f}"
            },
            "Plots": {
                "Capital Cost Comparison": capital_cost_plot,
                "Daytime Outage Cost": daytime_outage_plot,
                "Nighttime Outage Cost": nighttime_outage_plot,
                "On-Grid Daytime Outage Cost": on_grid_daytime_outage_plot,
                "Simple Payback Period Comparison": simple_payback_plot,
                "Carbon Emission Comparison": carbon_emission_plot
            }
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating planning recommendation: {str(e)}"
        )
