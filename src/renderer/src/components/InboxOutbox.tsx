import { useEffect, useState } from 'react'
import { messagesApi, events } from '../lib/api'
import type { Agent, AgentMessage } from '@shared/types'

interface Props {
  agent: Agent
  agents: Agent[]
  refreshKey?: number
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
        className="w-full text-left px-2 py-1.5 text-[10px] font-mono hover:bg-term-bg/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-term-muted">{msg.createdAt.slice(11, 19)}</span>
          <span className="text-term-blue">{nameOf(msg.from, agents)}</span>
          <span className="text-term-muted">→</span>
          <span className="text-term-blue">{nameOf(msg.to, agents)}</span>
          <span className={`ml-auto text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded-sm ${
            msg.status === 'delivered' ? 'bg-term-ok/20 text-term-ok' :
            msg.status === 'pending' ? 'bg-term-warn/20 text-term-warn' :
            'bg-term-err/20 text-term-err'
          }`}>
            {msg.status}
          </span>
        </div>
        {msg.subject && <div className="text-term-text mt-0.5">{msg.subject}</div>}
      </button>
      {open && (
        <pre className="px-2 pb-2 text-[10px] whitespace-pre-wrap text-term-text/80 font-mono bg-black/50">{msg.body}</pre>
      )}
    </li>
  )
}

export function InboxOutbox({ agent, agents, refreshKey }: Props) {
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
  }, [agent.id, refreshKey])

  const inbox = messages.filter((m) => m.to === agent.id).sort(byDateDesc)
  const outbox = messages.filter((m) => m.from === agent.id).sort(byDateDesc)
  const list = tab === 'inbox' ? inbox : outbox

  return (
    <div className="flex flex-col h-full bg-term-panel border-l border-term-border">
      <div className="flex border-b border-term-border text-[10px] font-mono">
        <button
          onClick={() => setTab('inbox')}
          className={`px-3 py-2 border-b-2 ${
            tab === 'inbox'
              ? 'border-term-accent text-term-text'
              : 'border-transparent text-term-muted hover:text-term-text'
          } uppercase tracking-wider`}
        >
          [INBOX] <span className="opacity-60">({inbox.length})</span>
        </button>
        <button
          onClick={() => setTab('outbox')}
          className={`px-3 py-2 border-b-2 ${
            tab === 'outbox'
              ? 'border-term-accent text-term-text'
              : 'border-transparent text-term-muted hover:text-term-text'
          } uppercase tracking-wider`}
        >
          [OUTBOX] <span className="opacity-60">({outbox.length})</span>
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <li className="px-3 py-6 text-[10px] text-term-muted text-center font-mono">
            [ NO {tab.toUpperCase()} MESSAGES ]
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
