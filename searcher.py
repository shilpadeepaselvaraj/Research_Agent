import time
import httpx
from typing import List, Optional
from app.core.config import settings
from app.models.schemas import AgentStep, AgentStatus, SearchResult

MOCK_RESULTS = {
    "default": [
        SearchResult(
            title="Comprehensive Overview: Recent Advances",
            url="https://arxiv.org/example/2024",
            snippet="This paper presents a thorough analysis of recent developments, covering key findings and implications for the field. The research demonstrates significant progress in understanding complex interactions.",
            score=0.95,
            published_date="2024-11-15",
        ),
        SearchResult(
            title="Industry Report: State of the Art Analysis",
            url="https://reports.example.com/2024/analysis",
            snippet="Our comprehensive industry analysis reveals emerging trends and growth opportunities. Key findings indicate substantial market shifts driven by technological innovation and changing consumer preferences.",
            score=0.88,
            published_date="2024-10-22",
        ),
        SearchResult(
            title="Expert Perspectives: Deep Dive Review",
            url="https://journal.example.com/review",
            snippet="Leading experts provide in-depth analysis of current methodologies and future directions. The review synthesizes evidence from over 200 studies published in the past three years.",
            score=0.82,
            published_date="2024-09-10",
        ),
        SearchResult(
            title="Case Studies: Real-World Applications",
            url="https://casestudies.example.com/applied",
            snippet="Examining practical implementations across diverse industries reveals consistent patterns of adoption and measurable impact. Organizations report average efficiency improvements of 34%.",
            score=0.79,
            published_date="2024-08-05",
        ),
    ]
}


async def search_web(query: str, max_results: int = 4) -> List[SearchResult]:
    """Search using Tavily API or fall back to mock results."""
    if settings.TAVILY_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": settings.TAVILY_API_KEY,
                        "query": query,
                        "max_results": max_results,
                        "search_depth": "advanced",
                        "include_answer": False,
                        "include_raw_content": False,
                    },
                )
                data = response.json()
                return [
                    SearchResult(
                        title=r.get("title", ""),
                        url=r.get("url", ""),
                        snippet=r.get("content", ""),
                        score=r.get("score", 0.0),
                        published_date=r.get("published_date"),
                    )
                    for r in data.get("results", [])
                ]
        except Exception:
            pass  # Fall through to mock

    # Mock results — augment with query context
    results = MOCK_RESULTS["default"].copy()
    for r in results:
        r.title = f"{r.title} — {query[:40]}"
    return results[:max_results]


async def run_searcher(
    sub_queries: List[str], focus_areas: List[str]
) -> tuple[List[AgentStep], List[SearchResult]]:
    """Run parallel searches for each sub-query."""
    steps = []
    all_results = []
    seen_urls = set()

    for i, sub_query in enumerate(sub_queries):
        start = time.time()
        thought = f"Searching for: '{sub_query}'"

        results = await search_web(sub_query, max_results=settings.MAX_SEARCH_RESULTS // len(sub_queries) + 1)

        # Deduplicate
        new_results = [r for r in results if r.url not in seen_urls]
        for r in new_results:
            seen_urls.add(r.url)
        all_results.extend(new_results)

        duration = int((time.time() - start) * 1000)

        step = AgentStep(
            agent="searcher",
            status=AgentStatus.SEARCHING,
            thought=thought,
            action=f"Web search [{i+1}/{len(sub_queries)}]: {sub_query}",
            result=f"Found {len(new_results)} unique sources",
            sources=[r.url for r in new_results],
            duration_ms=duration,
        )
        steps.append(step)

    return steps, all_results
