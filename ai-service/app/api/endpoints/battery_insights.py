"""
Battery RUL Insights API Endpoint
Dedicated endpoint for generating insights from Battery RUL prediction data
"""

import os
import json
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
        logger.info("✅ OpenAI LLM configured for battery insights")
    else:
        logger.warning("⚠️ OPENAI_API_KEY not found")
        llm = None
except Exception as e:
    logger.error(f"⚠️ OpenAI LLM could not be configured: {e}")
    llm = None

router = APIRouter()

def extract_battery_data(predictions_data: Dict) -> str:
    """Extract battery prediction data and format for LLM"""
    try:
        battery_pred = predictions_data.get('battery', {})
        
        if not battery_pred or not isinstance(battery_pred, dict):
            logger.warning("Battery prediction data is not a dict or is None")
            return ""
        
        battery_preds_list = battery_pred.get('predictions')
        if not battery_preds_list or not isinstance(battery_preds_list, list) or len(battery_preds_list) == 0:
            logger.warning(f"Battery predictions list is empty or invalid: {type(battery_preds_list)}")
            return ""
        
        model_info = battery_pred.get('model_info', {}) or {}
        first_item = battery_preds_list[0] if isinstance(battery_preds_list[0], dict) else {}
        last_item = battery_preds_list[-1] if isinstance(battery_preds_list[-1], dict) else {}
        
        try:
            first_rul = float(first_item.get('rul_hours') or first_item.get('predicted_rul') or 0)
        except (ValueError, TypeError):
            first_rul = 0
        
        try:
            last_rul = float(last_item.get('rul_hours') or last_item.get('predicted_rul') or 0)
        except (ValueError, TypeError):
            last_rul = 0
        
        r2 = model_info.get('r2') or model_info.get('r2_score', 'N/A')
        mae = float(model_info.get('mae', 0) or 0)
        
        # Format R² value safely
        if isinstance(r2, (int, float)):
            r2_formatted = f"{r2:.3f}"
        else:
            r2_formatted = str(r2)
        
        battery_info = f"""
**Battery RUL (Remaining Useful Life) Prediction:**
Current RUL: {first_rul:.1f} hours | Predicted RUL at cycle {len(battery_preds_list)}: {last_rul:.1f} hours
Model accuracy (R²): {r2_formatted} | Mean Error: ±{mae:.2f} hours
Trend: {'Degrading' if first_rul > 0 and last_rul < first_rul * 0.9 else 'Stable'} | Total cycles analyzed: {len(battery_preds_list)}

Use these EXACT values in your insights: Current RUL = {first_rul:.1f} hours, Predicted RUL = {last_rul:.1f} hours
"""
        logger.info(f"Successfully extracted battery info: {len(battery_preds_list)} predictions, RUL range: {first_rul:.1f} - {last_rul:.1f}")
        return battery_info
        
    except Exception as e:
        logger.error(f"Error extracting battery prediction info: {e}", exc_info=True)
        return ""

@router.post("/insights/battery-rul", response_model=Dict)
async def generate_battery_insights(
    request: Dict,
    current_user: models.User = Depends(get_current_user_optional)
):
    """Generate actionable insights specifically for Battery RUL prediction data"""
    
    if not llm:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    system_data = request.get("system_data", {})
    predictions = system_data.get('predictions', {})
    
    logger.info(f"=== Battery RUL Insights Request ===")
    logger.info(f"system_data keys: {list(system_data.keys())}")
    logger.info(f"predictions type: {type(predictions)}, is_dict: {isinstance(predictions, dict)}")
    logger.info(f"predictions keys: {list(predictions.keys()) if isinstance(predictions, dict) else 'not a dict'}")
    
    # Extract battery data - check if predictions is wrapped or direct
    battery_data = predictions.get('battery', {}) if isinstance(predictions, dict) else {}
    
    # Also check if battery data is directly in system_data
    if not battery_data and system_data.get('battery'):
        battery_data = system_data.get('battery', {})
    
    logger.info(f"battery_data type: {type(battery_data)}, is_dict: {isinstance(battery_data, dict)}")
    if isinstance(battery_data, dict):
        logger.info(f"battery_data keys: {list(battery_data.keys())}")
        logger.info(f"battery_data has 'predictions': {'predictions' in battery_data}")
        if 'predictions' in battery_data:
            preds = battery_data.get('predictions')
            logger.info(f"battery_data.predictions type: {type(preds)}, is_list: {isinstance(preds, list)}, length: {len(preds) if isinstance(preds, list) else 'N/A'}")
        if 'model_info' in battery_data:
            logger.info(f"battery_data.model_info: {battery_data.get('model_info')}")
    
    # Extract battery data
    battery_info = extract_battery_data({'battery': battery_data})
    
    if not battery_info or not battery_info.strip():
        error_msg = "No battery prediction data available. Please ensure battery RUL prediction model is loaded and data is available."
        logger.warning(error_msg)
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": error_msg
        }
    
    system_prompt = """You are a battery maintenance expert. Analyze ONLY the Battery RUL prediction data provided.

Generate 4-6 short, actionable insights as a numbered list. Each insight should:
- Be 1-2 sentences max
- Include specific RUL hours, cycle counts, and model accuracy from the data
- Provide clear action steps for battery maintenance or optimization
- Focus ONLY on battery health and lifespan
- Reference EXACT values like "Current RUL is X hours" or "After Y cycles, RUL will be Z hours"

Keep insights crisp, user-friendly, and practical. Use simple language. Always use the exact numbers from the prediction data provided."""

    human_prompt = f"""Analyze this Battery RUL prediction data and provide short, actionable insights.

{battery_info}

CRITICAL REQUIREMENTS:
1. Use ONLY the specific numbers, values, and metrics provided in the data above
2. Reference exact values from the data - quote the actual numbers (e.g., "Current RUL is X hours")
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
        logger.error(f"Error generating battery insights with OpenAI: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )

