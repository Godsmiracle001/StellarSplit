"""Analysis endpoints for fraud detection."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import time

from app.models.ensemble import FraudDetectionEnsemble
from app.config import get_settings

router = APIRouter()

# Initialize ensemble model
ensemble_model = FraudDetectionEnsemble()


class SplitData(BaseModel):
    """Split data for analysis."""
    split_id: str
    creator_id: str
    total_amount: float = Field(gt=0)
    participant_count: int = Field(gt=0)
    description: Optional[str] = None
    preferred_currency: str = "XLM"
    creator_wallet_address: Optional[str] = None
    created_at: datetime
    items: List[Dict[str, Any]] = []
    participants: List[Dict[str, Any]] = []


class UserHistory(BaseModel):
    """User history for context."""
    user_id: str
    total_splits_created: int = 0
    total_splits_completed: int = 0
    average_split_amount: float = 0.0
    total_payments_made: int = 0
    total_payments_received: int = 0
    account_age_days: int = 0
    wallet_address: Optional[str] = None


class PaymentData(BaseModel):
    """Payment data for analysis."""
    payment_id: str
    split_id: str
    participant_id: str
    amount: float = Field(gt=0)
    asset: str
    tx_hash: str
    sender_address: str
    receiver_address: str
    timestamp: datetime


class SplitContext(BaseModel):
    """Split context for payment analysis."""
    split_id: str
    total_amount: float
    amount_paid: float
    status: str
    participants: List[Dict[str, Any]] = []


class AnalysisResponse(BaseModel):
    """Analysis response."""
    risk_score: float = Field(ge=0, le=100)
    risk_level: str
    anomaly_score: float
    pattern_match_score: float
    flags: List[str]
    model_version: str
    processing_time_ms: int


class BatchAnalysisRequest(BaseModel):
    """Batch analysis request."""
    entities: List[Dict[str, Any]]
    entity_type: str = Field(..., regex="^(split|payment)$")


class BatchAnalysisResponse(BaseModel):
    """Batch analysis response."""
    results: List[AnalysisResponse]
    total_processed: int
    processing_time_ms: int


@router.post("/analyze/split", response_model=AnalysisResponse)
async def analyze_split(data: SplitData, user_history: Optional[UserHistory] = None):
    """
    Analyze a split for fraud risk.
    
    Returns risk score, anomaly detection results, and pattern matching scores.
    """
    start_time = time.time()
    
    try:
        # Prepare features
        features = _extract_split_features(data, user_history)
        
        # Get prediction from ensemble
        result = ensemble_model.predict_split(features)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return AnalysisResponse(
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            anomaly_score=result["anomaly_score"],
            pattern_match_score=result["pattern_match_score"],
            flags=result["flags"],
            model_version=ensemble_model.get_version(),
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/payment", response_model=AnalysisResponse)
async def analyze_payment(data: PaymentData, split_context: Optional[SplitContext] = None):
    """
    Analyze a payment for fraud risk.
    
    Returns risk score and fraud indicators.
    """
    start_time = time.time()
    
    try:
        # Prepare features
        features = _extract_payment_features(data, split_context)
        
        # Get prediction from ensemble
        result = ensemble_model.predict_payment(features)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        return AnalysisResponse(
            risk_score=result["risk_score"],
            risk_level=result["risk_level"],
            anomaly_score=result["anomaly_score"],
            pattern_match_score=result["pattern_match_score"],
            flags=result["flags"],
            model_version=ensemble_model.get_version(),
            processing_time_ms=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/batch", response_model=BatchAnalysisResponse)
async def analyze_batch(request: BatchAnalysisRequest):
    """
    Analyze multiple entities in batch.
    
    Efficient for processing historical data or periodic scans.
    """
    start_time = time.time()
    results = []
    
    for entity in request.entities:
        try:
            if request.entity_type == "split":
                split_data = SplitData(**entity)
                features = _extract_split_features(split_data, None)
                result = ensemble_model.predict_split(features)
            else:
                payment_data = PaymentData(**entity)
                features = _extract_payment_features(payment_data, None)
                result = ensemble_model.predict_payment(features)
            
            results.append(AnalysisResponse(
                risk_score=result["risk_score"],
                risk_level=result["risk_level"],
                anomaly_score=result["anomaly_score"],
                pattern_match_score=result["pattern_match_score"],
                flags=result["flags"],
                model_version=ensemble_model.get_version(),
                processing_time_ms=0
            ))
        
        except Exception as e:
            # Log error but continue processing
            results.append(AnalysisResponse(
                risk_score=0,
                risk_level="error",
                anomaly_score=0,
                pattern_match_score=0,
                flags=[f"processing_error: {str(e)}"],
                model_version=ensemble_model.get_version(),
                processing_time_ms=0
            ))
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return BatchAnalysisResponse(
        results=results,
        total_processed=len(results),
        processing_time_ms=processing_time
    )


def _extract_split_features(split_data: SplitData, user_history: Optional[UserHistory]) -> Dict[str, Any]:
    """Extract features from split data."""
    settings = get_settings()
    
    features = {
        # Amount features
        "total_amount": float(split_data.total_amount),
        "amount_per_participant": float(split_data.total_amount) / max(split_data.participant_count, 1),
        "participant_count": split_data.participant_count,
        
        # Time features
        "hour_of_day": split_data.created_at.hour,
        "day_of_week": split_data.created_at.weekday(),
        "is_weekend": split_data.created_at.weekday() >= 5,
        "is_night": split_data.created_at.hour < 6 or split_data.created_at.hour > 22,
        
        # Currency
        "is_xlm": split_data.preferred_currency == "XLM",
        "is_usdc": "USDC" in split_data.preferred_currency.upper(),
        
        # Items
        "item_count": len(split_data.items),
        "has_items": len(split_data.items) > 0,
        
        # User history features
        "user_splits_created": user_history.total_splits_created if user_history else 0,
        "user_completion_rate": (
            user_history.total_splits_completed / max(user_history.total_splits_created, 1)
            if user_history else 0
        ),
        "user_avg_split_amount": user_history.average_split_amount if user_history else 0,
        "user_account_age_days": user_history.account_age_days if user_history else 0,
        "is_new_user": (user_history.account_age_days if user_history else 0) < 7,
    }
    
    return features


def _extract_payment_features(payment_data: PaymentData, split_context: Optional[SplitContext]) -> Dict[str, Any]:
    """Extract features from payment data."""
    features = {
        # Amount features
        "payment_amount": float(payment_data.amount),
        "asset": payment_data.asset,
        "is_xlm": payment_data.asset == "XLM",
        
        # Timing features
        "hour_of_day": payment_data.timestamp.hour,
        "day_of_week": payment_data.timestamp.weekday(),
        "is_weekend": payment_data.timestamp.weekday() >= 5,
        
        # Split context
        "split_total_amount": float(split_context.total_amount) if split_context else 0,
        "split_amount_paid": float(split_context.amount_paid) if split_context else 0,
        "split_completion_pct": (
            (float(split_context.amount_paid) / float(split_context.total_amount) * 100)
            if split_context and float(split_context.total_amount) > 0 else 0
        ),
        "participant_count": len(split_context.participants) if split_context else 0,
    }
    
    return features
