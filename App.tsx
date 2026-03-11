import { useState, useRef, useEffect } from 'react'
import { useResearch } from './hooks/useResearch'
import AgentTrace from './components/agent/AgentTrace'
import ReportViewer from './components/agent/ReportViewer'

const EXAMPLE_QUERIES = [
  'What are the latest breakthroughs in large language model reasoning capabilities?',
  'How is AI transforming drug discovery and clinical trials in 2024?',
  'What are the economic implications of autonomous vehicles on urban employment?',
  'Compare the approaches of leading AI safety research organizations',
]

export default function App() {
  const [query, setQuery] = useState('')
  const { state, run, reset } = useResearch()
  const traceRef = useRef<HTMLDivElement>(null)

  // Auto-scroll trace
  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight
    }
  }, [state.steps.length])

  const handleSubmit = () => {
    if (query.trim().length < 10) return
    run(query.trim())
  }

  const isRunning = !['idle', 'complete', 'error'].includes(state.phase)

  return (
    <div style={styles.root}>
      {/* Noise overlay */}
      <div style={styles.noise} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>◈</span>
          <span style={styles.logoText}>ResearchAgent</span>
          <span style={styles.logoBadge}>v1.0 · Claude-powered</span>
        </div>
        <div style={styles.headerRight}>
          {state.totalDurationMs > 0 && (
            <span style={styles.stat}>⏱ {(state.totalDurationMs / 1000).toFixed(1)}s</span>
          )}
          {state.steps.length > 0 && (
            <span style={styles.stat}>🔄 {state.steps.length} steps</span>
          )}
          {state.phase !== 'idle' && (
            <button onClick={reset} style={styles.resetBtn}>New Research</button>
          )}
        </div>
      </header>

      {/* Search bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>⌕</span>
          <input
            style={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isRunning && handleSubmit()}
            placeholder="Enter a research question..."
            disabled={isRunning}
          />
          <button
            onClick={handleSubmit}
            disabled={isRunning || query.trim().length < 10}
            style={{
              ...styles.runBtn,
              opacity: isRunning || query.trim().length < 10 ? 0.4 : 1,
              cursor: isRunning || query.trim().length < 10 ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? (
              <span style={styles.spinner}>⟳</span>
            ) : '→ Research'}
          </button>
        </div>

        {/* Example queries */}
        {state.phase === 'idle' && (
          <div style={styles.examples}>
            <span style={styles.examplesLabel}>Try:</span>
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                style={styles.exampleBtn}
                onClick={() => setQuery(q)}
              >
                {q.length > 60 ? q.slice(0, 58) + '…' : q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      {state.phase === 'idle' ? (
        <div style={styles.heroSection}>
          <div style={styles.heroGrid}>
            {['🧠 Plan', '🔍 Search', '🔬 Analyze', '🪞 Reflect', '✍️ Synthesize'].map((step, i) => (
              <div key={i} style={styles.heroCard}>
                <span style={styles.heroCardText}>{step}</span>
              </div>
            ))}
          </div>
          <p style={styles.heroDesc}>
            A multi-agent ReAct pipeline that autonomously researches any topic —<br />
            planning, searching, analyzing, reflecting, and synthesizing a cited report.
          </p>
        </div>
      ) : (
        <div style={styles.workspace}>
          {/* Left: Agent Trace */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>AGENT TRACE</span>
              <span style={styles.panelBadge}>{state.steps.length} steps</span>
            </div>
            <div ref={traceRef} style={styles.panelBody}>
              <AgentTrace
                steps={state.steps}
                phase={state.phase}
                statusMessage={state.statusMessage}
              />
            </div>
          </div>

          {/* Right: Report / Sources */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>
                {state.report ? 'RESEARCH REPORT' : 'SOURCES'}
              </span>
              {state.searchResults.length > 0 && !state.report && (
                <span style={styles.panelBadge}>{state.searchResults.length} found</span>
              )}
            </div>
            <div style={styles.panelBody}>
              {state.report ? (
                <ReportViewer report={state.report} />
              ) : state.searchResults.length > 0 ? (
                <div style={styles.sourcesList}>
                  {state.searchResults.map((r, i) => (
                    <div key={i} style={styles.sourceCard}>
                      <div style={styles.sourceHeader}>
                        <a href={r.url} target="_blank" rel="noreferrer" style={styles.sourceTitle}>
                          {r.title}
                        </a>
                        <span style={styles.sourceScore}>{Math.round(r.score * 100)}%</span>
                      </div>
                      <p style={styles.sourceSnippet}>{r.snippet.slice(0, 160)}…</p>
                      <span style={styles.sourceUrl}>{new URL(r.url).hostname}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.waitingPanel}>
                  <div style={styles.waitingIcon}>◈</div>
                  <p style={styles.waitingText}>Sources will appear as the agent searches...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && state.error && (
        <div style={styles.errorBar}>
          ⚠ {state.error}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#050d15',
    color: '#c8dff0',
    fontFamily: "'Syne', 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  noise: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid #0f2030',
    background: '#050d15ee',
    backdropFilter: 'blur(10px)',
    position: 'sticky', top: 0,
    zIndex: 10,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { fontSize: 22, color: '#00d4ff' },
  logoText: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#c8e8f8' },
  logoBadge: {
    fontSize: 10, fontFamily: 'monospace', color: '#2a6080',
    border: '1px solid #1a3a50', padding: '2px 8px', borderRadius: 100, marginLeft: 4,
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  stat: { fontSize: 12, fontFamily: 'monospace', color: '#3a7090' },
  resetBtn: {
    fontSize: 12, fontFamily: 'monospace',
    padding: '6px 14px', borderRadius: 6,
    background: 'transparent', border: '1px solid #1a3a50',
    color: '#4a9ab8', cursor: 'pointer',
  },
  searchSection: {
    padding: '24px 32px 16px',
    position: 'relative', zIndex: 1,
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: '#0a1520',
    border: '1px solid #1e3a50',
    borderRadius: 12,
    padding: '4px 4px 4px 16px',
    maxWidth: 900,
    boxShadow: '0 0 40px rgba(0,180,255,0.04)',
  },
  searchIcon: { fontSize: 20, color: '#2a6080', marginRight: 4, flexShrink: 0 },
  input: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#c0d8f0', fontSize: 15,
    fontFamily: "'Syne', sans-serif",
    padding: '10px 0',
  },
  runBtn: {
    padding: '10px 20px', borderRadius: 8,
    background: 'linear-gradient(135deg, #006080, #003050)',
    border: '1px solid #0090c0',
    color: '#80d8ff', fontSize: 13, fontWeight: 600,
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '0.02em',
    transition: 'all 0.2s',
  },
  spinner: { display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 16 },
  examples: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    marginTop: 12, alignItems: 'center',
  },
  examplesLabel: { fontSize: 11, color: '#2a5070', fontFamily: 'monospace', marginRight: 4 },
  exampleBtn: {
    fontSize: 11, padding: '4px 12px',
    background: 'transparent', border: '1px solid #1a3040',
    color: '#3a7090', cursor: 'pointer', borderRadius: 6,
    fontFamily: "'Syne', sans-serif",
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  heroSection: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 32px', gap: 32,
  },
  heroGrid: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroCard: {
    padding: '16px 24px',
    background: '#0a1520',
    border: '1px solid #1a2d40',
    borderRadius: 10,
    minWidth: 100, textAlign: 'center',
  },
  heroCardText: { fontSize: 15, color: '#4a8aaa', fontFamily: 'monospace' },
  heroDesc: {
    fontSize: 15, color: '#2a5070', lineHeight: 1.8,
    textAlign: 'center', maxWidth: 600,
  },
  workspace: {
    flex: 1, display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
    borderTop: '1px solid #0f2030',
    overflow: 'hidden',
    minHeight: 0,
    height: 'calc(100vh - 180px)',
  },
  panel: {
    display: 'flex', flexDirection: 'column',
    borderRight: '1px solid #0f2030',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '1px solid #0f2030',
    background: '#060e18',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: 10, fontFamily: 'monospace',
    letterSpacing: '0.2em', color: '#2a5070',
  },
  panelBadge: {
    fontSize: 10, fontFamily: 'monospace',
    color: '#1a5070', background: '#0a1a28',
    padding: '2px 8px', borderRadius: 100,
    border: '1px solid #1a3040',
  },
  panelBody: {
    flex: 1, overflowY: 'auto', padding: 20,
    display: 'flex', flexDirection: 'column',
  },
  sourcesList: { display: 'flex', flexDirection: 'column', gap: 12 },
  sourceCard: {
    padding: '12px 16px',
    background: '#0a1520',
    borderRadius: 8,
    border: '1px solid #1a2d40',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  sourceHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  sourceTitle: { fontSize: 13, color: '#70b0d0', textDecoration: 'none', fontWeight: 500, lineHeight: 1.4 },
  sourceScore: {
    fontSize: 10, fontFamily: 'monospace', color: '#34d399',
    border: '1px solid #34d39944', padding: '1px 6px', borderRadius: 100,
    flexShrink: 0,
  },
  sourceSnippet: { fontSize: 12, color: '#3a6080', lineHeight: 1.6, margin: 0 },
  sourceUrl: { fontSize: 10, color: '#1a4060', fontFamily: 'monospace' },
  waitingPanel: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 12, opacity: 0.4,
  },
  waitingIcon: { fontSize: 32, color: '#1a4060' },
  waitingText: { fontSize: 13, color: '#2a5070', fontFamily: 'monospace', textAlign: 'center' },
  errorBar: {
    position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    background: '#200a0a', border: '1px solid #601010',
    color: '#f87171', padding: '10px 24px', borderRadius: 8,
    fontSize: 13, fontFamily: 'monospace', zIndex: 100,
  },
}
