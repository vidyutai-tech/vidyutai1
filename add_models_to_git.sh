#!/bin/bash
# Script to add ML model files to Git for deployment

echo "🚀 Adding ML model files to Git for production deployment..."
echo ""

# Add required model files for dashboard endpoints
echo "📦 Adding Battery RUL models..."
git add ai-service/app/ml-models/battery_rul_model.joblib
git add ai-service/app/ml-models/battery_rul_scaler.joblib
git add ai-service/app/ml-models/battery_rul_metadata.json

echo "📦 Adding Solar Degradation models..."
git add ai-service/app/ml-models/solar_degradation_model.joblib
git add ai-service/app/ml-models/solar_degradation_scaler.joblib
git add ai-service/app/ml-models/solar_degradation_metadata.json

echo "📦 Adding Energy Loss models..."
git add ai-service/app/ml-models/energy_loss_model.joblib
git add ai-service/app/ml-models/energy_loss_scaler.joblib
git add ai-service/app/ml-models/energy_loss_metadata.json

# Add optional LSTM model if it exists
if [ -f "ai-service/app/ml-models/lstm_solar_forecast_model.keras" ]; then
    echo "📦 Adding LSTM Solar Forecast model..."
    git add ai-service/app/ml-models/lstm_solar_forecast_model.keras
    if [ -f "ai-service/app/ml-models/lstm_solar_scaler.joblib" ]; then
        git add ai-service/app/ml-models/lstm_solar_scaler.joblib
    fi
fi

# Add metadata and info files
echo "📦 Adding metadata files..."
git add ai-service/app/ml-models/*.json 2>/dev/null || true
git add ai-service/app/ml-models/*.txt 2>/dev/null || true

echo ""
echo "✅ Model files staged for commit"
echo ""
echo "📝 Next steps:"
echo "   1. Review staged files: git status"
echo "   2. Commit: git commit -m 'Add ML model files for production deployment'"
echo "   3. Push: git push"
echo "   4. Render will auto-deploy with models"
echo ""
echo "⚠️  Note: Total file size ~14MB (safe for Git, no LFS needed)"

