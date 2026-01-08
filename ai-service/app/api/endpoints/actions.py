# ems-backend/app/api/endpoints/actions.py

import asyncio
import os
import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic.json import pydantic_encoder

from app.models import pydantic_models as models
from app.data.mock_data import MOCK_ALERTS, MOCK_RL_SUGGESTIONS, MOCK_SITES, MOCK_MAINTENANCE_ASSETS
from app.api.deps import get_current_user
from typing import List 
from app.data.mock_data import LAST_SUGGESTION_ACTION

# Create logger
logger = logging.getLogger(__name__)

# --- Configure OpenAI LLM ---
try:
    from app.core.config import settings
    openai_api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
    if openai_api_key:
        llm = ChatOpenAI(
            model="gpt-4o-mini",  # Using OpenAI's efficient model
            api_key=openai_api_key,
            temperature=0.7,
        )
        print("✅ OpenAI LLM configured successfully.")
    else:
        print("⚠️ OPENAI_API_KEY not found in environment")
        llm = None
except Exception as e:
    print(f"⚠️ OpenAI AI could not be configured: {e}")
    llm = None

router = APIRouter()

def generate_fallback_insights(system_data: dict) -> str:
    """Generate fallback insights when OpenAI API is unavailable."""
    context = system_data.get('context', 'energy_forecasting')
    
    if context == 'ai_predictions':
        # For predictions context, generate simple list based on predictions data
        predictions = system_data.get('predictions', {})
        battery_pred = predictions.get('battery', {})
        solar_pred = predictions.get('solar', {})
        loss_pred = predictions.get('loss', {})
        
        insights = []
        
        if battery_pred and battery_pred.get('predictions'):
            insights.append("🔋 Battery RUL predictions available - Monitor degradation trends and plan maintenance proactively")
            insights.append("📉 Track battery health over cycles to optimize replacement timing and reduce downtime")
        
        if solar_pred and solar_pred.get('predictions'):
            insights.append("☀️ Solar degradation analysis active - Schedule cleaning and maintenance based on efficiency trends")
            insights.append("🔧 Monitor annual degradation rate to ensure panels operate within 0.5-0.8% standard")
        
        if loss_pred and loss_pred.get('predictions'):
            insights.append("⚡ Energy loss analysis available - Identify optimal load ranges for maximum efficiency")
            insights.append("🎯 Operate within 50-75% transformer capacity to minimize distribution losses")
        
        if not insights:
            insights = [
                "📊 Run prediction models above to generate equipment health insights",
                "🔋 Battery RUL tracking helps schedule maintenance before failures",
                "☀️ Solar degradation monitoring identifies when cleaning or replacement is needed",
                "⚡ Energy loss analysis optimizes system efficiency and reduces waste"
            ]
        
        return "\n".join(f"- {insight}" for insight in insights)
    
    # For forecast/dashboard context
    health = system_data.get('health', {})
    telemetry = system_data.get('telemetry', {})
    forecast = system_data.get('forecast', {})
    
    battery_soc = health.get('battery_soc', 50)
    grid_draw = health.get('grid_draw', 0)
    pv_generation = health.get('pv_generation_today', 0)
    peak_hour = forecast.get('peak_hour', 14) if forecast else 14
    total_consumption = forecast.get('total_24h', 0) if forecast else 0
    
    insights = f"""## Energy Consumption Insights
- Peak demand expected at {peak_hour}:00 hours. Pre-charge battery 1-2 hours before peak to reduce grid dependency during high-demand periods.
- Current grid draw is {grid_draw:.2f} kW. {'Reduce non-essential loads by 20-30% to optimize grid usage and lower costs.' if grid_draw > 100 else 'Grid usage is within optimal range. Maintain current load distribution.'}
- {f'Forecasted 24-hour consumption: {total_consumption:.2f} kWh. Plan energy dispatch accordingly to minimize costs.' if forecast else 'Enable energy forecasting to get 24-hour consumption predictions and optimize dispatch planning.'}
- Monitor real-time consumption patterns to identify anomalies and potential efficiency improvements.

## Battery Optimization
- Current battery State of Charge (SoC): {battery_soc:.2f}%. {'CRITICAL: Charge battery immediately to prevent deep discharge and extend lifespan.' if battery_soc < 30 else 'Battery is well charged. Consider discharging during peak tariff hours to maximize savings.' if battery_soc > 80 else 'Optimal charging window: charge during off-peak hours (10 PM - 6 AM) when tariffs are lowest.'}
- Maintain battery SoC between 20-90% to maximize cycle life and prevent degradation. Avoid frequent deep discharges.
- Implement smart charging schedules: charge from solar during day, discharge during evening peak, and use grid during off-peak hours.
- Monitor battery temperature and health metrics regularly to detect early signs of degradation.

## Cost Savings Opportunities
- Load shifting potential: Shift approximately {round(grid_draw * 0.3)} kW of flexible loads to off-peak hours for 15-20% cost reduction.
- {f'Solar generation today: {pv_generation:.2f} kWh. Increase self-consumption to 80%+ by scheduling high-power loads during solar peak hours (10 AM - 3 PM).' if pv_generation > 0 else 'Solar PV installation recommendation: Install 2-3 kW solar capacity to reduce grid costs by 30-40% annually.'}
- Enable demand response programs to earn ₹2-5 per kWh during peak hours by reducing consumption when grid prices spike.
- Optimize time-of-use tariff strategy: consume 60% of daily energy during off-peak hours to minimize electricity bills.

## Renewable Integration
- {f'Current solar contribution: {round((pv_generation / (total_consumption if total_consumption > 0 else 100)) * 100, 1)}% of daily consumption. Target: increase to 40-50% with optimized dispatch.' if pv_generation > 0 else 'No solar generation detected. Install 2-3 kW solar PV system to achieve 30-40% renewable energy share and reduce carbon footprint.'}
- Battery-solar synergy: Use battery to store excess solar energy during midday and discharge during evening peak to maximize renewable utilization.
- Weather-aware dispatch: Sunny forecast for next 48 hours - maximize solar charging and minimize grid dependency during daytime hours.
- Carbon reduction potential: Increase renewable share by 25% through optimized battery dispatch and load scheduling, reducing CO2 emissions by 2-3 tonnes annually.
"""
    return insights

