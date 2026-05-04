import { useEffect, useState } from 'react'
import { apiFetch, clearToken } from '../lib/http'

interface CredStatus {
  hasCredentials: boolean
  exportedAt?: string
}

interface Props {
  email: string | null
  onClose: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days === 1 ? '' : 'en'}`
}

export function SettingsModal({ email, onClose }: Props) {
  const [credStatus, setCredStatus] = useState<CredStatus | null>(null)

  useEffect(() => {
    apiFetch('/api/auth/credentials/status')
      .then((r) => r.json() as Promise<CredStatus>)
      .then(setCredStatus)
      .catch(() => setCredStatus({ hasCredentials: false }))
  }, [])

  function handleLogout() {
    clearToken()
    window.location.reload()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[360px] bg-term-panel border border-term-border font-mono text-xs">
        <div className="flex items-center justify-between px-4 py-2 border-b border-term-border">
          <span className="text-[10px] uppercase tracking-widest text-term-text">EINSTELLUNGEN</span>
          <button onClick={onClose} className="text-term-muted hover:text-term-text transition-colors text-sm">✕</button>
        </div>

        <div className="p-4 space-y-5">
          <section className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-term-muted border-b border-term-border pb-1">ACCOUNT</p>
            <Row label="Email:" value={email ?? '–'} />
            <button
              onClick={handleLogout}
              className="w-full py-1.5 text-[11px] uppercase tracking-wider border border-term-err text-term-err hover:bg-term-err hover:text-black transition-colors"
            >
              Ausloggen
            </button>
          </section>

          <section className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-term-muted border-b border-term-border pb-1">CLAUDE AUTH</p>
            {credStatus === null ? (
              <p className="text-term-muted text-[10px]">…</p>
            ) : credStatus.hasCredentials ? (
              <>
                <Row label="Status:" value="✓ VORHANDEN" valueClass="text-term-ok" />
                {credStatus.exportedAt && (
                  <Row label="Synchronisiert:" value={timeAgo(credStatus.exportedAt)} />
                )}
              </>
            ) : (
              <Row label="Status:" value="✗ FEHLEND" valueClass="text-red-400" />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-term-text' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="w-28 text-term-muted shrink-0">{label}</span>
      <span className={`flex-1 break-all ${valueClass}`}>{value}</span>
    </div>
  )
}
