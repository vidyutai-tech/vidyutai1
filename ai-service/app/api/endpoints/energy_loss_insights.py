"""
Energy Loss Insights API Endpoint
Dedicated endpoint for generating insights from Energy Loss prediction data
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
        logger.info("✅ OpenAI LLM configured for energy loss insights")
    else:
        logger.warning("⚠️ OPENAI_API_KEY not found")
        llm = None
except Exception as e:
    logger.error(f"⚠️ OpenAI LLM could not be configured: {e}")
    llm = None

router = APIRouter()

def extract_loss_data(predictions_data: Dict) -> str:
    """Extract energy loss prediction data and format for LLM"""
    try:
        loss_pred = predictions_data.get('loss', {})
        
        if not loss_pred or not isinstance(loss_pred, dict):
            logger.warning("Energy loss prediction data is not a dict or is None")
            return ""
        
        loss_preds_list = loss_pred.get('predictions')
        if not loss_preds_list or not isinstance(loss_preds_list, list) or len(loss_preds_list) == 0:
            logger.warning(f"Energy loss predictions list is empty or invalid: {type(loss_preds_list)}")
            return ""
        
        model_info = loss_pred.get('model_info', {}) or {}
        
        # Try to get loss percentage values
        loss_values = []
        for p in loss_preds_list:
            if isinstance(p, dict):
                loss_val = p.get('loss_percent') or p.get('energy_loss') or p.get('predicted_loss') or 0
                try:
                    loss_values.append(float(loss_val))
                except (ValueError, TypeError):
                    pass
        
        if not loss_values:
            logger.warning("No valid loss percentage values found in predictions")
            return ""
        
        avg_loss = sum(loss_values) / len(loss_values)
        max_loss = max(loss_values)
        min_loss = min(loss_values)
        r2 = model_info.get('r2') or model_info.get('r2_score', 'N/A')
        mae = model_info.get('mae', 0)
        
        # Format R² value safely
        if isinstance(r2, (int, float)):
            r2_formatted = f"{r2:.3f}"
        else:
            r2_formatted = str(r2)
        
        loss_info = f"""
**Energy Loss Analysis Prediction:**
Average loss: {avg_loss:.2f}% | Maximum loss: {max_loss:.2f}% | Minimum loss: {min_loss:.2f}%
Model accuracy (R²): {r2_formatted} | Mean Error: ±{mae:.3f}%
Status: {'Within normal range (2-8%)' if 2 <= avg_loss <= 8 else 'May require optimization'} | Total prediction points: {len(loss_preds_list)}

Use these EXACT values in your insights: Average loss = {avg_loss:.2f}%, Maximum loss = {max_loss:.2f}%, Minimum loss = {min_loss:.2f}%
"""
        logger.info(f"Successfully extracted energy loss info: {len(loss_preds_list)} predictions, loss range: {min_loss:.2f}% - {max_loss:.2f}%")
        return loss_info
        
    except Exception as e:
        logger.error(f"Error extracting energy loss prediction info: {e}", exc_info=True)
        return ""

@router.post("/insights/energy-loss", response_model=Dict)
async def generate_energy_loss_insights(
    request: Dict,
    current_user: models.User = Depends(get_current_user_optional)
):
    """Generate actionable insights specifically for Energy Loss prediction data"""
    
    if not llm:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API is not configured. Please set OPENAI_API_KEY environment variable."
        )
    
    system_data = request.get("system_data", {})
    predictions = system_data.get('predictions', {})
    
    logger.info(f"=== Energy Loss Insights Request ===")
    logger.info(f"system_data keys: {list(system_data.keys())}")
    logger.info(f"predictions type: {type(predictions)}, is_dict: {isinstance(predictions, dict)}")
    logger.info(f"predictions keys: {list(predictions.keys()) if isinstance(predictions, dict) else 'not a dict'}")
    
    # Extract loss data - check if predictions is wrapped or direct
    loss_data = predictions.get('loss', {}) if isinstance(predictions, dict) else {}
    
    # Also check if loss data is directly in system_data
    if not loss_data and system_data.get('loss'):
        loss_data = system_data.get('loss', {})
    
    logger.info(f"loss_data type: {type(loss_data)}, is_dict: {isinstance(loss_data, dict)}")
    if isinstance(loss_data, dict):
        logger.info(f"loss_data keys: {list(loss_data.keys())}")
        logger.info(f"loss_data has 'predictions': {'predictions' in loss_data}")
        if 'predictions' in loss_data:
            preds = loss_data.get('predictions')
            logger.info(f"loss_data.predictions type: {type(preds)}, is_list: {isinstance(preds, list)}, length: {len(preds) if isinstance(preds, list) else 'N/A'}")
    
    # Extract loss data
    loss_info = extract_loss_data({'loss': loss_data})
    
    if not loss_info or not loss_info.strip():
        error_msg = "No energy loss prediction data available. Please ensure energy loss prediction model is loaded and data is available."
        logger.warning(error_msg)
        return {
            "success": False,
            "insights": "",
            "generated_at": datetime.now().isoformat(),
            "fallback": True,
            "message": error_msg
        }
    
    system_prompt = """You are an energy efficiency expert. Analyze ONLY the Energy Loss prediction data provided.

Generate 4-6 short, actionable insights as a numbered list. Each insight should:
- Be 1-2 sentences max
- Include specific percentages and load values from the data
- Provide clear action steps for energy loss reduction
- Focus ONLY on energy loss optimization
- Reference EXACT values like "Average loss is X%" or "At Y kW load, loss is Z%"

Keep insights crisp, user-friendly, and practical. Use simple language. Always use the exact numbers from the prediction data provided."""

    human_prompt = f"""Analyze this Energy Loss prediction data and provide short, actionable insights.

{loss_info}

CRITICAL REQUIREMENTS:
1. Use ONLY the specific numbers, values, and metrics provided in the data above
2. Reference exact values from the data - quote the actual numbers (e.g., "Average loss is X%", "At Y kW load, loss is Z%")
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
        logger.error(f"Error generating energy loss insights with OpenAI: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate insights: {str(e)}"
        )