@router.post("/sites/{site_id}/alerts/{alert_id}/acknowledge", response_model=dict)
async def acknowledge_alert(site_id: str, alert_id: str, current_user: models.User = Depends(get_current_user)):
    await asyncio.sleep(0.5)
    if site_id in MOCK_ALERTS:
        for alert in MOCK_ALERTS[site_id]:
            if alert.id == alert_id:
                alert.status = 'acknowledged'
                return {"success": True}
    raise HTTPException(status_code=404, detail="Alert not found")

@router.post("/sites/{site_id}/suggestions/{suggestion_id}/accept", response_model=dict)
async def accept_suggestion(site_id: str, suggestion_id: str, current_user: models.User = Depends(get_current_user)):
    await asyncio.sleep(0.8)
    if site_id in MOCK_RL_SUGGESTIONS:
        for suggestion in MOCK_RL_SUGGESTIONS[site_id]:
            if suggestion.id == suggestion_id:
                suggestion.status = 'accepted'
                # SET THE COOLDOWN TIMESTAMP
                LAST_SUGGESTION_ACTION[site_id] = datetime.now()
                return {"success": True, "schedule": "Action scheduled for next control cycle."}
    raise HTTPException(status_code=404, detail="Suggestion not found")

@router.post("/sites/{site_id}/suggestions/{suggestion_id}/reject", response_model=dict)
async def reject_suggestion(site_id: str, suggestion_id: str, current_user: models.User = Depends(get_current_user)):
    await asyncio.sleep(0.8)
    if site_id in MOCK_RL_SUGGESTIONS:
        for suggestion in MOCK_RL_SUGGESTIONS[site_id]:
            if suggestion.id == suggestion_id:
                suggestion.status = 'rejected'
                # SET THE COOLDOWN TIMESTAMP
                LAST_SUGGESTION_ACTION[site_id] = datetime.now()
                return {"success": True}
    raise HTTPException(status_code=404, detail="Suggestion not found")

