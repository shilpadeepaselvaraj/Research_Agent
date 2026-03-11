import asyncio
import json
from typing import AsyncGenerator
from datetime import datetime

from app.models.schemas import ResearchJob, AgentStatus, ResearchRequest
from app.agents.planner import run_planner
from app.agents.searcher import run_searcher
from app.agents.analyzer import run_analyzer
from app.agents.reflector import run_reflector
from app.agents.synthesizer import run_synthesizer

# In-memory job store (replace with Redis in production)
_jobs: dict[str, ResearchJob] = {}


def get_job(job_id: str) -> ResearchJob | None:
    return _jobs.get(job_id)


def create_job(query: str) -> ResearchJob:
    job = ResearchJob(query=query)
    _jobs[job.job_id] = job
    return job


def _event(event: str, data: dict) -> str:
    return f"data: {json.dumps({'event': event, 'data': data})}\n\n"


async def run_research_pipeline(
    job_id: str, request: ResearchRequest
) -> AsyncGenerator[str, None]:
    """
    Full agentic pipeline with SSE streaming.
    Yields server-sent events as the agents work.
    """
    job = _jobs.get(job_id)
    if not job:
        yield _event("error", {"message": "Job not found"})
        return

    try:
        # ── PHASE 1: Planning ──────────────────────────────────────────
        job.status = AgentStatus.PLANNING
        yield _event("status", {"status": "planning", "message": "🧠 Planner Agent analyzing query..."})

        planner_step, plan = await run_planner(request.query, request.depth)
        job.steps.append(planner_step)

        yield _event("step", {
            "step": planner_step.model_dump(mode="json"),
            "plan": plan,
        })
        await asyncio.sleep(0.1)

        # ── PHASE 2: Searching ─────────────────────────────────────────
        job.status = AgentStatus.SEARCHING
        yield _event("status", {"status": "searching", "message": f"🔍 Searcher Agent running {len(plan['sub_queries'])} searches..."})

        searcher_steps, search_results = await run_searcher(
            plan["sub_queries"], plan.get("focus_areas", [])
        )
        for step in searcher_steps:
            job.steps.append(step)
            yield _event("step", {"step": step.model_dump(mode="json")})
            await asyncio.sleep(0.05)

        yield _event("search_results", {
            "count": len(search_results),
            "results": [r.model_dump() for r in search_results[:6]],
        })

        # ── PHASE 3: Analysis ──────────────────────────────────────────
        job.status = AgentStatus.ANALYZING
        yield _event("status", {"status": "analyzing", "message": f"🔬 Analyzer Agent processing {len(search_results)} sources..."})

        analyzer_step, analysis = await run_analyzer(request.query, search_results, plan)
        job.steps.append(analyzer_step)
        yield _event("step", {"step": analyzer_step.model_dump(mode="json"), "analysis": analysis})
        await asyncio.sleep(0.1)

        # ── PHASE 4: Reflection ────────────────────────────────────────
        job.status = AgentStatus.REFLECTING
        yield _event("status", {"status": "reflecting", "message": "🪞 Reflector Agent checking quality..."})

        reflector_step, reflection = await run_reflector(request.query, plan, analysis)
        job.steps.append(reflector_step)
        yield _event("step", {"step": reflector_step.model_dump(mode="json"), "reflection": reflection})
        await asyncio.sleep(0.1)

        # Optional: second search pass if reflector deems it needed
        if not reflection.get("ready_to_synthesize", True) and reflection.get("additional_queries"):
            yield _event("status", {"status": "searching", "message": "🔍 Running additional searches based on reflection..."})
            extra_steps, extra_results = await run_searcher(
                reflection["additional_queries"][:2], []
            )
            search_results.extend(extra_results)
            for step in extra_steps:
                job.steps.append(step)
                yield _event("step", {"step": step.model_dump(mode="json")})

        # ── PHASE 5: Synthesis ─────────────────────────────────────────
        job.status = AgentStatus.SYNTHESIZING
        yield _event("status", {"status": "synthesizing", "message": "✍️ Synthesizer Agent writing report..."})

        synthesizer_step, report = await run_synthesizer(
            request.query, search_results, analysis, reflection
        )
        job.steps.append(synthesizer_step)
        job.report = report
        yield _event("step", {"step": synthesizer_step.model_dump(mode="json")})
        await asyncio.sleep(0.1)

        # ── COMPLETE ───────────────────────────────────────────────────
        job.status = AgentStatus.COMPLETE
        job.completed_at = datetime.utcnow()

        yield _event("complete", {
            "job_id": job_id,
            "report": report.model_dump(mode="json"),
            "total_steps": len(job.steps),
            "duration_ms": sum(s.duration_ms or 0 for s in job.steps),
        })

    except Exception as e:
        job.status = AgentStatus.ERROR
        job.error = str(e)
        yield _event("error", {"message": str(e), "job_id": job_id})
