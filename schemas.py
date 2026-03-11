from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum
import uuid


class AgentStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    SEARCHING = "searching"
    ANALYZING = "analyzing"
    REFLECTING = "reflecting"
    SYNTHESIZING = "synthesizing"
    COMPLETE = "complete"
    ERROR = "error"


class AgentStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    agent: str  # "planner", "searcher", "analyzer", "reflector", "synthesizer"
    status: AgentStatus
    thought: Optional[str] = None
    action: Optional[str] = None
    result: Optional[str] = None
    sources: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration_ms: Optional[int] = None


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    score: float = 0.0
    published_date: Optional[str] = None


class Citation(BaseModel):
    id: int
    title: str
    url: str
    excerpt: str


class ResearchSection(BaseModel):
    heading: str
    content: str
    citations: List[int] = []


class ResearchReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    summary: str
    sections: List[ResearchSection]
    citations: List[Citation]
    confidence_score: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_sources: int
    word_count: int


class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=10, max_length=500)
    depth: Literal["quick", "standard", "deep"] = "standard"
    focus_areas: Optional[List[str]] = None


class ResearchJob(BaseModel):
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    status: AgentStatus = AgentStatus.IDLE
    steps: List[AgentStep] = []
    report: Optional[ResearchReport] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class StreamEvent(BaseModel):
    event: str  # "step", "progress", "complete", "error"
    data: dict
