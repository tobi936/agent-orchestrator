import { useEffect, useState } from 'react'
import { authApi, dockerApi } from '../lib/api'
import type { Agent } from '@shared/types'

interface Props {
  docker: { reachable: boolean; imageReady: boolean } | null
  agents: Agent[]
  runningCount: number
}

export function StatusBar({ docker, agents, runningCount }: Props) {
  const [authOk, setAuthOk] = useState<boolean | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const a = await authApi.status()
        if (!cancelled) setAuthOk(a)
      } catch { /* ignore */ }
    }
    void tick()
    const id = setInterval(tick, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dockerOk = docker?.reachable ?? false
  const imageOk = docker?.imageReady ?? false

  return (
    <div className="statusbar">
      <div className={`statusbar-item${authOk ? ' ok' : authOk === false ? ' err' : ''}`}>
        <span className={`status-dot ${authOk ? 'running' : authOk === false ? 'error' : 'stopped'}`} />
        <span className="label">claude</span>
        <span className="value">{authOk === null ? '…' : authOk ? 'authenticated' : 'missing'}</span>
      </div>

      <div className={`statusbar-item${dockerOk ? ' ok' : ' err'}`}>
        <span className={`status-dot ${dockerOk ? 'running' : 'error'}`} />
        <span className="label">docker</span>
        <span className="value">{dockerOk ? 'online' : 'offline'}</span>
      </div>

      <div className={`statusbar-item${imageOk ? ' ok' : ' err'}`}>
        <span className="label">image</span>
        <span className="value">{imageOk ? 'ready' : 'missing'}</span>
      </div>

      <div className="statusbar-item">
        <span className="label">agents</span>
        <span className="value">{runningCount}/{agents.length} running</span>
      </div>

      <div className="statusbar-item right">
        <span className="label">build</span>
        <span className="value">v0.8</span>
      </div>

      <div className="statusbar-item">
        <span className="value">{now.toLocaleTimeString('en-GB')}</span>
      </div>
    </div>
  )
}
