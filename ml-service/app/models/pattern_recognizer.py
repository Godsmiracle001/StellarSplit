"""Neural network for pattern recognition."""

import numpy as np
import os
from typing import Dict, Any, Optional, List
from datetime import datetime
import json

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

from app.config import get_settings


class PatternRecognizer:
    """
    Neural Network for fraud pattern recognition.
    
    Uses a multi-layer neural network to identify complex fraud patterns
    that may not be captured by simpler models.
    """
    
    def __init__(
        self,
        input_dim: int = 20,
        hidden_layers: List[int] = [128, 64, 32],
        dropout_rate: float = 0.3,
        learning_rate: float = 0.001
    ):
        self.input_dim = input_dim
        self.hidden_layers = hidden_layers
        self.dropout_rate = dropout_rate
        self.learning_rate = learning_rate
        self.version = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.is_trained = False
        self.feature_names = []
        self.history = None
        
        if TF_AVAILABLE:
            self.model = self._build_model()
        else:
            self.model = None
    
    def _build_model(self) -> Sequential:
        """Build the neural network architecture."""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is not available")
        
        model = Sequential()
        
        # Input layer
        model.add(Dense(self.hidden_layers[0], activation='relu', input_shape=(self.input_dim,)))
        model.add(BatchNormalization())
        model.add(Dropout(self.dropout_rate))
        
        # Hidden layers
        for units in self.hidden_layers[1:]:
            model.add(Dense(units, activation='relu'))
            model.add(BatchNormalization())
            model.add(Dropout(self.dropout_rate))
        
        # Output layer (binary classification)
        model.add(Dense(1, activation='sigmoid'))
        
        # Compile
        model.compile(
            optimizer=Adam(learning_rate=self.learning_rate),
            loss='binary_crossentropy',
            metrics=['accuracy', tf.keras.metrics.AUC()]
        )
        
        return model
    
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        validation_split: float = 0.2,
        epochs: int = 100,
        batch_size: int = 32,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Train the neural network."""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is not available")
        
        if self.model is None:
            self.input_dim = X.shape[1]
            self.model = self._build_model()
        
        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        # Train
        self.history = self.model.fit(
            X, y,
            validation_split=validation_split,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping],
            verbose=1
        )
        
        self.is_trained = True
        if feature_names:
            self.feature_names = feature_names
        
        # Return training history
        return {
            "epochs_trained": len(self.history.history['loss']),
            "final_loss": float(self.history.history['loss'][-1]),
            "final_accuracy": float(self.history.history['accuracy'][-1]),
            "final_val_accuracy": float(self.history.history['val_accuracy'][-1]),
        }
    
    def predict(self, X: np.ndarray) -> Dict[str, Any]:
        """
        Predict fraud probability.
        
        Returns:
            Dict with pattern_match_score (0-100), is_suspicious, and confidence
        """
        if not TF_AVAILABLE or self.model is None:
            raise ImportError("TensorFlow is not available or model not trained")
        
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Get prediction probability
        prob = self.model.predict(X, verbose=0)[0][0]
        
        # Convert to score (0-100)
        score = prob * 100
        
        return {
            "pattern_match_score": float(score),
            "is_suspicious": bool(prob > 0.5),
            "fraud_probability": float(prob),
            "confidence": self._calculate_confidence(prob)
        }
    
    def predict_batch(self, X: np.ndarray) -> List[Dict[str, Any]]:
        """Predict fraud probabilities for batch."""
        if not TF_AVAILABLE or self.model is None:
            raise ImportError("TensorFlow is not available or model not trained")
        
        probs = self.model.predict(X, verbose=0)
        
        results = []
        for prob in probs:
            score = prob[0] * 100
            results.append({
                "pattern_match_score": float(score),
                "is_suspicious": bool(prob[0] > 0.5),
                "fraud_probability": float(prob[0]),
                "confidence": self._calculate_confidence(prob[0])
            })
        
        return results
    
    def _calculate_confidence(self, prob: float) -> float:
        """Calculate confidence based on distance from 0.5."""
        # Higher distance from 0.5 = higher confidence
        confidence = abs(prob - 0.5) * 2
        return float(confidence)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance using permutation importance approximation."""
        if not self.feature_names:
            return {}
        
        # For neural networks, we can use the first layer weights as a proxy
        if self.model is not None and TF_AVAILABLE:
            first_layer_weights = np.abs(self.model.layers[0].get_weights()[0])
            importance = np.mean(first_layer_weights, axis=1)
            
            # Normalize
            importance = importance / np.sum(importance)
            
            return {
                name: float(imp)
                for name, imp in zip(self.feature_names, importance)
            }
        
        return {name: 1.0 / len(self.feature_names) for name in self.feature_names}
    
    def save(self, path: Optional[str] = None):
        """Save model to disk."""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is not available")
        
        if path is None:
            settings = get_settings()
            path = os.path.join(
                settings.model_registry_path,
                "pattern_recognizer",
                self.version
            )
        
        os.makedirs(path, exist_ok=True)
        
        # Save Keras model
        model_path = os.path.join(path, "model.keras")
        self.model.save(model_path)
        
        # Save metadata
        metadata = {
            "version": self.version,
            "input_dim": self.input_dim,
            "hidden_layers": self.hidden_layers,
            "dropout_rate": self.dropout_rate,
            "learning_rate": self.learning_rate,
            "is_trained": self.is_trained,
            "feature_names": self.feature_names,
            "trained_at": datetime.now().isoformat()
        }
        
        if self.history:
            metadata["training_history"] = {
                k: [float(v) for v in vals]
                for k, vals in self.history.history.items()
            }
        
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        
        return path
    
    def load(self, version: str, base_path: Optional[str] = None):
        """Load model from disk."""
        if not TF_AVAILABLE:
            raise ImportError("TensorFlow is not available")
        
        if base_path is None:
            settings = get_settings()
            base_path = settings.model_registry_path
        
        path = os.path.join(base_path, "pattern_recognizer", version)
        
        # Load metadata
        metadata_path = os.path.join(path, "metadata.json")
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        self.version = metadata["version"]
        self.input_dim = metadata["input_dim"]
        self.hidden_layers = metadata["hidden_layers"]
        self.dropout_rate = metadata["dropout_rate"]
        self.learning_rate = metadata["learning_rate"]
        self.is_trained = metadata["is_trained"]
        self.feature_names = metadata.get("feature_names", [])
        
        # Load Keras model
        model_path = os.path.join(path, "model.keras")
        self.model = load_model(model_path)
        
        return self
    
    def get_version(self) -> str:
        """Get model version."""
        return self.version
