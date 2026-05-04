import { useState } from 'react'
import { getServerUrl } from '../hooks/useAuth'

interface Props {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string, serverUrl: string) => Promise<void>
}

type Tab = 'login' | 'register'

export function AuthScreen({ onLogin, onRegister }: Props) {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [serverUrl, setServerUrl] = useState(getServerUrl())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (tab === 'register') {
      if (password.length < 8) {
        setError('Passwort muss mindestens 8 Zeichen haben')
        return
      }
      if (password !== passwordConfirm) {
        setError('Passwörter stimmen nicht überein')
        return
      }
      if (!serverUrl) {
        setError('Server-URL ist erforderlich')
        return
      }
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        await onLogin(email, password)
      } else {
        await onRegister(email, password, serverUrl)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-term-bg font-mono">
      <div className="w-[380px] border border-term-border bg-term-panel p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-term-border">
          <span className="text-term-accent">▌</span>
          <span className="text-xs tracking-widest uppercase text-term-text">agent orchestrator</span>
        </div>

        <div className="flex gap-0 border border-term-border text-[11px]">
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-1.5 uppercase tracking-wider transition-colors ${
                tab === t
                  ? 'bg-term-accent text-black'
                  : 'text-term-muted hover:text-term-text'
              }`}
            >
              {t === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Email:" type="email" value={email} onChange={setEmail} required />
          <Field label="Passwort:" type="password" value={password} onChange={setPassword} required />

          {tab === 'register' && (
            <>
              <Field
                label="Passwort wdh.:"
                type="password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                required
              />
              <Field
                label="Server-URL:"
                type="url"
                value={serverUrl}
                onChange={setServerUrl}
                placeholder="https://..."
                required
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-[11px] uppercase tracking-wider border border-term-accent text-term-accent hover:bg-term-accent hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '…' : tab === 'login' ? 'Einloggen' : 'Registrieren'}
          </button>

          {error && (
            <p className="text-red-400 text-[11px] leading-snug">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <label className="w-28 text-term-muted shrink-0">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="flex-1 bg-term-bg border border-term-border px-2 py-1 text-term-text placeholder:text-term-muted focus:outline-none focus:border-term-accent"
      />
    </div>
  )
}
