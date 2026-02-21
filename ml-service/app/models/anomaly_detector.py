"""Isolation Forest anomaly detection model."""

import numpy as np
import joblib
import os
from typing import Dict, Any, Optional
from datetime import datetime
from sklearn.ensemble import IsolationForest

from app.config import get_settings


class AnomalyDetector:
    """
    Isolation Forest model for anomaly detection.
    
    Detects unusual patterns in splits and payments that deviate
    from normal behavior.
    """
    
    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=42,
            n_jobs=-1
        )
        self.contamination = contamination
        self.version = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.is_trained = False
        self.feature_names = []
    
    def train(self, X: np.ndarray, feature_names: Optional[list] = None):
        """Train the anomaly detection model."""
        self.model.fit(X)
        self.is_trained = True
        if feature_names:
            self.feature_names = feature_names
        return self
    
    def predict(self, X: np.ndarray) -> Dict[str, Any]:
        """
        Predict anomaly score for input data.
        
        Returns:
            Dict with anomaly_score (-1 to 1), is_anomaly (bool), and confidence
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Get anomaly scores
        scores = self.model.decision_function(X)
        predictions = self.model.predict(X)
        
        # Normalize scores to 0-100 range for consistency
        # scores are negative for anomalies, positive for normal
        # Map -0.5 to 0.5 range to 0-100
        normalized_scores = 50 - (scores * 100)
        normalized_scores = np.clip(normalized_scores, 0, 100)
        
        return {
            "anomaly_score": float(normalized_scores[0]),
            "is_anomaly": bool(predictions[0] == -1),
            "raw_score": float(scores[0]),
            "confidence": self._calculate_confidence(scores[0])
        }
    
    def predict_batch(self, X: np.ndarray) -> list:
        """Predict anomaly scores for batch of inputs."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        scores = self.model.decision_function(X)
        predictions = self.model.predict(X)
        
        normalized_scores = 50 - (scores * 100)
        normalized_scores = np.clip(normalized_scores, 0, 100)
        
        results = []
        for i in range(len(X)):
            results.append({
                "anomaly_score": float(normalized_scores[i]),
                "is_anomaly": bool(predictions[i] == -1),
                "raw_score": float(scores[i]),
                "confidence": self._calculate_confidence(scores[i])
            })
        
        return results
    
    def _calculate_confidence(self, raw_score: float) -> float:
        """Calculate confidence based on distance from decision boundary."""
        # Higher absolute score = higher confidence
        confidence = min(abs(raw_score) * 2, 1.0)
        return float(confidence)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance (Isolation Forest doesn't provide direct importance)."""
        # Return equal importance as Isolation Forest doesn't have feature_importances_
        if self.feature_names:
            return {name: 1.0 / len(self.feature_names) for name in self.feature_names}
        return {}
    
    def save(self, path: Optional[str] = None):
        """Save model to disk."""
        if path is None:
            settings = get_settings()
            path = os.path.join(
                settings.model_registry_path,
                "anomaly_detector",
                self.version
            )
        
        os.makedirs(path, exist_ok=True)
        
        # Save model
        model_path = os.path.join(path, "model.joblib")
        joblib.dump(self.model, model_path)
        
        # Save metadata
        metadata = {
            "version": self.version,
            "contamination": self.contamination,
            "n_estimators": self.model.n_estimators,
            "is_trained": self.is_trained,
            "feature_names": self.feature_names,
            "trained_at": datetime.now().isoformat()
        }
        
        metadata_path = os.path.join(path, "metadata.json")
        import json
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        return path
    
    def load(self, version: str, base_path: Optional[str] = None):
        """Load model from disk."""
        if base_path is None:
            settings = get_settings()
            base_path = settings.model_registry_path
        
        path = os.path.join(base_path, "anomaly_detector", version)
        
        # Load model
        model_path = os.path.join(path, "model.joblib")
        self.model = joblib.load(model_path)
        
        # Load metadata
        metadata_path = os.path.join(path, "metadata.json")
        import json
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        self.version = metadata["version"]
        self.contamination = metadata["contamination"]
        self.is_trained = metadata["is_trained"]
        self.feature_names = metadata.get("feature_names", [])
        
        return self
    
    def get_version(self) -> str:
        """Get model version."""
        return self.version
