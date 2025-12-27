"""Supabase database client."""

from functools import lru_cache
from typing import Union

from supabase import create_client, Client

from app.config import get_settings


def is_demo_mode() -> bool:
    """Check if we're in demo mode (no real Supabase configured)."""
    settings = get_settings()
    return "placeholder" in settings.supabase_url.lower()


@lru_cache()
def get_supabase_client() -> Union[Client, "DemoSupabaseClient"]:
    """Get cached Supabase client with service key (for backend operations)."""
    if is_demo_mode():
        from app.demo_db import get_demo_client
        return get_demo_client()

    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_anon_client() -> Union[Client, "DemoSupabaseClient"]:
    """Get Supabase client with anon key (for user-context operations)."""
    if is_demo_mode():
        from app.demo_db import get_demo_client
        return get_demo_client()

    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
