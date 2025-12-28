"""Tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from app.models import (
    CommentsConfig,
    JobCounts,
    JobCreate,
    ProfileResponse,
    ProjectCreate,
    ProjectResponse,
    RedditCredentials,
    RedditorConfig,
    ShareLinkResponse,
    SubredditConfig,
)


class TestRedditCredentials:
    """Tests for RedditCredentials model."""

    def test_valid_credentials(self):
        """Test creating valid credentials."""
        creds = RedditCredentials(
            client_id="abc123",
            client_secret="secret456",
            username="test_user",
        )
        assert creds.client_id == "abc123"
        assert creds.client_secret == "secret456"
        assert creds.username == "test_user"

    def test_missing_fields(self):
        """Test that missing fields raise validation error."""
        with pytest.raises(ValidationError):
            RedditCredentials(client_id="abc123")


class TestProfileResponse:
    """Tests for ProfileResponse model."""

    def test_with_credentials(self):
        """Test profile with Reddit credentials."""
        profile = ProfileResponse(
            id="user-123",
            email="test@example.com",
            has_reddit_credentials=True,
            reddit_username="test_user",
        )
        assert profile.has_reddit_credentials is True
        assert profile.reddit_username == "test_user"

    def test_without_credentials(self):
        """Test profile without Reddit credentials."""
        profile = ProfileResponse(
            id="user-123",
            email="test@example.com",
            has_reddit_credentials=False,
        )
        assert profile.has_reddit_credentials is False
        assert profile.reddit_username is None


class TestProjectCreate:
    """Tests for ProjectCreate model."""

    def test_valid_project(self):
        """Test creating a valid project."""
        project = ProjectCreate(name="Test Project", description="A test project")
        assert project.name == "Test Project"
        assert project.description == "A test project"

    def test_name_only(self):
        """Test creating a project with only name."""
        project = ProjectCreate(name="Test Project")
        assert project.name == "Test Project"
        assert project.description is None

    def test_empty_name_fails(self):
        """Test that empty name raises validation error."""
        with pytest.raises(ValidationError):
            ProjectCreate(name="")

    def test_name_too_long_fails(self):
        """Test that name over 100 chars raises validation error."""
        with pytest.raises(ValidationError):
            ProjectCreate(name="x" * 101)


class TestSubredditConfig:
    """Tests for SubredditConfig model."""

    def test_default_values(self):
        """Test default values are set correctly."""
        config = SubredditConfig(subreddit="python")
        assert config.subreddit == "python"
        assert config.category == "hot"
        assert config.limit == 25
        assert config.time_filter is None
        assert config.search_query is None

    def test_custom_values(self):
        """Test custom values are set correctly."""
        config = SubredditConfig(
            subreddit="programming",
            category="top",
            limit=100,
            time_filter="week",
        )
        assert config.category == "top"
        assert config.limit == 100
        assert config.time_filter == "week"

    def test_search_category(self):
        """Test search category with query."""
        config = SubredditConfig(
            subreddit="python",
            category="search",
            search_query="async programming",
        )
        assert config.category == "search"
        assert config.search_query == "async programming"

    def test_limit_bounds(self):
        """Test limit validation bounds."""
        # Valid limits
        SubredditConfig(subreddit="test", limit=1)
        SubredditConfig(subreddit="test", limit=1000)

        # Invalid limits
        with pytest.raises(ValidationError):
            SubredditConfig(subreddit="test", limit=0)

        with pytest.raises(ValidationError):
            SubredditConfig(subreddit="test", limit=1001)

    def test_invalid_category(self):
        """Test that invalid category raises validation error."""
        with pytest.raises(ValidationError):
            SubredditConfig(subreddit="test", category="invalid")


class TestRedditorConfig:
    """Tests for RedditorConfig model."""

    def test_default_limit(self):
        """Test default limit value."""
        config = RedditorConfig(username="spez")
        assert config.username == "spez"
        assert config.limit == 25

    def test_custom_limit(self):
        """Test custom limit value."""
        config = RedditorConfig(username="spez", limit=100)
        assert config.limit == 100


class TestCommentsConfig:
    """Tests for CommentsConfig model."""

    def test_default_values(self):
        """Test default values."""
        config = CommentsConfig(url="https://reddit.com/r/python/comments/abc123/")
        assert config.limit == 0  # All comments
        assert config.structured is True

    def test_limited_comments(self):
        """Test limited comments configuration."""
        config = CommentsConfig(
            url="https://reddit.com/r/python/comments/abc123/",
            limit=100,
            structured=False,
        )
        assert config.limit == 100
        assert config.structured is False


class TestJobCreate:
    """Tests for JobCreate model."""

    def test_subreddit_job(self):
        """Test creating a subreddit job."""
        job = JobCreate(
            job_type="subreddit",
            config=SubredditConfig(subreddit="python"),
        )
        assert job.job_type == "subreddit"
        assert isinstance(job.config, SubredditConfig)

    def test_redditor_job(self):
        """Test creating a redditor job."""
        job = JobCreate(
            job_type="redditor",
            config=RedditorConfig(username="spez"),
        )
        assert job.job_type == "redditor"
        assert isinstance(job.config, RedditorConfig)

    def test_comments_job(self):
        """Test creating a comments job."""
        job = JobCreate(
            job_type="comments",
            config=CommentsConfig(url="https://reddit.com/r/python/comments/abc123/"),
        )
        assert job.job_type == "comments"
        assert isinstance(job.config, CommentsConfig)


class TestJobCounts:
    """Tests for JobCounts model."""

    def test_default_values(self):
        """Test default values are all zero."""
        counts = JobCounts()
        assert counts.total == 0
        assert counts.completed == 0
        assert counts.running == 0
        assert counts.failed == 0
        assert counts.pending == 0

    def test_custom_values(self):
        """Test custom values."""
        counts = JobCounts(total=10, completed=5, running=2, failed=1, pending=2)
        assert counts.total == 10
        assert counts.completed == 5
