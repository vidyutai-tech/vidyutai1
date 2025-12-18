"""
Solar Degradation Insights API Endpoint
Dedicated endpoint for generating insights from Solar Degradation prediction data
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
        logger.info("✅ OpenAI LLM configured for solar insights")
    else:
        logger.warning("⚠️ OPENAI_API_KEY not found")
        llm = None
except Exception as e:
    logger.error(f"⚠️ OpenAI LLM could not be configured: {e}")
    llm = None

router = APIRouter()

def extract_solar_data(predictions_data: Dict) -> str:
    """Extract solar degradation prediction data and format for LLM"""
    try:
        solar_pred = predictions_data.get('solar', {})
        
        if not solar_pred or not isinstance(solar_pred, dict):
            logger.warning("Solar prediction data is not a dict or is None")
            return ""
        
        solar_preds_list = solar_pred.get('predictions')
        if not solar_preds_list or not isinstance(solar_preds_list, list) or len(solar_preds_list) == 0:
            logger.warning(f"Solar predictions list is empty or invalid: {type(solar_preds_list)}")
            return ""
        
        model_info = solar_pred.get('model_info', {}) or {}
        first_item = solar_preds_list[0] if isinstance(solar_preds_list[0], dict) else {}
        last_item = solar_preds_list[-1] if isinstance(solar_preds_list[-1], dict) else {}
        
        # Extract efficiency - try multiple field names
        try:
            first_efficiency = float(first_item.get('efficiency_current') or first_item.get('efficiency') or first_item.get('efficiency_percent') or first_item.get('performance') or 100)
        except (ValueError, TypeError):
            first_efficiency = 100
        
        try:
            last_efficiency = float(last_item.get('efficiency_current') or last_item.get('efficiency') or last_item.get('efficiency_percent') or last_item.get('performance') or 100)
        except (ValueError, TypeError):
            last_efficiency = 100
        
        # Get degradation percent if available
        try:
            first_degradation = float(first_item.get('degradation_percent') or 0)
        except (ValueError, TypeError):
            first_degradation = 0
        
        try:
            last_degradation = float(last_item.get('degradation_percent') or 0)
        except (ValueError, TypeError):
            last_degradation = 0
        
        # Calculate annual degradation rate
        try:
            years = float(last_item.get('age_years') or len(solar_preds_list))
        except (ValueError, TypeError):
            years = len(solar_preds_list)
        
        if years > 0 and first_efficiency > 0:
            if last_degradation > 0 and first_degradation >= 0:
                degradation_rate = (last_degradation - first_degradation) / years
            else:
                degradation_rate = ((first_efficiency - last_efficiency) / first_efficiency * 100) / years if first_efficiency > 0 else 0
        else:
            degradation_rate = 0
        
        r2 = model_info.get('r2') or model_info.get('r2_score', 'N/A')
        try:
            mae = float(model_info.get('mae') or 0)
        except (ValueError, TypeError):
            mae = 0
        
        # Format R² value safely
        if isinstance(r2, (int, float)):
            r2_formatted = f"{r2:.3f}"
        else:
            r2_formatted = str(r2)
        
        solar_info = f"""
**Solar Panel Degradation Prediction:**
Current efficiency: {first_efficiency:.2f}% | Predicted efficiency at year {int(years)}: {last_efficiency:.2f}%
Annual degradation rate: {abs(degradation_rate):.3f}% per year | Model accuracy (R²): {r2_formatted}
Mean Error: ±{mae:.3f}% | Status: {'Within normal range (0.5-0.8%/year)' if 0.5 <= abs(degradation_rate) <= 0.8 else 'May require attention'}

Use these EXACT values in your insights: Current efficiency = {first_efficiency:.2f}%, Predicted efficiency = {last_efficiency:.2f}%, Degradation rate = {abs(degradation_rate):.3f}% per year
"""
        logger.info(f"Successfully extracted solar info: {len(solar_preds_list)} predictions, efficiency range: {first_efficiency:.2f}% - {last_efficiency:.2f}%")
        return solar_info
        
    except Exception as e:
        logger.error(f"Error extracting solar prediction info: {e}", exc_info=True)
        return ""

@router.post("/insights/solar-degradation", response_model=Dict)
async def generate_solar_insights(
    request: Dict,
    current_user: models.User = Depends(get_current_user_optional)
):
    """Generate actionable insights specifically for Solar Degradation prediction data"""
    
    if not llm:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    system_data = request.get("system_data", {})
    predictions = system_data.get('predictions', {})
    
    logger.info(f"=== Solar Degradation Insights Request ===")
    logger.info(f"system_data keys: {list(system_data.keys())}")
    logger.info(f"predictions type: {type(predictions)}, is_dict: {isinstance(predictions, dict)}")
    logger.info(f"predictions keys: {list(predictions.keys()) if isinstance(predictions, dict) else 'not a dict'}")
    
    # Extract solar data - check if predictions is wrapped or direct
    solar_data = predictions.get('solar', {}) if isinstance(predictions, dict) else {}
    
    # Also check if solar data is directly in system_data
    if not solar_data and system_data.get('solar'):
        solar_data = system_data.get('solar', {})
    
    logger.info(f"solar_data type: {type(solar_data)}, is_dict: {isinstance(solar_data, dict)}")
    if isinstance(solar_data, dict):
        logger.info(f"solar_data keys: {list(solar_data.keys())}")
        logger.info(f"solar_data has 'predictions': {'predictions' in solar_data}")
        if 'predictions' in solar_data:
            preds = solar_data.get('predictions')
            logger.info(f"solar_data.predictions type: {type(preds)}, is_list: {isinstance(preds, list)}, length: {len(preds) if isinstance(preds, list) else 'N/A'}")
    
    # Extract solar data
    solar_info = extract_solar_data({'solar': solar_data})
    
    if not solar_info or not solar_info.strip():
        error_msg = "No solar degradation prediction data available. Please ensure solar degradation prediction model is loaded and data is available."
        logger.warning(error_msg)
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": error_msg
        }
    
    system_prompt = """You are a solar panel maintenance expert. Analyze ONLY the Solar Degradation prediction data provided.

Generate 4-6 short, actionable insights as a numbered list. Each insight should:
- Be 1-2 sentences max
- Include specific efficiency percentages, degradation rates, and model accuracy from the data
- Provide clear action steps for solar panel maintenance or performance improvement
- Focus ONLY on solar panel health and efficiency
- Reference EXACT values like "Current efficiency is X%" or "Degradation rate is Y% per year"

Keep insights crisp, user-friendly, and practical. Use simple language. Always use the exact numbers from the prediction data provided."""

    human_prompt = f"""Analyze this Solar Degradation prediction data and provide short, actionable insights.

{solar_info}

CRITICAL REQUIREMENTS:
1. Use ONLY the specific numbers, values, and metrics provided in the data above
2. Reference exact values from the data - quote the actual numbers (e.g., "Current efficiency is X%", "Degradation rate is Y% per year")
3. Do NOT provide generic advice - every insight must reference specific numbers from the prediction data
4. Generate 4-6 crisp, specific insights as a numbered list
5. Each insight should be 1-2 sentences and include actual numbers from the data provided above

IMPORTANT: Extract and use the exact numerical values from the prediction data above. Do not make up numbers or provide generic recommendations."""

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
        logger.error(f"Error generating solar insights with OpenAI: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )

