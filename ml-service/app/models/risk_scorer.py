"""Gradient Boosting risk scoring model."""

import numpy as np
import joblib
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from sklearn.ensemble import GradientBoostingRegressor
import warnings
warnings.filterwarnings('ignore')

from app.config import get_settings


class RiskScorer:
    """
    Gradient Boosting model for risk scoring.
    
    Combines outputs from other models and raw features to produce
    a final risk score (0-100).
    """
    
    def __init__(
        self,
        n_estimators: int = 100,
        learning_rate: float = 0.1,
        max_depth: int = 6,
        subsample: float = 0.8
    ):
        self.model = GradientBoostingRegressor(
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            subsample=subsample,
            random_state=42,
            loss='squared_error'
        )
        self.version = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.is_trained = False
        self.feature_names = []
        self.training_metrics = {}
    
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        validation_split: float = 0.2
    ) -> Dict[str, Any]:
        """
        Train the risk scoring model.
        
        Args:
            X: Feature matrix
            y: Target risk scores (0-100)
            feature_names: Names of features
            validation_split: Fraction for validation
        """
        # Split data
        split_idx = int(len(X) * (1 - validation_split))
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        # Train
        self.model.fit(X_train, y_train)
        
        # Calculate metrics
        train_score = self.model.score(X_train, y_train)
        val_score = self.model.score(X_val, y_val)
        
        y_pred = self.model.predict(X_val)
        mse = np.mean((y_val - y_pred) ** 2)
        mae = np.mean(np.abs(y_val - y_pred))
        
        self.training_metrics = {
            "train_r2": float(train_score),
            "val_r2": float(val_score),
            "val_mse": float(mse),
            "val_mae": float(mae)
        }
        
        self.is_trained = True
        if feature_names:
            self.feature_names = feature_names
        
        return self.training_metrics
    
    def predict(self, X: np.ndarray) -> Dict[str, Any]:
        """
        Predict risk score.
        
        Returns:
            Dict with risk_score (0-100), risk_level, and confidence
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Get prediction
        score = self.model.predict(X)[0]
        
        # Clip to valid range
        score = np.clip(score, 0, 100)
        
        # Determine risk level
        risk_level = self._get_risk_level(score)
        
        return {
            "risk_score": float(score),
            "risk_level": risk_level,
            "confidence": self._calculate_confidence(X),
            "percentile": self._calculate_percentile(score)
        }
    
    def predict_batch(self, X: np.ndarray) -> List[Dict[str, Any]]:
        """Predict risk scores for batch."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        scores = self.model.predict(X)
        scores = np.clip(scores, 0, 100)
        
        results = []
        for score in scores:
            results.append({
                "risk_score": float(score),
                "risk_level": self._get_risk_level(score),
                "confidence": 0.8,  # Simplified for batch
                "percentile": self._calculate_percentile(score)
            })
        
        return results
    
    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from score."""
        settings = get_settings()
        
        if score >= settings.high_risk_threshold:
            return "high"
        elif score >= settings.medium_risk_threshold:
            return "medium"
        else:
            return "low"
    
    def _calculate_confidence(self, X: np.ndarray) -> float:
        """Calculate prediction confidence."""
        # Use prediction from staged predictions to estimate variance
        staged_preds = list(self.model.staged_predict(X))
        
        # Variance across last 10 iterations
        if len(staged_preds) >= 10:
            last_preds = np.array([p[0] for p in staged_preds[-10:]])
            variance = np.var(last_preds)
            # Lower variance = higher confidence
            confidence = max(0, 1 - (variance / 100))
        else:
            confidence = 0.8
        
        return float(confidence)
    
    def _calculate_percentile(self, score: float) -> float:
        """Calculate percentile of score."""
        # Simplified percentile calculation
        return float(score)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from the model."""
        importance = self.model.feature_importances_
        
        if self.feature_names:
            return {
                name: float(imp)
                for name, imp in zip(self.feature_names, importance)
            }
        else:
            return {f"feature_{i}": float(imp) for i, imp in enumerate(importance)}
    
    def get_top_features(self, n: int = 10) -> List[Dict[str, Any]]:
        """Get top N most important features."""
        importance = self.get_feature_importance()
        sorted_features = sorted(
            importance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [
            {"feature": name, "importance": imp}
            for name, imp in sorted_features[:n]
        ]
    
    def save(self, path: Optional[str] = None):
        """Save model to disk."""
        if path is None:
            settings = get_settings()
            path = os.path.join(
                settings.model_registry_path,
                "risk_scorer",
                self.version
            )
        
        os.makedirs(path, exist_ok=True)
        
        # Save model
        model_path = os.path.join(path, "model.joblib")
        joblib.dump(self.model, model_path)
        
        # Save metadata
        metadata = {
            "version": self.version,
            "n_estimators": self.model.n_estimators,
            "learning_rate": self.model.learning_rate,
            "max_depth": self.model.max_depth,
            "is_trained": self.is_trained,
            "feature_names": self.feature_names,
            "training_metrics": self.training_metrics,
            "trained_at": datetime.now().isoformat()
        }
        
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        return path
    
    def load(self, version: str, base_path: Optional[str] = None):
        """Load model from disk."""
        if base_path is None:
            settings = get_settings()
            base_path = settings.model_registry_path
        
        path = os.path.join(base_path, "risk_scorer", version)
        
        # Load metadata
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        self.version = metadata["version"]
        self.is_trained = metadata["is_trained"]
        self.feature_names = metadata.get("feature_names", [])
        self.training_metrics = metadata.get("training_metrics", {})
        
        # Load model
        model_path = os.path.join(path, "model.joblib")
        self.model = joblib.load(model_path)
        
        return self
    
    def get_version(self) -> str:
        """Get model version."""
        return self.version
