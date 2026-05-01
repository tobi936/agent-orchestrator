import { useState } from 'react'
import { messagesApi } from '../lib/api'
import type { Agent } from '@shared/types'

interface Props {
  target: Agent
  agents: Agent[]
}

export function ComposeMessage({ target, agents }: Props) {
  const [from, setFrom] = useState<string>('orchestrator')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      await messagesApi.send({
        from,
        to: target.id,
        subject: subject.trim() || undefined,
        body: body.trim(),
      })
      setBody('')
      setSubject('')
    } catch (err) {
      setError(String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={send}
      className="border-t border-term-border bg-term-panel p-2 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 text-xs">
        <label className="text-term-muted">from</label>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-term-bg border border-term-border rounded px-2 py-1 text-term-text"
        >
          <option value="orchestrator">orchestrator (you)</option>
          {agents
            .filter((a) => a.id !== target.id)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <label className="text-term-muted ml-2">to</label>
        <span className="text-term-accent">{target.name}</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="subject (optional)"
          className="ml-auto bg-term-bg border border-term-border rounded px-2 py-1 text-term-text w-64 outline-none focus:border-term-accent"
        />
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`message to ${target.name}…  (Ctrl+Enter to send)`}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send(e)
          }}
          className="flex-1 bg-term-bg border border-term-border rounded px-2 py-1 text-sm text-term-text outline-none focus:border-term-accent resize-none"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="px-3 py-2 text-xs border border-term-accent rounded text-term-accent hover:bg-term-accent hover:text-term-bg disabled:opacity-30"
        >
          {sending ? 'sending…' : 'send →'}
        </button>
      </div>
      {error && <div className="text-xs text-term-err">{error}</div>}
    </form>
  )
}
