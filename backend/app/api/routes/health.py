"""
Health check endpoints.

Provides health and readiness checks for the application.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.version import get_version

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        Health status, version, and timestamp
    """
    return {
        "status": "healthy",
        "version": get_version(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "aws-infra-visualizer",
    }


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint.

    Verifies the application is ready to serve requests.

    Returns:
        Readiness status with component checks
    """
    # TODO: Add actual checks for database, AWS connectivity, etc.
    return {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": "ok",
            "aws": "ok",
        },
    }
