"""Export service for generating different output formats."""

import json
from datetime import datetime
from typing import Tuple


class ExportService:
    """Service for exporting job results to various formats."""

    def to_json(self, job: dict) -> Tuple[bytes, str, str]:
        """Export job results to JSON."""
        result_data = job.get("result_data", {})
        content = json.dumps(result_data, indent=2, ensure_ascii=False)

        filename = self._generate_filename(job, "json")
        return content.encode("utf-8"), "application/json", filename

    def to_markdown(self, job: dict) -> Tuple[bytes, str, str]:
        """Export job results to Markdown."""
        job_type = job["job_type"]
        config = job["config"]
        result_data = job.get("result_data", {})
        created_at = job.get("created_at", datetime.utcnow().isoformat())

        lines = []

        if job_type == "subreddit":
            lines.append(f"# Subreddit Scrape: r/{config.get('subreddit', 'unknown')}")
            lines.append("")
            lines.append(f"**Category:** {config.get('category', 'hot')}")
            lines.append(f"**Limit:** {config.get('limit', 'N/A')}")
            if config.get("time_filter"):
                lines.append(f"**Time Filter:** {config['time_filter']}")
            lines.append(f"**Scraped:** {created_at}")
            lines.append("")
            lines.append("---")
            lines.append("")

            for i, post in enumerate(result_data.get("data", []), 1):
                lines.append(f"## {i}. {post.get('title', 'No title')}")
                lines.append("")
                lines.append(f"- **Author:** {post.get('author', 'unknown')}")
                lines.append(f"- **Score:** {post.get('score', 0)}")
                lines.append(f"- **Comments:** {post.get('num_comments', 0)}")
                lines.append(f"- **Created:** {post.get('created_utc', 'unknown')}")
                lines.append(
                    f"- **URL:** https://reddit.com{post.get('permalink', '')}"
                )
                lines.append("")

                if post.get("selftext"):
                    lines.append("> " + post["selftext"][:500].replace("\n", "\n> "))
                    if len(post.get("selftext", "")) > 500:
                        lines.append("> ...")
                    lines.append("")

                lines.append("---")
                lines.append("")

        elif job_type == "redditor":
            username = config.get("username", "unknown")
            lines.append(f"# Redditor Profile: u/{username}")
            lines.append("")

            data = result_data.get("data", {})
            info = data.get("information", {})

            lines.append("## Profile Information")
            lines.append("")
            lines.append(f"- **Name:** {info.get('name', username)}")
            lines.append(f"- **Link Karma:** {info.get('link_karma', 0)}")
            lines.append(f"- **Comment Karma:** {info.get('comment_karma', 0)}")
            lines.append(f"- **Account Created:** {info.get('created_utc', 'unknown')}")
            lines.append("")
            lines.append("---")
            lines.append("")

            submissions = data.get("submissions", [])
            if submissions:
                lines.append(f"## Recent Submissions ({len(submissions)})")
                lines.append("")
                for post in submissions[:10]:
                    if isinstance(post, dict) and not post.get("error"):
                        lines.append(
                            f"- [{post.get('title', 'No title')}](https://reddit.com{post.get('permalink', '')})"
                        )
                        lines.append(
                            f"  - Score: {post.get('score', 0)} | Comments: {post.get('num_comments', 0)}"
                        )
                lines.append("")

            comments = data.get("comments", [])
            if comments:
                lines.append(f"## Recent Comments ({len(comments)})")
                lines.append("")
                for comment in comments[:10]:
                    if isinstance(comment, dict) and not comment.get("error"):
                        body = comment.get("body", "")[:200]
                        if len(comment.get("body", "")) > 200:
                            body += "..."
                        lines.append(f"- {body}")
                        lines.append(f"  - Score: {comment.get('score', 0)}")
                lines.append("")

        elif job_type == "comments":
            url = config.get("url", "")
            lines.append("# Comment Scrape")
            lines.append("")
            lines.append(f"**URL:** {url}")
            lines.append(f"**Scraped:** {created_at}")
            lines.append("")

            data = result_data.get("data", {})
            meta = data.get("submission_metadata", {})

            lines.append(f"## Submission: {meta.get('title', 'Unknown')}")
            lines.append("")
            lines.append(f"- **Author:** {meta.get('author', 'unknown')}")
            lines.append(f"- **Score:** {meta.get('score', 0)}")
            lines.append(f"- **Total Comments:** {data.get('total_comments', 0)}")
            lines.append("")
            lines.append("---")
            lines.append("")

            lines.append("## Comments")
            lines.append("")

            comments = data.get("comments", [])
            self._render_comments_md(comments, lines, max_depth=3)

        content = "\n".join(lines)
        filename = self._generate_filename(job, "md")
        return content.encode("utf-8"), "text/markdown", filename

    def _render_comments_md(
        self, comments: list, lines: list, depth: int = 0, max_depth: int = 3
    ):
        """Recursively render comments to markdown."""
        if depth > max_depth:
            return

        indent = "  " * depth
        for comment in comments[:20]:  # Limit to 20 per level
            if isinstance(comment, dict):
                author = comment.get("author", "unknown")
                body = comment.get("body", "")[:300]
                if len(comment.get("body", "")) > 300:
                    body += "..."
                score = comment.get("score", 0)

                lines.append(f"{indent}- **{author}** (score: {score})")
                lines.append(
                    f"{indent}  > {body.replace(chr(10), f'{chr(10)}{indent}  > ')}"
                )
                lines.append("")

                replies = comment.get("replies", [])
                if replies:
                    self._render_comments_md(replies, lines, depth + 1, max_depth)

    def to_pdf(self, job: dict) -> Tuple[bytes, str, str]:
        """Export job results to PDF."""
        try:
            import markdown2
            from weasyprint import HTML
        except ImportError:
            # Fallback to markdown if PDF libs not available
            content, _, _ = self.to_markdown(job)
            return content, "text/markdown", self._generate_filename(job, "md")

        # Convert markdown to HTML
        md_content, _, _ = self.to_markdown(job)
        html_content = markdown2.markdown(md_content.decode("utf-8"))

        # Wrap in styled HTML
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    color: #333;
                }}
                h1 {{ color: #1a1a1a; border-bottom: 2px solid #ff4500; padding-bottom: 10px; }}
                h2 {{ color: #333; margin-top: 30px; }}
                a {{ color: #0066cc; text-decoration: none; }}
                blockquote {{
                    border-left: 4px solid #ff4500;
                    margin: 10px 0;
                    padding-left: 15px;
                    color: #555;
                }}
                hr {{ border: none; border-top: 1px solid #ddd; margin: 20px 0; }}
                ul {{ padding-left: 20px; }}
                li {{ margin-bottom: 5px; }}
            </style>
        </head>
        <body>
            {html_content}
            <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                Generated by URS SAAS
            </footer>
        </body>
        </html>
        """

        pdf_bytes = HTML(string=styled_html).write_pdf()
        filename = self._generate_filename(job, "pdf")
        return pdf_bytes, "application/pdf", filename

    def _generate_filename(self, job: dict, extension: str) -> str:
        """Generate a filename for the export."""
        job_type = job["job_type"]
        config = job["config"]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

        if job_type == "subreddit":
            name = config.get("subreddit", "subreddit")
            category = config.get("category", "hot")
            return f"{name}_{category}_{timestamp}.{extension}"
        elif job_type == "redditor":
            name = config.get("username", "redditor")
            return f"u_{name}_{timestamp}.{extension}"
        elif job_type == "comments":
            return f"comments_{timestamp}.{extension}"
        else:
            return f"export_{timestamp}.{extension}"
