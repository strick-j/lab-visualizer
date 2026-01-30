"""
Authentication API routes.

Provides endpoints for local login, OIDC, and SAML authentication.
"""

import logging
import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.database import get_db
from app.schemas.auth import (
    AuthConfigResponse,
    LoginRequest,
    LogoutResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import (
    authenticate_local_user,
    create_federated_user,
    create_session,
    get_user_by_external_id,
    refresh_access_token,
    revoke_session,
    validate_access_token,
)

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

# Store OIDC/SAML state tokens temporarily (in production, use Redis)
_state_store: dict[str, dict] = {}


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """Extract client IP and user agent from request."""
    user_agent = request.headers.get("user-agent")
    # Handle X-Forwarded-For for proxied requests
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()
    else:
        ip_address = request.client.host if request.client else None
    return ip_address, user_agent


@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """Get authentication configuration for the frontend."""
    return AuthConfigResponse(
        local_auth_enabled=settings.local_auth_enabled,
        oidc_enabled=settings.oidc_enabled,
        saml_enabled=settings.saml_enabled,
        oidc_issuer=settings.oidc_issuer if settings.oidc_enabled else None,
        saml_idp_entity_id=settings.saml_idp_entity_id if settings.saml_enabled else None,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with username and password."""
    if not settings.local_auth_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local authentication is disabled",
        )

    user = await authenticate_local_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    ip_address, user_agent = get_client_info(request)
    access_token, refresh_token, session = await create_session(
        db, user, user_agent=user_agent, ip_address=ip_address
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh an access token."""
    result = await refresh_access_token(db, refresh_data.refresh_token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access_token, new_refresh_token = result
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Logout and revoke the current session."""
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = auth_header[7:]  # Remove "Bearer " prefix
    result = await validate_access_token(db, token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user, session = result
    await revoke_session(db, session)
    return LogoutResponse()


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get the current authenticated user."""
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = auth_header[7:]
    result = await validate_access_token(db, token)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user, _ = result
    return UserResponse.model_validate(user)


# =============================================================================
# OIDC Authentication
# =============================================================================


@router.get("/oidc/login")
async def oidc_login(request: Request):
    """Initiate OIDC authentication flow."""
    if not settings.oidc_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC authentication is not configured",
        )

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _state_store[state] = {"type": "oidc"}

    # Construct authorization URL
    redirect_uri = str(request.url_for("oidc_callback"))
    params = {
        "response_type": "code",
        "client_id": settings.oidc_client_id,
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
    }

    auth_url = f"{settings.oidc_issuer}/authorize?{urlencode(params)}"
    return {"auth_url": auth_url, "state": state}


@router.get("/oidc/callback")
async def oidc_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback after authentication."""
    if not settings.oidc_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC authentication is not configured",
        )

    # Verify state
    if state not in _state_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter",
        )
    del _state_store[state]

    # Exchange code for tokens
    redirect_uri = str(request.url_for("oidc_callback"))
    token_endpoint = f"{settings.oidc_issuer}/token"

    async with httpx.AsyncClient() as client:
        try:
            token_response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": settings.oidc_client_id,
                    "client_secret": settings.oidc_client_secret,
                },
            )
            token_response.raise_for_status()
            tokens = token_response.json()
        except httpx.HTTPError as e:
            logger.error(f"OIDC token exchange failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to exchange authorization code",
            )

        # Get user info
        userinfo_endpoint = f"{settings.oidc_issuer}/userinfo"
        try:
            userinfo_response = await client.get(
                userinfo_endpoint,
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()
        except httpx.HTTPError as e:
            logger.error(f"OIDC userinfo fetch failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to fetch user information",
            )

    # Find or create user
    external_id = userinfo.get("sub")
    if not external_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No subject identifier in OIDC response",
        )

    user = await get_user_by_external_id(db, external_id, "oidc")
    if not user:
        # Create new user
        username = userinfo.get("preferred_username") or userinfo.get("email") or external_id
        user = await create_federated_user(
            db,
            username=username,
            external_id=external_id,
            provider="oidc",
            email=userinfo.get("email"),
            display_name=userinfo.get("name"),
        )

    # Create session
    ip_address, user_agent = get_client_info(request)
    access_token, refresh_token, session = await create_session(
        db, user, user_agent=user_agent, ip_address=ip_address
    )

    # Return tokens (frontend will handle these)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


# =============================================================================
# SAML Authentication
# =============================================================================


@router.get("/saml/login")
async def saml_login(request: Request):
    """Initiate SAML authentication flow."""
    if not settings.saml_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAML authentication is not configured",
        )

    # Generate relay state for CSRF protection
    relay_state = secrets.token_urlsafe(32)
    _state_store[relay_state] = {"type": "saml"}

    # Construct SAML AuthnRequest URL (simplified - in production use python3-saml)
    callback_url = str(request.url_for("saml_callback"))
    params = {
        "SAMLRequest": "",  # Would be Base64-encoded AuthnRequest XML
        "RelayState": relay_state,
    }

    # For now, return the SSO URL - full SAML request generation would use python3-saml
    return {
        "sso_url": settings.saml_idp_sso_url,
        "relay_state": relay_state,
        "callback_url": callback_url,
        "message": "Full SAML AuthnRequest generation requires python3-saml library",
    }


@router.post("/saml/callback")
async def saml_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle SAML callback (Assertion Consumer Service)."""
    if not settings.saml_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAML authentication is not configured",
        )

    # Parse form data
    form_data = await request.form()
    saml_response = form_data.get("SAMLResponse")
    relay_state = form_data.get("RelayState")

    if not saml_response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing SAML response",
        )

    # Verify relay state
    if relay_state and relay_state not in _state_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid relay state",
        )
    if relay_state:
        del _state_store[relay_state]

    # In production, use python3-saml to validate and parse the SAML response
    # For now, return an error indicating full implementation needs the library
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Full SAML response validation requires python3-saml library. "
        "Install it with: pip install python3-saml",
    )


@router.get("/saml/metadata")
async def saml_metadata(request: Request):
    """Return SAML Service Provider metadata."""
    if not settings.saml_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SAML authentication is not enabled",
        )

    # Return basic SP metadata info
    callback_url = str(request.url_for("saml_callback"))
    return {
        "entity_id": settings.saml_sp_entity_id or str(request.base_url),
        "acs_url": callback_url,
        "message": "Full metadata XML generation requires python3-saml library",
    }
