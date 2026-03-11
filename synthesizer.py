import anthropic
import json
import time
from typing import List
from app.core.config import settings
from app.models.schemas import (
    AgentStep, AgentStatus, SearchResult,
    ResearchReport, ResearchSection, Citation
)

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYNTHESIZER_SYSTEM = """You are a Research Synthesis Agent. Write a comprehensive, well-structured research report.

Respond ONLY with valid JSON:
{
  "summary": "Executive summary paragraph (2-3 sentences)",
  "sections": [
    {
      "heading": "Section Title",
      "content": "Detailed section content (3-5 paragraphs). Use [1], [2] for citations.",
      "citations": [1, 2]
    }
  ],
  "citations": [
    {
      "id": 1,
      "title": "Source title",
      "url": "https://...",
      "excerpt": "Key quote or excerpt"
    }
  ],
  "confidence_score": 0.87
}

Requirements:
- Write 3-5 substantive sections
- Each section must have 2-4 paragraphs of real analysis
- Cite sources inline using [N] notation
- Include a "Key Findings" section and a "Conclusion" section
- Be factual, balanced, and analytical
- Total word count should be 800-1500 words"""


async def run_synthesizer(
    query: str,
    results: List[SearchResult],
    analysis: dict,
    reflection: dict,
) -> tuple[AgentStep, ResearchReport]:
    """Synthesize all findings into a structured research report."""
    start = time.time()

    thought = "Synthesizing all findings into a comprehensive, cited research report..."

    sources_context = "\n".join(
        [f"[{i+1}] {r.title} ({r.url}): {r.snippet[:200]}" for i, r in enumerate(results[:8])]
    )

    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=settings.MAX_TOKENS,
        system=SYNTHESIZER_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": f"""Research query: {query}

Available sources:
{sources_context}

Key facts from analysis:
{json.dumps(analysis.get('key_facts', []), indent=2)}

Themes identified:
{json.dumps(analysis.get('themes', []), indent=2)}

Contradictions to address:
{json.dumps(analysis.get('contradictions', []), indent=2)}

Reflection notes:
- Strengths: {json.dumps(reflection.get('strengths', []))}
- Missing aspects to address: {json.dumps(reflection.get('missing_aspects', []))}
- Bias risks: {json.dumps(reflection.get('bias_risks', []))}

Write the comprehensive research report now.""",
            }
        ],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    report_data = json.loads(raw.strip())

    # Build typed sections
    sections = [
        ResearchSection(
            heading=s["heading"],
            content=s["content"],
            citations=s.get("citations", []),
        )
        for s in report_data.get("sections", [])
    ]

    # Build citations
    citations = [
        Citation(
            id=c["id"],
            title=c["title"],
            url=c["url"],
            excerpt=c.get("excerpt", ""),
        )
        for c in report_data.get("citations", [])
    ]

    # Word count estimate
    full_text = report_data.get("summary", "") + " ".join(
        s["content"] for s in report_data.get("sections", [])
    )
    word_count = len(full_text.split())

    report = ResearchReport(
        query=query,
        summary=report_data.get("summary", ""),
        sections=sections,
        citations=citations,
        confidence_score=report_data.get("confidence_score", 0.8),
        total_sources=len(results),
        word_count=word_count,
    )

    duration = int((time.time() - start) * 1000)

    step = AgentStep(
        agent="synthesizer",
        status=AgentStatus.SYNTHESIZING,
        thought=thought,
        action=f"Wrote {len(sections)} sections, {word_count} words, {len(citations)} citations",
        result=report.summary[:200] + "...",
        sources=[c.url for c in citations[:3]],
        duration_ms=duration,
    )

    return step, report
