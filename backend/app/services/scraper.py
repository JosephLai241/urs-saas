"""Reddit scraper service using PRAW."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import praw
from praw.models import Comment, Submission


def convert_timestamp(raw_timestamp: float) -> str:
    """Convert UNIX timestamp to ISO 8601 UTC format."""
    return datetime.fromtimestamp(raw_timestamp, tz=timezone.utc).isoformat()


def serialize_submission(submission: Submission) -> Dict[str, Any]:
    """Serialize a PRAW Submission object to a dictionary."""
    return {
        "id": submission.id,
        "title": submission.title,
        "author": str(submission.author) if submission.author else "[deleted]",
        "subreddit": str(submission.subreddit),
        "score": submission.score,
        "upvote_ratio": submission.upvote_ratio,
        "num_comments": submission.num_comments,
        "created_utc": convert_timestamp(submission.created_utc),
        "permalink": submission.permalink,
        "url": submission.url,
        "selftext": submission.selftext,
        "is_self": submission.is_self,
        "nsfw": submission.over_18,
        "spoiler": submission.spoiler,
        "stickied": submission.stickied,
        "locked": submission.locked,
        "distinguished": submission.distinguished,
        "link_flair_text": submission.link_flair_text,
    }


def serialize_comment(comment: Comment) -> Dict[str, Any]:
    """Serialize a PRAW Comment object to a dictionary."""
    return {
        "id": comment.id,
        "author": str(comment.author) if comment.author else "[deleted]",
        "body": comment.body,
        "score": comment.score,
        "created_utc": convert_timestamp(comment.created_utc),
        "permalink": comment.permalink,
        "is_submitter": comment.is_submitter,
        "stickied": comment.stickied,
        "distinguished": comment.distinguished,
        "edited": bool(comment.edited),
        "parent_id": comment.parent_id,
    }


class ScraperService:
    """Service for scraping Reddit data using PRAW."""

    def __init__(self, client_id: str, client_secret: str, username: str):
        """Initialize PRAW Reddit instance with user credentials."""
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=f"URS-SAAS/1.0 by {username}",
        )

    def scrape_subreddit(
        self,
        subreddit_name: str,
        category: str,
        limit: int,
        time_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Scrape submissions from a subreddit.

        Args:
            subreddit_name: Name of the subreddit (without r/)
            category: One of: hot, new, controversial, top, rising, search
            limit: Maximum number of submissions to retrieve
            time_filter: Time filter for top/controversial (hour, day, week, month, year, all)
            search_query: Search query (required if category is 'search')
            progress_callback: Optional callback function(current, total, message)

        Returns:
            Dict with scrape_settings and data
        """
        subreddit = self.reddit.subreddit(subreddit_name)

        # Get the appropriate listing generator based on category
        if category == "hot":
            submissions = subreddit.hot(limit=limit)
        elif category == "new":
            submissions = subreddit.new(limit=limit)
        elif category == "rising":
            submissions = subreddit.rising(limit=limit)
        elif category == "controversial":
            submissions = subreddit.controversial(time_filter=time_filter or "all", limit=limit)
        elif category == "top":
            submissions = subreddit.top(time_filter=time_filter or "all", limit=limit)
        elif category == "search":
            if not search_query:
                raise ValueError("search_query is required for search category")
            submissions = subreddit.search(search_query, limit=limit, time_filter=time_filter or "all")
        else:
            raise ValueError(f"Invalid category: {category}")

        # Convert to list with progress updates
        data = []
        for i, submission in enumerate(submissions):
            data.append(serialize_submission(submission))
            if progress_callback:
                progress_callback(i + 1, limit, f"Scraped {i + 1}/{limit} submissions")

        return {
            "scrape_settings": {
                "subreddit": subreddit_name,
                "category": category,
                "limit": limit,
                "time_filter": time_filter,
                "search_query": search_query,
            },
            "data": data,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    def scrape_redditor(
        self,
        username: str,
        limit: int,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Scrape a Redditor's profile and activity.

        Args:
            username: Reddit username (without u/)
            limit: Maximum number of items per category
            progress_callback: Optional callback function(current, total, message)

        Returns:
            Dict with scrape_settings and data
        """
        redditor = self.reddit.redditor(username)

        # Get basic info
        try:
            redditor_info = {
                "name": redditor.name,
                "created_utc": convert_timestamp(redditor.created_utc),
                "comment_karma": redditor.comment_karma,
                "link_karma": redditor.link_karma,
                "is_gold": getattr(redditor, "is_gold", False),
                "is_mod": getattr(redditor, "is_mod", False),
            }
        except Exception:
            redditor_info = {"name": username, "error": "Could not fetch profile info"}

        # Get submissions and comments
        submissions = []
        comments = []

        if progress_callback:
            progress_callback(0, 100, "Fetching submissions...")

        try:
            for i, submission in enumerate(redditor.submissions.new(limit=limit)):
                submissions.append(serialize_submission(submission))
                if progress_callback:
                    progress_callback(
                        int((i + 1) / limit * 50),
                        100,
                        f"Scraped {i + 1} submissions",
                    )
        except Exception as e:
            submissions = [{"error": str(e)}]

        if progress_callback:
            progress_callback(50, 100, "Fetching comments...")

        try:
            for i, comment in enumerate(redditor.comments.new(limit=limit)):
                comments.append(serialize_comment(comment))
                if progress_callback:
                    progress_callback(
                        50 + int((i + 1) / limit * 50),
                        100,
                        f"Scraped {i + 1} comments",
                    )
        except Exception as e:
            comments = [{"error": str(e)}]

        return {
            "scrape_settings": {
                "redditor": username,
                "limit": limit,
            },
            "data": {
                "information": redditor_info,
                "submissions": submissions,
                "comments": comments,
            },
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    def scrape_comments(
        self,
        url: str,
        limit: int = 0,
        structured: bool = True,
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Scrape comments from a submission.

        Args:
            url: URL of the Reddit submission
            limit: Maximum number of comments (0 = all)
            structured: Whether to return structured comment tree
            progress_callback: Optional callback function(current, total, message)

        Returns:
            Dict with scrape_settings and data
        """
        submission = self.reddit.submission(url=url)

        # Get submission metadata
        submission_metadata = serialize_submission(submission)

        if progress_callback:
            progress_callback(10, 100, "Loading comments...")

        # Replace MoreComments objects
        if limit == 0:
            submission.comments.replace_more(limit=None)
        else:
            submission.comments.replace_more(limit=limit)

        if progress_callback:
            progress_callback(30, 100, "Processing comments...")

        # Get all comments
        all_comments = submission.comments.list()
        total_comments = len(all_comments)

        if structured:
            # Build comment tree
            comments = self._build_comment_tree(
                submission.comments,
                progress_callback,
                50,
                100,
            )
        else:
            # Flat list
            comments = []
            for i, comment in enumerate(all_comments):
                if isinstance(comment, Comment):
                    comments.append(serialize_comment(comment))
                    if progress_callback and i % 10 == 0:
                        progress_callback(
                            50 + int((i + 1) / total_comments * 50),
                            100,
                            f"Processed {i + 1}/{total_comments} comments",
                        )

        return {
            "scrape_settings": {
                "url": url,
                "limit": limit,
                "structured": structured,
            },
            "data": {
                "submission_metadata": submission_metadata,
                "comments": comments,
                "total_comments": total_comments,
            },
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    def _build_comment_tree(
        self,
        comment_forest,
        progress_callback: Optional[callable] = None,
        start_progress: int = 0,
        end_progress: int = 100,
    ) -> List[Dict[str, Any]]:
        """Recursively build comment tree structure."""

        def process_comment(comment, depth=0):
            if not isinstance(comment, Comment):
                return None

            comment_dict = serialize_comment(comment)
            comment_dict["depth"] = depth
            comment_dict["replies"] = []

            for reply in comment.replies:
                reply_dict = process_comment(reply, depth + 1)
                if reply_dict:
                    comment_dict["replies"].append(reply_dict)

            return comment_dict

        result = []
        total = len(comment_forest)

        for i, comment in enumerate(comment_forest):
            comment_dict = process_comment(comment)
            if comment_dict:
                result.append(comment_dict)

            if progress_callback:
                progress = start_progress + int(
                    (i + 1) / total * (end_progress - start_progress)
                )
                progress_callback(progress, 100, f"Building tree: {i + 1}/{total}")

        return result
