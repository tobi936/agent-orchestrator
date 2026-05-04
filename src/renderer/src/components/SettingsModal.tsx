import { useEffect, useState } from 'react'
import { apiFetch, clearToken } from '../lib/http'
import { getServerUrl } from '../hooks/useAuth'

interface CredStatus {
  hasCredentials: boolean
  exportedAt?: string
}

interface Props {
  email: string | null
  onClose: () => void
}

const isElectron = typeof window !== 'undefined' && 'api' in window

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
  const [syncing, setSyncing] = useState(false)
  const serverUrl = getServerUrl()

  useEffect(() => {
    apiFetch('/api/auth/credentials/status')
      .then((r) => r.json() as Promise<CredStatus>)
      .then(setCredStatus)
      .catch(() => setCredStatus({ hasCredentials: false }))
  }, [])

  async function handleLogout() {
    clearToken()
    if (isElectron) {
      try { await window.api.server.logout() } catch { /* ignore */ }
    }
    window.location.reload()
  }

  async function handleSync() {
    if (!isElectron) return
    setSyncing(true)
    try {
      await (window.api as unknown as { auth: { uploadCredentials: () => Promise<void> } }).auth.uploadCredentials()
      const res = await apiFetch('/api/auth/credentials/status')
      setCredStatus(await res.json() as CredStatus)
    } catch {
      // silent
    } finally {
      setSyncing(false)
    }
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
          {/* Account */}
          <section className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-term-muted border-b border-term-border pb-1">ACCOUNT</p>
            <Row label="Email:" value={email ?? '–'} />
            {serverUrl && <Row label="Server:" value={serverUrl} />}
            <button
              onClick={handleLogout}
              className="w-full py-1.5 text-[11px] uppercase tracking-wider border border-term-err text-term-err hover:bg-term-err hover:text-black transition-colors"
            >
              Ausloggen
            </button>
          </section>

          {/* Claude Auth */}
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
              <>
                <Row label="Status:" value="✗ FEHLEND" valueClass="text-red-400" />
                {!isElectron && (
                  <p className="text-term-muted text-[10px] leading-relaxed border border-term-border p-2 mt-1">
                    ⚠ Öffne einmalig die Desktop-App und logge dich ein, um deine Claude-Credentials zu synchronisieren.
                  </p>
                )}
              </>
            )}

            {isElectron && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full py-1.5 text-[11px] uppercase tracking-wider border border-term-accent text-term-accent hover:bg-term-accent hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {syncing ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
              </button>
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
