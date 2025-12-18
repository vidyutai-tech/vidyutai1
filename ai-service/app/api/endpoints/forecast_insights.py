"""
Energy Forecast Insights API Endpoint
Dedicated endpoint for generating insights from Energy Forecast data
"""

import os
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from typing import Dict

from app.models import pydantic_models as models
from app.api.deps import get_current_user_optional

# Create logger
logger = logging.getLogger(__name__)

# Configure OpenAI LLM
try:
    from app.core.config import settings
    openai_api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
    if openai_api_key:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=openai_api_key,
            temperature=0.7,
        )
        logger.info("✅ OpenAI LLM configured for forecast insights")
    else:
        logger.warning("⚠️ OPENAI_API_KEY not found")
        llm = None
except Exception as e:
    logger.error(f"⚠️ OpenAI LLM could not be configured: {e}")
    llm = None

router = APIRouter()

@router.post("/insights/energy-forecast", response_model=Dict)
async def generate_forecast_insights(
    request: Dict,
    current_user: models.User = Depends(get_current_user_optional)
):
    """Generate actionable insights specifically for Energy Forecast data"""
    
    if not llm:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    system_data = request.get("system_data", {})
    forecast = system_data.get('forecast')
    forecast_subtype = system_data.get('forecast_subtype', 'consumption')  # 'production' or 'consumption'
    
    logger.info(f"Energy Forecast insights request - subtype: {forecast_subtype}, has_forecast: {bool(forecast)}")
    
    if not forecast:
        error_msg = "No forecast data available. Please ensure energy forecast is generated."
        logger.warning(error_msg)
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": error_msg
        }
    
    # Adjust prompt based on subtype (production or consumption)
    if forecast_subtype == 'production':
        system_prompt = """You are an energy production expert. Analyze ONLY the energy PRODUCTION forecast data provided.

Generate 4-6 short insights as a numbered list (no categories). Each insight should:
- Be 1-2 sentences max
- Include specific kWh and kW values from the production forecast
- Reference peak production hours and patterns
- Focus ONLY on production optimization and planning

Keep insights crisp, user-friendly, and practical. Use simple language."""
    elif forecast_subtype == 'consumption':
        system_prompt = """You are an energy demand expert. Analyze ONLY the energy DEMAND/CONSUMPTION forecast data provided.

Generate 4-6 short insights as a numbered list (no categories). Each insight should:
- Be 1-2 sentences max
- Include specific kWh and kW values from the consumption forecast
- Reference peak demand hours and patterns
- Focus ONLY on demand management and load planning

Keep insights crisp, user-friendly, and practical. Use simple language."""
    else:
        # General forecast
        system_prompt = """You are an energy forecasting expert. Analyze the forecast data provided.

Generate 4-6 short insights as a numbered list (no categories). Each insight should:
- Be 1-2 sentences max
- Include specific numbers from the forecast
- Reference peak hours and patterns
- Focus on practical recommendations

Keep insights crisp, user-friendly, and practical. Use simple language."""
    
    forecast_type_label = "Production" if forecast_subtype == 'production' else "Consumption/Demand"
    forecast_section = f"""
**24-Hour {forecast_type_label} Forecast:**
- Total: {forecast.get('total_24h', 0):.2f} kWh
- Average: {forecast.get('average', 0):.2f} kW
- Peak: {forecast.get('peak', 0):.2f} kW at hour {forecast.get('peak_hour', 0)}
- Minimum: {forecast.get('min', 0):.2f} kW at hour {forecast.get('min_hour', 0)}
"""
    
    human_prompt = f"""Analyze this {forecast_subtype or 'energy'} forecast data:

**Site:** {system_data.get('site', {}).get('name', 'Unknown')}
{forecast_section}

Generate 4-6 crisp insights. Focus ONLY on the forecast data above. Be specific with numbers and provide clear actions. Reference exact values from the forecast data."""

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
        logger.error(f"Error generating forecast insights with OpenAI: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )

