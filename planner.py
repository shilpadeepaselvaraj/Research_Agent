import anthropic
import json
import time
from typing import List, Optional
from app.core.config import settings
from app.models.schemas import AgentStep, AgentStatus


client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

PLANNER_SYSTEM = """You are a Research Planner Agent. Your job is to analyze a research query and decompose it into a structured research plan.

You must respond with ONLY valid JSON in this exact format:
{
  "sub_queries": ["specific question 1", "specific question 2", ...],
  "focus_areas": ["area1", "area2", ...],
  "approach": "Brief description of the research approach",
  "expected_sources": ["source type 1", "source type 2", ...]
}

Guidelines:
- Break the main query into 3-5 specific, searchable sub-questions
- Identify 2-4 focus areas that cover different angles
- Sub-queries should be concrete and distinct
- Think about what authoritative sources would have this info
"""


async def run_planner(query: str, depth: str = "standard") -> tuple[AgentStep, dict]:
    """Decompose research query into a structured plan."""
    start = time.time()

    depth_instruction = {
        "quick": "Create 2-3 focused sub-queries for a quick overview.",
        "standard": "Create 3-4 sub-queries covering key aspects.",
        "deep": "Create 4-5 comprehensive sub-queries for thorough analysis.",
    }

    thought = f"Analyzing query: '{query}'. Decomposing into searchable sub-questions..."

    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1024,
        system=PLANNER_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"Research query: {query}\n\nDepth: {depth_instruction[depth]}\n\nCreate the research plan.",
            }
        ],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    plan = json.loads(raw.strip())

    duration = int((time.time() - start) * 1000)

    step = AgentStep(
        agent="planner",
        status=AgentStatus.PLANNING,
        thought=thought,
        action=f"Decomposed into {len(plan['sub_queries'])} sub-queries",
        result=f"Plan: {plan['approach']}",
        duration_ms=duration,
    )

    return step, plan
