"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

# ============ Profile ============


class RedditCredentials(BaseModel):
    """Reddit API credentials."""

    client_id: str
    client_secret: str
    username: str


class ProfileResponse(BaseModel):
    """User profile response."""

    id: str
    email: str
    has_reddit_credentials: bool
    reddit_username: Optional[str] = None
    created_at: Optional[datetime] = None


class ProfileUpdate(BaseModel):
    """Update profile request."""

    reddit_client_id: Optional[str] = None
    reddit_client_secret: Optional[str] = None
    reddit_username: Optional[str] = None


# ============ Projects ============


class ProjectCreate(BaseModel):
    """Create project request."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class JobCounts(BaseModel):
    """Job counts by status."""

    total: int = 0
    completed: int = 0
    running: int = 0
    failed: int = 0
    pending: int = 0


class ProjectResponse(BaseModel):
    """Project response."""

    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    job_count: int = 0
    job_counts: JobCounts = JobCounts()


class ProjectUpdate(BaseModel):
    """Update project request."""

    name: Optional[str] = None
    description: Optional[str] = None


# ============ Scrape Jobs ============

JobType = Literal["subreddit", "redditor", "comments"]
JobStatus = Literal["pending", "running", "completed", "failed", "cancelled"]


class SubredditConfig(BaseModel):
    """Subreddit scrape configuration."""

    subreddit: str
    category: Literal["hot", "new", "controversial", "top", "rising", "search"] = "hot"
    limit: int = Field(default=25, ge=1, le=1000)
    time_filter: Optional[Literal["hour", "day", "week", "month", "year", "all"]] = None
    search_query: Optional[str] = None


class RedditorConfig(BaseModel):
    """Redditor scrape configuration."""

    username: str
    limit: int = Field(default=25, ge=1, le=1000)


class CommentsConfig(BaseModel):
    """Comments scrape configuration."""

    url: str
    limit: int = Field(default=0, ge=0)  # 0 = all comments
    structured: bool = True


class JobCreate(BaseModel):
    """Create job request."""

    job_type: JobType
    config: SubredditConfig | RedditorConfig | CommentsConfig


class JobResponse(BaseModel):
    """Job response."""

    id: str
    project_id: str
    user_id: str
    job_type: JobType
    config: dict
    status: JobStatus
    progress: int = 0
    error_message: Optional[str] = None
    result_data: Optional[dict] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class JobProgress(BaseModel):
    """Job progress update."""

    status: JobStatus
    progress: int
    message: Optional[str] = None


# ============ Share Links ============


class ShareLinkCreate(BaseModel):
    """Create share link request."""

    pass  # No additional fields needed


class ShareLinkResponse(BaseModel):
    """Share link response."""

    id: str
    job_id: str
    share_token: str
    is_active: bool
    created_at: datetime
    url: str


class SharedResultResponse(BaseModel):
    """Public shared result response."""

    job_type: JobType
    config: dict
    result_data: dict
    created_at: datetime


# ============ Export ============

ExportFormat = Literal["json", "markdown", "pdf"]


class ExportRequest(BaseModel):
    """Export request."""

    format: ExportFormat = "json"
