"""In-memory demo database for local testing without Supabase."""

from datetime import datetime
from typing import Dict, List, Any, Optional
from uuid import uuid4


class DemoDatabase:
    """Simple in-memory database for demo mode."""

    def __init__(self):
        self.user_profiles: Dict[str, Dict] = {}
        self.projects: Dict[str, Dict] = {}
        self.scrape_jobs: Dict[str, Dict] = {}
        self.share_links: Dict[str, Dict] = {}

        # Initialize demo user profile
        self.user_profiles["demo-user-id"] = {
            "id": "demo-user-id",
            "reddit_client_id": None,
            "reddit_client_secret": None,
            "reddit_username": None,
            "created_at": datetime.utcnow().isoformat(),
        }

    def _generate_id(self) -> str:
        return str(uuid4())


class DemoTable:
    """Mock Supabase table interface."""

    def __init__(self, db: DemoDatabase, table_name: str):
        self.db = db
        self.table_name = table_name
        self._data = getattr(db, table_name)
        self._filters: List[tuple] = []
        self._order_by: Optional[tuple] = None

    def select(self, *args) -> "DemoTable":
        return self

    def insert(self, data: Dict) -> "DemoTable":
        item_id = data.get("id") or self.db._generate_id()
        data["id"] = item_id
        if "created_at" not in data:
            data["created_at"] = datetime.utcnow().isoformat()
        self._data[item_id] = data
        self._insert_result = [data]
        return self

    def upsert(self, data: Dict) -> "DemoTable":
        return self.insert(data)

    def update(self, data: Dict) -> "DemoTable":
        self._update_data = data
        return self

    def delete(self) -> "DemoTable":
        self._delete = True
        return self

    def eq(self, field: str, value: Any) -> "DemoTable":
        self._filters.append(("eq", field, value))
        return self

    def in_(self, field: str, values: List) -> "DemoTable":
        self._filters.append(("in", field, values))
        return self

    def order(self, field: str, desc: bool = False) -> "DemoTable":
        self._order_by = (field, desc)
        return self

    def execute(self) -> "DemoTableResult":
        # Handle insert result
        if hasattr(self, "_insert_result"):
            return DemoTableResult(self._insert_result)

        # Apply filters
        results = list(self._data.values())

        for filter_type, field, value in self._filters:
            if filter_type == "eq":
                results = [r for r in results if r.get(field) == value]
            elif filter_type == "in":
                results = [r for r in results if r.get(field) in value]

        # Handle update
        if hasattr(self, "_update_data"):
            for item in results:
                item.update(self._update_data)
                self._data[item["id"]] = item
            return DemoTableResult(results)

        # Handle delete
        if hasattr(self, "_delete"):
            for item in results:
                if item["id"] in self._data:
                    del self._data[item["id"]]
            return DemoTableResult(results)

        # Apply ordering
        if self._order_by:
            field, desc = self._order_by
            results.sort(key=lambda x: x.get(field, ""), reverse=desc)

        return DemoTableResult(results)


class DemoTableResult:
    """Mock Supabase query result."""

    def __init__(self, data: List[Dict]):
        self.data = data


class DemoSupabaseClient:
    """Mock Supabase client for demo mode."""

    def __init__(self):
        self._db = DemoDatabase()

    def table(self, name: str) -> DemoTable:
        # Map table names
        table_map = {
            "user_profiles": "user_profiles",
            "projects": "projects",
            "scrape_jobs": "scrape_jobs",
            "share_links": "share_links",
        }
        return DemoTable(self._db, table_map.get(name, name))


# Singleton instance
_demo_client: Optional[DemoSupabaseClient] = None


def get_demo_client() -> DemoSupabaseClient:
    """Get or create demo client singleton."""
    global _demo_client
    if _demo_client is None:
        _demo_client = DemoSupabaseClient()
    return _demo_client
