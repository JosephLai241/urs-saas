"""FastAPI main application."""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict

from app.api import auth as auth_api
from app.api import jobs, profile, projects, share
from app.config import get_settings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Global exception handler to ensure CORS headers on errors."""
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
