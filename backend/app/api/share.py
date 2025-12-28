"""Share links API endpoints."""

import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import User, get_current_user
from app.config import get_settings
from app.database import get_supabase_client
from app.models import SharedResultResponse, ShareLinkResponse

router = APIRouter()


def generate_share_token() -> str:
    """Generate a URL-safe share token."""
    return secrets.token_urlsafe(16)


@router.post("/jobs/{job_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Create a shareable link for a job result."""
    supabase = get_supabase_client()
    settings = get_settings()

    # Verify job ownership and completion
    job_result = (
        supabase.table("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not job_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job = job_result.data[0]

    if job["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only share completed jobs",
        )

    # Check if share link already exists
    existing = (
        supabase.table("share_links")
        .select("*")
        .eq("job_id", job_id)
        .eq("is_active", True)
        .execute()
    )

    if existing.data:
        link = existing.data[0]
        return ShareLinkResponse(
            id=link["id"],
            job_id=link["job_id"],
            share_token=link["share_token"],
            is_active=link["is_active"],
            created_at=link["created_at"],
            url=f"{settings.frontend_url}/share/{link['share_token']}",
        )

    # Create new share link
    share_token = generate_share_token()
    result = (
        supabase.table("share_links")
        .insert(
            {
                "job_id": job_id,
                "share_token": share_token,
                "is_active": True,
            }
        )
        .execute()
    )

    link = result.data[0]
    return ShareLinkResponse(
        id=link["id"],
        job_id=link["job_id"],
        share_token=link["share_token"],
        is_active=link["is_active"],
        created_at=link["created_at"],
        url=f"{settings.frontend_url}/share/{link['share_token']}",
    )


@router.get("/shares", response_model=List[ShareLinkResponse])
async def list_share_links(user: User = Depends(get_current_user)):
    """List all share links created by the user."""
    supabase = get_supabase_client()
    settings = get_settings()

    # Get all jobs for user, then get share links
    jobs = supabase.table("scrape_jobs").select("id").eq("user_id", user.id).execute()

    if not jobs.data:
        return []

    job_ids = [j["id"] for j in jobs.data]

    result = (
        supabase.table("share_links")
        .select("*")
        .in_("job_id", job_ids)
        .order("created_at", desc=True)
        .execute()
    )

    return [
        ShareLinkResponse(
            id=link["id"],
            job_id=link["job_id"],
            share_token=link["share_token"],
            is_active=link["is_active"],
            created_at=link["created_at"],
            url=f"{settings.frontend_url}/share/{link['share_token']}",
        )
        for link in result.data
    ]


@router.delete("/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_share_link(
    share_id: str,
    user: User = Depends(get_current_user),
):
    """Revoke (deactivate) a share link."""
    supabase = get_supabase_client()

    # Get share link and verify ownership through job
    share = (
        supabase.table("share_links")
        .select("*, scrape_jobs(user_id)")
        .eq("id", share_id)
        .execute()
    )

    if not share.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found",
        )

    link = share.data[0]
    if link["scrape_jobs"]["user_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to revoke this share link",
        )

    # Deactivate instead of delete
    supabase.table("share_links").update(
        {
            "is_active": False,
        }
    ).eq("id", share_id).execute()


@router.get("/share/{token}", response_model=SharedResultResponse)
async def get_shared_result(token: str):
    """Public endpoint to view shared results (no auth required)."""
    supabase = get_supabase_client()

    # Get share link
    share = (
        supabase.table("share_links")
        .select("*")
        .eq("share_token", token)
        .eq("is_active", True)
        .execute()
    )

    if not share.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share link not found or expired",
        )

    link = share.data[0]

    # Get job results
    job = supabase.table("scrape_jobs").select("*").eq("id", link["job_id"]).execute()

    if not job.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job_data = job.data[0]

    return SharedResultResponse(
        job_type=job_data["job_type"],
        config=job_data["config"],
        result_data=job_data["result_data"],
        created_at=job_data["created_at"],
    )
