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
      const [list, status] = await Promise.all([agentsApi.list(), dockerApi.status()])
      if (!mounted) return
      setAgents(list)
      setDocker(status)
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const off = events.onMessageDelivered(() => {
      void refresh()
    })
    return () => {
      off()
    }
  }, [refresh])

  return { agents, loading, docker, refresh, setAgents }
}
