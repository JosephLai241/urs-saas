"""Tests for the export service."""

import json

import pytest

from app.services.export import ExportService


class TestExportService:
    """Tests for ExportService."""

    @pytest.fixture
    def export_service(self):
        """Create an ExportService instance."""
        return ExportService()

    def test_to_json_subreddit(self, export_service, sample_subreddit_job):
        """Test JSON export for subreddit job."""
        content, media_type, filename = export_service.to_json(sample_subreddit_job)

        assert media_type == "application/json"
        assert filename.endswith(".json")
        assert "python" in filename
        assert "hot" in filename

        # Verify content is valid JSON
        data = json.loads(content.decode("utf-8"))
        assert "data" in data
        assert len(data["data"]) == 2

    def test_to_json_redditor(self, export_service, sample_redditor_job):
        """Test JSON export for redditor job."""
        content, media_type, filename = export_service.to_json(sample_redditor_job)

        assert media_type == "application/json"
        assert "spez" in filename

        data = json.loads(content.decode("utf-8"))
        assert "data" in data
        assert "information" in data["data"]

    def test_to_markdown_subreddit(self, export_service, sample_subreddit_job):
        """Test Markdown export for subreddit job."""
        content, media_type, filename = export_service.to_markdown(sample_subreddit_job)

        assert media_type == "text/markdown"
        assert filename.endswith(".md")

        md_content = content.decode("utf-8")
        assert "# Subreddit Scrape: r/python" in md_content
        assert "**Category:** hot" in md_content
        assert "Test Post 1" in md_content
        assert "test_user" in md_content

    def test_to_markdown_redditor(self, export_service, sample_redditor_job):
        """Test Markdown export for redditor job."""
        content, media_type, filename = export_service.to_markdown(sample_redditor_job)

        md_content = content.decode("utf-8")
        assert "# Redditor Profile: u/spez" in md_content
        assert "## Profile Information" in md_content
        assert "Link Karma" in md_content

    def test_to_markdown_comments(self, export_service, sample_comments_job):
        """Test Markdown export for comments job."""
        content, media_type, filename = export_service.to_markdown(sample_comments_job)

        md_content = content.decode("utf-8")
        assert "# Comment Scrape" in md_content
        assert "## Submission: Test Post" in md_content
        assert "## Comments" in md_content
        assert "commenter1" in md_content

    def test_markdown_blockquote_formatting(self, export_service, sample_subreddit_job):
        """Test that selftext is properly formatted as blockquote."""
        content, _, _ = export_service.to_markdown(sample_subreddit_job)
        md_content = content.decode("utf-8")

        # The selftext should be in a blockquote
        assert "> This is the content of the test post." in md_content

    def test_to_markdown_truncates_long_content(self, export_service):
        """Test that long content is truncated."""
        job = {
            "job_type": "subreddit",
            "config": {"subreddit": "test", "category": "hot"},
            "result_data": {
                "data": [
                    {
                        "title": "Long Post",
                        "author": "test",
                        "score": 1,
                        "num_comments": 1,
                        "created_utc": "2024-01-01",
                        "permalink": "/r/test/",
                        "selftext": "x" * 1000,  # Very long content
                    }
                ]
            },
            "created_at": "2024-01-01T00:00:00Z",
        }

        content, _, _ = export_service.to_markdown(job)
        md_content = content.decode("utf-8")

        # Should be truncated with "..."
        assert "..." in md_content

    def test_generate_filename_subreddit(self, export_service, sample_subreddit_job):
        """Test filename generation for subreddit jobs."""
        filename = export_service._generate_filename(sample_subreddit_job, "json")
        assert "python" in filename
        assert "hot" in filename
        assert filename.endswith(".json")

    def test_generate_filename_redditor(self, export_service, sample_redditor_job):
        """Test filename generation for redditor jobs."""
        filename = export_service._generate_filename(sample_redditor_job, "md")
        assert "u_spez" in filename
        assert filename.endswith(".md")

    def test_generate_filename_comments(self, export_service, sample_comments_job):
        """Test filename generation for comments jobs."""
        filename = export_service._generate_filename(sample_comments_job, "pdf")
        assert "comments" in filename
        assert filename.endswith(".pdf")

    def test_empty_result_data(self, export_service):
        """Test handling of empty result data."""
        job = {
            "job_type": "subreddit",
            "config": {"subreddit": "test", "category": "hot"},
            "result_data": {},
            "created_at": "2024-01-01T00:00:00Z",
        }

        content, media_type, filename = export_service.to_json(job)
        data = json.loads(content.decode("utf-8"))
        assert data == {}

    def test_render_comments_md_nested(self, export_service):
        """Test rendering of nested comments."""
        comments = [
            {
                "author": "user1",
                "body": "Parent comment",
                "score": 10,
                "replies": [
                    {
                        "author": "user2",
                        "body": "Reply to parent",
                        "score": 5,
                        "replies": [
                            {
                                "author": "user3",
                                "body": "Nested reply",
                                "score": 2,
                                "replies": [],
                            }
                        ],
                    }
                ],
            }
        ]

        lines = []
        export_service._render_comments_md(comments, lines, depth=0, max_depth=3)

        output = "\n".join(lines)
        assert "user1" in output
        assert "user2" in output
        assert "user3" in output
        assert "Parent comment" in output
        assert "Reply to parent" in output
        assert "Nested reply" in output

    def test_render_comments_md_max_depth(self, export_service):
        """Test that comments beyond max depth are not rendered."""
        comments = [
            {
                "author": "user1",
                "body": "Level 0",
                "score": 1,
                "replies": [
                    {
                        "author": "user2",
                        "body": "Level 1",
                        "score": 1,
                        "replies": [
                            {
                                "author": "user3",
                                "body": "Level 2 - should not appear",
                                "score": 1,
                                "replies": [],
                            }
                        ],
                    }
                ],
            }
        ]

        lines = []
        export_service._render_comments_md(comments, lines, depth=0, max_depth=1)

        output = "\n".join(lines)
        assert "Level 0" in output
        assert "Level 1" in output
        assert "Level 2" not in output
