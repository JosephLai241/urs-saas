"""Background job runner service."""

import asyncio
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from functools import partial

import prawcore.exceptions

from app.api.profile import decrypt_value
from app.database import get_supabase_client
from app.services.scraper import ScraperService

logger = logging.getLogger(__name__)

# Thread pool for running synchronous scraper code
_executor = ThreadPoolExecutor(max_workers=4)


def _format_error_message(e: Exception) -> str:
    """Format exception into user-friendly error message with context."""

    # Reddit API rate limiting
    if isinstance(e, prawcore.exceptions.TooManyRequests):
        return (
            "Rate limited by Reddit API (HTTP 429). "
            "Reddit limits API requests to prevent abuse. "
            "Please wait a few minutes before trying again, or reduce the number of items you're scraping."
        )

    # Authentication/authorization errors
    if isinstance(e, prawcore.exceptions.ResponseException):
        status_code = getattr(e, "response", None)
        if status_code:
            status_code = getattr(status_code, "status_code", None)

        if status_code == 401:
            return (
                "Authentication failed (HTTP 401). "
                "Your Reddit API credentials may be invalid or expired. "
                "Please check your Client ID and Client Secret in Settings."
            )
        elif status_code == 403:
            return (
                "Access forbidden (HTTP 403). "
                "You may not have permission to access this resource, "
                "or your Reddit app may need additional permissions."
            )
        elif status_code == 404:
            return (
                "Resource not found (HTTP 404). "
                "The subreddit, user, or post you're trying to scrape doesn't exist or has been deleted."
            )
        elif status_code == 500:
            return (
                "Reddit server error (HTTP 500). "
                "Reddit is experiencing issues. Please try again later."
            )
        elif status_code == 503:
            return (
                "Reddit service unavailable (HTTP 503). "
                "Reddit servers are temporarily overloaded. Please try again in a few minutes."
            )
        else:
            return f"Reddit API error (HTTP {status_code}): {str(e)}"

    # Forbidden access (banned, private, etc.)
    if isinstance(e, prawcore.exceptions.Forbidden):
        return (
            "Access forbidden (HTTP 403). "
            "This subreddit may be private, quarantined, or you may be banned from it."
        )

    # Not found
    if isinstance(e, prawcore.exceptions.NotFound):
        return (
            "Not found (HTTP 404). "
            "The subreddit, user, or submission doesn't exist or has been deleted."
        )

    # Server errors
    if isinstance(e, prawcore.exceptions.ServerError):
        return (
            "Reddit server error. "
            "Reddit is experiencing technical difficulties. Please try again later."
        )

    # Request exception (network issues)
    if isinstance(e, prawcore.exceptions.RequestException):
        return (
            "Network error connecting to Reddit. "
            "Please check your internet connection and try again."
        )

    # Invalid credentials
    if isinstance(e, prawcore.exceptions.OAuthException):
        return (
            "OAuth authentication error. "
            "Your Reddit API credentials are invalid. "
            "Please verify your Client ID and Client Secret in Settings."
        )

    # Redirect (subreddit renamed, etc.)
    if isinstance(e, prawcore.exceptions.Redirect):
        return (
            "Redirect detected. "
            "This subreddit may have been renamed or moved. "
            "Please check the subreddit name and try again."
        )

    # Generic PRAW exception
    if isinstance(e, prawcore.exceptions.PrawcoreException):
        return f"Reddit API error: {str(e)}"

    # Fallback - include exception type for debugging
    return f"{type(e).__name__}: {str(e)}"


async def start_scrape_job(job_id: str, user_id: str):
    """Start a scrape job in the background."""
    # Create background task
    task = asyncio.create_task(run_scrape_job(job_id, user_id))

    # Store task reference (for cancellation)
    from app.main import background_jobs

    background_jobs[job_id] = task


def _run_scrape_sync(
    job_id: str, job_type: str, config: dict, scraper: ScraperService, supabase
) -> dict:
    """Run the scrape synchronously (called from thread pool)."""

    # Progress callback
    def update_progress(current: int, total: int, message: str):
        progress = int((current / total) * 100) if total > 0 else 0
        supabase.table("scrape_jobs").update(
            {
                "progress": min(progress, 99),  # Cap at 99 until complete
            }
        ).eq("id", job_id).execute()

    # Execute scrape based on job type
    if job_type == "subreddit":
        return scraper.scrape_subreddit(
            subreddit_name=config["subreddit"],
            category=config.get("category", "hot"),
            limit=config.get("limit", 25),
            time_filter=config.get("time_filter"),
            search_query=config.get("search_query"),
            progress_callback=update_progress,
        )
    elif job_type == "redditor":
        return scraper.scrape_redditor(
            username=config["username"],
            limit=config.get("limit", 25),
            progress_callback=update_progress,
        )
    elif job_type == "comments":
        return scraper.scrape_comments(
            url=config["url"],
            limit=config.get("limit", 0),
            structured=config.get("structured", True),
            progress_callback=update_progress,
        )
    else:
        raise ValueError(f"Unknown job type: {job_type}")


async def run_scrape_job(job_id: str, user_id: str):
    """Execute a scrape job."""
    supabase = get_supabase_client()

    try:
        # Update status to running
        supabase.table("scrape_jobs").update(
            {
                "status": "running",
                "started_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", job_id).execute()

        # Get job details
        job_result = (
            supabase.table("scrape_jobs").select("*").eq("id", job_id).execute()
        )
        if not job_result.data:
            raise ValueError("Job not found")

        job = job_result.data[0]
        job_type = job["job_type"]
        config = job["config"]

        # Get user's Reddit credentials
        profile_result = (
            supabase.table("user_profiles").select("*").eq("id", user_id).execute()
        )
        if not profile_result.data or not profile_result.data[0].get(
            "reddit_client_id"
        ):
            raise ValueError(
                "Reddit credentials not configured. Please add your credentials in Settings."
            )

        profile = profile_result.data[0]
        client_id = decrypt_value(profile["reddit_client_id"])
        client_secret = decrypt_value(profile["reddit_client_secret"])
        reddit_username = profile.get("reddit_username", "user")

        # Create scraper service
        scraper = ScraperService(client_id, client_secret, reddit_username)

        # Run the synchronous scrape in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result_data = await loop.run_in_executor(
            _executor,
            partial(_run_scrape_sync, job_id, job_type, config, scraper, supabase),
        )

        # Save results
        supabase.table("scrape_jobs").update(
            {
                "status": "completed",
                "progress": 100,
                "result_data": result_data,
                "completed_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", job_id).execute()

    except asyncio.CancelledError:
        # Job was cancelled
        supabase.table("scrape_jobs").update(
            {
                "status": "cancelled",
                "completed_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", job_id).execute()
        raise

    except Exception as e:
        # Job failed - format error with user-friendly context
        error_message = _format_error_message(e)
        logger.error(f"Job {job_id} failed: {error_message}")
        logger.error(f"Original exception: {type(e).__name__}: {str(e)}")
        logger.error(traceback.format_exc())

        supabase.table("scrape_jobs").update(
            {
                "status": "failed",
                "error_message": error_message,
                "completed_at": datetime.utcnow().isoformat(),
            }
        ).eq("id", job_id).execute()

    finally:
        # Clean up task reference
        from app.main import background_jobs

        if job_id in background_jobs:
            del background_jobs[job_id]
