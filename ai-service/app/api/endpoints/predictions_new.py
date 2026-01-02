"""
AI Predictions API Endpoints
Provides inference for:
1. Battery RUL Prediction
2. Solar Panel Degradation
3. Energy Loss Analysis
4. XAI (Explainable AI) - Feature Importance and Local Explanations
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import json
import asyncio

from app.api.deps import get_current_user, get_current_user_optional
from app.models import pydantic_models as models

router = APIRouter()
# Use absolute path relative to this file's location
# From app/api/endpoints/predictions_new.py -> app/ml-models
_base_path = Path(__file__).resolve().parent.parent.parent
models_dir = _base_path / "ml-models"

# Global models dict
prediction_models = {}
_models_loading_lock = asyncio.Lock()  # Async lock to prevent concurrent loading

# Load models on startup
def load_prediction_models():
    """Load all prediction models"""
    global prediction_models
    
    print(f"🔍 Loading prediction models from: {models_dir}")
    print(f"🔍 Models directory exists: {models_dir.exists()}")
    
    try:
        # Battery RUL Model
        battery_model_path = models_dir / "battery_rul_model.joblib"
        battery_scaler_path = models_dir / "battery_rul_scaler.joblib"
        battery_meta_path = models_dir / "battery_rul_metadata.json"
        
        print(f"🔍 Battery model path: {battery_model_path.exists()}, scaler: {battery_scaler_path.exists()}, meta: {battery_meta_path.exists()}")
        
        if battery_model_path.exists() and battery_scaler_path.exists() and battery_meta_path.exists():
            try:
                prediction_models['battery_rul'] = {
                    'model': joblib.load(battery_model_path),
                    'scaler': joblib.load(battery_scaler_path),
                    'metadata': json.load(open(battery_meta_path))
                }
                print("✅ Battery RUL Model loaded successfully")
            except Exception as e:
                print(f"❌ Error loading Battery RUL model: {e}")
                import traceback
                print(f"Full error: {traceback.format_exc()}")
        else:
            print(f"⚠️ Battery RUL model files not found. Model: {battery_model_path.exists()}, Scaler: {battery_scaler_path.exists()}, Metadata: {battery_meta_path.exists()}")
        
        # Solar Degradation Model  
        solar_model_path = models_dir / "solar_degradation_model.joblib"
        solar_scaler_path = models_dir / "solar_degradation_scaler.joblib"
        solar_meta_path = models_dir / "solar_degradation_metadata.json"
        
        print(f"🔍 Solar model path: {solar_model_path.exists()}, scaler: {solar_scaler_path.exists()}, meta: {solar_meta_path.exists()}")
        
        if solar_model_path.exists() and solar_scaler_path.exists() and solar_meta_path.exists():
            try:
                prediction_models['solar_degradation'] = {
                    'model': joblib.load(solar_model_path),
                    'scaler': joblib.load(solar_scaler_path),
                    'metadata': json.load(open(solar_meta_path))
                }
                print("✅ Solar Degradation Model loaded successfully")
            except Exception as e:
                print(f"❌ Error loading Solar Degradation model: {e}")
                import traceback
                print(f"Full error: {traceback.format_exc()}")
        else:
            print(f"⚠️ Solar Degradation model files not found. Model: {solar_model_path.exists()}, Scaler: {solar_scaler_path.exists()}, Metadata: {solar_meta_path.exists()}")
        
        # Energy Loss Model
        loss_model_path = models_dir / "energy_loss_model.joblib"
        loss_scaler_path = models_dir / "energy_loss_scaler.joblib"
        loss_meta_path = models_dir / "energy_loss_metadata.json"
        
        print(f"🔍 Energy Loss model path: {loss_model_path.exists()}, scaler: {loss_scaler_path.exists()}, meta: {loss_meta_path.exists()}")
        
        if loss_model_path.exists() and loss_scaler_path.exists() and loss_meta_path.exists():
            try:
                prediction_models['energy_loss'] = {
                    'model': joblib.load(loss_model_path),
                    'scaler': joblib.load(loss_scaler_path),
                    'metadata': json.load(open(loss_meta_path))
                }
                print("✅ Energy Loss Model loaded successfully")
            except Exception as e:
                print(f"❌ Error loading Energy Loss model: {e}")
                import traceback
                print(f"Full error: {traceback.format_exc()}")
        else:
            print(f"⚠️ Energy Loss model files not found. Model: {loss_model_path.exists()}, Scaler: {loss_scaler_path.exists()}, Metadata: {loss_meta_path.exists()}")
        
        print(f"📊 Total models loaded: {len(prediction_models)}")
        print(f"📊 Loaded model keys: {list(prediction_models.keys())}")
            
    except ImportError as e:
        print(f"⚠️ Error loading prediction models (missing module): {e}")
        print("💡 This may be due to scikit-learn version incompatibility. Models were trained with scikit-learn 1.3.2.")
        print("💡 Try: pip install scikit-learn==1.3.2")
        import traceback
        print(f"Full error: {traceback.format_exc()}")
    except Exception as e:
        print(f"⚠️ Error loading prediction models: {e}")
        import traceback
        print(f"Full error: {traceback.format_exc()}")

# Helper function to ensure models are loaded (lazy loading)
async def ensure_models_loaded():
    """Ensure prediction models are loaded (lazy loading) - thread-safe and non-blocking"""
    global prediction_models
    # Check if already loaded (fast path)
    if prediction_models:
        return
    
    # Acquire lock to prevent concurrent loading
    async with _models_loading_lock:
        # Double-check after acquiring lock (another request might have loaded them)
        if prediction_models:
            return
        
        # Load models in executor to avoid blocking event loop
        # This is safe because it's protected by the lock (only one request loads)
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, load_prediction_models)
        except Exception as e:
            # Log error but don't crash - models will be unavailable
            print(f"⚠️ Error loading prediction models: {e}")
            import traceback
            print(f"Full error: {traceback.format_exc()}")

# Models will be loaded lazily on first request or in background during startup
# This prevents blocking the health check endpoint during deployment

# Pydantic Models
class BatteryRULInput(BaseModel):
    cycle_count: float = Field(..., description="Number of charge/discharge cycles")
    temperature_c: float = Field(..., description="Battery temperature in Celsius")
    voltage_v: float = Field(..., description="Battery voltage")
    current_a: float = Field(..., description="Current in Amperes")
    soc_percent: float = Field(..., description="State of Charge percentage")
    discharge_rate: float = Field(..., description="C-rate for discharge")
    charge_rate: float = Field(..., description="C-rate for charge")
    age_days: int = Field(..., description="Battery age in days")

class SolarDegradationInput(BaseModel):
    age_years: float = Field(..., description="Solar panel age in years")
    irradiance_wm2: float = Field(..., description="Solar irradiance W/m²")
    temperature_c: float = Field(..., description="Panel temperature in Celsius")
    dust_index: float = Field(..., description="Dust accumulation index 0-100")
    humidity_percent: float = Field(..., description="Humidity percentage")
    tilt_angle_deg: float = Field(..., description="Panel tilt angle in degrees")
    efficiency_initial: float = Field(..., description="Initial efficiency percentage")

class EnergyLossInput(BaseModel):
    load_kw: float = Field(..., description="Load in kilowatts")
    voltage_v: float = Field(..., description="System voltage")
    current_a: float = Field(..., description="Current in Amperes")
    power_factor: float = Field(..., description="Power factor 0-1")
    cable_length_m: float = Field(..., description="Cable length in meters")
    transformer_load_percent: float = Field(..., description="Transformer loading percentage")
    ambient_temp_c: float = Field(..., description="Ambient temperature")
    frequency_hz: float = Field(..., description="Frequency in Hz")

# API Endpoints

@router.post("/predictions/battery-rul")
async def predict_battery_rul(
    input_data: BatteryRULInput,
    current_user: models.User = Depends(get_current_user)
):
    """Predict Battery Remaining Useful Life"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'battery_rul' not in prediction_models:
        raise HTTPException(status_code=503, detail="Battery RUL model not available. Run training script first.")
    
    model_data = prediction_models['battery_rul']
    features = model_data['metadata']['features']
    
    # Prepare input
    input_df = pd.DataFrame([[
        input_data.cycle_count,
        input_data.temperature_c,
        input_data.voltage_v,
        input_data.current_a,
        input_data.soc_percent,
        input_data.discharge_rate,
        input_data.charge_rate,
        input_data.age_days
    ]], columns=features)
    
    # Scale and predict
    input_scaled = model_data['scaler'].transform(input_df)
    prediction = model_data['model'].predict(input_scaled)[0]
    
    # Calculate confidence interval (95%)
    rmse = model_data['metadata']['metrics']['rmse']
    ci_lower = max(0, prediction - 1.96 * rmse)
    ci_upper = prediction + 1.96 * rmse
    
    return {
        'success': True,
        'prediction': {
            'rul_hours': float(prediction),
            'rul_days': float(prediction / 24),
            'confidence_interval': {
                'lower': float(ci_lower),
                'upper': float(ci_upper)
            }
        },
        'model_info': {
            'type': model_data['metadata']['model_type'],
            'r2_score': model_data['metadata']['metrics']['r2'],
            'mae': model_data['metadata']['metrics']['mae']
        },
        'health_status': 'Good' if prediction > 2000 else ('Warning' if prediction > 500 else 'Critical')
    }

