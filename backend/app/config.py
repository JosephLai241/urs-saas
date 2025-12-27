"""Application configuration."""

import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Get the directory containing this config file
CONFIG_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(CONFIG_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields from other .env files
    )

    # App settings
    app_name: str = "URS SAAS API"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str

    # JWT (using Supabase's JWT secret)
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Encryption key for Reddit credentials
    encryption_key: str

    # Demo auth (optional)
    demo_username: str = "demo"
    demo_password: str = "demo123"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
