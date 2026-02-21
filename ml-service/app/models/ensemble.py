"""Ensemble model combining all fraud detection models."""

import numpy as np
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

from app.config import get_settings
from app.models.anomaly_detector import AnomalyDetector
from app.models.pattern_recognizer import PatternRecognizer
from app.models.risk_scorer import RiskScorer


class FraudDetectionEnsemble:
    """
    Ensemble model that combines anomaly detection, pattern recognition,
    and risk scoring into a unified fraud detection system.
    """
    
    def __init__(self):
        self.anomaly_detector = AnomalyDetector()
        self.pattern_recognizer = PatternRecognizer()
        self.risk_scorer = RiskScorer()
        self.version = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.is_trained = False
        self.weights = {
            "anomaly": 0.3,
            "pattern": 0.3,
            "risk": 0.4
        }
    
    def train(
        self,
        X: np.ndarray,
        y: Optional[np.ndarray] = None,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Train all models in the ensemble.
        
        Args:
            X: Feature matrix
            y: Optional labels for supervised models
            feature_names: Names of features
        """
        results = {}
        
        # Train anomaly detector (unsupervised)
        self.anomaly_detector.train(X, feature_names)
        results["anomaly_detector"] = {"status": "trained"}
        
        # Train pattern recognizer (supervised, needs labels)
        if y is not None:
            pattern_results = self.pattern_recognizer.train(X, y, feature_names=feature_names)
            results["pattern_recognizer"] = pattern_results
        
        # Train risk scorer (needs combined features)
        # For now, use simple heuristic-based risk scores for training
        if y is not None:
            risk_results = self.risk_scorer.train(X, y, feature_names)
            results["risk_scorer"] = risk_results
        
        self.is_trained = True
        if feature_names:
            self.feature_names = feature_names
        
        return results
    
    def predict_split(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict fraud risk for a split.
        
        Returns:
            Dict with combined risk score, individual model outputs, and flags
        """
        # Convert features to array
        X = np.array(list(features.values())).reshape(1, -1)
        
        # Get predictions from each model
        anomaly_result = self.anomaly_detector.predict(X)
        pattern_result = self.pattern_recognizer.predict(X)
        risk_result = self.risk_scorer.predict(X)
        
        # Combine scores using weighted average
        combined_score = (
            self.weights["anomaly"] * anomaly_result["anomaly_score"] +
            self.weights["pattern"] * pattern_result["pattern_match_score"] +
            self.weights["risk"] * risk_result["risk_score"]
        )
        
        # Generate flags
        flags = self._generate_flags(
            features,
            anomaly_result,
            pattern_result,
            risk_result
        )
        
        return {
            "risk_score": round(combined_score, 2),
            "risk_level": self._get_risk_level(combined_score),
            "anomaly_score": round(anomaly_result["anomaly_score"], 2),
            "pattern_match_score": round(pattern_result["pattern_match_score"], 2),
            "flags": flags,
            "model_version": self.version,
            "details": {
                "anomaly": anomaly_result,
                "pattern": pattern_result,
                "risk": risk_result
            }
        }
    
    def predict_payment(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Predict fraud risk for a payment."""
        # Similar to predict_split but with payment-specific logic
        X = np.array(list(features.values())).reshape(1, -1)
        
        anomaly_result = self.anomaly_detector.predict(X)
        pattern_result = self.pattern_recognizer.predict(X)
        risk_result = self.risk_scorer.predict(X)
        
        combined_score = (
            self.weights["anomaly"] * anomaly_result["anomaly_score"] +
            self.weights["pattern"] * pattern_result["pattern_match_score"] +
            self.weights["risk"] * risk_result["risk_score"]
        )
        
        flags = self._generate_flags(
            features,
            anomaly_result,
            pattern_result,
            risk_result,
            is_payment=True
        )
        
        return {
            "risk_score": round(combined_score, 2),
            "risk_level": self._get_risk_level(combined_score),
            "anomaly_score": round(anomaly_result["anomaly_score"], 2),
            "pattern_match_score": round(pattern_result["pattern_match_score"], 2),
            "flags": flags,
            "model_version": self.version,
            "details": {
                "anomaly": anomaly_result,
                "pattern": pattern_result,
                "risk": risk_result
            }
        }
    
    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from score."""
        settings = get_settings()
        
        if score >= settings.high_risk_threshold:
            return "high"
        elif score >= settings.medium_risk_threshold:
            return "medium"
        else:
            return "low"
    
    def _generate_flags(
        self,
        features: Dict[str, float],
        anomaly_result: Dict[str, Any],
        pattern_result: Dict[str, Any],
        risk_result: Dict[str, Any],
        is_payment: bool = False
    ) -> List[str]:
        """Generate fraud indicator flags."""
        flags = []
        
        # Anomaly-based flags
        if anomaly_result.get("is_anomaly"):
            flags.append("anomalous_behavior")
        
        if anomaly_result.get("anomaly_score", 0) > 70:
            flags.append("high_anomaly_score")
        
        # Pattern-based flags
        if pattern_result.get("is_suspicious"):
            flags.append("suspicious_pattern_detected")
        
        if pattern_result.get("fraud_probability", 0) > 0.7:
            flags.append("high_fraud_probability")
        
        # Feature-based flags
        if features.get("is_new_user", 0) > 0.5:
            flags.append("new_user")
        
        if features.get("is_rapid_creation", 0) > 0.5:
            flags.append("rapid_split_creation")
        
        if features.get("is_night", 0) > 0.5:
            flags.append("night_time_activity")
        
        if features.get("is_large_amount", 0) > 0.5:
            flags.append("large_amount")
        
        if features.get("is_single_participant", 0) > 0.5:
            flags.append("single_participant_split")
        
        # Payment-specific flags
        if is_payment:
            if features.get("is_immediate_payment", 0) > 0.5:
                flags.append("immediate_payment")
            
            if features.get("is_delayed_payment", 0) > 0.5:
                flags.append("delayed_payment")
            
            if features.get("hours_since_split_creation", 0) < 0.1:
                flags.append("instant_payment_after_creation")
        
        return flags
    
    def save(self, path: Optional[str] = None):
        """Save all models in the ensemble."""
        if path is None:
            settings = get_settings()
            path = os.path.join(
                settings.model_registry_path,
                "ensemble",
                self.version
            )
        
        os.makedirs(path, exist_ok=True)
        
        # Save individual models
        self.anomaly_detector.save()
        self.pattern_recognizer.save()
        self.risk_scorer.save()
        
        # Save ensemble metadata
        metadata = {
            "version": self.version,
            "is_trained": self.is_trained,
            "weights": self.weights,
            "model_versions": {
                "anomaly_detector": self.anomaly_detector.get_version(),
                "pattern_recognizer": self.pattern_recognizer.get_version(),
                "risk_scorer": self.risk_scorer.get_version()
            },
            "saved_at": datetime.now().isoformat()
        }
        
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        return path
    
    def load(self, version: str, base_path: Optional[str] = None):
        """Load ensemble from disk."""
        if base_path is None:
            settings = get_settings()
            base_path = settings.model_registry_path
        
        path = os.path.join(base_path, "ensemble", version)
        
        # Load metadata
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        self.version = metadata["version"]
        self.is_trained = metadata["is_trained"]
        self.weights = metadata["weights"]
        
        # Load individual models
        model_versions = metadata["model_versions"]
        self.anomaly_detector.load(model_versions["anomaly_detector"])
        self.pattern_recognizer.load(model_versions["pattern_recognizer"])
        self.risk_scorer.load(model_versions["risk_scorer"])
        
        return self
    
    def load_version(self, version: str):
        """Load specific version (alias for load)."""
        return self.load(version)
    
    def get_version(self) -> str:
        """Get ensemble version."""
        return self.version
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about all models in ensemble."""
        return {
            "ensemble_version": self.version,
            "is_trained": self.is_trained,
            "weights": self.weights,
            "models": {
                "anomaly_detector": {
                    "version": self.anomaly_detector.get_version(),
                    "type": "IsolationForest"
                },
                "pattern_recognizer": {
                    "version": self.pattern_recognizer.get_version(),
                    "type": "NeuralNetwork"
                },
                "risk_scorer": {
                    "version": self.risk_scorer.get_version(),
                    "type": "GradientBoosting"
                }
            }
        }
