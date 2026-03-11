import React from 'react'
import { AgentStep } from '../../lib/api'
import { Phase } from '../../hooks/useResearch'

const AGENT_META: Record<string, { icon: string; color: string; label: string }> = {
  planner:     { icon: '🧠', color: '#60a5fa', label: 'Planner' },
  searcher:    { icon: '🔍', color: '#34d399', label: 'Searcher' },
  analyzer:    { icon: '🔬', color: '#f59e0b', label: 'Analyzer' },
  reflector:   { icon: '🪞', color: '#a78bfa', label: 'Reflector' },
  synthesizer: { icon: '✍️', color: '#f472b6', label: 'Synthesizer' },
}

const PHASE_ORDER: Phase[] = ['planning', 'searching', 'analyzing', 'reflecting', 'synthesizing', 'complete']

interface Props {
  steps: AgentStep[]
  phase: Phase
  statusMessage: string
}

export default function AgentTrace({ steps, phase, statusMessage }: Props) {
  const phaseIdx = PHASE_ORDER.indexOf(phase)

  return (
    <div style={styles.container}>
      {/* Pipeline progress bar */}
      <div style={styles.pipeline}>
        {PHASE_ORDER.slice(0, -1).map((p, i) => {
          const done = phaseIdx > i
          const active = phaseIdx === i
          const meta = AGENT_META[p === 'planning' ? 'planner' : p === 'searching' ? 'searcher' : p === 'analyzing' ? 'analyzer' : p === 'reflecting' ? 'reflector' : 'synthesizer']
          return (
            <React.Fragment key={p}>
              <div style={{
                ...styles.pipelineNode,
                border: `2px solid ${done || active ? meta.color : '#2a3a4e'}`,
                background: done ? meta.color + '22' : active ? meta.color + '11' : 'transparent',
                boxShadow: active ? `0 0 12px ${meta.color}55` : 'none',
              }}>
                <span style={{ fontSize: 16 }}>{meta.icon}</span>
                <span style={{ ...styles.pipelineLabel, color: done || active ? meta.color : '#4a6a88' }}>
                  {meta.label}
                </span>
                {active && <div style={{ ...styles.pulseDot, background: meta.color }} />}
              </div>
              {i < PHASE_ORDER.length - 2 && (
                <div style={{
                  ...styles.connector,
                  background: done ? meta.color + '66' : '#1e2d3e',
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Status message */}
      {statusMessage && phase !== 'complete' && phase !== 'idle' && (
        <div style={styles.statusBar}>
          <div style={styles.statusDot} />
          <span style={styles.statusText}>{statusMessage}</span>
        </div>
      )}

      {/* Steps list */}
      <div style={styles.steps}>
        {steps.map((step, idx) => {
          const meta = AGENT_META[step.agent] ?? AGENT_META.planner
          return (
            <div
              key={step.id || idx}
              style={{
                ...styles.step,
                borderLeft: `3px solid ${meta.color}`,
                animationDelay: `${idx * 0.05}s`,
              }}
              className="step-appear"
            >
              <div style={styles.stepHeader}>
                <span style={{ ...styles.agentBadge, color: meta.color, border: `1px solid ${meta.color}44` }}>
                  {meta.icon} {meta.label}
                </span>
                {step.duration_ms && (
                  <span style={styles.duration}>{step.duration_ms}ms</span>
                )}
              </div>

              {step.thought && (
                <div style={styles.thought}>
                  <span style={styles.thoughtLabel}>THOUGHT</span>
                  <p style={styles.thoughtText}>{step.thought}</p>
                </div>
              )}

              {step.action && (
                <div style={styles.action}>
                  <span style={styles.actionLabel}>ACTION</span>
                  <p style={styles.actionText}>{step.action}</p>
                </div>
              )}

              {step.result && (
                <div style={styles.result}>
                  <span style={styles.resultLabel}>RESULT</span>
                  <p style={styles.resultText}>{step.result}</p>
                </div>
              )}

              {step.sources && step.sources.length > 0 && (
                <div style={styles.sources}>
                  {step.sources.slice(0, 3).map((s, i) => (
                    <a key={i} href={s} target="_blank" rel="noreferrer" style={styles.sourceChip}>
                      {new URL(s).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Live thinking indicator */}
        {phase !== 'idle' && phase !== 'complete' && phase !== 'error' && (
          <div style={styles.thinkingRow}>
            <div style={styles.thinkingDots}>
              <div style={{ ...styles.dot, animationDelay: '0s' }} />
              <div style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <div style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
            <span style={styles.thinkingText}>Agent working...</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    height: '100%',
  },
  pipeline: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    padding: '12px 16px',
    background: '#080e18',
    borderRadius: 12,
    border: '1px solid #1a2a3a',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  pipelineNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 10px',
    borderRadius: 8,
    minWidth: 64,
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  pipelineLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  pulseDot: {
    position: 'absolute',
    top: -3, right: -3,
    width: 8, height: 8,
    borderRadius: '50%',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  connector: {
    height: 2,
    width: 20,
    borderRadius: 1,
    transition: 'background 0.4s ease',
    flexShrink: 0,
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#0a1520',
    borderRadius: 8,
    border: '1px solid #1a2d40',
  },
  statusDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: '#00e5ff',
    animation: 'pulse 1s ease-in-out infinite',
    flexShrink: 0,
  },
  statusText: {
    fontSize: 13,
    color: '#7ac0e0',
    fontFamily: 'monospace',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    flex: 1,
    paddingRight: 4,
  },
  step: {
    padding: '12px 14px',
    background: '#0a141e',
    borderRadius: '0 8px 8px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    animation: 'slideIn 0.3s ease forwards',
    opacity: 0,
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentBadge: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '2px 8px',
    borderRadius: 100,
    letterSpacing: '0.05em',
  },
  duration: {
    fontSize: 10,
    color: '#3a5a72',
    fontFamily: 'monospace',
  },
  thought: { display: 'flex', flexDirection: 'column', gap: 3 },
  thoughtLabel: { fontSize: 9, fontFamily: 'monospace', color: '#3a5a72', letterSpacing: '0.15em' },
  thoughtText: { fontSize: 12, color: '#5a8aaa', lineHeight: 1.5, margin: 0 },
  action: { display: 'flex', flexDirection: 'column', gap: 3 },
  actionLabel: { fontSize: 9, fontFamily: 'monospace', color: '#3a6a4a', letterSpacing: '0.15em' },
  actionText: { fontSize: 12, color: '#4ab070', lineHeight: 1.5, margin: 0, fontFamily: 'monospace' },
  result: { display: 'flex', flexDirection: 'column', gap: 3 },
  resultLabel: { fontSize: 9, fontFamily: 'monospace', color: '#5a4a3a', letterSpacing: '0.15em' },
  resultText: { fontSize: 12, color: '#c0a060', lineHeight: 1.5, margin: 0 },
  sources: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  sourceChip: {
    fontSize: 10,
    color: '#4a8aaa',
    background: '#0a1e2e',
    border: '1px solid #1a3a50',
    borderRadius: 4,
    padding: '2px 7px',
    textDecoration: 'none',
    fontFamily: 'monospace',
  },
  thinkingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    opacity: 0.6,
  },
  thinkingDots: { display: 'flex', gap: 4, alignItems: 'center' },
  dot: {
    width: 6, height: 6,
    borderRadius: '50%',
    background: '#2a6080',
    animation: 'bounce 0.8s ease-in-out infinite',
  },
  thinkingText: { fontSize: 11, color: '#3a6080', fontFamily: 'monospace' },
}
