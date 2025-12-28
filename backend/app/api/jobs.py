"""Jobs API endpoints."""

import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.auth import User, get_current_user, get_current_user_from_token_or_query
from app.database import get_supabase_client
from app.models import ExportFormat, JobResponse
from app.services.export import ExportService

router = APIRouter()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Get job details and status."""
    supabase = get_supabase_client()

    result = (
        supabase.table("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    return JobResponse(**result.data[0])


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_job(
    job_id: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """Cancel a running job or delete a completed one."""
    supabase = get_supabase_client()

    # Verify ownership
    result = (
        supabase.table("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job = result.data[0]

    # If running, try to cancel the background task
    if job["status"] == "running":
        background_jobs = request.app.state.background_jobs
        if job_id in background_jobs:
            background_jobs[job_id].cancel()
            del background_jobs[job_id]

        supabase.table("scrape_jobs").update(
            {
                "status": "cancelled",
            }
        ).eq("id", job_id).execute()
    else:
        # Delete completed/failed job
        supabase.table("scrape_jobs").delete().eq("id", job_id).execute()


@router.get("/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """SSE endpoint for real-time job progress updates."""
    supabase = get_supabase_client()

    # Verify ownership
    result = (
        supabase.table("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for job progress."""
        last_status = None
        last_progress = -1

        while True:
            # Poll job status
            result = (
                supabase.table("scrape_jobs")
                .select("status, progress, error_message")
                .eq("id", job_id)
                .execute()
            )

            if not result.data:
                yield "data: {'error': 'Job not found'}\n\n"
                break

            job = result.data[0]
            status = job["status"]
            progress = job["progress"]

            # Only send update if something changed
            if status != last_status or progress != last_progress:
                import json

                data = {
                    "status": status,
                    "progress": progress,
                    "error_message": job.get("error_message"),
                }
                yield f"data: {json.dumps(data)}\n\n"

                last_status = status
                last_progress = progress

            # Stop if job is complete
            if status in ("completed", "failed", "cancelled"):
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/{job_id}/export")
async def export_job(
    job_id: str,
    format: ExportFormat = "json",
    user: User = Depends(get_current_user_from_token_or_query),
):
    """Export job results in various formats."""
    supabase = get_supabase_client()

    result = (
        supabase.table("scrape_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    job = result.data[0]

    if job["status"] != "completed" or not job.get("result_data"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job has no results to export",
        )

    export_service = ExportService()

    if format == "json":
        content, media_type, filename = export_service.to_json(job)
    elif format == "markdown":
        content, media_type, filename = export_service.to_markdown(job)
    elif format == "pdf":
        content, media_type, filename = export_service.to_pdf(job)
    else:
        content, media_type, filename = export_service.to_json(job)

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )
