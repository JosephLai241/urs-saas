"""Supabase database client."""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client with service key (for backend operations)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_anon_client() -> Client:
    """Get Supabase client with anon key (for user-context operations)."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
