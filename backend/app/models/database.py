"""
Database configuration and session management.

Uses SQLAlchemy with async support for SQLite.

The engine and session factory are created lazily on first access so that
test code can override the database URL (or call ``configure_test_engine``)
before any connections are opened.  Existing callers that import ``engine``
or ``async_session_maker`` at the module level continue to work thanks to a
module-level ``__getattr__`` hook (PEP 562).
"""

import logging
from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-initialised module state
# ---------------------------------------------------------------------------
_engine = None
_async_session_maker = None


class Base(DeclarativeBase):
    """Base class for all database models."""

    pass


# Enable foreign key support for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key constraints for SQLite."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ---------------------------------------------------------------------------
# Engine / session helpers
# ---------------------------------------------------------------------------


def get_engine():
    """Return the async engine, creating it on first call."""
    global _engine
    if _engine is None:
        settings = get_settings()
        database_url = settings.database_url
        if database_url.startswith("sqlite:///"):
            database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///")
        _engine = create_async_engine(
            database_url,
            echo=settings.debug,
            future=True,
        )
    return _engine


def get_session_maker():
    """Return the async session factory, creating it on first call."""
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_maker


def configure_test_engine(url: str = "sqlite+aiosqlite://", **engine_kwargs):
    """Replace the engine with an in-memory test engine.

    Uses ``StaticPool`` so that every async task shares the same underlying
    SQLite connection (required for in-memory databases).

    Call this **before** any ``init_db`` / ``get_db`` usage — typically at the
    top level of ``tests/conftest.py``.
    """
    from sqlalchemy.pool import StaticPool

    global _engine, _async_session_maker

    defaults = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }
    defaults.update(engine_kwargs)

    _engine = create_async_engine(url, **defaults)
    _async_session_maker = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


# ---------------------------------------------------------------------------
# PEP 562 – allow ``from app.models.database import engine`` etc. to keep
# working while deferring creation until first access.
# ---------------------------------------------------------------------------


def __getattr__(name: str):
    if name == "engine":
        return get_engine()
    if name == "async_session_maker":
        return get_session_maker()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


# ---------------------------------------------------------------------------
# Public async helpers
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session."""
    async with get_session_maker()() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize the database and create all tables."""
    from app.models.auth import AuthSettings, Session, User
    from app.models.resources import (
        EC2Instance,
        RDSInstance,
        Region,
        SyncStatus,
        TerraformStateBucket,
        TerraformStatePath,
    )

    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully")
