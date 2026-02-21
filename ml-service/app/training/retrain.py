"""Model retraining pipeline."""

import numpy as np
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from app.config import get_settings
from app.data.connection import db_manager
from app.data.queries import FraudDetectionQueries
from app.features.extractors import SplitFeatureExtractor, PaymentFeatureExtractor
from app.models.anomaly_detector import AnomalyDetector
from app.models.pattern_recognizer import PatternRecognizer
from app.models.risk_scorer import RiskScorer
from app.models.ensemble import FraudDetectionEnsemble

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelTrainer:
    """Handles model training and retraining."""
    
    def __init__(self):
        self.settings = get_settings()
        self.metrics = {}
    
    async def fetch_training_data(self, limit: int = 10000) -> tuple:
        """Fetch and prepare training data from database."""
        async with db_manager.async_session() as session:
            # Get labeled data from fraud_alerts
            query = """
                SELECT 
                    s.id as split_id,
                    s.total_amount,
                    s.participant_count,
                    s.created_at,
                    s.preferred_currency,
                    s.creator_wallet_address,
                    fa.is_true_positive as is_fraud,
                    fa.risk_score as labeled_risk
                FROM splits s
                JOIN fraud_alerts fa ON s.id = fa.split_id
                WHERE fa.is_true_positive IS NOT NULL
                ORDER BY s.created_at DESC
                LIMIT :limit
            """
            
            from sqlalchemy import text
            result = await session.execute(text(query), {"limit": limit})
            rows = result.fetchall()
            
            if len(rows) < self.settings.min_training_samples:
                logger.warning(
                    f"Insufficient training data: {len(rows)} samples, "
                    f"minimum required: {self.settings.min_training_samples}"
                )
                return None, None
            
            # Extract features for each split
            features_list = []
            labels = []
            
            for row in rows:
                split_data = {
                    "split_id": str(row[0]),
                    "total_amount": float(row[1]),
                    "participant_count": row[2],
                    "created_at": row[3],
                    "preferred_currency": row[4],
                    "creator_wallet_address": row[5]
                }
                
                # Get user history
                user_history = await FraudDetectionQueries.get_user_split_history(
                    session, row[5] or "unknown"
                )
                
                # Get network patterns
                network_patterns = await FraudDetectionQueries.get_network_patterns(
                    session, str(row[0])
                )
                
                # Extract features
                features = SplitFeatureExtractor.extract(
                    split_data, user_history, network_patterns
                )
                features_list.append(features)
                
                # Label: 1 for fraud, 0 for legitimate
                is_fraud = row[6] if row[6] is not None else False
                labels.append(1 if is_fraud else 0)
            
            # Convert to numpy arrays
            feature_names = list(features_list[0].keys())
            X = np.array([[f.get(name, 0.0) for name in feature_names] for f in features_list])
            y = np.array(labels)
            
            logger.info(f"Fetched {len(X)} training samples with {len(feature_names)} features")
            
            return X, y, feature_names
    
    def train_anomaly_detector(self, X: Optional[np.ndarray] = None, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Train the anomaly detection model."""
        logger.info("Training anomaly detector...")
        
        if X is None:
            # Use dummy data for initial training
            X = np.random.randn(1000, 20)
            feature_names = [f"feature_{i}" for i in range(20)]
        
        model = AnomalyDetector(
            contamination=self.settings.isolation_forest_contamination,
            n_estimators=self.settings.isolation_forest_n_estimators
        )
        
        model.train(X, feature_names)
        path = model.save()
        
        logger.info(f"Anomaly detector trained and saved to {path}")
        
        self.metrics["anomaly_detector"] = {
            "version": model.get_version(),
            "path": path,
            "contamination": model.contamination
        }
        
        return self.metrics["anomaly_detector"]
    
    def train_pattern_recognizer(self, X: Optional[np.ndarray] = None, y: Optional[np.ndarray] = None, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Train the pattern recognition model."""
        logger.info("Training pattern recognizer...")
        
        if X is None or y is None:
            # Use dummy data for initial training
            X = np.random.randn(1000, 20)
            y = np.random.randint(0, 2, 1000)
            feature_names = [f"feature_{i}" for i in range(20)]
        
        model = PatternRecognizer(
            input_dim=X.shape[1],
            hidden_layers=[128, 64, 32],
            dropout_rate=0.3
        )
        
        history = model.train(X, y, feature_names=feature_names, epochs=50)
        path = model.save()
        
        logger.info(f"Pattern recognizer trained and saved to {path}")
        
        self.metrics["pattern_recognizer"] = {
            "version": model.get_version(),
            "path": path,
            "accuracy": history.get("final_accuracy", 0),
            "val_accuracy": history.get("final_val_accuracy", 0)
        }
        
        return self.metrics["pattern_recognizer"]
    
    def train_risk_scorer(self, X: Optional[np.ndarray] = None, y: Optional[np.ndarray] = None, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Train the risk scoring model."""
        logger.info("Training risk scorer...")
        
        if X is None or y is None:
            # Use dummy data for initial training
            X = np.random.randn(1000, 20)
            y = np.random.uniform(0, 100, 1000)
            feature_names = [f"feature_{i}" for i in range(20)]
        
        # Convert binary labels to risk scores if needed
        if y.max() <= 1:
            y = y * 100
        
        model = RiskScorer(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=6
        )
        
        metrics = model.train(X, y, feature_names)
        path = model.save()
        
        logger.info(f"Risk scorer trained and saved to {path}")
        
        self.metrics["risk_scorer"] = {
            "version": model.get_version(),
            "path": path,
            **metrics
        }
        
        return self.metrics["risk_scorer"]
    
    def train_ensemble(self, X: Optional[np.ndarray] = None, y: Optional[np.ndarray] = None, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Train the ensemble model."""
        logger.info("Training ensemble...")
        
        if X is None or y is None:
            # Use dummy data for initial training
            X = np.random.randn(1000, 20)
            y = np.random.randint(0, 2, 1000)
            feature_names = [f"feature_{i}" for i in range(20)]
        
        ensemble = FraudDetectionEnsemble()
        results = ensemble.train(X, y, feature_names)
        path = ensemble.save()
        
        logger.info(f"Ensemble trained and saved to {path}")
        
        self.metrics["ensemble"] = {
            "version": ensemble.get_version(),
            "path": path,
            "model_results": results
        }
        
        return self.metrics["ensemble"]
    
    async def train_all(self) -> Dict[str, Any]:
        """Train all models with data from database."""
        logger.info("Starting full model training pipeline...")
        
        # Fetch training data
        data = await self.fetch_training_data()
        
        if data[0] is None:
            logger.warning("Using synthetic data for initial training")
            X, y, feature_names = None, None, None
        else:
            X, y, feature_names = data
        
        # Train individual models
        self.train_anomaly_detector(X, feature_names)
        self.train_pattern_recognizer(X, y, feature_names)
        self.train_risk_scorer(X, y, feature_names)
        
        # Train ensemble
        self.train_ensemble(X, y, feature_names)
        
        logger.info("Training pipeline completed")
        
        return self.metrics
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get training metrics."""
        return {
            "trained_at": datetime.now().isoformat(),
            "models": self.metrics
        }


async def main():
    """Main training function."""
    trainer = ModelTrainer()
    metrics = await trainer.train_all()
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    import json
    asyncio.run(main())
