"""Database connection management."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from typing import Optional
import asyncio

from app.config import get_settings

Base = declarative_base()

class DatabaseManager:
    """Manages database connections."""
    
    _instance: Optional['DatabaseManager'] = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        settings = get_settings()
        # Convert sync connection string to async
        db_url = settings.db_connection_string
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        self.engine = create_async_engine(
            db_url,
            pool_size=settings.db_pool_size,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False
        )
        
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        self._initialized = True
    
    async def get_session(self) -> AsyncSession:
        """Get a database session."""
        async with self.async_session() as session:
            yield session
    
    async def health_check(self) -> bool:
        """Check database connectivity."""
        try:
            async with self.async_session() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception:
            return False
    
    async def close(self):
        """Close database connections."""
        if self.engine:
            await self.engine.dispose()


# Global instance
db_manager = DatabaseManager()


async def get_db_session():
    """Dependency for FastAPI to get database session."""
    async with db_manager.async_session() as session:
        try:
            yield session
        finally:
            await session.close()