@router.post("/predictions/solar-degradation")
async def predict_solar_degradation(
    input_data: SolarDegradationInput,
    current_user: models.User = Depends(get_current_user)
):
    """Predict Solar Panel Degradation"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'solar_degradation' not in prediction_models:
        raise HTTPException(status_code=503, detail="Solar degradation model not available")
    
    model_data = prediction_models['solar_degradation']
    features = model_data['metadata']['features']
    
    # Prepare input
    input_df = pd.DataFrame([[
        input_data.age_years,
        input_data.irradiance_wm2,
        input_data.temperature_c,
        input_data.dust_index,
        input_data.humidity_percent,
        input_data.tilt_angle_deg,
        input_data.efficiency_initial
    ]], columns=features)
    
    # Scale and predict
    input_scaled = model_data['scaler'].transform(input_df)
    degradation = model_data['model'].predict(input_scaled)[0]
    
    # Calculate current efficiency
    current_efficiency = input_data.efficiency_initial * (1 - degradation / 100)
    
    # Calculate confidence interval
    rmse = model_data['metadata']['metrics']['rmse']
    ci_lower = max(0, degradation - 1.96 * rmse)
    ci_upper = min(100, degradation + 1.96 * rmse)
    
    return {
        'success': True,
        'prediction': {
            'degradation_percent': float(degradation),
            'current_efficiency': float(current_efficiency),
            'initial_efficiency': input_data.efficiency_initial,
            'confidence_interval': {
                'lower': float(ci_lower),
                'upper': float(ci_upper)
            }
        },
        'model_info': {
            'type': model_data['metadata']['model_type'],
            'r2_score': model_data['metadata']['metrics']['r2'],
            'mae': model_data['metadata']['metrics']['mae']
        },
        'performance_status': 'Excellent' if degradation < 10 else ('Good' if degradation < 20 else 'Needs Maintenance')
    }

@router.post("/predictions/energy-loss")
async def predict_energy_loss(
    input_data: EnergyLossInput,
    current_user: models.User = Depends(get_current_user)
):
    """Predict Energy Loss in Distribution System"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'energy_loss' not in prediction_models:
        raise HTTPException(status_code=503, detail="Energy loss model not available")
    
    model_data = prediction_models['energy_loss']
    features = model_data['metadata']['features']
    
    # Prepare input
    input_df = pd.DataFrame([[
        input_data.load_kw,
        input_data.voltage_v,
        input_data.current_a,
        input_data.power_factor,
        input_data.cable_length_m,
        input_data.transformer_load_percent,
        input_data.ambient_temp_c,
        input_data.frequency_hz
    ]], columns=features)
    
    # Scale and predict
    input_scaled = model_data['scaler'].transform(input_df)
    loss_percent = model_data['model'].predict(input_scaled)[0]
    
    # Calculate actual loss
    loss_kw = input_data.load_kw * (loss_percent / 100)
    annual_loss_kwh = loss_kw * 8760  # Annual hours
    annual_cost_inr = annual_loss_kwh * 7  # ₹7/kWh average
    
    # Calculate confidence interval
    rmse = model_data['metadata']['metrics']['rmse']
    ci_lower = max(0, loss_percent - 1.96 * rmse)
    ci_upper = min(100, loss_percent + 1.96 * rmse)
    
    return {
        'success': True,
        'prediction': {
            'loss_percent': float(loss_percent),
            'loss_kw': float(loss_kw),
            'annual_loss_kwh': float(annual_loss_kwh),
            'annual_cost_inr': float(annual_cost_inr),
            'confidence_interval': {
                'lower': float(ci_lower),
                'upper': float(ci_upper)
            }
        },
        'model_info': {
            'type': model_data['metadata']['model_type'],
            'r2_score': model_data['metadata']['metrics']['r2'],
            'mae': model_data['metadata']['metrics']['mae']
        },
        'efficiency_status': 'Excellent' if loss_percent < 3 else ('Good' if loss_percent < 6 else 'Needs Optimization')
    }

