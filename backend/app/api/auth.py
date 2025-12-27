"""Authentication API endpoints."""

import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request."""
    email: str
    password: str


class LoginResponse(BaseModel):
    """Login response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class SignupRequest(BaseModel):
    """Signup request."""
    email: str
    password: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    try:
        supabase = get_supabase_client()
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if response.user and response.session:
            return LoginResponse(
                access_token=response.session.access_token,
                user={
                    "id": response.user.id,
                    "email": response.user.email,
                },
            )
    except Exception as e:
        logger.error(f"Login failed for {request.email}: {e}")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
    )


@router.post("/signup", response_model=LoginResponse)
async def signup(request: SignupRequest):
    """Create a new account."""
    try:
        supabase = get_supabase_client()
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })

        if response.user and response.session:
            # Create user profile
            supabase.table("user_profiles").insert({
                "id": response.user.id,
            }).execute()

            return LoginResponse(
                access_token=response.session.access_token,
                user={
                    "id": response.user.id,
                    "email": response.user.email,
                },
            )
        elif response.user:
            # User created but needs email confirmation
            raise HTTPException(
                status_code=status.HTTP_200_OK,
                detail="Please check your email to confirm your account",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup failed for {request.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to create account",
    )


@router.post("/logout")
async def logout():
    """Logout (client should discard token)."""
    return {"message": "Logged out successfully"}
