import anthropic
import json
import time
from typing import List
from app.core.config import settings
from app.models.schemas import AgentStep, AgentStatus

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

REFLECTOR_SYSTEM = """You are a Research Reflection Agent. Your role is to critically evaluate the analysis quality and identify what's missing or needs improvement.

Respond with ONLY valid JSON:
{
  "quality_score": 0.82,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "missing_aspects": ["aspect 1", "aspect 2"],
  "bias_risks": ["potential bias 1"],
  "additional_queries": ["follow-up query 1", "follow-up query 2"],
  "ready_to_synthesize": true,
  "reasoning": "Why this analysis is/isn't ready for synthesis"
}

Be rigorous. Challenge assumptions. Identify echo chambers in sources."""


async def run_reflector(
    query: str, plan: dict, analysis: dict
) -> tuple[AgentStep, dict]:
    """Self-critique the analysis and decide if more research is needed."""
    start = time.time()

    thought = "Critically evaluating analysis quality, checking for gaps and potential biases..."

    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1024,
        system=REFLECTOR_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"""Original query: {query}

Research plan:
- Sub-queries covered: {json.dumps(plan.get('sub_queries', []))}
- Focus areas: {json.dumps(plan.get('focus_areas', []))}

Analysis results:
- Key facts found: {len(analysis.get('key_facts', []))}
- Themes identified: {json.dumps(analysis.get('themes', []))}
- Contradictions noted: {json.dumps(analysis.get('contradictions', []))}
- Knowledge gaps: {json.dumps(analysis.get('knowledge_gaps', []))}
- Confidence: {analysis.get('confidence', 0)}
- Summary: {analysis.get('summary', '')}

Critically evaluate this analysis. Is it comprehensive enough to write a high-quality research report?""",
            }
        ],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    reflection = json.loads(raw.strip())

    duration = int((time.time() - start) * 1000)

    quality = reflection.get("quality_score", 0.7)
    ready = reflection.get("ready_to_synthesize", True)

    step = AgentStep(
        agent="reflector",
        status=AgentStatus.REFLECTING,
        thought=thought,
        action=f"Quality score: {quality:.0%} | Ready: {'Yes' if ready else 'Needs more research'}",
        result=reflection.get("reasoning", ""),
        duration_ms=duration,
    )

    return step, reflection
