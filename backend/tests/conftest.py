"""Pytest configuration and fixtures."""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set test environment variables before importing app
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test-service-key"
os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"
os.environ["JWT_SECRET"] = "test-secret-key-for-testing-only-12345"
os.environ["ENCRYPTION_KEY"] = "dGVzdC1lbmNyeXB0aW9uLWtleS0xMjM0NTY3ODkw"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

# Import after setting up path and environment
from fastapi.testclient import TestClient


@pytest.fixture
def mock_supabase():
    """Mock Supabase client."""
    import app.database

    with patch.object(app.database, "get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_auth():
    """Mock authentication."""
    import app.auth

    with patch.object(app.auth, "verify_token") as mock:
        mock.return_value = app.auth.User(id="test-user-id", email="test@example.com")
        yield mock


@pytest.fixture
def client(mock_supabase, mock_auth):
    """Create a test client with mocked dependencies."""
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_subreddit_job():
    """Sample subreddit scrape job data."""
    return {
        "id": "job-123",
        "project_id": "project-123",
        "user_id": "test-user-id",
        "job_type": "subreddit",
        "config": {
            "subreddit": "python",
            "category": "hot",
            "limit": 25,
        },
        "status": "completed",
        "progress": 100,
        "result_data": {
            "scrape_settings": {
                "subreddit": "python",
                "category": "hot",
                "limit": 25,
            },
            "data": [
                {
                    "title": "Test Post 1",
                    "author": "test_user",
                    "score": 100,
                    "num_comments": 50,
                    "created_utc": "2024-01-15T10:00:00Z",
                    "permalink": "/r/python/comments/abc123/test_post_1/",
                    "selftext": "This is the content of the test post.",
                },
                {
                    "title": "Test Post 2",
                    "author": "another_user",
                    "score": 200,
                    "num_comments": 75,
                    "created_utc": "2024-01-15T09:00:00Z",
                    "permalink": "/r/python/comments/def456/test_post_2/",
                    "selftext": "",
                },
            ],
        },
        "created_at": "2024-01-15T12:00:00Z",
        "completed_at": "2024-01-15T12:01:00Z",
    }


@pytest.fixture
def sample_redditor_job():
    """Sample redditor scrape job data."""
    return {
        "id": "job-456",
        "project_id": "project-123",
        "user_id": "test-user-id",
        "job_type": "redditor",
        "config": {
            "username": "spez",
            "limit": 25,
        },
        "status": "completed",
        "progress": 100,
        "result_data": {
            "data": {
                "information": {
                    "name": "spez",
                    "link_karma": 100000,
                    "comment_karma": 500000,
                    "created_utc": "2005-06-06T00:00:00Z",
                },
                "submissions": [
                    {
                        "title": "Reddit Update",
                        "score": 5000,
                        "num_comments": 2000,
                        "permalink": "/r/announcements/comments/xyz/",
                    }
                ],
                "comments": [
                    {
                        "body": "Thanks for the feedback!",
                        "score": 100,
                    }
                ],
            }
        },
        "created_at": "2024-01-15T12:00:00Z",
        "completed_at": "2024-01-15T12:01:00Z",
    }


@pytest.fixture
def sample_comments_job():
    """Sample comments scrape job data."""
    return {
        "id": "job-789",
        "project_id": "project-123",
        "user_id": "test-user-id",
        "job_type": "comments",
        "config": {
            "url": "https://reddit.com/r/python/comments/abc123/test_post/",
            "limit": 0,
            "structured": True,
        },
        "status": "completed",
        "progress": 100,
        "result_data": {
            "data": {
                "submission_metadata": {
                    "title": "Test Post",
                    "author": "test_user",
                    "score": 500,
                },
                "total_comments": 100,
                "comments": [
                    {
                        "author": "commenter1",
                        "body": "Great post!",
                        "score": 50,
                        "replies": [
                            {
                                "author": "commenter2",
                                "body": "I agree!",
                                "score": 10,
                                "replies": [],
                            }
                        ],
                    }
                ],
            }
        },
        "created_at": "2024-01-15T12:00:00Z",
        "completed_at": "2024-01-15T12:01:00Z",
    }
