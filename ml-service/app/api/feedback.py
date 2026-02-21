"""Feedback endpoints for fraud detection."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

router = APIRouter()


class FeedbackType(str, Enum):
    """Feedback type."""
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    FALSE_NEGATIVE = "false_negative"
    TRUE_NEGATIVE = "true_negative"


class FeedbackRequest(BaseModel):
    """Feedback request."""
    alert_id: str
    is_fraud: bool
    feedback_type: FeedbackType
    notes: Optional[str] = None
    reviewed_by: str


class FeedbackResponse(BaseModel):
    """Feedback response."""
    success: bool
    message: str
    feedback_id: str


class FeedbackStats(BaseModel):
    """Feedback statistics."""
    total_feedback: int
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float


# In-memory storage (replace with database in production)
feedback_storage: List[dict] = []


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit feedback on a fraud alert.
    
    This helps improve the model through the feedback loop.
    """
    import uuid
    
    feedback_id = str(uuid.uuid4())
    
    # Store feedback
    feedback_entry = {
        "id": feedback_id,
        "alert_id": request.alert_id,
        "is_fraud": request.is_fraud,
        "feedback_type": request.feedback_type,
        "notes": request.notes,
        "reviewed_by": request.reviewed_by,
        "created_at": datetime.utcnow()
    }
    
    feedback_storage.append(feedback_entry)
    
    return FeedbackResponse(
        success=True,
        message="Feedback recorded successfully",
        feedback_id=feedback_id
    )


@router.get("/feedback/stats", response_model=FeedbackStats)
async def get_feedback_stats():
    """Get feedback statistics for model performance."""
    total = len(feedback_storage)
    
    if total == 0:
        return FeedbackStats(
            total_feedback=0,
            true_positives=0,
            false_positives=0,
            false_negatives=0,
            true_negatives=0,
            accuracy=0.0,
            precision=0.0,
            recall=0.0,
            f1_score=0.0
        )
    
    tp = sum(1 for f in feedback_storage if f["feedback_type"] == FeedbackType.TRUE_POSITIVE)
    fp = sum(1 for f in feedback_storage if f["feedback_type"] == FeedbackType.FALSE_POSITIVE)
    fn = sum(1 for f in feedback_storage if f["feedback_type"] == FeedbackType.FALSE_NEGATIVE)
    tn = sum(1 for f in feedback_storage if f["feedback_type"] == FeedbackType.TRUE_NEGATIVE)
    
    # Calculate metrics
    accuracy = (tp + tn) / total if total > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return FeedbackStats(
        total_feedback=total,
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        true_negatives=tn,
        accuracy=accuracy,
        precision=precision,
        recall=recall,
        f1_score=f1
    )


@router.get("/feedback/recent")
async def get_recent_feedback(limit: int = 50):
    """Get recent feedback entries."""
    recent = sorted(
        feedback_storage,
        key=lambda x: x["created_at"],
        reverse=True
    )[:limit]
    
    return {"feedback": recent}
