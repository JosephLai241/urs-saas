"""Tests for API endpoint logic."""

import pytest
from app.models import (
    JobCreate,
    JobResponse,
    ProjectCreate,
    ProjectResponse,
    SubredditConfig,
)


class TestProjectValidation:
    """Tests for project input validation."""

    def test_project_create_valid(self):
        """Test creating a valid project."""
        project = ProjectCreate(name="Test Project", description="A description")
        assert project.name == "Test Project"
        assert project.description == "A description"

    def test_project_create_no_description(self):
        """Test creating a project without description."""
        project = ProjectCreate(name="Test Project")
        assert project.name == "Test Project"
        assert project.description is None

    def test_project_response_with_job_counts(self):
        """Test project response includes job counts."""
        from app.models import JobCounts

        response = ProjectResponse(
            id="project-123",
            user_id="user-456",
            name="Test Project",
            description="Test",
            created_at="2024-01-15T12:00:00Z",
            job_count=5,
            job_counts=JobCounts(total=5, completed=3, running=1, pending=1),
        )
        assert response.job_count == 5
        assert response.job_counts.completed == 3


class TestJobValidation:
    """Tests for job input validation."""

    def test_job_create_subreddit(self):
        """Test creating a subreddit job."""
        job = JobCreate(
            job_type="subreddit",
            config=SubredditConfig(subreddit="python", category="hot", limit=25),
        )
        assert job.job_type == "subreddit"
        assert job.config.subreddit == "python"

    def test_job_response_structure(self):
        """Test job response has required fields."""
        response = JobResponse(
            id="job-123",
            project_id="project-456",
            user_id="user-789",
            job_type="subreddit",
            config={"subreddit": "python", "category": "hot"},
            status="completed",
            progress=100,
            created_at="2024-01-15T12:00:00Z",
        )
        assert response.id == "job-123"
        assert response.status == "completed"
        assert response.progress == 100


class TestShareValidation:
    """Tests for share link validation."""

    def test_share_link_response_structure(self):
        """Test share link response has required fields."""
        from app.models import ShareLinkResponse

        response = ShareLinkResponse(
            id="share-123",
            job_id="job-456",
            share_token="abc123xyz",
            is_active=True,
            created_at="2024-01-15T12:00:00Z",
            url="http://localhost:3000/share/abc123xyz",
        )
        assert response.share_token == "abc123xyz"
        assert response.is_active is True
        assert "abc123xyz" in response.url

    def test_shared_result_response_structure(self):
        """Test shared result response structure."""
        from app.models import SharedResultResponse

        response = SharedResultResponse(
            job_type="subreddit",
            config={"subreddit": "python"},
            result_data={"data": []},
            created_at="2024-01-15T12:00:00Z",
        )
        assert response.job_type == "subreddit"
        assert response.config["subreddit"] == "python"


class TestExportValidation:
    """Tests for export format validation."""

    def test_export_format_json(self):
        """Test JSON export format."""
        from app.models import ExportRequest

        request = ExportRequest(format="json")
        assert request.format == "json"

    def test_export_format_markdown(self):
        """Test Markdown export format."""
        from app.models import ExportRequest

        request = ExportRequest(format="markdown")
        assert request.format == "markdown"

    def test_export_format_pdf(self):
        """Test PDF export format."""
        from app.models import ExportRequest

        request = ExportRequest(format="pdf")
        assert request.format == "pdf"

    def test_export_format_default(self):
        """Test default export format is JSON."""
        from app.models import ExportRequest

        request = ExportRequest()
        assert request.format == "json"

    def test_export_format_invalid(self):
        """Test invalid export format raises error."""
        from app.models import ExportRequest
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            ExportRequest(format="invalid")


class TestProfileValidation:
    """Tests for profile validation."""

    def test_profile_update_partial(self):
        """Test partial profile update."""
        from app.models import ProfileUpdate

        update = ProfileUpdate(reddit_username="new_user")
        assert update.reddit_username == "new_user"
        assert update.reddit_client_id is None

    def test_profile_update_all_fields(self):
        """Test full profile update."""
        from app.models import ProfileUpdate

        update = ProfileUpdate(
            reddit_client_id="client123",
            reddit_client_secret="secret456",
            reddit_username="myuser",
        )
        assert update.reddit_client_id == "client123"
        assert update.reddit_client_secret == "secret456"
        assert update.reddit_username == "myuser"
