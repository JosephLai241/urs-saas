"""Profile API endpoints."""

from app.auth import User, get_current_user
from app.config import get_settings
from app.database import get_supabase_client
from app.models import ProfileResponse, ProfileUpdate
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()


def get_cipher():
    """Get Fernet cipher for encryption."""
    settings = get_settings()
    return Fernet(settings.encryption_key.encode())


def encrypt_value(value: str) -> str:
    """Encrypt a value."""
    cipher = get_cipher()
    return cipher.encrypt(value.encode()).decode()


def decrypt_value(value: str) -> str:
    """Decrypt a value."""
    cipher = get_cipher()
    return cipher.decrypt(value.encode()).decode()


@router.get("", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Get current user profile."""
    supabase = get_supabase_client()

    # Get or create profile
    result = supabase.table("user_profiles").select("*").eq("id", user.id).execute()

    if not result.data:
        # Create profile if it doesn't exist
        supabase.table("user_profiles").insert({"id": user.id}).execute()
        return ProfileResponse(
            id=user.id,
            email=user.email,
            has_reddit_credentials=False,
        )

    profile = result.data[0]
    return ProfileResponse(
        id=user.id,
        email=user.email,
        has_reddit_credentials=bool(profile.get("reddit_client_id")),
        reddit_username=profile.get("reddit_username"),
        created_at=profile.get("created_at"),
    )


@router.patch("", response_model=ProfileResponse)
async def update_profile(
    update: ProfileUpdate,
    user: User = Depends(get_current_user),
):
    """Update user profile (including Reddit credentials)."""
    supabase = get_supabase_client()

    update_data = {}

    if update.reddit_client_id is not None:
        update_data["reddit_client_id"] = encrypt_value(update.reddit_client_id)

    if update.reddit_client_secret is not None:
        update_data["reddit_client_secret"] = encrypt_value(update.reddit_client_secret)

    if update.reddit_username is not None:
        update_data["reddit_username"] = update.reddit_username

    if update_data:
        supabase.table("user_profiles").upsert(
            {
                "id": user.id,
                **update_data,
            }
        ).execute()

    return await get_profile(user)


@router.get("/reddit-credentials")
async def get_reddit_credentials(user: User = Depends(get_current_user)):
    """Get decrypted Reddit credentials (for internal use)."""
    supabase = get_supabase_client()

    result = supabase.table("user_profiles").select("*").eq("id", user.id).execute()

    if not result.data or not result.data[0].get("reddit_client_id"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reddit credentials not configured",
        )

    profile = result.data[0]
    return {
        "client_id": decrypt_value(profile["reddit_client_id"]),
        "client_secret": decrypt_value(profile["reddit_client_secret"]),
        "username": profile.get("reddit_username", ""),
    }
