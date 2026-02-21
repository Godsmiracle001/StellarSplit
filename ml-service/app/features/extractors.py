"""Feature extractors for fraud detection."""

from typing import Dict, Any, List, Optional
from datetime import datetime
import numpy as np


class SplitFeatureExtractor:
    """Extract features from split data."""
    
    @staticmethod
    def extract(
        split_data: Dict[str, Any],
        user_history: Optional[Dict[str, Any]] = None,
        network_patterns: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """Extract all features from split data."""
        features = {}
        
        # Amount features
        features.update(SplitFeatureExtractor._extract_amount_features(split_data))
        
        # Time features
        features.update(SplitFeatureExtractor._extract_time_features(split_data))
        
        # Participant features
        features.update(SplitFeatureExtractor._extract_participant_features(split_data))
        
        # Item features
        features.update(SplitFeatureExtractor._extract_item_features(split_data))
        
        # Currency features
        features.update(SplitFeatureExtractor._extract_currency_features(split_data))
        
        # User history features
        if user_history:
            features.update(SplitFeatureExtractor._extract_user_features(user_history))
        
        # Network features
        if network_patterns:
            features.update(SplitFeatureExtractor._extract_network_features(network_patterns))
        
        return features
    
    @staticmethod
    def _extract_amount_features(split_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract amount-related features."""
        total_amount = float(split_data.get("total_amount", 0))
        participant_count = split_data.get("participant_count", 1)
        
        return {
            "total_amount": total_amount,
            "amount_per_participant": total_amount / max(participant_count, 1),
            "log_total_amount": np.log1p(total_amount),
            "is_large_amount": float(total_amount > 1000),
            "is_small_amount": float(total_amount < 10),
        }
    
    @staticmethod
    def _extract_time_features(split_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract time-related features."""
        created_at = split_data.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        
        if not created_at:
            created_at = datetime.utcnow()
        
        hour = created_at.hour
        day_of_week = created_at.weekday()
        
        return {
            "hour_of_day": float(hour),
            "day_of_week": float(day_of_week),
            "is_weekend": float(day_of_week >= 5),
            "is_night": float(hour < 6 or hour > 22),
            "is_business_hours": float(9 <= hour <= 17),
            "is_late_night": float(0 <= hour < 5),
        }
    
    @staticmethod
    def _extract_participant_features(split_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract participant-related features."""
        participant_count = split_data.get("participant_count", 0)
        participants = split_data.get("participants", [])
        
        # Calculate variance in amounts owed
        if participants:
            amounts = [p.get("amount_owed", 0) for p in participants]
            amount_variance = np.var(amounts) if len(amounts) > 1 else 0
            max_amount = max(amounts) if amounts else 0
            min_amount = min(amounts) if amounts else 0
        else:
            amount_variance = 0
            max_amount = 0
            min_amount = 0
        
        return {
            "participant_count": float(participant_count),
            "log_participant_count": np.log1p(participant_count),
            "is_single_participant": float(participant_count == 1),
            "is_large_group": float(participant_count > 10),
            "amount_variance": float(amount_variance),
            "amount_range": float(max_amount - min_amount),
        }
    
    @staticmethod
    def _extract_item_features(split_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract item-related features."""
        items = split_data.get("items", [])
        item_count = len(items)
        
        if items:
            item_amounts = [i.get("amount", 0) for i in items]
            avg_item_amount = np.mean(item_amounts)
            item_variance = np.var(item_amounts) if len(item_amounts) > 1 else 0
        else:
            avg_item_amount = 0
            item_variance = 0
        
        return {
            "item_count": float(item_count),
            "has_items": float(item_count > 0),
            "avg_item_amount": float(avg_item_amount),
            "item_variance": float(item_variance),
            "items_per_participant": item_count / max(split_data.get("participant_count", 1), 1),
        }
    
    @staticmethod
    def _extract_currency_features(split_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract currency-related features."""
        currency = split_data.get("preferred_currency", "XLM")
        
        return {
            "is_xlm": float(currency == "XLM"),
            "is_usdc": float("USDC" in currency.upper()),
            "is_eurc": float("EURC" in currency.upper()),
            "is_stablecoin": float(any(s in currency.upper() for s in ["USDC", "EURC", "USDT"])),
        }
    
    @staticmethod
    def _extract_user_features(user_history: Dict[str, Any]) -> Dict[str, float]:
        """Extract user history features."""
        total_splits = user_history.get("total_splits", 0)
        completed_splits = user_history.get("completed_splits", 0)
        avg_amount = user_history.get("avg_amount", 0)
        first_split_at = user_history.get("first_split_at")
        
        # Calculate account age
        if first_split_at:
            if isinstance(first_split_at, str):
                first_split_at = datetime.fromisoformat(first_split_at.replace('Z', '+00:00'))
            account_age_days = (datetime.utcnow() - first_split_at).days
        else:
            account_age_days = 0
        
        completion_rate = completed_splits / max(total_splits, 1)
        
        return {
            "user_total_splits": float(total_splits),
            "user_completion_rate": float(completion_rate),
            "user_avg_amount": float(avg_amount),
            "user_account_age_days": float(account_age_days),
            "is_new_user": float(account_age_days < 7),
            "is_active_user": float(total_splits > 10),
            "is_trusted_user": float(completion_rate > 0.9 and total_splits > 5),
        }
    
    @staticmethod
    def _extract_network_features(network_patterns: Dict[str, Any]) -> Dict[str, float]:
        """Extract network pattern features."""
        return {
            "unique_wallet_count": float(network_patterns.get("unique_wallet_count", 0)),
            "recent_splits_count": float(network_patterns.get("recent_splits_count", 0)),
            "is_rapid_creation": float(network_patterns.get("is_rapid_creation", False)),
            "has_circular_pattern": float(network_patterns.get("has_circular_pattern", False)),
        }


class PaymentFeatureExtractor:
    """Extract features from payment data."""
    
    @staticmethod
    def extract(
        payment_data: Dict[str, Any],
        split_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """Extract all features from payment data."""
        features = {}
        
        # Payment amount features
        features.update(PaymentFeatureExtractor._extract_payment_amount_features(payment_data))
        
        # Timing features
        features.update(PaymentFeatureExtractor._extract_timing_features(payment_data, split_context))
        
        # Asset features
        features.update(PaymentFeatureExtractor._extract_asset_features(payment_data))
        
        # Split context features
        if split_context:
            features.update(PaymentFeatureExtractor._extract_split_context_features(split_context))
        
        return features
    
    @staticmethod
    def _extract_payment_amount_features(payment_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract payment amount features."""
        amount = float(payment_data.get("amount", 0))
        
        return {
            "payment_amount": amount,
            "log_payment_amount": np.log1p(amount),
            "is_large_payment": float(amount > 1000),
            "is_small_payment": float(amount < 1),
        }
    
    @staticmethod
    def _extract_timing_features(
        payment_data: Dict[str, Any],
        split_context: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Extract timing features."""
        timestamp = payment_data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        if not timestamp:
            timestamp = datetime.utcnow()
        
        features = {
            "payment_hour": float(timestamp.hour),
            "payment_day_of_week": float(timestamp.weekday()),
            "payment_is_weekend": float(timestamp.weekday() >= 5),
            "payment_is_night": float(timestamp.hour < 6 or timestamp.hour > 22),
        }
        
        # Calculate time since split creation
        if split_context and split_context.get("created_at"):
            created_at = split_context["created_at"]
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            time_diff = (timestamp - created_at).total_seconds() / 3600  # hours
            features["hours_since_split_creation"] = time_diff
            features["is_immediate_payment"] = float(time_diff < 1)
            features["is_delayed_payment"] = float(time_diff > 168)  # 7 days
        
        return features
    
    @staticmethod
    def _extract_asset_features(payment_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract asset features."""
        asset = payment_data.get("asset", "XLM")
        
        return {
            "is_xlm_payment": float(asset == "XLM"),
            "is_usdc_payment": float("USDC" in asset.upper()),
            "is_stablecoin_payment": float(any(s in asset.upper() for s in ["USDC", "EURC", "USDT"])),
        }
    
    @staticmethod
    def _extract_split_context_features(split_context: Dict[str, Any]) -> Dict[str, float]:
        """Extract split context features."""
        total_amount = float(split_context.get("total_amount", 0))
        amount_paid = float(split_context.get("amount_paid", 0))
        
        completion_pct = (amount_paid / total_amount * 100) if total_amount > 0 else 0
        
        return {
            "split_total_amount": total_amount,
            "split_completion_pct": completion_pct,
            "split_is_complete": float(completion_pct >= 100),
            "split_is_partial": float(0 < completion_pct < 100),
            "participant_count": float(split_context.get("participant_count", 0)),
        }
