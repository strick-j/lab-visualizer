"""
Application info endpoint.

Provides version, build, and environment information.
"""

import os
from datetime import datetime, timezone

from fastapi import APIRouter

from app.version import get_version

router = APIRouter()


@router.get("/info")
async def app_info():
    """
    Application information endpoint.

    Returns version, build metadata, and environment details.
    """
    return {
        "version": get_version(),
        "build_sha": os.environ.get("BUILD_SHA", "unknown"),
        "build_date": os.environ.get("BUILD_DATE", "unknown"),
        "environment": os.environ.get("ENVIRONMENT", "development"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
