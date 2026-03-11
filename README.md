# 🔬 Autonomous Research & Report Agent

A production-grade multi-agent research pipeline powered by **Anthropic Claude**. Enter any research question and watch 5 specialized AI agents collaborate — planning, searching, analyzing, reflecting, and synthesizing — to produce a comprehensive cited research report in real time.

---

## ✨ Features

- **Multi-agent ReAct pipeline** with 5 specialized agents (Planner → Searcher → Analyzer → Reflector → Synthesizer)
- **Live agent trace visualization** — watch every thought, action, and result stream in real time via SSE
- **Self-correcting loop** — the Reflector agent critiques the analysis and can trigger additional search passes
- **Parallel sub-agent fan-out** — searches run concurrently across multiple sub-queries
- **Structured, cited reports** — inline citations, confidence scores, word counts
- **Graceful fallback** — works in mock mode without Tavily API key

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)               │
│  QueryInput → AgentTrace (SSE) → ReportViewer          │
└───────────────────────┬────────────────────────────────┘
                        │ HTTP + SSE
┌───────────────────────▼────────────────────────────────┐
│                  FastAPI Backend                        │
│                                                        │
│   POST /api/v1/research        → create job            │
│   GET  /api/v1/research/{id}/stream → SSE events       │
│   GET  /api/v1/research/{id}   → job status/result     │
└───────────────────────┬────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────┐
│              Orchestrator (services/orchestrator.py)    │
│                                                        │
│  1. PlannerAgent   → Claude: decompose query           │
│  2. SearcherAgent  → Tavily API (parallel sub-queries) │
│  3. AnalyzerAgent  → Claude: extract facts + themes    │
│  4. ReflectorAgent → Claude: self-critique + QA        │
│  5. SynthesizerAgent → Claude: write cited report      │
└────────────────────────────────────────────────────────┘
```

### Agent Roles

| Agent | Model | Purpose | Output |
|-------|-------|---------|--------|
| **Planner** | Claude | Decompose query into sub-questions | Research plan (JSON) |
| **Searcher** | Tavily API | Parallel web searches | SearchResult list |
| **Analyzer** | Claude | Extract facts, themes, contradictions | Analysis (JSON) |
| **Reflector** | Claude | Self-critique, quality check | Reflection + follow-up queries |
| **Synthesizer** | Claude | Write structured cited report | ResearchReport (JSON) |

### Agentic Patterns Demonstrated

- **ReAct (Reason + Act)** — each agent reasons before acting
- **Reflection loop** — Reflector can trigger a second search pass
- **Parallel tool use** — searcher fans out sub-queries concurrently
- **Structured output** — all agents produce typed JSON responses
- **Streaming** — SSE pipeline for real-time trace visibility

---

## 📁 Project Structure

```
research-agent/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── planner.py       # Query decomposition
│   │   │   ├── searcher.py      # Web search (Tavily + mock)
│   │   │   ├── analyzer.py      # Insight extraction
│   │   │   ├── reflector.py     # Self-critique + QA
│   │   │   └── synthesizer.py   # Report generation
│   │   ├── api/
│   │   │   └── routes.py        # FastAPI endpoints
│   │   ├── core/
│   │   │   └── config.py        # Settings (pydantic-settings)
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic data models
│   │   ├── services/
│   │   │   └── orchestrator.py  # Agent pipeline + SSE streaming
│   │   └── main.py              # FastAPI app entry
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── agent/
│   │   │       ├── AgentTrace.tsx   # Live step visualization
│   │   │       └── ReportViewer.tsx # Report renderer
│   │   ├── hooks/
│   │   │   └── useResearch.ts   # State machine + SSE handling
│   │   ├── lib/
│   │   │   └── api.ts           # API client
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── docs/
    ├── README.md              ← You are here
    ├── ARCHITECTURE.md
    └── DEPLOYMENT.md
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com))
- Tavily API key (optional — [get one here](https://tavily.com))

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

npm install
npm run dev
# → http://localhost:3000
```

### 3. Open the App

Navigate to **http://localhost:3000**, type a research question, and hit **Research**.

---

## 🔌 API Reference

### Start a Research Job

```http
POST /api/v1/research
Content-Type: application/json

{
  "query": "What are the latest advances in quantum computing?",
  "depth": "standard"  // "quick" | "standard" | "deep"
}
```

Response:
```json
{ "job_id": "abc123", "status": "created" }
```

### Stream Agent Events (SSE)

```http
GET /api/v1/research/{job_id}/stream?query=...&depth=standard
Accept: text/event-stream
```

Event types:
| Event | Description |
|-------|-------------|
| `status` | Phase change (planning → searching → ...) |
| `step` | Individual agent step with thought/action/result |
| `search_results` | Array of discovered sources |
| `complete` | Final report JSON |
| `error` | Error message |

### Get Job Result

```http
GET /api/v1/research/{job_id}
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## 🐳 Docker

```bash
# Build and run both services
docker compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## 🔧 Configuration

| Env Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | required | Claude API key |
| `TAVILY_API_KEY` | optional | Web search (mock if absent) |
| `CLAUDE_MODEL` | `claude-sonnet-4-20250514` | Claude model |
| `MAX_SEARCH_RESULTS` | `8` | Total search results per job |
| `MAX_TOKENS` | `4096` | Max tokens per synthesis |
| `PARALLEL_AGENTS` | `3` | Concurrent search agents |

---

## 🗺 Roadmap

- [ ] Redis-backed job persistence
- [ ] PDF export of reports
- [ ] Citation verification agent
- [ ] User accounts + report history
- [ ] Slack/email delivery of completed reports
- [ ] LangSmith tracing integration
- [ ] Custom agent persona configurations

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit changes: `git commit -m 'feat: add X'`
4. Push and open a PR

---

## 📄 License

MIT

---

*Built with Claude (Anthropic), FastAPI, React, and Tavily.*
