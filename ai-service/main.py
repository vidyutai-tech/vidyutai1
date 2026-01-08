"""
VidyutAI AI Service - Backward Compatibility Entry Point
This file is kept for backward compatibility. The actual application is in app/main.py

For new deployments, use: uvicorn app.main:app
For local development from root: python main.py (will use app.main:app)
"""

# Import the app from app.main for backward compatibility
from app.main import app

# Re-export app for backward compatibility
__all__ = ['app']

# For running directly with: python main.py
if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get port from environment or use default
    port = int(os.getenv("PORT", 8000))
    
    # Run the application using app.main:app
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        timeout_keep_alive=120,
        timeout_graceful_shutdown=30
    )
