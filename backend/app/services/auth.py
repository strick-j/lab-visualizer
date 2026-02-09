"""
Authentication service.

Handles user authentication, token management, and session handling.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.auth import Session, User

logger = logging.getLogger(__name__)
settings = get_settings()


def _sanitize_for_log(value: Optional[str]) -> str:
    """Sanitize a potentially user-controlled value for safe logging."""
    if value is None:
        return ""
    # Remove CR/LF characters to prevent log injection via new lines.
    return str(value).replace("\r", "").replace("\n", "")


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    result: str = pwd_context.hash(password)
    return result


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    result: bool = pwd_context.verify(plain_password, hashed_password)
    return result


def hash_token(token: str) -> str:
    """Hash a token using SHA-256."""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """Get a user by username."""
    result = await db.execute(select(User).where(User.username == username))
    user: Optional[User] = result.scalar_one_or_none()
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email."""
    result = await db.execute(select(User).where(User.email == email))
    user: Optional[User] = result.scalar_one_or_none()
    return user


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user: Optional[User] = result.scalar_one_or_none()
    return user


async def get_user_by_external_id(
    db: AsyncSession, external_id: str, provider: str
) -> Optional[User]:
    """Get a user by external ID (from OIDC)."""
    result = await db.execute(
        select(User).where(
            User.external_id == external_id, User.auth_provider == provider
        )
    )
    user: Optional[User] = result.scalar_one_or_none()
    return user


async def create_local_user(
    db: AsyncSession,
    username: str,
    password: str,
    email: Optional[str] = None,
    display_name: Optional[str] = None,
    is_admin: bool = False,
) -> User:
    """Create a new local user."""
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        auth_provider="local",
        display_name=display_name or username,
        is_admin=is_admin,
        role="admin" if is_admin else "user",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    safe_username = _sanitize_for_log(username)
    logger.info(f"Created local user: {safe_username}")
    return user


