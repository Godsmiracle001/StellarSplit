"""Feature transformers for ML models."""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os

from app.config import get_settings


class FeatureTransformer:
    """Transform features for ML models."""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_names = []
        self.is_fitted = False
    
    def fit(self, features_list: List[Dict[str, float]]):
        """Fit the transformer on training data."""
        if not features_list:
            return
        
        # Convert to DataFrame
        df = pd.DataFrame(features_list)
        
        # Store feature names
        self.feature_names = list(df.columns)
        
        # Fit scaler on numeric features
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            self.scaler.fit(df[numeric_cols])
        
        self.is_fitted = True
    
    def transform(self, features: Dict[str, float]) -> np.ndarray:
        """Transform a single feature dictionary."""
        if not self.is_fitted:
            raise ValueError("Transformer must be fitted before transform")
        
        # Ensure all features are present
        for name in self.feature_names:
            if name not in features:
                features[name] = 0.0
        
        # Create array in correct order
        values = [features.get(name, 0.0) for name in self.feature_names]
        X = np.array(values).reshape(1, -1)
        
        # Apply scaling
        X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def transform_batch(self, features_list: List[Dict[str, float]]) -> np.ndarray:
        """Transform a batch of features."""
        if not self.is_fitted:
            raise ValueError("Transformer must be fitted before transform")
        
        # Convert to DataFrame
        df = pd.DataFrame(features_list)
        
        # Ensure all features are present
        for name in self.feature_names:
            if name not in df.columns:
                df[name] = 0.0
        
        # Reorder columns
        df = df[self.feature_names]
        
        # Apply scaling
        X_scaled = self.scaler.transform(df)
        
        return X_scaled
    
    def save(self, path: str):
        """Save transformer to disk."""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_names': self.feature_names,
            'is_fitted': self.is_fitted
        }, path)
    
    def load(self, path: str):
        """Load transformer from disk."""
        data = joblib.load(path)
        self.scaler = data['scaler']
        self.label_encoders = data['label_encoders']
        self.feature_names = data['feature_names']
        self.is_fitted = data['is_fitted']


class FeaturePipeline:
    """Pipeline for feature extraction and transformation."""
    
    def __init__(self):
        self.split_transformer = FeatureTransformer()
        self.payment_transformer = FeatureTransformer()
    
    def fit_split_transformer(self, splits_data: List[Dict[str, Any]]):
        """Fit transformer on split data."""
        from app.features.extractors import SplitFeatureExtractor
        
        features_list = []
        for data in splits_data:
            features = SplitFeatureExtractor.extract(data)
            features_list.append(features)
        
        self.split_transformer.fit(features_list)
    
    def fit_payment_transformer(self, payments_data: List[Dict[str, Any]]):
        """Fit transformer on payment data."""
        from app.features.extractors import PaymentFeatureExtractor
        
        features_list = []
        for data in payments_data:
            features = PaymentFeatureExtractor.extract(data)
            features_list.append(features)
        
        self.payment_transformer.fit(features_list)
    
    def transform_split(self, split_data: Dict[str, Any]) -> np.ndarray:
        """Transform split data."""
        from app.features.extractors import SplitFeatureExtractor
        
        features = SplitFeatureExtractor.extract(split_data)
        return self.split_transformer.transform(features)
    
    def transform_payment(self, payment_data: Dict[str, Any]) -> np.ndarray:
        """Transform payment data."""
        from app.features.extractors import PaymentFeatureExtractor
        
        features = PaymentFeatureExtractor.extract(payment_data)
        return self.payment_transformer.transform(features)
    
    def save(self, base_path: str):
        """Save pipeline to disk."""
        os.makedirs(base_path, exist_ok=True)
        self.split_transformer.save(os.path.join(base_path, "split_transformer.joblib"))
        self.payment_transformer.save(os.path.join(base_path, "payment_transformer.joblib"))
    
    def load(self, base_path: str):
        """Load pipeline from disk."""
        self.split_transformer.load(os.path.join(base_path, "split_transformer.joblib"))
        self.payment_transformer.load(os.path.join(base_path, "payment_transformer.joblib"))


class FeatureImportanceAnalyzer:
    """Analyze feature importance for interpretability."""
    
    @staticmethod
    def get_feature_importance(model, feature_names: List[str]) -> Dict[str, float]:
        """Get feature importance from model."""
        importance = {}
        
        # Try different model types
        if hasattr(model, 'feature_importances_'):
            # Tree-based models
            for name, score in zip(feature_names, model.feature_importances_):
                importance[name] = float(score)
        
        elif hasattr(model, 'coef_'):
            # Linear models
            coefs = np.abs(model.coef_)
            if len(coefs.shape) > 1:
                coefs = coefs[0]
            for name, score in zip(feature_names, coefs):
                importance[name] = float(score)
        
        else:
            # Default: equal importance
            for name in feature_names:
                importance[name] = 1.0 / len(feature_names)
        
        # Sort by importance
        return dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
    
    @staticmethod
    def explain_prediction(
        features: Dict[str, float],
        feature_importance: Dict[str, float],
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """Explain which features contributed most to a prediction."""
        explanations = []
        
        for feature_name, importance in list(feature_importance.items())[:top_n]:
            value = features.get(feature_name, 0)
            explanations.append({
                "feature": feature_name,
                "value": value,
                "importance": importance,
                "description": FeatureImportanceAnalyzer._get_feature_description(feature_name)
            })
        
        return explanations
    
    @staticmethod
    def _get_feature_description(feature_name: str) -> str:
        """Get human-readable description of a feature."""
        descriptions = {
            "total_amount": "Total amount of the split",
            "amount_per_participant": "Average amount per participant",
            "participant_count": "Number of participants",
            "hour_of_day": "Hour when split was created",
            "is_night": "Split created during night hours",
            "is_weekend": "Split created on weekend",
            "user_total_splits": "User's total split count",
            "user_completion_rate": "User's historical completion rate",
            "is_new_user": "User is new (less than 7 days)",
            "is_rapid_creation": "Multiple splits created rapidly",
            "payment_amount": "Payment amount",
            "hours_since_split_creation": "Time elapsed since split creation",
            "split_completion_pct": "Percentage of split already paid",
        }
        
        return descriptions.get(feature_name, f"Feature: {feature_name}")
