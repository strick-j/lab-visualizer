"""
Tests for the user management endpoints.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.database import Base, async_session_maker, engine
from app.services.auth import create_local_user, create_session


@pytest.fixture(autouse=True)
async def reset_db():
    """Reset database tables before each test for isolation."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture
async def client():
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
async def admin_user_and_token():
    """Create an admin user and return (user, access_token)."""
    async with async_session_maker() as db:
        user = await create_local_user(
            db,
            username=f"testadmin-{uuid.uuid4().hex[:8]}",
            password="OldPassword123",
            is_admin=True,
        )
        access_token, _, _ = await create_session(db, user)
        return user, access_token


@pytest.fixture
async def regular_user_and_token():
    """Create a regular (non-admin) user and return (user, access_token)."""
    async with async_session_maker() as db:
        user = await create_local_user(
            db,
            username=f"regularuser-{uuid.uuid4().hex[:8]}",
            password="OldPassword123",
            is_admin=False,
        )
        access_token, _, _ = await create_session(db, user)
        return user, access_token


# =============================================================================
# PUT /api/users/{user_id}/password
# =============================================================================


@pytest.mark.asyncio
async def test_change_password_without_token_returns_401(client):
    """Test that PUT /api/users/1/password without token returns 401."""
    response = await client.put(
        "/api/users/1/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_change_password_with_invalid_token_returns_401(client):
    """Test that PUT /api/users/1/password with invalid token returns 401."""
    response = await client.put(
        "/api/users/1/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": "Bearer invalidtoken"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_change_password_success(client, admin_user_and_token):
    """Test successful password change."""
    user, token = admin_user_and_token
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == user.username
    assert data["is_admin"] is True


@pytest.mark.asyncio
async def test_change_password_wrong_current_password(client, admin_user_and_token):
    """Test password change with incorrect current password returns 401."""
    user, token = admin_user_and_token
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "WrongPassword",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "incorrect" in data["detail"].lower()


@pytest.mark.asyncio
async def test_change_password_too_short_returns_422(client, admin_user_and_token):
    """Test password change with too-short new password returns 422."""
    user, token = admin_user_and_token
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "short",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_change_password_no_body_returns_422(client, admin_user_and_token):
    """Test password change with no body returns 422."""
    user, token = admin_user_and_token
    response = await client.put(
        f"/api/users/{user.id}/password",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_change_password_different_user_returns_403(client, admin_user_and_token):
    """Test that changing another user's password returns 403."""
    user, token = admin_user_and_token
    other_user_id = user.id + 999  # Non-existent but different user ID
    response = await client.put(
        f"/api/users/{other_user_id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    data = response.json()
    assert "own password" in data["detail"].lower()


@pytest.mark.asyncio
async def test_change_password_regular_user_success(client, regular_user_and_token):
    """Test that non-admin users can also change their own password."""
    user, token = regular_user_and_token
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == user.username


@pytest.mark.asyncio
async def test_change_password_then_login_with_new_password(
    client, admin_user_and_token
):
    """Test that after changing password, login works with the new password."""
    user, token = admin_user_and_token

    # Change password
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Login with new password
    response = await client.post(
        "/api/auth/login",
        json={"username": user.username, "password": "NewPassword456"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_change_password_old_password_no_longer_works(
    client, admin_user_and_token
):
    """Test that after changing password, login with old password fails."""
    user, token = admin_user_and_token

    # Change password
    response = await client.put(
        f"/api/users/{user.id}/password",
        json={
            "current_password": "OldPassword123",
            "new_password": "NewPassword456",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Login with old password should fail
    response = await client.post(
        "/api/auth/login",
        json={"username": user.username, "password": "OldPassword123"},
    )
    assert response.status_code == 401
