import { useEffect, useRef } from 'react'
import { events } from '../lib/api'
import type { LogLine } from '@shared/types'

type Listener = (line: LogLine) => void

const listeners = new Map<string, Set<Listener>>()
let unsubscribe: (() => void) | null = null

function ensureGlobalListener() {
  if (unsubscribe) return
  unsubscribe = events.onLog((line) => {
    const set = listeners.get(line.agentId)
    if (!set) return
    for (const cb of set) cb(line)
  })
}

export function useAgentLogs(agentId: string | null, onLine: Listener): void {
  const cbRef = useRef(onLine)
  cbRef.current = onLine

  useEffect(() => {
    if (!agentId) return
    ensureGlobalListener()
    const handler: Listener = (line) => cbRef.current(line)
    let set = listeners.get(agentId)
    if (!set) {
      set = new Set()
      listeners.set(agentId, set)
    }
    set.add(handler)
    return () => {
      set?.delete(handler)
      if (set && set.size === 0) listeners.delete(agentId)
    }
  }, [agentId])
}
