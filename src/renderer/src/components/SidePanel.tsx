import { useEffect, useState } from 'react'
import { messagesApi, events as sseEvents } from '../lib/api'
import type { Agent, AgentMessage } from '@shared/types'
import { Icon } from './Icons'
import { JsonBlock } from './helpers'

interface Props {
  agent: Agent | null
  agents: Agent[]
}

type SideTab = 'inbox' | 'outbox'

function nameOf(id: string, agents: Agent[]): string {
  return agents.find((a) => a.id === id)?.name ?? id
}

function msgTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts.slice(11, 16) || ''
  }
}

function statusTagClass(status: AgentMessage['status']): string {
  return status
}

export function SidePanel({ agent, agents }: Props) {
  const [tab, setTab] = useState<SideTab>('inbox')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (!agent) { setMessages([]); setSelectedId(null); return }
    let cancelled = false
    const load = () => {
      void messagesApi.list(agent.id).then((msgs) => {
        if (!cancelled) {
          setMessages(msgs)
          if (!selectedId && msgs.length > 0) setSelectedId(msgs[0].id)
        }
      })
    }
    load()
    const off = sseEvents.onMessageDelivered(load)
    return () => { cancelled = true; off() }
  }, [agent?.id])

  const inbox = messages.filter((m) => m.to === (agent?.id ?? '')).sort(byDateDesc)
  const outbox = messages.filter((m) => m.from === (agent?.id ?? '')).sort(byDateDesc)
  const list = tab === 'inbox' ? inbox : outbox
  const selected = list.find((m) => m.id === selectedId) ?? list[0] ?? null

  let parsedBody: unknown = null
  if (selected) {
    try { parsedBody = JSON.parse(selected.body) } catch { parsedBody = selected.body }
  }

  return (
    <aside className="side-panel">
      <div className="side-panel-tabs">
        <button
          className={`side-tab${tab === 'inbox' ? ' active' : ''}`}
          onClick={() => setTab('inbox')}
        >
          <Icon name="inbox" size={13} />
          Inbox
          {inbox.length > 0 && <span className="count">{inbox.length}</span>}
        </button>
        <button
          className={`side-tab${tab === 'outbox' ? ' active' : ''}`}
          onClick={() => setTab('outbox')}
        >
          <Icon name="outbox" size={13} />
          Outbox
          {outbox.length > 0 && <span className="count">{outbox.length}</span>}
        </button>
        <div className="side-panel-actions">
          <button className="icon-btn" title="Filter">
            <Icon name="filter" size={14} />
          </button>
        </div>
      </div>

      <div className="side-panel-list">
        {!agent && (
          <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
            Select an agent to view messages
          </div>
        )}
        {agent && list.length === 0 && (
          <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
            No {tab} messages
          </div>
        )}
        {list.map((m) => {
          const fromName = nameOf(m.from, agents)
          const toName = nameOf(m.to, agents)
          return (
            <div
              key={m.id}
              className={`side-msg${selected?.id === m.id ? ' active' : ''}`}
              onClick={() => setSelectedId(m.id)}
            >
              <div className="udot" />
              <div className="sm-body">
                <div className="row1">
                  <span className="from">{fromName}</span>
                  <span className="arr">→</span>
                  <span className="to">{toName}</span>
                </div>
                {m.subject && <div className="subj">{m.subject}</div>}
                <div className="preview">{m.body.slice(0, 80)}</div>
                <div className="tag-row">
                  <span className={`msg-tag ${statusTagClass(m.status)}`}>{m.status}</span>
                </div>
              </div>
              <div className="time">{msgTime(m.createdAt)}</div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="side-panel-detail">
          <div className="det-subject">{selected.subject ?? '(no subject)'}</div>
          <div className="det-meta">
            <span className="v">{nameOf(selected.from, agents)}</span>
            {' → '}
            <span className="v">{nameOf(selected.to, agents)}</span>
            {' · '}
            {msgTime(selected.createdAt)}
            {' · '}
            <span className="v">{selected.id.slice(0, 8)}</span>
          </div>
          <JsonBlock data={parsedBody} />
          <div className="det-actions">
            <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 12, marginLeft: 'auto' }}>
              <Icon name="ext" size={11} /> Open in Chat
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

function byDateDesc(a: AgentMessage, b: AgentMessage): number {
  return b.createdAt.localeCompare(a.createdAt)
}
