"""
Authentication API routes.

Provides endpoints for local login and OIDC authentication.
"""

import logging
import secrets
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
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
from app.services.settings import get_effective_oidc_config

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

# Store OIDC state tokens temporarily (in production, use Redis)
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
async def get_auth_config(db: AsyncSession = Depends(get_db)):
    """Get authentication configuration for the frontend."""
    oidc_config = await get_effective_oidc_config(db)

    return AuthConfigResponse(
        local_auth_enabled=settings.local_auth_enabled,
        oidc_enabled=oidc_config["enabled"] and bool(oidc_config["issuer"]),
        oidc_issuer=oidc_config["issuer"] if oidc_config["enabled"] else None,
        oidc_display_name=oidc_config.get("display_name") if oidc_config["enabled"] else None,
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

# Cache for OIDC discovery documents
_oidc_discovery_cache: dict[str, dict] = {}


async def get_oidc_discovery(issuer: str) -> dict:
    """Fetch OIDC discovery document from issuer's well-known endpoint."""
    if issuer in _oidc_discovery_cache:
        return _oidc_discovery_cache[issuer]

    # Normalize issuer URL (remove trailing slash)
    issuer = issuer.rstrip("/")
    discovery_url = f"{issuer}/.well-known/openid-configuration"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(discovery_url, timeout=10.0)
            response.raise_for_status()
            discovery = response.json()
            _oidc_discovery_cache[issuer] = discovery
            logger.info(f"Fetched OIDC discovery from {discovery_url}")
            return discovery
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch OIDC discovery from {discovery_url}: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch OIDC configuration from {discovery_url}",
            )


@router.get("/oidc/login")
async def oidc_login(request: Request, db: AsyncSession = Depends(get_db)):
    """Initiate OIDC authentication flow."""
    oidc_config = await get_effective_oidc_config(db)

    if not oidc_config["enabled"] or not oidc_config["issuer"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC authentication is not configured",
        )

    # Fetch OIDC discovery document
    discovery = await get_oidc_discovery(oidc_config["issuer"])
    authorization_endpoint = discovery.get("authorization_endpoint")
    if not authorization_endpoint:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OIDC discovery document missing authorization_endpoint",
        )

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    _state_store[state] = {"type": "oidc"}

    # Construct authorization URL using discovered endpoint
    redirect_uri = str(request.url_for("oidc_callback"))
    params = {
        "response_type": "code",
        "client_id": oidc_config["client_id"],
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
    }

    auth_url = f"{authorization_endpoint}?{urlencode(params)}"
    logger.info(f"OIDC login redirecting to: {authorization_endpoint}")
    return {"auth_url": auth_url, "state": state}


@router.get("/oidc/callback")
async def oidc_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle OIDC callback after authentication."""
    oidc_config = await get_effective_oidc_config(db)

    if not oidc_config["enabled"] or not oidc_config["issuer"]:
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

    # Fetch OIDC discovery document for endpoints
    discovery = await get_oidc_discovery(oidc_config["issuer"])
    token_endpoint = discovery.get("token_endpoint")
    userinfo_endpoint = discovery.get("userinfo_endpoint")

    if not token_endpoint:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OIDC discovery document missing token_endpoint",
        )

    # Exchange code for tokens
    redirect_uri = str(request.url_for("oidc_callback"))

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Exchanging code at token endpoint: {token_endpoint}")
            token_response = await client.post(
                token_endpoint,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": oidc_config["client_id"],
                    "client_secret": oidc_config["client_secret"],
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

        # Get user info if endpoint is available
        userinfo = {}
        if userinfo_endpoint:
            try:
                logger.info(f"Fetching userinfo from: {userinfo_endpoint}")
                userinfo_response = await client.get(
                    userinfo_endpoint,
                    headers={"Authorization": f"Bearer {tokens['access_token']}"},
                )
                userinfo_response.raise_for_status()
                userinfo = userinfo_response.json()
            except httpx.HTTPError as e:
                logger.warning(f"OIDC userinfo fetch failed: {e}")
                # Continue without userinfo - we can still use id_token claims

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

    # Redirect to frontend with tokens in URL fragment
    # Using fragment (#) instead of query params for security (fragments aren't sent to server)
    # Use frontend_url if configured, otherwise fall back to first CORS origin
    frontend_base = settings.frontend_url or (settings.cors_origins_list[0] if settings.cors_origins_list else "")
    frontend_callback = f"{frontend_base}/auth/callback"
    token_params = urlencode({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.access_token_expire_minutes * 60,
    })
    redirect_url = f"{frontend_callback}#{token_params}"
    logger.info(f"OIDC auth successful for user {user.username}, redirecting to {frontend_base}")
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