@router.post("/sites/{site_id}/maintenance/{asset_id}/schedule", response_model=dict)
async def schedule_maintenance(site_id: str, asset_id: str, current_user: models.User = Depends(get_current_user)):
    await asyncio.sleep(1.2)
    return {"success": True, "message": f"Maintenance for asset {asset_id} has been scheduled."}

@router.post("/sites/{site_id}/rl-strategy", response_model=dict)
async def update_rl_strategy(site_id: str, strategy: models.RLStrategy, current_user: models.User = Depends(get_current_user)):
    await asyncio.sleep(1)
    print(f"Site {site_id} RL strategy updated to: {strategy.dict()}")
    return {"success": True}

@router.post("/alerts/analyze-root-cause", response_model=str)
async def analyze_root_cause(alert: models.Alert, current_user: models.User = Depends(get_current_user)):
    # This remains a mock endpoint as requested
    await asyncio.sleep(2.5)
    response = "This is a mock analysis for the alert." # Simplified for brevity
    return response


@router.post("/actions/generate-insights", response_model=dict)
async def generate_insights(request: dict):
    """Generate actionable insights based on system data using OpenAI AI."""
    if not llm:
        # Return fallback insights if OpenAI is not configured
        return {
            "success": True,
            "insights": generate_fallback_insights(request.get("system_data", {})),
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": "Using fallback insights. Configure OPENAI_API_KEY for AI-powered insights."
        }
    
    system_data = request.get("system_data", {})
    context = system_data.get('context', 'dashboard')  # Default to dashboard for full insights
    
    # NOTE: Prediction-specific insights (battery, solar, loss) are now handled by dedicated endpoints:
    # - /api/v1/insights/battery-rul
    # - /api/v1/insights/solar-degradation
    # - /api/v1/insights/energy-loss
    # - /api/v1/insights/energy-forecast
    # This endpoint now only handles dashboard/main actionable insights
    
    # Different prompts based on context
    if context == 'ai_predictions':
        # Redirect users to dedicated endpoints
        logger.warning(f"Received prediction context request. Please use dedicated endpoints: /api/v1/insights/battery-rul, /api/v1/insights/solar-degradation, /api/v1/insights/energy-loss")
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": "Prediction insights should use dedicated endpoints: /api/v1/insights/battery-rul, /api/v1/insights/solar-degradation, or /api/v1/insights/energy-loss"
        }
    elif context == 'energy_forecasting':
        # Redirect users to dedicated forecast endpoint
        logger.warning(f"Received forecast context request. Please use dedicated endpoint: /api/v1/insights/energy-forecast")
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": "Forecast insights should use dedicated endpoint: /api/v1/insights/energy-forecast"
        }
    elif context == 'dashboard' or not context:
        # For dashboard context - includes ALL available data (health, telemetry, forecast, etc.)
        system_prompt = """
        You are an expert energy management consultant for VidyutAI's Smart Energy Platform with specialized knowledge in renewable energy systems, grid integration, battery storage, demand-side management, and energy economics.

        Your task is to analyze ALL available system data (current health status, real-time telemetry, forecast predictions, and any other provided metrics) and generate comprehensive, actionable insights that provide a holistic view of system optimization opportunities.

        **Analysis Framework:**
        1. Examine current system state across all metrics (health indicators, telemetry, forecast patterns)
        2. Identify cross-system optimization opportunities (cost reduction, efficiency gains, reliability improvements)
        3. Connect insights between different data sources (e.g., forecast + battery SoC + grid draw)
        4. Prioritize recommendations by impact and feasibility
        5. Provide specific, quantified recommendations with actionable steps
        
        **CRITICAL FORMATTING RULES:**
        - Generate EXACTLY 4 categories, no more, no less
        - Use EXACTLY this format:
        
        ## Energy Consumption Insights
        - Insight 1 text here
        - Insight 2 text here
        - Insight 3 text here
        
        ## Battery Optimization
        - Insight 1 text here
        - Insight 2 text here
        - Insight 3 text here
        
        ## Cost Savings Opportunities
        - Insight 1 text here
        - Insight 2 text here
        - Insight 3 text here
        
        ## Renewable Integration
        - Insight 1 text here
        - Insight 2 text here
        - Insight 3 text here
        
        **IMPORTANT:**
        - Use ONLY these 4 category names exactly as shown
        - Synthesize insights from ALL available data sources (health, telemetry, forecast)
        - Provide 3-4 specific, actionable insights per category
        - Be specific with numbers, percentages, timeframes, and thresholds from the data
        - Connect insights across different data sources (e.g., "Given forecast peak at hour X and current battery SoC of Y%...")
        - Each insight should be a complete, actionable recommendation with clear business impact
        - Include both immediate actions and strategic recommendations
        - Consider safety, reliability, and cost-effectiveness in all recommendations
        """
        
        # Only include health/telemetry if available (full mode)
        health_section = ""
        if system_data.get('health'):
            health_section = f"""
    **Current System Health:**
    - Site Health: {system_data.get('health', {}).get('site_health', 0):.1f}%
    - Grid Draw: {system_data.get('health', {}).get('grid_draw', 0):.2f} kW
    - Battery SoC: {system_data.get('health', {}).get('battery_soc', 0):.2f}%
    - PV Generation Today: {system_data.get('health', {}).get('pv_generation_today', 0):.2f} kWh
    """
        
        telemetry_section = ""
        if system_data.get('telemetry'):
            telemetry_section = f"""
    **Real-time Telemetry:**
    - Battery Discharge: {system_data.get('telemetry', {}).get('battery_discharge', 0):.2f} kW
    - PV Generation: {system_data.get('telemetry', {}).get('pv_generation', 0):.2f} kW
    - Battery SoC: {system_data.get('telemetry', {}).get('soc_batt', 0):.2f}%
    """
        
        forecast_section = ""
        if system_data.get('forecast'):
            forecast_section = f"""
    **24-Hour Forecast:**
    - Total Consumption: {system_data.get('forecast', {}).get('total_24h', 0):.2f} kWh
    - Average: {system_data.get('forecast', {}).get('average', 0):.2f} kW
    - Peak: {system_data.get('forecast', {}).get('peak', 0):.2f} kW at hour {system_data.get('forecast', {}).get('peak_hour', 0)}
    - Minimum: {system_data.get('forecast', {}).get('min', 0):.2f} kW at hour {system_data.get('forecast', {}).get('min_hour', 0)}
    """
        
        human_prompt = f"""
    Analyze ALL available energy system data and provide comprehensive, actionable insights that synthesize information across different data sources:
    
    **Site Information:**
    - Site: {system_data.get('site', {}).get('name', 'Unknown')}
    {health_section}
    {telemetry_section}
    {forecast_section}
    
    Generate specific, actionable insights for each category by analyzing and connecting data across all available sources.
    Synthesize information from health metrics, telemetry, and forecasts to provide holistic recommendations.
    Include numbers and percentages where relevant, and connect insights between different data sources.
    Focus on what IS available in the data, and use all provided metrics to create comprehensive insights.
    """
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])
    
    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({})
        insights_text = response.content if hasattr(response, 'content') else str(response)
        
        return {
            "success": True,
            "insights": insights_text,
            "generated_at": datetime.now().isoformat(),
            "fallback": False
        }
    except Exception as e:
        # Return fallback insights on error
        logger.error(f"Error generating insights with OpenAI: {str(e)}")
        return {
            "success": True,
            "insights": generate_fallback_insights(system_data),
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": f"OpenAI API error. Using fallback insights. Error: {str(e)}"
        }

