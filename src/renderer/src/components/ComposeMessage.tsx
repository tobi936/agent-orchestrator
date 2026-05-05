import { useState } from 'react'
import { messagesApi } from '../lib/api'
import type { Agent } from '@shared/types'

interface Props {
  target: Agent
  agents: Agent[]
  onSent?: () => void
}

export function ComposeMessage({ target, agents, onSent }: Props) {
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
      onSent?.()
    } catch (err) {
      setError(String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form
      onSubmit={send}
      className="border-t border-term-border bg-term-panel p-2 flex flex-col gap-2 flex-shrink-0"
    >
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <label className="text-term-muted uppercase">[FROM]</label>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-black border border-term-border rounded-sm px-2 py-1 text-term-text font-mono outline-none focus:border-term-blue"
        >
          <option value="orchestrator">orchestrator</option>
          {agents
            .filter((a) => a.id !== target.id)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <label className="text-term-muted ml-3 uppercase">[TO]</label>
        <span className="text-term-accent">{target.name}</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="SUBJECT"
          className="ml-auto bg-black border border-term-border rounded-sm px-2 py-1 text-term-text font-mono outline-none focus:border-term-blue placeholder:text-term-muted/30"
        />
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`MESSAGE TO ${target.name.toUpperCase()}... (ENTER TO SEND, SHIFT+ENTER FOR NEW LINE)`}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) void send(e)
          }}
          className="flex-1 bg-black border border-term-border rounded-sm px-2 py-1.5 text-xs text-term-text font-mono outline-none focus:border-term-blue resize-none placeholder:text-term-muted/30"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="px-3 py-1.5 text-[10px] font-mono border border-term-accent rounded-sm text-term-accent hover:bg-term-accent hover:text-black disabled:opacity-30 transition-colors uppercase"
        >
          {sending ? '[SENDING]' : '[SEND]'}
        </button>
      </div>
      {error && <div className="text-[10px] text-term-err font-mono">[ERROR] {error}</div>}
    </form>
  )
}
