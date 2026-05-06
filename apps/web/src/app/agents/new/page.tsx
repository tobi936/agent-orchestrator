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
      if (!res.ok) throw new Error('Failed to create agent')
      const agent = await res.json()
      router.push(`/agents/${agent.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Agent</h1>
        <p className="text-zinc-400 text-sm mt-1">Configure your AI agent</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research Assistant"
            required
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant that..."
            required
            rows={6}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Process Command <span className="text-zinc-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g. python.exe -m robdevsim -s "config.json"'
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
          />
          <p className="text-zinc-500 text-xs mt-1.5">If set, this command is spawned when the agent starts. Leave blank to use AI provider mode.</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Creating…' : 'Create Agent'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-200 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
