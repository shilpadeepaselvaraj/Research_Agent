from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ResearchRequest, ResearchJob
from app.services.orchestrator import run_research_pipeline, create_job, get_job

router = APIRouter()


@router.post("/research", response_model=dict)
async def start_research(request: ResearchRequest):
    """Create a new research job and return job_id."""
    job = create_job(request.query)
    return {"job_id": job.job_id, "status": "created"}


@router.get("/research/{job_id}/stream")
async def stream_research(job_id: str, query: str, depth: str = "standard"):
    """Stream agent events via Server-Sent Events."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    request = ResearchRequest(query=query, depth=depth)

    return StreamingResponse(
        run_research_pipeline(job_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/research/{job_id}", response_model=ResearchJob)
async def get_research_job(job_id: str):
    """Get job status and results."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/health")
async def health():
    return {"status": "ok", "service": "research-agent"}
