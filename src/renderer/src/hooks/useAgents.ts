import { useCallback, useEffect, useState } from 'react'
import { agentsApi, dockerApi, events } from '../lib/api'
import type { Agent } from '@shared/types'

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [docker, setDocker] = useState<{ reachable: boolean; imageReady: boolean } | null>(null)

  const refresh = useCallback(async () => {
    const list = await agentsApi.list()
    setAgents(list)
  }, [])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const [list, status] = await Promise.all([agentsApi.list(), dockerApi.status()])
        if (!mounted) return
        setAgents(list)
        setDocker(status)
      } catch {
        // IPC not ready yet or Docker unavailable — still unblock the UI
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const offMsg = events.onMessageDelivered(() => {
      void refresh()
    })
    const offStatus = events.onAgentStatus((updated) => {
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    })
    return () => {
      offMsg()
      offStatus()
    }
  }, [refresh])

  return { agents, loading, docker, refresh, setAgents }
}