async def create_federated_user(
    db: AsyncSession,
    username: str,
    external_id: str,
    provider: str,
    email: Optional[str] = None,
    display_name: Optional[str] = None,
) -> User:
    """Create a new federated user (OIDC)."""
    user = User(
        username=username,
        email=email,
        auth_provider=provider,
        external_id=external_id,
        display_name=display_name or username,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    safe_username = _sanitize_for_log(username)
    safe_provider = _sanitize_for_log(provider)
    logger.info(f"Created federated user: {safe_username} (provider: {safe_provider})")
    return user


async def authenticate_local_user(
    db: AsyncSession, username: str, password: str
) -> Optional[User]:
    """Authenticate a local user by username and password."""
    user = await get_user_by_username(db, username)
    safe_username = _sanitize_for_log(username)
    if not user:
        logger.warning(f"Auth failed: user '{safe_username}' not found")
        return None
    if user.auth_provider != "local":
        logger.warning(
            f"Auth failed: user '{safe_username}' is not a local user "
            f"(provider: {user.auth_provider})"
        )
        return None
    if not user.password_hash:
        logger.warning(f"Auth failed: user '{safe_username}' has no password hash")
        return None
    if not verify_password(password, user.password_hash):
        logger.warning(
            f"Auth failed: password verification failed for user '{safe_username}'"
        )
        return None
    if not user.is_active:
        logger.warning(f"Auth failed: user '{safe_username}' is not active")
        return None
    logger.info(f"Auth succeeded for user '{safe_username}'")
    return user


async def create_session(
    db: AsyncSession,
    user: User,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Tuple[str, str, Session]:
    """Create a new session and return access/refresh tokens."""
    access_token = generate_token()
    refresh_token = generate_token()
    session_id = generate_token()

    now = datetime.now(timezone.utc)
    access_expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expires = now + timedelta(days=settings.refresh_token_expire_days)

    session = Session(
        session_id=session_id,
        user_id=user.id,
        access_token_hash=hash_token(access_token),
        refresh_token_hash=hash_token(refresh_token),
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=access_expires,
        refresh_expires_at=refresh_expires,
    )
    db.add(session)

    # Update user's last login
    user.last_login_at = now
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session for user: {user.username}")
    return access_token, refresh_token, session


async def validate_access_token(
    db: AsyncSession, access_token: str
) -> Optional[Tuple[User, Session]]:
    """Validate an access token and return the associated user and session."""
    token_hash = hash_token(access_token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Session).where(
            Session.access_token_hash == token_hash,
            Session.is_revoked == False,  # noqa: E712
            Session.expires_at > now,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    user = await get_user_by_id(db, session.user_id)
    if not user or not user.is_active:
        return None

    # Update last activity
    session.last_activity_at = now
    await db.commit()

    return user, session


async def refresh_access_token(
    db: AsyncSession, refresh_token: str
) -> Optional[Tuple[str, str]]:
    """Refresh an access token using a refresh token."""
    token_hash = hash_token(refresh_token)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Session).where(
            Session.refresh_token_hash == token_hash,
            Session.is_revoked == False,  # noqa: E712
            Session.refresh_expires_at > now,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    user = await get_user_by_id(db, session.user_id)
    if not user or not user.is_active:
        return None

    # Generate new tokens
    new_access_token = generate_token()
    new_refresh_token = generate_token()

    access_expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expires = now + timedelta(days=settings.refresh_token_expire_days)

    # Update session with new tokens
    session.access_token_hash = hash_token(new_access_token)
    session.refresh_token_hash = hash_token(new_refresh_token)
    session.expires_at = access_expires
    session.refresh_expires_at = refresh_expires
    session.last_activity_at = now

    await db.commit()
    logger.info(f"Refreshed tokens for user: {user.username}")

    return new_access_token, new_refresh_token


async def revoke_session(db: AsyncSession, session: Session) -> None:
    """Revoke a session."""
    session.is_revoked = True
    session.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    logger.info(f"Revoked session: {session.session_id[:8]}...")


async def revoke_all_user_sessions(db: AsyncSession, user_id: int) -> int:
    """Revoke all sessions for a user. Returns count of revoked sessions."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Session).where(
            Session.user_id == user_id,
            Session.is_revoked == False,  # noqa: E712
        )
    )
    sessions = result.scalars().all()

    count = 0
    for session in sessions:
        session.is_revoked = True
        session.revoked_at = now
        count += 1

    await db.commit()
    logger.info(f"Revoked {count} sessions for user_id: {int(user_id)}")
    return count


def validate_password_strength(password: str) -> list[str]:
    """
    Validate password meets strength requirements.

    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character

    Returns a list of validation error messages (empty if valid).
    """
    errors: list[str] = []

    if len(password) < 12:
        errors.append("Password must be at least 12 characters long")

    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")

    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")

    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number")

    special_chars = set("!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\")
    if not any(c in special_chars for c in password):
        errors.append("Password must contain at least one special character")

    return errors


async def check_admin_exists(db: AsyncSession) -> bool:
    """Check if any admin user exists in the database."""
    result = await db.execute(
        select(User).where(User.is_admin == True, User.is_active == True)  # noqa: E712
    )
    return result.scalar_one_or_none() is not None


async def create_initial_admin(
    db: AsyncSession,
    username: str,
    password: str,
) -> User:
    """
    Create the initial admin user during first-time setup.

    Only succeeds if no admin user already exists.
    Validates password strength requirements.
    Raises ValueError if validation fails or an admin already exists.
    """
    # Check no admin exists
    if await check_admin_exists(db):
        raise ValueError(
            "An admin user already exists. Setup has already been completed."
        )

    # Validate username
    username = username.strip()
    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters long")
    if len(username) > 100:
        raise ValueError("Username must be at most 100 characters long")

    # Validate password strength
    errors = validate_password_strength(password)
    if errors:
        raise ValueError("; ".join(errors))

    # Check username not already taken
    existing = await get_user_by_username(db, username)
    if existing:
        raise ValueError("Username is already taken")

    user = await create_local_user(
        db,
        username=username,
        password=password,
        is_admin=True,
        display_name="Administrator",
    )
    logger.info(f"Initial admin user created via setup: {_sanitize_for_log(username)}")
    return user


async def change_user_password(
    db: AsyncSession,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    """
    Change a local user's password.

    Verifies the current password, then updates the hash.
    Raises ValueError with a descriptive message on failure.
    """
    if user.auth_provider != "local":
        raise ValueError("Password changes are only supported for local accounts")

    if not user.password_hash:
        raise ValueError("User account has no password configured")

    if not verify_password(current_password, user.password_hash):
        raise ValueError("Current password is incorrect")

    user.password_hash = hash_password(new_password)
    await db.commit()
    safe_username = _sanitize_for_log(user.username)
    logger.info(f"Password changed for user: {safe_username}")


async def ensure_admin_user(db: AsyncSession) -> None:
    """Check if an admin user exists on startup and log setup status."""
    admin_exists = await check_admin_exists(db)
    if admin_exists:
        logger.info("Admin user exists - setup is complete")
    else:
        logger.info("No admin user found - initial setup required via /setup page")


# --- User Management ---

VALID_ROLES = ("user", "admin")


async def list_all_users(db: AsyncSession) -> list[User]:
    """Return all users ordered by creation date."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def update_user_status(
    db: AsyncSession,
    user_id: int,
    is_active: bool,
    acting_user: User,
) -> User:
    """
    Enable or disable a user account.

    Raises ValueError if the admin tries to deactivate themselves
    or if the target user is not found.
    """
    if acting_user.id == user_id and not is_active:
        raise ValueError("You cannot deactivate your own account")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")

    user.is_active = is_active
    await db.commit()
    await db.refresh(user)

    action = "activated" if is_active else "deactivated"
    safe_username = _sanitize_for_log(user.username)
    safe_actor = _sanitize_for_log(acting_user.username)
    logger.info(f"User {safe_username} {action} by {safe_actor}")

    # Revoke all sessions when deactivating
    if not is_active:
        await revoke_all_user_sessions(db, user_id)

    return user


async def update_user_role(
    db: AsyncSession,
    user_id: int,
    role: str,
    acting_user: User,
) -> User:
    """
    Update a user's role.

    Raises ValueError if the role is invalid, if the admin tries to
    demote themselves, or if the target user is not found.
    """
    if role not in VALID_ROLES:
        raise ValueError(
            f"Invalid role: {role}. Must be one of: {', '.join(VALID_ROLES)}"
        )

    if acting_user.id == user_id and role != "admin":
        raise ValueError("You cannot remove your own admin role")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise ValueError("User not found")

    user.role = role
    user.is_admin = role == "admin"
    await db.commit()
    await db.refresh(user)

    safe_username = _sanitize_for_log(user.username)
    safe_actor = _sanitize_for_log(acting_user.username)
    safe_role = _sanitize_for_log(role)
    logger.info(f"User {safe_username} role changed to '{safe_role}' by {safe_actor}")
    return user
