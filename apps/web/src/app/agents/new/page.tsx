'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, systemPrompt }),
      })
      if (!res.ok) throw new Error()
      router.push('/')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* TopBar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-accent flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold tracking-tight text-ink hover:text-accent-fg transition-colors"
          >
            Orchestrator
          </button>
          <span className="h-3.5 w-px bg-line" />
          <span className="text-[11px] text-ink-3">New Agent</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-hover border border-line flex items-center justify-center">
          <span className="text-[11px] font-semibold text-ink-2">U</span>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center pt-16 px-4 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          <div className="mb-7">
            <h1 className="text-lg font-semibold text-ink tracking-tight">New Agent</h1>
            <p className="text-sm text-ink-3 mt-0.5">Configure a new AI agent</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Research Assistant"
                required
                className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-ink-3 mb-1.5 uppercase tracking-wider">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that…"
                required
                rows={6}
                className="w-full bg-raised border border-line rounded-lg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors resize-none font-sans"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-accent hover:opacity-90 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
              >
                {loading ? 'Creating…' : 'Create Agent'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm font-medium text-ink-3 hover:text-ink px-4 py-2 rounded-lg hover:bg-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
