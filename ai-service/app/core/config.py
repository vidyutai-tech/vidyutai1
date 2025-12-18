# ems-backend/app/core/config.py

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
import os

class Settings(BaseSettings):
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key-change-in-production-please-set-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")  # Legacy support (deprecated)
    
    # Server settings
    PORT: str = os.getenv("PORT", "8000")
    PYTHON_ENV: str = os.getenv("PYTHON_ENV", "production")
    
    # Database settings
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/vidyutai")
    
    # InfluxDB settings
    INFLUXDB_URL: str = os.getenv("INFLUXDB_URL", "http://localhost:8086")
    INFLUXDB_TOKEN: str = os.getenv("INFLUXDB_TOKEN", "")
    INFLUXDB_ORG: str = os.getenv("INFLUXDB_ORG", "vidyutai")
    INFLUXDB_BUCKET: str = os.getenv("INFLUXDB_BUCKET", "energy_data")
    
    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "vidyutai-ai-service")
    KAFKA_TOPIC_ENERGY_DATA: str = os.getenv("KAFKA_TOPIC_ENERGY_DATA", "energy-data")
    KAFKA_TOPIC_ANOMALIES: str = os.getenv("KAFKA_TOPIC_ANOMALIES", "energy-anomalies")
    
    # Model settings
    MODEL_PATH: str = os.getenv("MODEL_PATH", "../models")
    ANOMALY_DETECTION_MODEL: str = os.getenv("ANOMALY_DETECTION_MODEL", "isolation_forest_model.pkl")
    PREDICTION_MODEL: str = os.getenv("PREDICTION_MODEL", "energy_prediction_model.pkl")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Pydantic v2 configuration
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields from .env that aren't defined here
    )

settings = Settings()