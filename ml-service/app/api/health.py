"""Health check endpoints."""

from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow()
    )


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness check for Kubernetes."""
    return {"status": "ready"}
