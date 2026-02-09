"""
Tests for the authentication endpoints.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.database import init_db


@pytest.fixture
async def client():
    """Create async test client with initialized database."""
    await init_db()
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_auth_config_returns_successfully(client):
    """Test that GET /api/auth/config returns auth configuration."""
    response = await client.get("/api/auth/config")
    assert response.status_code == 200
    data = response.json()
    assert "local_auth_enabled" in data
    assert "oidc_enabled" in data
    assert "oidc_issuer" in data
    assert "oidc_display_name" in data
    assert isinstance(data["local_auth_enabled"], bool)
    assert isinstance(data["oidc_enabled"], bool)


@pytest.mark.asyncio
async def test_auth_config_reflects_default_settings(client):
    """Test that auth config reflects default settings values."""
    response = await client.get("/api/auth/config")
    assert response.status_code == 200
    data = response.json()
    # Default settings have local_auth_enabled=True and no OIDC configured
    assert data["local_auth_enabled"] is True
    assert data["oidc_enabled"] is False
    assert data["oidc_issuer"] is None
    assert data["oidc_display_name"] is None


@pytest.mark.asyncio
async def test_auth_config_with_multiple_admins(client):
    """Test that GET /api/auth/config works when multiple admin users exist.

    Regression test: scalar_one_or_none() in check_admin_exists() raised
    MultipleResultsFound when more than one admin existed, causing a 500.
    """
    from app.models.database import async_session_maker
    from app.services.auth import create_initial_admin

    # Create first admin via setup endpoint
    response = await client.post(
        "/api/auth/setup",
        json={
            "username": "admin1",
            "password": "AdminPass1!xyz",
            "confirm_password": "AdminPass1!xyz",
        },
    )
    assert response.status_code == 200

    # Create a second admin user directly in the database
    async with async_session_maker() as session:
        from app.models.auth import User

        user2 = User(
            username="admin2",
            password_hash="unused",
            is_admin=True,
            is_active=True,
            role="admin",
        )
        session.add(user2)
        await session.commit()

    # This must return 200, not 500
    response = await client.get("/api/auth/config")
    assert response.status_code == 200
    data = response.json()
    assert data["setup_required"] is False


@pytest.mark.asyncio
async def test_login_invalid_credentials_returns_401(client):
    """Test that POST /api/auth/login with invalid credentials returns 401."""
    response = await client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_login_no_body_returns_422(client):
    """Test that POST /api/auth/login with no body returns 422."""
    response = await client.post("/api/auth/login")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_empty_username_returns_422(client):
    """Test that POST /api/auth/login with empty username returns 422."""
    response = await client.post(
        "/api/auth/login",
        json={"username": "", "password": "somepassword"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_password_returns_422(client):
    """Test that POST /api/auth/login with missing password returns 422."""
    response = await client.post(
        "/api/auth/login",
        json={"username": "admin"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_me_without_token_returns_401(client):
    """Test that GET /api/auth/me without token returns 401."""
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_me_with_invalid_token_returns_401(client):
    """Test that GET /api/auth/me with an invalid token returns 401."""
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalidtoken123"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_logout_without_token_returns_401(client):
    """Test that POST /api/auth/logout without token returns 401."""
    response = await client.post("/api/auth/logout")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_logout_with_invalid_token_returns_401(client):
    """Test that POST /api/auth/logout with an invalid token returns 401."""
    response = await client.post(
        "/api/auth/logout",
        headers={"Authorization": "Bearer invalidtoken123"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_protected_ec2_route_without_token_returns_401(client):
    """Test that GET /api/ec2 without token returns 401 when auth is enabled."""
    response = await client.get("/api/ec2")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_invalid_token_returns_401(client):
    """Test that POST /api/auth/refresh with invalid token returns 401."""
    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalidrefreshtoken123"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_refresh_no_body_returns_422(client):
    """Test that POST /api/auth/refresh with no body returns 422."""
    response = await client.post("/api/auth/refresh")
    assert response.status_code == 422
