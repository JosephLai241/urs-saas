"""Projects API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user, User
from app.database import get_supabase_client
from app.models import ProjectCreate, ProjectResponse, ProjectUpdate, JobCreate, JobResponse, JobCounts


router = APIRouter()


def _calculate_job_counts(jobs: list) -> JobCounts:
    """Calculate job counts by status."""
    counts = JobCounts(total=len(jobs))
    for job in jobs:
        status = job.get("status", "pending")
        if status == "completed":
            counts.completed += 1
        elif status == "running":
            counts.running += 1
        elif status == "failed":
            counts.failed += 1
        elif status == "pending":
            counts.pending += 1
    return counts


@router.get("", response_model=List[ProjectResponse])
async def list_projects(user: User = Depends(get_current_user)):
    """List all projects for current user."""
    supabase = get_supabase_client()

    # Get projects
    projects_result = supabase.table("projects").select("*").eq(
        "user_id", user.id
    ).order("created_at", desc=True).execute()

    # Get all jobs for user to count per project
    jobs_result = supabase.table("scrape_jobs").select(
        "id, project_id, status"
    ).eq("user_id", user.id).execute()

    # Group jobs by project_id
    jobs_by_project: dict = {}
    for job in jobs_result.data:
        project_id = job.get("project_id")
        if project_id:
            if project_id not in jobs_by_project:
                jobs_by_project[project_id] = []
            jobs_by_project[project_id].append(job)

    projects = []
    for p in projects_result.data:
        jobs = jobs_by_project.get(p["id"], [])
        job_counts = _calculate_job_counts(jobs)

        projects.append(ProjectResponse(
            id=p["id"],
            user_id=p["user_id"],
            name=p["name"],
            description=p.get("description"),
            created_at=p["created_at"],
            job_count=job_counts.total,
            job_counts=job_counts,
        ))

    return projects


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    user: User = Depends(get_current_user),
):
    """Create a new project."""
    supabase = get_supabase_client()

    result = supabase.table("projects").insert({
        "user_id": user.id,
        "name": project.name,
        "description": project.description,
    }).execute()

    p = result.data[0]
    return ProjectResponse(
        id=p["id"],
        user_id=p["user_id"],
        name=p["name"],
        description=p.get("description"),
        created_at=p["created_at"],
        job_count=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
):
    """Get a specific project."""
    supabase = get_supabase_client()

    # Get project
    project_result = supabase.table("projects").select("*").eq(
        "id", project_id
    ).eq("user_id", user.id).execute()

    if not project_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    p = project_result.data[0]

    # Get jobs for this project
    jobs_result = supabase.table("scrape_jobs").select(
        "id, status"
    ).eq("project_id", project_id).execute()

    job_counts = _calculate_job_counts(jobs_result.data)

    return ProjectResponse(
        id=p["id"],
        user_id=p["user_id"],
        name=p["name"],
        description=p.get("description"),
        created_at=p["created_at"],
        job_count=job_counts.total,
        job_counts=job_counts,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    user: User = Depends(get_current_user),
):
    """Update a project."""
    supabase = get_supabase_client()

    # Verify ownership
    existing = supabase.table("projects").select("id").eq(
        "id", project_id
    ).eq("user_id", user.id).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.description is not None:
        update_data["description"] = update.description

    if update_data:
        supabase.table("projects").update(update_data).eq("id", project_id).execute()

    return await get_project(project_id, user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a project and all its jobs."""
    supabase = get_supabase_client()

    result = supabase.table("projects").delete().eq(
        "id", project_id
    ).eq("user_id", user.id).execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )


@router.get("/{project_id}/jobs", response_model=List[JobResponse])
async def list_project_jobs(
    project_id: str,
    user: User = Depends(get_current_user),
):
    """List all jobs in a project."""
    supabase = get_supabase_client()

    # Verify project ownership
    project = supabase.table("projects").select("id").eq(
        "id", project_id
    ).eq("user_id", user.id).execute()

    if not project.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    result = supabase.table("scrape_jobs").select("*").eq(
        "project_id", project_id
    ).order("created_at", desc=True).execute()

    return [JobResponse(**job) for job in result.data]


@router.post("/{project_id}/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    project_id: str,
    job: JobCreate,
    user: User = Depends(get_current_user),
):
    """Create and start a new scrape job."""
    from app.services.job_runner import start_scrape_job

    supabase = get_supabase_client()

    # Verify project ownership
    project = supabase.table("projects").select("id").eq(
        "id", project_id
    ).eq("user_id", user.id).execute()

    if not project.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Create job record
    result = supabase.table("scrape_jobs").insert({
        "project_id": project_id,
        "user_id": user.id,
        "job_type": job.job_type,
        "config": job.config.model_dump(),
        "status": "pending",
        "progress": 0,
    }).execute()

    job_data = result.data[0]

    # Start background job
    await start_scrape_job(job_data["id"], user.id)

    return JobResponse(**job_data)
