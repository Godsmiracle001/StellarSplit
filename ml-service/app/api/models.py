"""Model management endpoints."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import json

from app.config import get_settings
from app.models.ensemble import FraudDetectionEnsemble

router = APIRouter()

# Initialize ensemble model
ensemble_model = FraudDetectionEnsemble()


class ModelInfo(BaseModel):
    """Model information."""
    name: str
    version: str
    trained_at: Optional[datetime]
    accuracy: Optional[float]
    is_loaded: bool


class ModelVersionsResponse(BaseModel):
    """Model versions response."""
    models: List[ModelInfo]
    current_version: str


class RetrainRequest(BaseModel):
    """Retraining request."""
    model_type: str = "all"  # all, anomaly, pattern, risk
    force: bool = False


class RetrainResponse(BaseModel):
    """Retraining response."""
    job_id: str
    status: str
    message: str


class TrainingStatusResponse(BaseModel):
    """Training status response."""
    job_id: str
    status: str  # pending, running, completed, failed
    progress: Optional[float] = None
    metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# In-memory job storage (replace with Redis in production)
training_jobs: Dict[str, Dict[str, Any]] = {}


@router.get("/models/versions", response_model=ModelVersionsResponse)
async def get_model_versions():
    """Get available model versions."""
    settings = get_settings()
    models = []
    
    # Check model registry directory
    registry_path = settings.model_registry_path
    if os.path.exists(registry_path):
        for model_name in ["anomaly_detector", "pattern_recognizer", "risk_scorer", "ensemble"]:
            model_dir = os.path.join(registry_path, model_name)
            if os.path.exists(model_dir):
                # List versions
                versions = [d for d in os.listdir(model_dir) if os.path.isdir(os.path.join(model_dir, d))]
                for version in versions:
                    metadata_path = os.path.join(model_dir, version, "metadata.json")
                    metadata = {}
                    if os.path.exists(metadata_path):
                        with open(metadata_path, "r") as f:
                            metadata = json.load(f)
                    
                    models.append(ModelInfo(
                        name=model_name,
                        version=version,
                        trained_at=datetime.fromisoformat(metadata.get("trained_at")) if metadata.get("trained_at") else None,
                        accuracy=metadata.get("accuracy"),
                        is_loaded=version == ensemble_model.get_version()
                    ))
    
    return ModelVersionsResponse(
        models=models,
        current_version=ensemble_model.get_version()
    )


@router.post("/models/retrain", response_model=RetrainResponse)
async def retrain_models(request: RetrainRequest, background_tasks: BackgroundTasks):
    """Trigger model retraining."""
    import uuid
    
    job_id = str(uuid.uuid4())
    
    # Initialize job
    training_jobs[job_id] = {
        "status": "pending",
        "progress": 0,
        "metrics": None,
        "error": None
    }
    
    # Start training in background
    background_tasks.add_task(_train_models_task, job_id, request.model_type)
    
    return RetrainResponse(
        job_id=job_id,
        status="pending",
        message=f"Retraining job started for {request.model_type} models"
    )


@router.get("/models/training/{job_id}", response_model=TrainingStatusResponse)
async def get_training_status(job_id: str):
    """Get training job status."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    job = training_jobs[job_id]
    return TrainingStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job.get("progress"),
        metrics=job.get("metrics"),
        error=job.get("error")
    )


@router.post("/models/load/{version}")
async def load_model_version(version: str):
    """Load a specific model version."""
    try:
        ensemble_model.load_version(version)
        return {"status": "success", "message": f"Loaded model version {version}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


async def _train_models_task(job_id: str, model_type: str):
    """Background task for model training."""
    from app.training.retrain import ModelTrainer
    
    try:
        training_jobs[job_id]["status"] = "running"
        
        trainer = ModelTrainer()
        
        if model_type in ["all", "anomaly"]:
            training_jobs[job_id]["progress"] = 0.25
            trainer.train_anomaly_detector()
        
        if model_type in ["all", "pattern"]:
            training_jobs[job_id]["progress"] = 0.50
            trainer.train_pattern_recognizer()
        
        if model_type in ["all", "risk"]:
            training_jobs[job_id]["progress"] = 0.75
            trainer.train_risk_scorer()
        
        # Train ensemble
        training_jobs[job_id]["progress"] = 0.90
        trainer.train_ensemble()
        
        # Get metrics
        metrics = trainer.get_metrics()
        
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["progress"] = 1.0
        training_jobs[job_id]["metrics"] = metrics
        
    except Exception as e:
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)
