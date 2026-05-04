import { useEffect, useState } from 'react'
import { apiFetch, clearToken, getToken } from '../lib/http'

interface CredStatus {
  hasCredentials: boolean
  exportedAt?: string
}

interface Props {
  email: string | null
  onClose: () => void
}

type OS = 'mac' | 'linux' | 'windows'

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

function uploadCommand(os: OS, origin: string, token: string): string {
  if (os === 'windows') {
    return `$t="${token}";$s="${origin}"
$d="$env:USERPROFILE\\.claude";$j="$env:USERPROFILE\\.claude.json"
$f=@()
if(Test-Path $d){Get-ChildItem $d -Recurse -File|%{$f+=@{path=$_.FullName.Substring($d.Length+1);content=[Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))}}}
if(Test-Path $j){$f+=@{path=".claude.json";content=[Convert]::ToBase64String([IO.File]::ReadAllBytes($j))}}
$b=@{bundle=@{files=$f;exportedAt=(Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")}}|ConvertTo-Json -Depth 10
Invoke-RestMethod -Method POST -Uri "$s/api/auth/credentials" -Headers @{Authorization="Bearer $t";"Content-Type"="application/json"} -Body $b
Write-Host "✓ Fertig"`
  }
  return `python3 -c "
import json,base64,os,datetime
from pathlib import Path
d=Path(os.path.expanduser('~/.claude'))
j=Path(os.path.expanduser('~/.claude.json'))
f=[{'path':str(p.relative_to(d)),'content':base64.b64encode(p.read_bytes()).decode()} for p in d.rglob('*') if p.is_file()] if d.exists() else []
if j.exists():f.append({'path':'.claude.json','content':base64.b64encode(j.read_bytes()).decode()})
print(json.dumps({'bundle':{'files':f,'exportedAt':datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}}))
" | curl -s -X POST "${origin}/api/auth/credentials" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d @- && echo "✓ Fertig"`
}

export function SettingsModal({ email, onClose }: Props) {
  const [credStatus, setCredStatus] = useState<CredStatus | null>(null)
  const [os, setOs] = useState<OS>('mac')
  const [copied, setCopied] = useState(false)

  const origin = window.location.origin
  const token = getToken() ?? ''

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

  function handleCopy() {
    void navigator.clipboard.writeText(uploadCommand(os, origin, token))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[480px] bg-term-panel border border-term-border font-mono text-xs">
        <div className="flex items-center justify-between px-4 py-2 border-b border-term-border">
          <span className="text-[10px] uppercase tracking-widest text-term-text">EINSTELLUNGEN</span>
          <button onClick={onClose} className="text-term-muted hover:text-term-text transition-colors text-sm">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {/* Account */}
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
              <Row label="Status:" value="✗ FEHLEND" valueClass="text-red-400" />
            )}
          </section>

          {/* Credentials Upload */}
          <section className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-term-muted border-b border-term-border pb-1">CREDENTIALS HOCHLADEN</p>
            <p className="text-[10px] text-term-muted leading-relaxed">
              Führe diesen Befehl auf deinem lokalen Rechner aus, um deine <span className="text-term-text">~/.claude</span>-Credentials mit deinem Account zu verknüpfen.
            </p>

            {/* OS tabs */}
            <div className="flex border border-term-border text-[10px]">
              {(['mac', 'linux', 'windows'] as OS[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setOs(o)}
                  className={`flex-1 py-1 uppercase tracking-wider transition-colors ${
                    os === o ? 'bg-term-accent text-black' : 'text-term-muted hover:text-term-text'
                  }`}
                >
                  {o === 'mac' ? 'macOS' : o === 'linux' ? 'Linux' : 'Windows'}
                </button>
              ))}
            </div>

            {/* Command box */}
            <div className="relative">
              <pre className="bg-term-bg border border-term-border p-2 text-[10px] text-term-text leading-relaxed whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {uploadCommand(os, origin, token)}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 text-[9px] uppercase tracking-wider border border-term-border text-term-muted hover:text-term-text hover:border-term-accent transition-colors bg-term-panel"
              >
                {copied ? '✓' : 'COPY'}
              </button>
            </div>
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
