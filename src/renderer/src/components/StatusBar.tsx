import { useEffect, useState } from 'react'
import { authApi, dockerApi } from '../lib/api'

export function StatusBar() {
  const [docker, setDocker] = useState<{ reachable: boolean; imageReady: boolean } | null>(null)
  const [authOk, setAuthOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const [d, a] = await Promise.all([dockerApi.status(), authApi.status()])
      if (!cancelled) {
        setDocker(d)
        setAuthOk(a)
      }
    }
    void tick()
    const id = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const dockerOk = docker?.reachable
  const imageOk = docker?.imageReady

  return (
    <div className="flex items-center gap-4 px-3 py-1 text-[10px] font-mono text-term-muted border-t border-term-border bg-term-panel flex-shrink-0">
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${authOk ? 'bg-term-ok' : 'bg-term-err'}`} />
        <span className="uppercase tracking-wider">CLAUDE AUTH:</span>
        <span className={authOk ? 'text-term-ok' : 'text-term-err'}>
          {authOk === null ? '…' : authOk ? 'OK' : 'MISSING'}
        </span>
        {authOk === false && (
          <span className="text-term-warn ml-1">— ~/.claude fehlt auf dem Server</span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${dockerOk ? 'bg-term-ok' : 'bg-term-err'}`} />
        <span className="uppercase tracking-wider">DOCKER:</span>
        <span className={dockerOk ? 'text-term-ok' : 'text-term-err'}>{dockerOk ? 'ONLINE' : 'OFFLINE'}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${imageOk ? 'bg-term-ok' : 'bg-term-warn'}`} />
        <span className="uppercase tracking-wider">IMAGE:</span>
        <span className={imageOk ? 'text-term-ok' : 'text-term-warn'}>{imageOk ? 'READY' : 'MISSING'}</span>
      </span>
      <span className="ml-auto opacity-40 uppercase tracking-widest">AGENT-ORCHESTRATOR v1.0</span>
    </div>
  )
}
