#!/usr/bin/env python3
"""
Reset the SQLite database.

This script drops all tables and recreates them, effectively resetting
the database to a clean state.

⚠️  WARNING: This will delete all data in the database!

Usage:
    python -m scripts.reset_db

    or

    python scripts/reset_db.py
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
    """Drop all tables and recreate them."""
    settings = get_settings()

    logger.warning("⚠️  WARNING: This will delete all data in the database!")
    logger.info(f"Database URL: {settings.database_url}")

    # Confirm action
    response = input("Are you sure you want to reset the database? (yes/no): ")
    if response.lower() != "yes":
        logger.info("Database reset cancelled")
        return

    try:
        # Drop all tables
        logger.info("Dropping all tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        logger.info("✓ All tables dropped")

        # Recreate all tables
        logger.info("Creating tables...")
        await init_db()
        logger.info("✓ All tables recreated")

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
        logger.error(f"✗ Failed to reset database: {e}")
        sys.exit(1)

    logger.info("Database reset complete!")


if __name__ == "__main__":
    asyncio.run(main())
