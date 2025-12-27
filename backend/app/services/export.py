"""Export service for generating JSON output."""

import json
from datetime import datetime
from typing import Tuple


class ExportService:
    """Service for exporting job results to JSON."""

    def to_json(self, job: dict) -> Tuple[bytes, str, str]:
        """Export job results to JSON."""
        result_data = job.get("result_data", {})
        content = json.dumps(result_data, indent=2, ensure_ascii=False)

        filename = self._generate_filename(job, "json")
        return content.encode("utf-8"), "application/json", filename

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