@router.get("/predictions/battery-rul/dashboard")
async def get_battery_rul_dashboard():
    """Get Battery RUL dashboard with sample predictions"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'battery_rul' not in prediction_models:
        # Return fallback data instead of error
        return {
            'success': True,
            'predictions': [
                {
                    'cycle_count': i * 60,
                    'age_days': i * 30,
                    'rul_hours': float(5000 - (i * 60 * 2)),
                    'rul_days': float((5000 - (i * 60 * 2)) / 24),
                    'fallback': True
                }
                for i in range(50)
            ],
            'model_info': {'note': 'Using fallback predictions - model not available'},
            'fallback': True
        }
    
    model_data = prediction_models['battery_rul']
    
    # Generate sample predictions for visualization
    np.random.seed(42)
    n_samples = 50
    
    predictions = []
    for i in range(n_samples):
        try:
            cycle_count = i * 60  # Progressive cycles
            temp = np.random.normal(25, 5)
            age_days = i * 30  # Progressive aging
            
            input_df = pd.DataFrame([[
                cycle_count, temp, 48, 20, 75, 0.5, 0.5, age_days
            ]], columns=model_data['metadata']['features'])
            
            input_scaled = model_data['scaler'].transform(input_df)
            rul = model_data['model'].predict(input_scaled)[0]
            
            predictions.append({
                'cycle_count': int(cycle_count),
                'age_days': int(age_days),
                'rul_hours': float(rul),
                'rul_days': float(rul / 24)
            })
        except (AttributeError, ValueError, ImportError, TypeError) as e:
            # Handle scikit-learn version incompatibility or missing modules
            # Generate fallback prediction based on cycle count
            estimated_rul_hours = max(1000, 5000 - (cycle_count * 2))
            predictions.append({
                'cycle_count': int(cycle_count),
                'age_days': int(age_days),
                'rul_hours': float(estimated_rul_hours),
                'rul_days': float(estimated_rul_hours / 24),
                'fallback': True
            })
    
    return {
        'success': True,
        'predictions': predictions,
        'model_info': model_data['metadata']['metrics']
    }

@router.get("/predictions/solar-degradation/dashboard")
async def get_solar_degradation_dashboard():
    """Get Solar Degradation dashboard with sample predictions"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'solar_degradation' not in prediction_models:
        # Return fallback data instead of error
        return {
            'success': True,
            'predictions': [
                {
                    'age_years': age,
                    'degradation_percent': float(age * 0.5),
                    'efficiency_current': float(18 * (1 - (age * 0.5) / 100)),
                    'efficiency_initial': 18.0,
                    'fallback': True
                }
                for age in range(0, 26)
            ],
            'model_info': {'note': 'Using fallback predictions - model not available'},
            'fallback': True
        }
    
    model_data = prediction_models['solar_degradation']
    
    # Generate sample predictions over panel lifetime
    predictions = []
    for age in range(0, 26):  # 0-25 years
        try:
            input_df = pd.DataFrame([[
                age, 800, 35, 30, 60, 20, 18
            ]], columns=model_data['metadata']['features'])
            
            input_scaled = model_data['scaler'].transform(input_df)
            degradation = model_data['model'].predict(input_scaled)[0]
            current_eff = 18 * (1 - degradation / 100)
            
            predictions.append({
                'age_years': age,
                'degradation_percent': float(degradation),
                'efficiency_current': float(current_eff),
                'efficiency_initial': 18.0
            })
        except (AttributeError, ValueError, ImportError, TypeError) as e:
            # Handle scikit-learn version incompatibility or missing modules
            # Generate fallback prediction based on typical degradation rate
            degradation_fallback = age * 0.5  # 0.5% per year typical
            current_eff = 18 * (1 - degradation_fallback / 100)
            predictions.append({
                'age_years': age,
                'degradation_percent': float(degradation_fallback),
                'efficiency_current': float(current_eff),
                'efficiency_initial': 18.0,
                'fallback': True
            })
    
    return {
        'success': True,
        'predictions': predictions,
        'model_info': model_data['metadata']['metrics']
    }

