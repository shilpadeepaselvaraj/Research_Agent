import anthropic
import json
import time
from typing import List
from app.core.config import settings
from app.models.schemas import AgentStep, AgentStatus, SearchResult

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

ANALYZER_SYSTEM = """You are a Research Analyzer Agent. Your job is to extract key insights, facts, and themes from search results.

You must respond with ONLY valid JSON:
{
  "key_facts": ["fact 1", "fact 2", ...],
  "themes": ["theme 1", "theme 2", ...],
  "contradictions": ["contradiction 1", ...],
  "knowledge_gaps": ["gap 1", ...],
  "confidence": 0.85,
  "summary": "Brief analytical summary"
}

Be precise, factual, and note any conflicting information between sources."""


async def run_analyzer(
    query: str, results: List[SearchResult], plan: dict
) -> tuple[AgentStep, dict]:
    """Analyze search results to extract structured insights."""
    start = time.time()

    # Format results for the model
    sources_text = "\n\n".join(
        [
            f"[Source {i+1}] {r.title}\nURL: {r.url}\nContent: {r.snippet}"
            for i, r in enumerate(results[:8])
        ]
    )

    thought = f"Analyzing {len(results)} sources for insights, themes, and contradictions..."

    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=ANALYZER_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"""Original research query: {query}

Research focus areas: {', '.join(plan.get('focus_areas', []))}

Search Results:
{sources_text}

Analyze these sources and extract structured insights.""",
            }
        ],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    analysis = json.loads(raw.strip())

    duration = int((time.time() - start) * 1000)

    step = AgentStep(
        agent="analyzer",
        status=AgentStatus.ANALYZING,
        thought=thought,
        action=f"Extracted {len(analysis.get('key_facts', []))} facts across {len(analysis.get('themes', []))} themes",
        result=analysis.get("summary", ""),
        sources=[r.url for r in results[:4]],
        duration_ms=duration,
    )

    return step, analysis
