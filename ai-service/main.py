"""
VidyutAI AI Service - Main Entry Point
This module serves as the main entry point for the AI service,
providing real-time data analysis and insights for energy management.
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import local modules
from config import settings
from api.router import api_router
from core.data_processor import DataProcessor
from models.model_manager import ModelManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Import optimization router
try:
    from app.api.endpoints import optimization
    OPTIMIZATION_AVAILABLE = True
except ImportError:
    OPTIMIZATION_AVAILABLE = False
    logger.warning("Optimization router not available - app.api.endpoints.optimization not found")

# Import demand optimization router
try:
    from app.api.endpoints import demand_optimization
    DEMAND_OPTIMIZATION_AVAILABLE = True
    logger.info(f"✅ Demand optimization module imported successfully. Router: {demand_optimization.router}")
except ImportError as e:
    DEMAND_OPTIMIZATION_AVAILABLE = False
    logger.warning(f"⚠️ Demand optimization router not available - app.api.endpoints.demand_optimization not found: {e}")
except Exception as e:
    DEMAND_OPTIMIZATION_AVAILABLE = False
    logger.error(f"❌ Error importing demand optimization: {e}")

# Import forecasting router
try:
    from app.api.endpoints import forecasting
    FORECASTING_AVAILABLE = True
except ImportError:
    FORECASTING_AVAILABLE = False
    logger.warning("Forecasting router not available - app.api.endpoints.forecasting not found")

# Import actions router (for AI insights)
try:
    from app.api.endpoints import actions
    ACTIONS_AVAILABLE = True
except ImportError:
    ACTIONS_AVAILABLE = False
    logger.warning("Actions router not available - app.api.endpoints.actions not found")

# Import predictions router (for AI predictions)
try:
    from app.api.endpoints import predictions_new
    PREDICTIONS_AVAILABLE = True
except ImportError:
    PREDICTIONS_AVAILABLE = False
    logger.warning("Predictions router not available - app.api.endpoints.predictions_new not found")

# Import insights routers (for dedicated insight endpoints)
try:
    from app.api.endpoints import battery_insights, solar_insights, energy_loss_insights, forecast_insights
    INSIGHTS_AVAILABLE = True
except ImportError as e:
    INSIGHTS_AVAILABLE = False
    logger.warning(f"Insights routers not available - {e}")

# Import planning router
try:
    from app.api.endpoints import planning
    PLANNING_AVAILABLE = True
    logger.info("✅ Planning router imported successfully")
except ImportError as e:
    PLANNING_AVAILABLE = False
    logger.warning(f"⚠️ Planning router not available - {e}")
except Exception as e:
    PLANNING_AVAILABLE = False
    logger.error(f"❌ Error importing planning router: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="VidyutAI AI Service",
    description="AI-powered analytics for energy management systems",
    version="0.1.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Include planning router if available (register with /api/v1 prefix)
if PLANNING_AVAILABLE:
    try:
        app.include_router(planning.router, prefix="/api/v1", tags=["Planning"])
        logger.info("✅ Planning router registered at /api/v1/planning/recommend")
    except Exception as e:
        logger.error(f"❌ Failed to register planning router: {e}")
else:
    logger.warning("⚠️ Planning router not available - skipping registration")

# Include optimization router if available
if OPTIMIZATION_AVAILABLE:
    app.include_router(optimization.router, prefix="/api/v1", tags=["Source Optimization"])
    logger.info("Optimization router registered at /api/v1/optimize")

# Include demand optimization router if available
if DEMAND_OPTIMIZATION_AVAILABLE:
    try:
        app.include_router(demand_optimization.router, prefix="/api/v1", tags=["Demand Optimization"])
        logger.info("✅ Demand optimization router registered at /api/v1/demand-optimize")
        # Log all routes in the router for debugging
        for route in demand_optimization.router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                logger.info(f"   Route: {list(route.methods)} /api/v1{route.path}")
    except Exception as e:
        logger.error(f"❌ Failed to register demand optimization router: {e}")
else:
    logger.warning("⚠️ Demand optimization router not available - skipping registration")

# Include forecasting router if available
if FORECASTING_AVAILABLE:
    app.include_router(forecasting.router, prefix="/api/v1", tags=["Forecasting"])
    logger.info("Forecasting router registered at /api/v1/forecast/*")

# Include actions router if available (for AI insights)
if ACTIONS_AVAILABLE:
    app.include_router(actions.router, prefix="/api/v1", tags=["Actions"])
    logger.info("Actions router registered at /api/v1/actions/*")

# Include predictions router if available (for AI predictions)
if PREDICTIONS_AVAILABLE:
    app.include_router(predictions_new.router, prefix="/api/v1", tags=["AI Predictions"])
    logger.info("Predictions router registered at /api/v1/predictions/*")

# Include dedicated insights routers if available
if INSIGHTS_AVAILABLE:
    app.include_router(battery_insights.router, prefix="/api/v1", tags=["Insights - Battery RUL"])
    app.include_router(solar_insights.router, prefix="/api/v1", tags=["Insights - Solar Degradation"])
    app.include_router(energy_loss_insights.router, prefix="/api/v1", tags=["Insights - Energy Loss"])
    app.include_router(forecast_insights.router, prefix="/api/v1", tags=["Insights - Energy Forecast"])
    logger.info("Insights routers registered at /api/v1/insights/*")

# Initialize components
data_processor = None
model_manager = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global data_processor, model_manager
    
    logger.info("Starting VidyutAI AI Service...")
    
    try:
        # Initialize data processor
        data_processor = DataProcessor()
        logger.info("Data processor initialized")
        
        # Initialize model manager
        model_manager = ModelManager()
        logger.info("Model manager initialized")
        
        # Load prediction models in background (non-blocking)
        # This prevents blocking the health check endpoint during deployment
        if PREDICTIONS_AVAILABLE:
            import asyncio
            from app.api.endpoints import predictions_new
            async def load_models_background():
                try:
                    logger.info("Loading prediction models in background...")
                    predictions_new.load_prediction_models()
                    logger.info("Prediction models loaded successfully")
                except Exception as e:
                    logger.warning(f"Error loading prediction models in background: {e}")
                    # Don't fail startup if model loading fails - they can be loaded lazily
            
            # Schedule background task (non-blocking)
            asyncio.create_task(load_models_background())
        
        logger.info("VidyutAI AI Service started successfully")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down VidyutAI AI Service...")
    
    # Clean up resources here
    
    logger.info("VidyutAI AI Service shut down successfully")

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "VidyutAI AI Service",
        "status": "running",
        "version": "0.1.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Run the application with increased timeouts for ML predictions
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        timeout_keep_alive=120,  # Keep connections alive for 2 minutes
        timeout_graceful_shutdown=30  # Graceful shutdown timeout
    )