@router.get("/predictions/energy-loss/dashboard")
async def get_energy_loss_dashboard():
    """Get Energy Loss dashboard with sample predictions"""
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if 'energy_loss' not in prediction_models:
        # Return fallback data instead of error
        load_values = np.linspace(50, 500, 30)
        return {
            'success': True,
            'predictions': [
                {
                    'load_kw': float(load),
                    'loss_percent': float(5.0 + (load / 100) * 0.5),
                    'loss_kw': float(load * (5.0 + (load / 100) * 0.5) / 100),
                    'efficiency_percent': float(100 - (5.0 + (load / 100) * 0.5)),
                    'fallback': True
                }
                for load in load_values
            ],
            'model_info': {'note': 'Using fallback predictions - model not available'},
            'fallback': True
        }
    
    model_data = prediction_models['energy_loss']
    
    # Generate predictions for different load scenarios
    predictions = []
    load_values = np.linspace(50, 500, 30)
    
    for load in load_values:
        try:
            voltage = 415
            current = load * 1000 / (voltage * np.sqrt(3) * 0.9)
            
            input_df = pd.DataFrame([[
                load, voltage, current, 0.9, 200, 75, 30, 50
            ]], columns=model_data['metadata']['features'])
            
            input_scaled = model_data['scaler'].transform(input_df)
            loss_percent = model_data['model'].predict(input_scaled)[0]
            loss_kw = load * (loss_percent / 100)
            
            predictions.append({
                'load_kw': float(load),
                'loss_percent': float(loss_percent),
                'loss_kw': float(loss_kw),
                'efficiency_percent': float(100 - loss_percent)
            })
        except (AttributeError, ValueError, ImportError, TypeError) as e:
            # Handle scikit-learn version incompatibility or missing modules
            # Generate fallback prediction based on typical loss percentage
            loss_percent_fallback = 5.0 + (load / 100) * 0.5  # 5-7.5% typical range
            loss_kw = load * (loss_percent_fallback / 100)
            predictions.append({
                'load_kw': float(load),
                'loss_percent': float(loss_percent_fallback),
                'loss_kw': float(loss_kw),
                'efficiency_percent': float(100 - loss_percent_fallback),
                'fallback': True
            })
    
    return {
        'success': True,
        'predictions': predictions,
        'model_info': model_data['metadata']['metrics']
    }

