"""Shared test configuration and fixtures."""

from app.models.database import configure_test_engine

# Set up an in-memory SQLite engine (with StaticPool) before any test or
# fixture touches the database.  This replaces the default file-backed
# engine so tests never require a ``data/`` directory on disk.
configure_test_engine()
