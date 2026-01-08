"""
VidyutAI AI Service - Main Entry Point
This is the primary entry point for the AI service, providing real-time data analysis
and insights for energy management systems.
"""

import os
import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.api import api_router
from app.api.endpoints import (
    optimization, demand_optimization, forecasting, predictions_new,
    battery_insights, solar_insights, energy_loss_insights, forecast_insights,
    solar_degradation, planning, actions
)
from app.services.websocket_manager import websocket_handler

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app instance
app = FastAPI(
    title="VidyutAI AI Service",
    description="AI-powered analytics for energy management systems",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include the main API router (includes auth, sites, assets, data, actions, planning, etc.)
app.include_router(api_router, prefix="/api/v1")

# Import and register routers with error handling
# Optimization router
try:
    app.include_router(optimization.router, prefix="/api/v1", tags=["Source Optimization"])
    logger.info("✅ Optimization router registered at /api/v1/optimize")
except Exception as e:
    logger.warning(f"⚠️ Optimization router not available: {e}")

# Demand optimization router
try:
    app.include_router(demand_optimization.router, prefix="/api/v1", tags=["Demand Optimization"])
    logger.info("✅ Demand optimization router registered at /api/v1/demand-optimize")
except Exception as e:
    logger.warning(f"⚠️ Demand optimization router not available: {e}")

# Forecasting router
try:
    app.include_router(forecasting.router, prefix="/api/v1", tags=["Forecasting"])
    logger.info("✅ Forecasting router registered at /api/v1/forecast/*")
except Exception as e:
    logger.warning(f"⚠️ Forecasting router not available: {e}")

# Predictions router (for AI predictions)
try:
    app.include_router(predictions_new.router, prefix="/api/v1", tags=["AI Predictions"])
    logger.info("✅ Predictions router registered at /api/v1/predictions/*")
except Exception as e:
    logger.warning(f"⚠️ Predictions router not available: {e}")

# Dedicated insights routers for specific prediction types
try:
    app.include_router(battery_insights.router, prefix="/api/v1", tags=["Insights - Battery RUL"])
    app.include_router(solar_insights.router, prefix="/api/v1", tags=["Insights - Solar Degradation"])
    app.include_router(energy_loss_insights.router, prefix="/api/v1", tags=["Insights - Energy Loss"])
    app.include_router(forecast_insights.router, prefix="/api/v1", tags=["Insights - Energy Forecast"])
    logger.info("✅ Insights routers registered at /api/v1/insights/*")
except Exception as e:
    logger.warning(f"⚠️ Insights routers not available: {e}")

# Solar degradation router (for case studies)
try:
    app.include_router(solar_degradation.router, prefix="/api/v1", tags=["Case Studies"])
    logger.info("✅ Solar degradation router registered at /api/v1/solar-panel-degradation")
except Exception as e:
    logger.warning(f"⚠️ Solar degradation router not available: {e}")

# Planning router (already included in api_router, but can be registered separately if needed)
# Note: Planning is already included via api_router, so this is optional
try:
    # Only register separately if not already included via api_router
    # app.include_router(planning.router, prefix="/api/v1", tags=["Planning"])
    logger.info("✅ Planning router available (included via api_router)")
except Exception as e:
    logger.warning(f"⚠️ Planning router not available: {e}")

# Actions router (already included in api_router, but can be registered separately if needed)
# Note: Actions is already included via api_router, so this is optional
try:
    # Only register separately if not already included via api_router
    # app.include_router(actions.router, prefix="/api/v1", tags=["Actions"])
    logger.info("✅ Actions router available (included via api_router)")
except Exception as e:
    logger.warning(f"⚠️ Actions router not available: {e}")

# Define the WebSocket route
@app.websocket("/ws/site/{site_id}")
async def websocket_endpoint(websocket: WebSocket, site_id: str):
    await websocket_handler(websocket, site_id)

# Startup event - load prediction models in background
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting VidyutAI AI Service...")
    
    try:
        # Load prediction models in background (non-blocking)
        # This prevents blocking the health check endpoint during deployment
        import asyncio
        try:
            async def load_models_background():
                try:
                    logger.info("Loading prediction models in background...")
                    predictions_new.load_prediction_models()
                    logger.info("✅ Prediction models loaded successfully")
                except Exception as e:
                    logger.warning(f"⚠️ Error loading prediction models in background: {e}")
                    # Don't fail startup if model loading fails - they can be loaded lazily
            
            # Schedule background task (non-blocking)
            asyncio.create_task(load_models_background())
        except Exception as e:
            logger.warning(f"⚠️ Could not schedule model loading: {e}")
        
        logger.info("✅ VidyutAI AI Service started successfully")
    except Exception as e:
        logger.error(f"❌ Error during startup: {str(e)}")
        # Don't raise - allow service to start even if some components fail

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down VidyutAI AI Service...")
    logger.info("✅ VidyutAI AI Service shut down successfully")

# Root endpoint for basic health check
@app.get("/", tags=["Root"])
async def read_root():
    return {
        "service": "VidyutAI AI Service",
        "status": "running",
        "version": "1.0.0"
    }

# Health check endpoint for deployment monitoring
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {"status": "healthy", "service": "VidyutAI AI Service"}

# For local development: allow running with python -m app.main
if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Run the application with increased timeouts for ML predictions
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        timeout_keep_alive=120,  # Keep connections alive for 2 minutes
        timeout_graceful_shutdown=30  # Graceful shutdown timeout
    )
