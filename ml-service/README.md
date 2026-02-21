# ML Fraud Detection Service

Machine Learning microservice for StellarSplit fraud detection.

## Overview

This service provides real-time fraud detection using three ML models:

1. **Isolation Forest** - Unsupervised anomaly detection
2. **Neural Network** - Pattern recognition for known fraud patterns
3. **Gradient Boosting** - Risk scoring based on combined features

## Architecture

```
┌─────────────────┐     HTTP      ┌──────────────────┐
│  NestJS Backend │ ◄────────────► │   ML Service     │
│                 │               │  (FastAPI)       │
└─────────────────┘               └────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
           ┌────────▼─────────┐  ┌─────────▼──────────┐  ┌───────▼────────┐
           │ Anomaly Detector │  │ Pattern Recognizer │  │  Risk Scorer   │
           │ Isolation Forest │  │  Neural Network    │  │Gradient Boosting│
           └──────────────────┘  └────────────────────┘  └────────────────┘
```

## Quick Start

### Using Docker

```bash
docker-compose up ml-service
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --reload
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Analyze Split
```bash
POST /api/v1/analyze/split
Content-Type: application/json

{
  "split_data": {
    "split_id": "uuid",
    "creator_id": "uuid",
    "total_amount": 100.00,
    "participant_count": 3,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### Analyze Payment
```bash
POST /api/v1/analyze/payment
Content-Type: application/json

{
  "payment_data": {
    "payment_id": "uuid",
    "split_id": "uuid",
    "amount": 50.00,
    "asset": "XLM",
    "timestamp": "2026-01-01T00:00:00Z"
  }
}
```

### Submit Feedback
```bash
POST /api/v1/feedback
Content-Type: application/json

{
  "alert_id": "uuid",
  "is_fraud": true,
  "feedback_type": "true_positive",
  "reviewed_by": "admin@example.com"
}
```

### Model Management
```bash
# Get model versions
GET /api/v1/models/versions

# Trigger retraining
POST /api/v1/models/retrain
{
  "model_type": "all"
}

# Check training status
GET /api/v1/models/training/{job_id}
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |
| `DB_CONNECTION_STRING` | - | PostgreSQL connection |
| `REDIS_URL` | - | Redis connection |
| `MODEL_REGISTRY_PATH` | /models | Model storage path |
| `HIGH_RISK_THRESHOLD` | 80 | High risk score threshold |
| `MEDIUM_RISK_THRESHOLD` | 50 | Medium risk score threshold |

## Model Training

### Manual Training

```bash
python -m app.training.retrain
```

### Scheduled Training

The service supports scheduled retraining via cron. Set `TRAINING_SCHEDULE` environment variable:

```bash
TRAINING_SCHEDULE="0 2 * * 0"  # Weekly on Sunday at 2 AM
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_models.py
```

## Monitoring

Prometheus metrics available at `/metrics`:

- `ml_service_requests_total` - Request count
- `ml_service_request_duration_seconds` - Request latency

## Feature Engineering

The service extracts features from:

### Split Features
- Total amount, participant count
- Time-based features (hour, day of week)
- User history (account age, completion rate)
- Network patterns (rapid creation, circular payments)

### Payment Features
- Payment amount and timing
- Asset type (XLM, USDC, etc.)
- Split completion percentage
- Time since split creation

## Risk Levels

| Score | Level | Action |
|-------|-------|--------|
| 0-49 | Low | Log only |
| 50-79 | Medium | Flag for review |
| 80-100 | High | Block + immediate alert |

## License

MIT License - See LICENSE file for details.
