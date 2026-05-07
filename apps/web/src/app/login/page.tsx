'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(data.error ?? 'Error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--c-raised)] border border-[var(--c-line)] rounded-xl p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--c-ink)] mb-6">
            Agent Orchestrator
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--c-ink-2)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoFocus
                className="px-3 py-2 rounded-lg border border-[var(--c-line)] bg-[var(--c-surface)] text-[var(--c-ink)] placeholder:text-[var(--c-ink-4)] focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)] focus:border-transparent text-sm"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--c-orange-fg)] bg-[var(--c-orange-bg)] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 rounded-lg bg-[var(--c-accent)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Checking…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
