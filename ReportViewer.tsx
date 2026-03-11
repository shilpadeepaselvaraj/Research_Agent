import React, { useState } from 'react'
import { ResearchReport } from '../../lib/api'

interface Props {
  report: ResearchReport
}

export default function ReportViewer({ report }: Props) {
  const [activeSection, setActiveSection] = useState(0)
  const [showCitations, setShowCitations] = useState(false)

  const confidence = Math.round(report.confidence_score * 100)
  const confColor = confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171'

  return (
    <div style={styles.container}>
      {/* Report header */}
      <div style={styles.header}>
        <div style={styles.meta}>
          <span style={styles.metaTag}>📄 Research Report</span>
          <span style={styles.metaTag}>📚 {report.total_sources} sources</span>
          <span style={styles.metaTag}>📝 {report.word_count.toLocaleString()} words</span>
          <span style={{ ...styles.metaTag, color: confColor, borderColor: confColor + '44' }}>
            ✓ {confidence}% confidence
          </span>
        </div>
        <h2 style={styles.title}>{report.query}</h2>
        <div style={styles.confidenceBar}>
          <div style={{ ...styles.confidenceFill, width: `${confidence}%`, background: confColor }} />
        </div>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.sectionLabel}>EXECUTIVE SUMMARY</div>
        <p style={styles.summaryText}>{report.summary}</p>
      </div>

      {/* Section tabs */}
      <div style={styles.tabs}>
        {report.sections.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveSection(i)}
            style={{
              ...styles.tab,
              background: activeSection === i ? '#0f2030' : 'transparent',
              color: activeSection === i ? '#60c8f0' : '#4a6a88',
              borderBottom: activeSection === i ? '2px solid #60c8f0' : '2px solid transparent',
            }}
          >
            {s.heading}
          </button>
        ))}
      </div>

      {/* Active section content */}
      {report.sections[activeSection] && (
        <div style={styles.sectionContent}>
          <h3 style={styles.sectionHeading}>{report.sections[activeSection].heading}</h3>
          <div style={styles.bodyText}>
            {report.sections[activeSection].content.split('\n\n').map((para, i) => (
              <p key={i} style={styles.paragraph}>
                {renderInlineCitations(para, report.citations)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Citations toggle */}
      <div style={styles.citationsSection}>
        <button
          onClick={() => setShowCitations(v => !v)}
          style={styles.citationsToggle}
        >
          {showCitations ? '▼' : '▶'} References ({report.citations.length})
        </button>
        {showCitations && (
          <div style={styles.citationsList}>
            {report.citations.map(c => (
              <div key={c.id} style={styles.citation}>
                <span style={styles.citationNum}>[{c.id}]</span>
                <div style={styles.citationBody}>
                  <a href={c.url} target="_blank" rel="noreferrer" style={styles.citationTitle}>
                    {c.title}
                  </a>
                  <p style={styles.citationExcerpt}>{c.excerpt}</p>
                  <span style={styles.citationUrl}>{c.url}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function renderInlineCitations(text: string, citations: ResearchReport['citations']): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/\[(\d+)\]/)
    if (match) {
      const id = parseInt(match[1])
      const cit = citations.find(c => c.id === id)
      return (
        <a
          key={i}
          href={cit?.url || '#'}
          target="_blank"
          rel="noreferrer"
          title={cit?.title || ''}
          style={styles.inlineCite}
        >
          [{id}]
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    height: '100%',
    overflowY: 'auto',
  },
  header: {
    padding: '20px 24px',
    background: '#060f18',
    borderRadius: 12,
    border: '1px solid #1a2d40',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaTag: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4a8aaa',
    border: '1px solid #1a3a50',
    padding: '3px 10px',
    borderRadius: 100,
    background: '#0a1a28',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#d4e8f8',
    margin: '0 0 12px',
    lineHeight: 1.3,
    letterSpacing: '-0.02em',
  },
  confidenceBar: {
    height: 3,
    background: '#1a2d40',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 1s ease',
  },
  summary: {
    padding: '16px 20px',
    background: '#0a1520',
    borderRadius: 10,
    border: '1px solid #1a2d40',
    borderLeft: '3px solid #60c8f0',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    letterSpacing: '0.2em',
    color: '#3a6080',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#8ab8d4',
    lineHeight: 1.75,
    margin: 0,
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0,
    borderBottom: '1px solid #1a2d40',
    overflowX: 'auto',
  },
  tab: {
    padding: '8px 14px',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
    background: 'transparent',
  },
  sectionContent: {
    flex: 1,
    padding: '20px 4px',
    minHeight: 200,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: 600,
    color: '#c0d8f0',
    marginBottom: 16,
    letterSpacing: '-0.01em',
  },
  bodyText: { display: 'flex', flexDirection: 'column', gap: 12 },
  paragraph: {
    fontSize: 14,
    color: '#7a9ab8',
    lineHeight: 1.8,
    margin: 0,
  },
  inlineCite: {
    color: '#60b8f0',
    fontSize: 11,
    verticalAlign: 'super',
    textDecoration: 'none',
    fontFamily: 'monospace',
    padding: '0 2px',
  },
  citationsSection: {
    borderTop: '1px solid #1a2d40',
    paddingTop: 16,
    marginTop: 8,
  },
  citationsToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#4a8aaa',
    fontSize: 12,
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
    padding: '4px 0',
  },
  citationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  citation: {
    display: 'flex',
    gap: 12,
    padding: '10px 14px',
    background: '#080e18',
    borderRadius: 8,
    border: '1px solid #1a2a38',
  },
  citationNum: {
    fontSize: 11,
    color: '#60a0c0',
    fontFamily: 'monospace',
    minWidth: 24,
    paddingTop: 2,
  },
  citationBody: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  citationTitle: {
    fontSize: 13,
    color: '#7ab8d8',
    textDecoration: 'none',
    fontWeight: 500,
  },
  citationExcerpt: {
    fontSize: 11,
    color: '#3a6080',
    margin: 0,
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  citationUrl: {
    fontSize: 10,
    color: '#2a4a60',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
