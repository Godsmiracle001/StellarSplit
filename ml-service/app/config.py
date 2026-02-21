"""Configuration management for ML service."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""
    
    # Server
    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = False
    
    # Database
    db_connection_string: str = "postgresql://postgres:postgres@localhost:5432/stellarsplit"
    db_pool_size: int = 10
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Model Registry
    model_registry_path: str = "/models"
    
    # Training
    training_schedule: str = "0 2 * * 0"  # Weekly on Sunday at 2 AM
    min_training_samples: int = 1000
    
    # Fraud Detection Thresholds
    high_risk_threshold: float = 80.0
    medium_risk_threshold: float = 50.0
    
    # Model Parameters
    isolation_forest_contamination: float = 0.05
    isolation_forest_n_estimators: int = 100
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