# ========== XAI (Explainable AI) Endpoints ==========

def get_feature_importance(model, model_type: str) -> Dict[str, Any]:
    """Extract feature importance from tree-based models"""
    try:
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            return {
                'method': 'feature_importances_',
                'importances': importances.tolist() if hasattr(importances, 'tolist') else list(importances)
            }
        else:
            return {
                'method': 'not_available',
                'importances': []
            }
    except Exception as e:
        return {
            'method': 'error',
            'error': str(e),
            'importances': []
        }

def calculate_local_contribution(model, scaler, features: List[str], input_values: np.ndarray, prediction: float) -> Dict[str, Any]:
    """Calculate local feature contributions for a specific prediction"""
    try:
        # For tree-based models, we can use feature importance weighted by input values
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            
            # Normalize importances
            total_importance = np.sum(np.abs(importances))
            if total_importance > 0:
                normalized_importances = importances / total_importance
            else:
                normalized_importances = importances
            
            # Calculate contribution: importance * normalized_input_value
            # Normalize input values to 0-1 scale for better interpretation
            input_normalized = (input_values - input_values.min()) / (input_values.max() - input_values.min() + 1e-10)
            
            # Contribution = importance * normalized_input
            contributions = normalized_importances * input_normalized[0]
            
            # Create feature contribution mapping
            feature_contributions = {}
            for i, feature in enumerate(features):
                feature_contributions[feature] = {
                    'contribution': float(contributions[i]),
                    'importance': float(importances[i]),
                    'input_value': float(input_values[0][i]),
                    'normalized_input': float(input_normalized[0][i])
                }
            
            # Sort by absolute contribution
            sorted_contributions = sorted(
                feature_contributions.items(),
                key=lambda x: abs(x[1]['contribution']),
                reverse=True
            )
            
            return {
                'success': True,
                'contributions': {k: v for k, v in sorted_contributions},
                'top_contributors': [
                    {
                        'feature': k,
                        'contribution': v['contribution'],
                        'importance': v['importance'],
                        'input_value': v['input_value']
                    }
                    for k, v in sorted_contributions[:5]
                ]
            }
        else:
            return {
                'success': False,
                'error': 'Model does not support feature importance extraction'
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@router.get("/xai/feature-importance/{model_type}")
async def get_feature_importance_endpoint(
    model_type: str
):
    """Get global feature importance for a model type"""
    
    model_key_map = {
        'battery-rul': 'battery_rul',
        'solar-degradation': 'solar_degradation',
        'energy-loss': 'energy_loss'
    }
    
    model_key = model_key_map.get(model_type)
    if not model_key:
        raise HTTPException(status_code=400, detail=f"Invalid model type. Use: {', '.join(model_key_map.keys())}")
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if model_key not in prediction_models:
        raise HTTPException(status_code=503, detail=f"{model_type} model not available")
    
    model_data = prediction_models[model_key]
    model = model_data['model']
    features = model_data['metadata']['features']
    
    # Get feature importance
    importance_result = get_feature_importance(model, model_data['metadata']['model_type'])
    
    if importance_result['method'] == 'not_available':
        raise HTTPException(status_code=501, detail="Feature importance not available for this model type")
    
    importances = importance_result['importances']
    
    # Create feature-importance pairs
    feature_importance_pairs = [
        {
            'feature': feature,
            'importance': float(importance),
            'importance_percent': float(importance * 100 / sum(importances)) if sum(importances) > 0 else 0
        }
        for feature, importance in zip(features, importances)
    ]
    
    # Sort by importance
    feature_importance_pairs.sort(key=lambda x: x['importance'], reverse=True)
    
    return {
        'success': True,
        'model_type': model_type,
        'model_algorithm': model_data['metadata']['model_type'],
        'features': features,
        'feature_importance': feature_importance_pairs,
        'total_features': len(features),
        'interpretability': {
            'scope': 'global',
            'method': 'feature_importances_',
            'description': 'Shows which features are most important for the model\'s predictions overall'
        }
    }

@router.post("/xai/local-explanation/{model_type}")
async def get_local_explanation(
    model_type: str,
    input_data: Dict[str, Any]
):
    """Get local explanation for a specific prediction"""
    
    model_key_map = {
        'battery-rul': 'battery_rul',
        'solar-degradation': 'solar_degradation',
        'energy-loss': 'energy_loss'
    }
    
    model_key = model_key_map.get(model_type)
    if not model_key:
        raise HTTPException(status_code=400, detail=f"Invalid model type. Use: {', '.join(model_key_map.keys())}")
    
    # Lazy load models if not already loaded
    await ensure_models_loaded()
    
    if model_key not in prediction_models:
        raise HTTPException(status_code=503, detail=f"{model_type} model not available")
    
    model_data = prediction_models[model_key]
    model = model_data['model']
    scaler = model_data['scaler']
    features = model_data['metadata']['features']
    
    # Prepare input
    try:
        input_values = np.array([[input_data.get(f, 0) for f in features]])
        input_scaled = scaler.transform(input_values)
        prediction = model.predict(input_scaled)[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing input: {str(e)}")
    
    # Get local contribution
    contribution_result = calculate_local_contribution(model, scaler, features, input_values, prediction)
    
    if not contribution_result.get('success'):
        raise HTTPException(status_code=500, detail=contribution_result.get('error', 'Failed to calculate contributions'))
    
    # Generate natural language explanation
    top_contributors = contribution_result['top_contributors']
    explanation_parts = []
    
    if top_contributors:
        explanation_parts.append(f"The prediction of {prediction:.2f} is primarily influenced by:")
        for i, contributor in enumerate(top_contributors[:3], 1):
            feature_name = contributor['feature'].replace('_', ' ').title()
            contribution_pct = abs(contributor['contribution']) * 100
            explanation_parts.append(
                f"{i}. {feature_name} (contribution: {contribution_pct:.1f}%)"
            )
    
    return {
        'success': True,
        'model_type': model_type,
        'prediction': float(prediction),
        'input_features': {f: float(input_values[0][i]) for i, f in enumerate(features)},
        'feature_contributions': contribution_result['contributions'],
        'top_contributors': top_contributors,
        'explanation': ' '.join(explanation_parts),
        'interpretability': {
            'scope': 'local',
            'method': 'feature_contribution',
            'description': 'Shows which features contributed most to this specific prediction'
        }
    }

@router.get("/xai/models")
async def get_available_xai_models():
    """Get list of models available for XAI interpretation
    
    Returns available models with their XAI support capabilities.
    """
    
    available_models = []
    
    for model_key, model_data in prediction_models.items():
        model_type_map = {
            'battery_rul': 'battery-rul',
            'solar_degradation': 'solar-degradation',
            'energy_loss': 'energy-loss'
        }
        
        model_type = model_type_map.get(model_key)
        if model_type:
            model = model_data['model']
            has_importance = hasattr(model, 'feature_importances_')
            
            available_models.append({
                'model_key': model_key,
                'model_type': model_type,
                'model_algorithm': model_data['metadata']['model_type'],
                'features': model_data['metadata']['features'],
                'metrics': model_data['metadata']['metrics'],
                'xai_support': {
                    'feature_importance': has_importance,
                    'local_explanation': has_importance,
                    'global_interpretability': has_importance
                }
            })
    
    return {
        'success': True,
        'available_models': available_models,
        'total_models': len(available_models)
    }

