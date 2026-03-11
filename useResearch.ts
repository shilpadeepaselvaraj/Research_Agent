import { useState, useCallback, useRef } from 'react'
import {
  startResearch, streamResearch,
  AgentStep, SearchResult, ResearchReport, StreamEvent
} from '../lib/api'

export type Phase = 'idle' | 'planning' | 'searching' | 'analyzing' | 'reflecting' | 'synthesizing' | 'complete' | 'error'

export interface ResearchState {
  phase: Phase
  statusMessage: string
  steps: AgentStep[]
  searchResults: SearchResult[]
  report: ResearchReport | null
  error: string | null
  totalDurationMs: number
}

const INITIAL: ResearchState = {
  phase: 'idle',
  statusMessage: '',
  steps: [],
  searchResults: [],
  report: null,
  error: null,
  totalDurationMs: 0,
}

export function useResearch() {
  const [state, setState] = useState<ResearchState>(INITIAL)
  const cancelRef = useRef<(() => void) | null>(null)

  const handleEvent = useCallback((event: StreamEvent) => {
    setState(prev => {
      switch (event.event) {
        case 'status':
          return {
            ...prev,
            phase: (event.data.status as Phase) ?? prev.phase,
            statusMessage: (event.data.message as string) ?? '',
          }
        case 'step':
          return {
            ...prev,
            steps: [...prev.steps, event.data.step as AgentStep],
          }
        case 'search_results':
          return {
            ...prev,
            searchResults: (event.data.results as SearchResult[]) ?? [],
          }
        case 'complete':
          return {
            ...prev,
            phase: 'complete',
            report: event.data.report as ResearchReport,
            totalDurationMs: (event.data.duration_ms as number) ?? 0,
            statusMessage: '✅ Research complete',
          }
        case 'error':
          return {
            ...prev,
            phase: 'error',
            error: (event.data.message as string) ?? 'Unknown error',
          }
        default:
          return prev
      }
    })
  }, [])

  const run = useCallback(async (query: string) => {
    if (cancelRef.current) cancelRef.current()
    setState({ ...INITIAL, phase: 'planning', statusMessage: 'Starting research...' })

    try {
      const jobId = await startResearch(query)
      const cancel = streamResearch(jobId, query, handleEvent)
      cancelRef.current = cancel
    } catch (e) {
      setState(prev => ({ ...prev, phase: 'error', error: String(e) }))
    }
  }, [handleEvent])

  const reset = useCallback(() => {
    if (cancelRef.current) cancelRef.current()
    setState(INITIAL)
  }, [])

  return { state, run, reset }
}
