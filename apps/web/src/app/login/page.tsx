'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm">
        <div className="bg-raised border border-line rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-7 h-7 rounded-[6px] bg-accent flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-ink tracking-tight">Agent Orchestrator</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-ink-3 uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-orange-fg bg-orange-bg px-3 py-2 rounded-lg border border-orange-fg/20">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Checking…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
