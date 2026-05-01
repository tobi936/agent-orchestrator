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
    <div className="flex items-center gap-4 px-3 py-1 text-[10px] font-mono text-term-muted border-t border-term-border bg-term-panel flex-shrink-0">
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${
            dockerOk ? 'bg-term-ok' : 'bg-term-err'
          }`}
        />
        <span className="uppercase tracking-wider">DOCKER:</span>
        <span className={dockerOk ? 'text-term-ok' : 'text-term-err'}>{dockerOk ? 'ONLINE' : 'OFFLINE'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${
            imageOk ? 'bg-term-ok' : 'bg-term-warn'
          }`}
        />
        <span className="uppercase tracking-wider">IMAGE:</span>
        <span className={imageOk ? 'text-term-ok' : 'text-term-warn'}>{imageOk ? 'READY' : 'MISSING'}</span>
      </span>
      <span className="ml-auto opacity-40 uppercase tracking-widest">AGENT-ORCHESTRATOR v1.0</span>
    </div>
  )
}
