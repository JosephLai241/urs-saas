"""Authentication utilities."""

import logging
from datetime import datetime
from functools import lru_cache
from typing import Optional

import httpx
from app.config import get_settings
from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_jwks():
    """Fetch and cache the Supabase JWKS (JSON Web Key Set)."""
    settings = get_settings()
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    response = httpx.get(jwks_url)
    response.raise_for_status()
    return response.json()


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
        # First, decode without verification to see the header
        unverified_header = jwt.get_unverified_header(token)
        token_alg = unverified_header.get("alg", "unknown")
        token_kid = unverified_header.get("kid")

        # For ES256 (asymmetric), use JWKS from Supabase
        if token_alg == "ES256":
            jwks = get_supabase_jwks()

            # Find the key that matches the token's kid
            key_data = None
            for key in jwks.get("keys", []):
                if key.get("kid") == token_kid:
                    key_data = key
                    break

            if not key_data:
                logger.error(f"No matching key found for kid: {token_kid}")
                raise credentials_exception

            # Construct the public key
            public_key = jwk.construct(key_data)

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                audience="authenticated",
            )
        else:
            # For HS256 (symmetric), use the JWT secret
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=[settings.jwt_algorithm],
                audience="authenticated",
            )

        user_id: str = payload.get("sub")
        email: str = payload.get("email")

        if user_id is None:
            logger.error("Token verification failed: no 'sub' claim in payload")
            raise credentials_exception

        return User(id=user_id, email=email or "")

    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
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