@router.post("/actions/ask-ai", response_model=str)
async def ask_ai(query: models.AIQuery, current_user: models.User = Depends(get_current_user)):
    if not llm:
        raise HTTPException(status_code=503, detail="AI service is not configured or available.")

    await asyncio.sleep(0.5)

    system_context = {
        "sites": [site.model_dump() for site in MOCK_SITES],
        "assets": [asset.model_dump() for asset in MOCK_MAINTENANCE_ASSETS],
        "active_alerts": MOCK_ALERTS,
        "pending_suggestions": MOCK_RL_SUGGESTIONS,
        "current_time_ist": datetime.now().isoformat()
    }
    context_json = json.dumps(system_context, default=pydantic_encoder, indent=2)

    system_prompt = """
    You are an expert AI assistant for VidyutAI's Energy Management System (EMS), a comprehensive platform for managing renewable energy systems, battery storage, grid integration, and energy optimization.

    **Your Expertise:**
    - Renewable energy systems (solar, wind, hybrid)
    - Battery storage and energy management
    - Grid integration and demand response
    - Energy economics and cost optimization
    - Predictive maintenance and system health
    - Real-time monitoring and telemetry analysis

    **Core Principles:**
    1. Answer based ONLY on the real-time system data provided in the context
    2. If information is not available in the data, clearly state that rather than making assumptions
    3. Be concise, accurate, and actionable
    4. Prioritize safety and reliability in all recommendations
    5. Use clear, professional language accessible to both technical and non-technical users

    **Response Guidelines:**
    - Provide specific numbers, percentages, and metrics when available in the data
    - Explain the significance of data points and trends
    - Offer actionable recommendations when appropriate
    - Flag any concerns or anomalies clearly
    - If asked about something not in the data, acknowledge the limitation

    **CRITICAL FORMATTING RULES:**
    - Always use standard markdown formatting
    - Use `**bold**` for emphasis on key terms and values
    - For lists, use numbered lists (1., 2., 3.) for main items
    - Use bulleted lists (using '*') for sub-items
    - Each item MUST be on a new line
    - Use code formatting (`backticks`) for technical identifiers (site IDs, asset IDs, etc.)

    **--- EXAMPLE OF CORRECT FORMATTING ---**
    USER QUESTION: "list all my assets"

    YOUR CORRECT RESPONSE FORMAT:
    Based on the current system data, here are all assets:

    1.  **site_ahd_gj - Sabarmati Riverfront Solar**
        * `asset_ahd_inv01`: Inverter Unit SR-01
        * `asset_ahd_pv01`: Rooftop PV Array 3B

    2.  **site_srt_gj - Surat Industrial Power Hub**
        * `asset_srt_gt01`: Gas Turbine Primary
    **--- END OF EXAMPLE ---**

    Remember: Accuracy and clarity are paramount. If you cannot answer based on the provided data, say so explicitly.
    """
    
    human_prompt = """
    --- SYSTEM DATA (JSON) ---
    {context}
    --- END OF SYSTEM DATA ---

    USER QUESTION: "{question}"
    """
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])


    chain = prompt | llm

    try:
        response = await chain.ainvoke({
            "context": context_json,
            "question": query.question
        })
        return response.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred with the AI service: {e}")
    
    
@router.get("/sites/{site_id}/suggestions", response_model=List[models.RLSuggestion])
async def get_suggestions(site_id: str, current_user: models.User = Depends(get_current_user)):
    """
    Retrieves all pending RL suggestions for a given site.
    """
    await asyncio.sleep(0.5)
    return [s for s in MOCK_RL_SUGGESTIONS.get(site_id, []) if s.status == 'pending']