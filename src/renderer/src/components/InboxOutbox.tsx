import { useEffect, useState } from 'react'
import { messagesApi, events } from '../lib/api'
import type { Agent, AgentMessage } from '@shared/types'

interface Props {
  agent: Agent
  agents: Agent[]
}

function nameOf(id: string, agents: Agent[]): string {
  return agents.find((a) => a.id === id)?.name ?? id
}

function MessageRow({ msg, agents }: { msg: AgentMessage; agents: Agent[] }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="border-b border-term-border last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 text-xs hover:bg-term-bg/40"
      >
        <div className="flex items-center gap-2">
          <span className="text-term-muted">{msg.createdAt.slice(11, 19)}</span>
          <span className="text-term-accent">{nameOf(msg.from, agents)}</span>
          <span className="text-term-muted">→</span>
          <span className="text-term-accent">{nameOf(msg.to, agents)}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-term-muted">
            {msg.status}
          </span>
        </div>
        {msg.subject && <div className="text-term-text mt-0.5">{msg.subject}</div>}
      </button>
      {open && (
        <pre className="px-3 pb-2 text-xs whitespace-pre-wrap text-term-text/80">{msg.body}</pre>
      )}
    </li>
  )
}

export function InboxOutbox({ agent, agents }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox')

  useEffect(() => {
    let cancelled = false
    void messagesApi.list(agent.id).then((m) => {
      if (!cancelled) setMessages(m)
    })
    const off1 = events.onMessageDelivered(() => {
      void messagesApi.list(agent.id).then((m) => {
        if (!cancelled) setMessages(m)
      })
    })
    return () => {
      cancelled = true
      off1()
    }
  }, [agent.id])

  const inbox = messages.filter((m) => m.to === agent.id).sort(byDateDesc)
  const outbox = messages.filter((m) => m.from === agent.id).sort(byDateDesc)
  const list = tab === 'inbox' ? inbox : outbox

  return (
    <div className="flex flex-col h-full bg-term-panel border-l border-term-border">
      <div className="flex border-b border-term-border text-xs">
        <button
          onClick={() => setTab('inbox')}
          className={`px-3 py-2 border-b-2 ${
            tab === 'inbox'
              ? 'border-term-accent text-term-text'
              : 'border-transparent text-term-muted hover:text-term-text'
          }`}
        >
          inbox <span className="opacity-60">({inbox.length})</span>
        </button>
        <button
          onClick={() => setTab('outbox')}
          className={`px-3 py-2 border-b-2 ${
            tab === 'outbox'
              ? 'border-term-accent text-term-text'
              : 'border-transparent text-term-muted hover:text-term-text'
          }`}
        >
          outbox <span className="opacity-60">({outbox.length})</span>
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <li className="px-3 py-6 text-xs text-term-muted text-center">
            no {tab} messages yet
          </li>
        )}
        {list.map((m) => (
          <MessageRow key={m.id} msg={m} agents={agents} />
        ))}
      </ul>
    </div>
  )
}

function byDateDesc(a: AgentMessage, b: AgentMessage): number {
  return b.createdAt.localeCompare(a.createdAt)
}
