"""FastAPI application entry point."""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from app.config import get_settings
from app.api import analyze, models, feedback, health

# Metrics
REQUEST_COUNT = Counter(
    'ml_service_requests_total',
    'Total requests',
    ['method', 'endpoint', 'status']
)
REQUEST_DURATION = Histogram(
    'ml_service_request_duration_seconds',
    'Request duration',
    ['method', 'endpoint']
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings = get_settings()
    print(f"Starting ML Fraud Detection Service v1.0.0")
    print(f"Model registry path: {settings.model_registry_path}")
    print(f"High risk threshold: {settings.high_risk_threshold}")
    yield
    # Shutdown
    print("Shutting down ML Fraud Detection Service")


app = FastAPI(
    title="StellarSplit Fraud Detection ML Service",
    description="ML-based fraud detection for suspicious splits and payments",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Collect request metrics."""
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    endpoint = request.url.path
    method = request.method
    status = str(response.status_code)
    
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    
    return response


# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(models.router, prefix="/api/v1", tags=["Models"])
app.include_router(feedback.router, prefix="/api/v1", tags=["Feedback"])


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    from fastapi.responses import Response
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
