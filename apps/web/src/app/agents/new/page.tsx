'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAgentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [command, setCommand] = useState('')
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
        body: JSON.stringify({ name, systemPrompt, command: command.trim() || undefined }),
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
      <header className="h-11 flex items-center justify-between px-4 border-b border-[#EAE9E4] bg-[#FAFAF8] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-[#3D3DF5] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold tracking-tight text-[#0E0E0C] hover:text-[#3D3DF5] transition-colors"
          >
            Orchestrator
          </button>
          <span className="h-3.5 w-px bg-[#EAE9E4]" />
          <span className="text-[11px] text-[#AAA]">New Agent</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[#EAE9E4] flex items-center justify-center">
          <span className="text-[11px] font-semibold text-[#666]">U</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center pt-16 px-4 overflow-y-auto">
        <div className="w-full max-w-[440px]">
          <div className="mb-7">
            <h1 className="text-lg font-semibold text-[#0E0E0C] tracking-tight">New Agent</h1>
            <p className="text-sm text-[#AAA] mt-0.5">Configure a new AI agent</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Research Assistant"
                required
                className="w-full bg-white border border-[#EAE9E4] rounded-lg px-3.5 py-2.5 text-sm text-[#0E0E0C] placeholder:text-[#C8C7C3] focus:outline-none focus:border-[#3D3DF5] focus:ring-1 focus:ring-[#3D3DF5]/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that…"
                required
                rows={6}
                className="w-full bg-white border border-[#EAE9E4] rounded-lg px-3.5 py-2.5 text-sm text-[#0E0E0C] placeholder:text-[#C8C7C3] focus:outline-none focus:border-[#3D3DF5] focus:ring-1 focus:ring-[#3D3DF5]/20 transition-colors resize-none font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#666] mb-1.5 uppercase tracking-wider">
                Process Command <span className="text-[#C8C7C3] normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='e.g. python -m myagent --config "setup.json"'
                className="w-full bg-white border border-[#EAE9E4] rounded-lg px-3.5 py-2.5 text-sm text-[#0E0E0C] placeholder:text-[#C8C7C3] focus:outline-none focus:border-[#3D3DF5] focus:ring-1 focus:ring-[#3D3DF5]/20 transition-colors font-mono"
              />
              <p className="text-[11px] text-[#AAA] mt-1.5">If set, runs in an E2B sandbox on start. Leave blank for AI provider mode.</p>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#3D3DF5] hover:bg-[#3030e0] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? 'Creating…' : 'Create Agent'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-sm font-medium text-[#888] hover:text-[#0E0E0C] px-4 py-2 rounded-lg hover:bg-[#F2F2F0] transition-colors"
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
