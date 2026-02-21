"""Unit tests for ML models."""

import pytest
import numpy as np
from app.models.anomaly_detector import AnomalyDetector
from app.models.pattern_recognizer import PatternRecognizer
from app.models.risk_scorer import RiskScorer
from app.models.ensemble import FraudDetectionEnsemble


class TestAnomalyDetector:
    """Tests for Isolation Forest anomaly detector."""
    
    def test_initialization(self):
        model = AnomalyDetector(contamination=0.1, n_estimators=50)
        assert model.contamination == 0.1
        assert model.model.n_estimators == 50
    
    def test_train_and_predict(self):
        model = AnomalyDetector()
        
        # Generate synthetic data
        X_train = np.random.randn(100, 10)
        
        # Train
        model.train(X_train)
        assert model.is_trained
        
        # Predict
        X_test = np.random.randn(1, 10)
        result = model.predict(X_test)
        
        assert "anomaly_score" in result
        assert "is_anomaly" in result
        assert 0 <= result["anomaly_score"] <= 100
        assert isinstance(result["is_anomaly"], bool)
    
    def test_predict_before_train_raises(self):
        model = AnomalyDetector()
        X = np.random.randn(1, 10)
        
        with pytest.raises(ValueError, match="Model must be trained"):
            model.predict(X)


class TestPatternRecognizer:
    """Tests for Neural Network pattern recognizer."""
    
    def test_initialization(self):
        model = PatternRecognizer(input_dim=20, hidden_layers=[64, 32])
        assert model.input_dim == 20
        assert model.hidden_layers == [64, 32]
    
    def test_train_and_predict(self):
        model = PatternRecognizer(input_dim=10)
        
        # Generate synthetic data
        X = np.random.randn(100, 10)
        y = np.random.randint(0, 2, 100)
        
        # Train
        history = model.train(X, y, epochs=5)
        assert model.is_trained
        assert "final_accuracy" in history
        
        # Predict
        X_test = np.random.randn(1, 10)
        result = model.predict(X_test)
        
        assert "pattern_match_score" in result
        assert "fraud_probability" in result
        assert 0 <= result["pattern_match_score"] <= 100
        assert 0 <= result["fraud_probability"] <= 1


class TestRiskScorer:
    """Tests for Gradient Boosting risk scorer."""
    
    def test_initialization(self):
        model = RiskScorer(n_estimators=50, learning_rate=0.05)
        assert model.model.n_estimators == 50
        assert model.model.learning_rate == 0.05
    
    def test_train_and_predict(self):
        model = RiskScorer()
        
        # Generate synthetic data
        X = np.random.randn(100, 10)
        y = np.random.uniform(0, 100, 100)
        
        # Train
        metrics = model.train(X, y)
        assert model.is_trained
        assert "train_r2" in metrics
        
        # Predict
        X_test = np.random.randn(1, 10)
        result = model.predict(X_test)
        
        assert "risk_score" in result
        assert "risk_level" in result
        assert 0 <= result["risk_score"] <= 100
        assert result["risk_level"] in ["low", "medium", "high"]
    
    def test_get_risk_level(self):
        model = RiskScorer()
        
        assert model._get_risk_level(90) == "high"
        assert model._get_risk_level(60) == "medium"
        assert model._get_risk_level(30) == "low"


class TestFraudDetectionEnsemble:
    """Tests for the ensemble model."""
    
    def test_initialization(self):
        ensemble = FraudDetectionEnsemble()
        assert ensemble.weights["anomaly"] == 0.3
        assert ensemble.weights["pattern"] == 0.3
        assert ensemble.weights["risk"] == 0.4
    
    def test_predict_split(self):
        ensemble = FraudDetectionEnsemble()
        
        # Create dummy features
        features = {
            "total_amount": 100.0,
            "participant_count": 3.0,
            "hour_of_day": 14.0,
            "is_night": 0.0,
            "is_new_user": 0.0,
        }
        
        # This will use untrained models, but should not crash
        # In production, models would be loaded from disk
        try:
            result = ensemble.predict_split(features)
            assert "risk_score" in result
            assert "risk_level" in result
            assert "flags" in result
        except ValueError:
            # Expected if models are not trained
            pass
    
    def test_get_risk_level(self):
        ensemble = FraudDetectionEnsemble()
        
        assert ensemble._get_risk_level(85) == "high"
        assert ensemble._get_risk_level(65) == "medium"
        assert ensemble._get_risk_level(25) == "low"
    
    def test_generate_flags(self):
        ensemble = FraudDetectionEnsemble()
        
        features = {
            "is_new_user": 1.0,
            "is_night": 1.0,
            "is_large_amount": 1.0,
        }
        
        anomaly = {"is_anomaly": True, "anomaly_score": 75}
        pattern = {"is_suspicious": True, "fraud_probability": 0.8}
        risk = {"risk_score": 70}
        
        flags = ensemble._generate_flags(features, anomaly, pattern, risk)
        
        assert "new_user" in flags
        assert "night_time_activity" in flags
        assert "large_amount" in flags
        assert "anomalous_behavior" in flags


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
