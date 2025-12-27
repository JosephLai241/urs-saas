"""FastAPI main application."""

import asyncio
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api import projects, jobs, share, profile, auth as auth_api


# Store for background jobs
background_jobs: Dict[str, asyncio.Task] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    app.state.background_jobs = background_jobs
    yield
    # Shutdown - cancel all background jobs
    for job_id, task in background_jobs.items():
        if not task.done():
            task.cancel()


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="Universal Reddit Scraper SAAS API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware - build list of allowed origins
    allowed_origins = [
        "http://localhost:3000",
        "https://urs-saas.vercel.app",
        settings.frontend_url,
        settings.frontend_url.rstrip("/"),  # Handle trailing slash
    ]
    # Remove duplicates and empty strings
    allowed_origins = list(set(o for o in allowed_origins if o))

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(auth_api.router, prefix="/api/auth", tags=["auth"])
    app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
    app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
    app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
    app.include_router(share.router, prefix="/api", tags=["share"])

    @app.get("/api/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "app": settings.app_name}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
