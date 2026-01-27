#!/usr/bin/env python3
"""
Initialize the SQLite database.

This script creates all database tables without starting the full application.
Useful for development and testing environments.

Usage:
    python -m scripts.init_db

    or

    python scripts/init_db.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.models.database import Base, engine, init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def main():
    """Initialize the database and create all tables."""
    settings = get_settings()

    logger.info("Initializing database...")
    logger.info(f"Database URL: {settings.database_url}")

    try:
        # Initialize database and create tables
        await init_db()
        logger.info("✓ Database initialized successfully")
        logger.info("✓ All tables created")

        # Display created tables
        async with engine.begin() as conn:
            result = await conn.run_sync(
                lambda sync_conn: sync_conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ).fetchall()
            )
            tables = [row[0] for row in result]
            logger.info(f"Created tables: {', '.join(tables)}")

    except Exception as e:
        logger.error(f"✗ Failed to initialize database: {e}")
        sys.exit(1)

    logger.info("Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
