"""Authentication utilities."""

from typing import Optional
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_supabase_client


security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str
    email: Optional[str] = None
    exp: Optional[datetime] = None


class User(BaseModel):
    """Authenticated user."""
    id: str
    email: str


def verify_token(token: str) -> User:
    """Verify a JWT token and return the user."""
    settings = get_settings()

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode the Supabase JWT
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        email: str = payload.get("email")

        if user_id is None:
            raise credentials_exception

        return User(id=user_id, email=email or "")

    except JWTError:
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """Verify JWT token and return current user."""
    return verify_token(credentials.credentials)


async def get_current_user_from_token_or_query(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    token: Optional[str] = Query(None, description="JWT token for authentication"),
) -> User:
    """Verify JWT token from header or query parameter. Used for download endpoints."""
    # Try header first
    if credentials and credentials.credentials:
        return verify_token(credentials.credentials)

    # Fall back to query parameter
    if token:
        return verify_token(token)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


# Simplified auth for demo mode
# Use a valid UUID for demo user so it works with Supabase
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
DEMO_USER_EMAIL = "demo@example.com"


class DemoUser(BaseModel):
    """Demo user for simplified auth."""
    id: str = DEMO_USER_ID
    email: str = DEMO_USER_EMAIL


def create_demo_token(username: str, password: str) -> Optional[str]:
    """Create a demo JWT token for simplified auth."""
    settings = get_settings()

    # Check demo credentials (fallback if Supabase not configured)
    demo_username = getattr(settings, "demo_username", "demo")
    demo_password = getattr(settings, "demo_password", "demo123")

    if username == demo_username and password == demo_password:
        expire = datetime.utcnow() + timedelta(days=7)
        to_encode = {
            "sub": DEMO_USER_ID,
            "email": DEMO_USER_EMAIL,
            "exp": expire,
            "aud": "authenticated",
        }
        return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return None
