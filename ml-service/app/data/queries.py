"""Database queries for fraud detection."""

from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta


class FraudDetectionQueries:
    """Queries for fraud detection data."""
    
    @staticmethod
    async def get_user_split_history(
        session: AsyncSession,
        user_id: str,
        days: int = 90
    ) -> Dict[str, Any]:
        """Get user's split creation history."""
        query = text("""
            SELECT 
                COUNT(*) as total_splits,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_splits,
                AVG(total_amount) as avg_amount,
                MAX(created_at) as last_split_at,
                MIN(created_at) as first_split_at
            FROM splits
            WHERE creator_wallet_address = (
                SELECT creator_wallet_address FROM splits 
                WHERE creator_wallet_address IS NOT NULL 
                LIMIT 1
            )
            AND created_at >= :since
        """)
        
        since = datetime.utcnow() - timedelta(days=days)
        result = await session.execute(query, {"since": since})
        row = result.fetchone()
        
        if not row:
            return {
                "total_splits": 0,
                "completed_splits": 0,
                "avg_amount": 0,
                "last_split_at": None,
                "first_split_at": None
            }
        
        return {
            "total_splits": row[0] or 0,
            "completed_splits": row[1] or 0,
            "avg_amount": float(row[2]) if row[2] else 0,
            "last_split_at": row[3],
            "first_split_at": row[4]
        }
    
    @staticmethod
    async def get_user_payment_history(
        session: AsyncSession,
        wallet_address: str,
        days: int = 90
    ) -> Dict[str, Any]:
        """Get user's payment history."""
        query = text("""
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount,
                COUNT(DISTINCT split_id) as unique_splits
            FROM payments p
            JOIN participants pt ON p.participant_id = pt.id
            WHERE pt.wallet_address = :wallet_address
            AND p.created_at >= :since
        """)
        
        since = datetime.utcnow() - timedelta(days=days)
        result = await session.execute(query, {
            "wallet_address": wallet_address,
            "since": since
        })
        row = result.fetchone()
        
        if not row:
            return {
                "total_payments": 0,
                "total_amount": 0,
                "avg_amount": 0,
                "unique_splits": 0
            }
        
        return {
            "total_payments": row[0] or 0,
            "total_amount": float(row[1]) if row[1] else 0,
            "avg_amount": float(row[2]) if row[2] else 0,
            "unique_splits": row[3] or 0
        }
    
    @staticmethod
    async def get_split_participants(
        session: AsyncSession,
        split_id: str
    ) -> List[Dict[str, Any]]:
        """Get participants for a split."""
        query = text("""
            SELECT 
                id,
                user_id,
                amount_owed,
                amount_paid,
                status,
                wallet_address
            FROM participants
            WHERE split_id = :split_id
        """)
        
        result = await session.execute(query, {"split_id": split_id})
        rows = result.fetchall()
        
        return [
            {
                "id": str(row[0]),
                "user_id": str(row[1]),
                "amount_owed": float(row[2]),
                "amount_paid": float(row[3]),
                "status": row[4],
                "wallet_address": row[5]
            }
            for row in rows
        ]
    
    @staticmethod
    async def get_split_items(
        session: AsyncSession,
        split_id: str
    ) -> List[Dict[str, Any]]:
        """Get items for a split."""
        query = text("""
            SELECT 
                id,
                name,
                amount,
                quantity
            FROM items
            WHERE split_id = :split_id
        """)
        
        result = await session.execute(query, {"split_id": split_id})
        rows = result.fetchall()
        
        return [
            {
                "id": str(row[0]),
                "name": row[1],
                "amount": float(row[2]),
                "quantity": row[3] or 1
            }
            for row in rows
        ]
    
    @staticmethod
    async def get_network_patterns(
        session: AsyncSession,
        split_id: str
    ) -> Dict[str, Any]:
        """Analyze network patterns for fraud detection."""
        # Check for circular payments
        circular_query = text("""
            SELECT COUNT(*) FROM (
                SELECT DISTINCT p1.wallet_address
                FROM participants p1
                JOIN participants p2 ON p1.split_id = p2.split_id
                JOIN payments pay ON pay.participant_id = p2.id
                WHERE p1.split_id = :split_id
                AND p1.wallet_address IS NOT NULL
            ) sub
        """)
        
        result = await session.execute(circular_query, {"split_id": split_id})
        unique_wallets = result.scalar() or 0
        
        # Check for rapid split creation
        rapid_query = text("""
            SELECT COUNT(*) FROM splits s1
            JOIN splits s2 ON s1.creator_wallet_address = s2.creator_wallet_address
            WHERE s2.id = :split_id
            AND s1.id != s2.id
            AND s1.created_at >= s2.created_at - INTERVAL '1 hour'
            AND s1.created_at <= s2.created_at
        """)
        
        result = await session.execute(rapid_query, {"split_id": split_id})
        recent_splits = result.scalar() or 0
        
        return {
            "unique_wallet_count": unique_wallets,
            "recent_splits_count": recent_splits,
            "has_circular_pattern": False,  # Would need more complex analysis
            "is_rapid_creation": recent_splits > 5
        }
    
    @staticmethod
    async def get_training_data(
        session: AsyncSession,
        limit: int = 10000
    ) -> List[Dict[str, Any]]:
        """Get labeled data for model training."""
        query = text("""
            SELECT 
                s.id as split_id,
                s.total_amount,
                s.participant_count,
                s.created_at,
                s.preferred_currency,
                fa.risk_score as labeled_risk,
                fa.is_true_positive as is_fraud
            FROM splits s
            LEFT JOIN fraud_alerts fa ON s.id = fa.split_id
            WHERE fa.id IS NOT NULL
            ORDER BY s.created_at DESC
            LIMIT :limit
        """)
        
        result = await session.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        return [
            {
                "split_id": str(row[0]),
                "total_amount": float(row[1]),
                "participant_count": row[2],
                "created_at": row[3],
                "preferred_currency": row[4],
                "labeled_risk": float(row[5]) if row[5] else None,
                "is_fraud": row[6]
            }
            for row in rows
        ]
