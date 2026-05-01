import { useEffect, useState } from 'react'
import { dockerApi } from '../lib/api'

export function StatusBar() {
  const [status, setStatus] = useState<{ reachable: boolean; imageReady: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const s = await dockerApi.status()
      if (!cancelled) setStatus(s)
    }
    void tick()
    const id = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const dockerOk = status?.reachable
  const imageOk = status?.imageReady

  return (
    <div className="flex items-center gap-4 px-3 py-1 text-xs text-term-muted border-t border-term-border bg-term-panel">
      <span className="flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            dockerOk ? 'bg-term-ok' : 'bg-term-err'
          }`}
        />
        docker {dockerOk ? 'connected' : 'unreachable'}
      </span>
      <span className="flex items-center gap-1">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            imageOk ? 'bg-term-ok' : 'bg-term-warn'
          }`}
        />
        agent image {imageOk ? 'ready' : 'missing — run `npm run build:agent-image`'}
      </span>
      <span className="ml-auto opacity-60">agent-orchestrator</span>
    </div>
  )
}
