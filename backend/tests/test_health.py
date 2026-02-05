"""
Tests for the health check endpoints.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    """Test that health check returns healthy status."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert data["service"] == "aws-infra-visualizer"


@pytest.mark.asyncio
async def test_readiness_check(client):
    """Test that readiness check returns ready status."""
    response = await client.get("/api/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "checks" in data


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root endpoint returns service info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "AWS Infrastructure Visualizer"
    assert "version" in data
    assert "docs" in data
