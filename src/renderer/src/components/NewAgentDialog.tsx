import { useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent } from '@shared/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (a: Agent) => void
}

export function NewAgentDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [model, setModel] = useState('sonnet')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const agent = await agentsApi.create({ name, systemPrompt, model })
      onCreated(agent)
      setName('')
      setSystemPrompt('')
      setModel('sonnet')
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="bg-term-panel border border-term-border rounded p-4 w-[480px] flex flex-col gap-3"
      >
        <h2 className="text-sm uppercase tracking-wider text-term-muted">new agent</h2>

        <label className="flex flex-col gap-1 text-xs text-term-muted">
          name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="researcher"
            required
            className="bg-term-bg border border-term-border rounded px-2 py-1 text-sm text-term-text outline-none focus:border-term-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-term-muted">
          model
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-term-bg border border-term-border rounded px-2 py-1 text-sm text-term-text outline-none focus:border-term-accent"
          >
            <option value="sonnet">sonnet</option>
            <option value="opus">opus</option>
            <option value="haiku">haiku</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-term-muted">
          system prompt
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a research agent. When you need to delegate, append:&#10;DELEGATE-TO: <agent-name>&#10;BODY:&#10;..."
            rows={6}
            className="bg-term-bg border border-term-border rounded px-2 py-1 text-sm text-term-text outline-none focus:border-term-accent resize-none"
          />
        </label>

        {error && <div className="text-xs text-term-err">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs border border-term-border rounded text-term-muted hover:text-term-text"
          >
            cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-3 py-1 text-xs border border-term-accent rounded text-term-accent hover:bg-term-accent hover:text-term-bg disabled:opacity-50"
          >
            {submitting ? 'creating…' : 'create'}
          </button>
        </div>
      </form>
    </div>
  )
}
