import { useEffect, useRef, useState } from 'react'
import { agentsApi, messagesApi, events as sseEvents } from '../lib/api'
import { useAgentLogs } from '../hooks/useAgentLogs'
import type { Agent, AgentMessage } from '@shared/types'
import type { LogLine } from '@shared/types'
import { Icon } from './Icons'

interface Props {
  agent: Agent
  agents: Agent[]
}

type EventKind = 'divider' | 'claude' | 'tool' | 'user' | 'inbox-msg'

interface ChatEvent {
  id: string
  kind: EventKind
  time: string
  // divider
  label?: string
  // claude / user
  text?: string
  // tool
  tool?: string
  arg?: string
  result?: string
  ok?: boolean
  // inbox-msg
  from?: string
  to?: string
  subject?: string
}

function isWatcherLine(line: LogLine): boolean {
  if (line.stream === 'system' || line.stream === 'stderr') return true
  return /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(line.text)
}

function lineTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts.slice(11, 19) || ''
  }
}

let _idCounter = 0
function nextId(): string { return String(++_idCounter) }

function logLineToEvent(line: LogLine): ChatEvent | null {
  if (isWatcherLine(line)) return null
  const text = line.text.replace(/\r?\n$/, '')
  const time = lineTime(line.ts)
  if (text.startsWith('[TOOL] ')) {
    const rest = text.slice(7)
    const colon = rest.indexOf(': ')
    const tool = colon >= 0 ? rest.slice(0, colon) : rest
    const arg = colon >= 0 ? rest.slice(colon + 2) : ''
    return { id: nextId(), kind: 'tool', time, tool, arg, result: '', ok: false }
  }
  if (text.startsWith('[RESULT] ')) {
    return null
  }
  if (text.startsWith('[THINKING] ') || text.trim()) {
    return { id: nextId(), kind: 'claude', time, text: text.startsWith('[THINKING] ') ? text.slice(11) : text }
  }
  return null
}

function mergeEvents(events: ChatEvent[], newEvents: ChatEvent[]): ChatEvent[] {
  const result = [...events]
  for (const ev of newEvents) {
    if (ev.kind === 'claude' && result.length > 0) {
      const last = result[result.length - 1]
      if (last.kind === 'claude' && Math.abs(Date.now()) < 5000) {
        result[result.length - 1] = { ...last, text: (last.text ?? '') + '\n' + (ev.text ?? '') }
        continue
      }
    }
    result.push(ev)
  }
  return result
}

function nameOf(id: string, agents: Agent[]): string {
  return agents.find((a) => a.id === id)?.name ?? id
}

export function ChatView({ agent, agents }: Props) {
  const [events, setEvents] = useState<ChatEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [from, setFrom] = useState('orchestrator')
  const [msgBody, setMsgBody] = useState('')
  const [sending, setSending] = useState(false)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    setEvents([])
    void agentsApi.logHistory(agent.id).then((history) => {
      const seed: ChatEvent[] = [
        { id: nextId(), kind: 'divider', time: '', label: `Session · ${agent.name}` },
      ]
      for (const line of history) {
        const ev = logLineToEvent(line)
        if (ev) seed.push(ev)
      }
      setEvents(seed)
    })
  }, [agent.id])

  useAgentLogs(agent.id, (line) => {
    if (pausedRef.current) return
    const ev = logLineToEvent(line)
    if (!ev) return
    setEvents((prev) => mergeEvents(prev, [ev]))
  })

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void messagesApi.list(agent.id).then((msgs) => {
        if (cancelled) return
        const inboxEvents: ChatEvent[] = msgs
          .filter((m) => m.to === agent.id)
          .map((m) => ({
            id: `msg-${m.id}`,
            kind: 'inbox-msg' as EventKind,
            time: lineTime(m.createdAt),
            from: nameOf(m.from, agents),
            to: nameOf(m.to, agents),
            subject: m.subject,
          }))
        setEvents((prev) => {
          const existingMsgIds = new Set(prev.filter((e) => e.kind === 'inbox-msg').map((e) => e.id))
          const newMsgs = inboxEvents.filter((e) => !existingMsgIds.has(e.id))
          if (newMsgs.length === 0) return prev
          return [...prev, ...newMsgs]
        })
      })
    }
    load()
    const off = sseEvents.onMessageDelivered(load)
    return () => { cancelled = true; off() }
  }, [agent.id, agents])

  useEffect(() => {
    if (!paused && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [events, paused])

  const send = async () => {
    if (!msgBody.trim()) return
    setSending(true)
    try {
      await messagesApi.send({ from, to: agent.id, body: msgBody.trim() })
      const userEv: ChatEvent = {
        id: nextId(),
        kind: 'user',
        time: new Date().toLocaleTimeString('en-GB'),
        text: msgBody.trim(),
        from,
      }
      setEvents((prev) => [...prev, userEv])
      setMsgBody('')
    } finally {
      setSending(false)
    }
  }

  const toolCount = events.filter((e) => e.kind === 'tool').length
  const claudeCount = events.filter((e) => e.kind === 'claude').length

  return (
    <div className="tab-content">
      <div className="chat-toolbar">
        <div className={`live-indicator${paused ? ' paused' : ''}`}>
          <span className="dot"></span>
          {paused ? 'PAUSED' : 'LIVE · streaming'}
        </div>
        <div style={{ width: 1, height: 14, background: 'var(--line-strong)', flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          {toolCount} tool calls · {claudeCount} responses
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn ghost" style={{ padding: '4px 8px' }} onClick={() => setPaused((p) => !p)}>
          <Icon name={paused ? 'play' : 'pause'} size={12} />
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="chat-viewport" ref={viewportRef}>
        <div className="chat-stream">
          {events.map((ev) => (
            <ChatEventRow key={ev.id} ev={ev} agent={agent} />
          ))}
          {events.length === 0 && (
            <div style={{ color: 'var(--ink-4)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
              Waiting for activity… send a message below.
            </div>
          )}
        </div>
      </div>

      <div className="chat-composer">
        <div className="chat-composer-inner">
          <textarea
            placeholder={`Send a message to ${agent.name}…`}
            rows={1}
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <div className="chat-composer-actions">
            <button className="btn primary" onClick={() => void send()} disabled={sending || !msgBody.trim()}>
              <Icon name="send" size={12} />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
        <div className="chat-composer-hint">
          <span>⌘↵ to send</span>
          <span>→ /agent/inbox/</span>
        </div>
      </div>
    </div>
  )
}

function ChatEventRow({ ev, agent }: { ev: ChatEvent; agent: Agent }) {
  if (ev.kind === 'divider') {
    return <div className="chat-divider">{ev.label}</div>
  }

  if (ev.kind === 'inbox-msg') {
    return (
      <div className="bubble">
        <div className="bubble-avatar agent-msg" title="incoming message">↘</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">Inbox</span>
            <span className="bubble-tag">agent message</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="event-card">
            <div className="event-card-head">
              <span className="event-card-from">{ev.from}</span>
              <span className="event-card-arrow">→</span>
              <span>{ev.to}</span>
            </div>
            {ev.subject && <div className="event-card-subject">{ev.subject}</div>}
            <div style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
              open in Inbox →
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (ev.kind === 'tool') {
    return (
      <div className="bubble">
        <div className="bubble-avatar tool" title="tool call">⚙</div>
        <div className="bubble-body">
          <div className="tool-card">
            <div className="tool-card-head">
              <span className="tool-card-name">{ev.tool}</span>
              {ev.arg && <span className="tool-card-arg">({ev.arg})</span>}
              {ev.result && (
                <span className={`tool-card-result${ev.ok ? ' ok' : ''}`}>
                  {ev.ok ? '✓ ' : ''}{ev.result}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (ev.kind === 'claude') {
    return (
      <div className="bubble">
        <div className="bubble-avatar claude">C</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">{agent.name}</span>
            <span className="bubble-tag">{agent.model || 'claude'}</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="bubble-content">{ev.text}</div>
        </div>
      </div>
    )
  }

  if (ev.kind === 'user') {
    const initials = (ev.from ?? 'you').slice(0, 2).toUpperCase()
    return (
      <div className="bubble">
        <div className="bubble-avatar you">{initials}</div>
        <div className="bubble-body">
          <div className="bubble-head">
            <span className="bubble-name">{ev.from ?? 'You'}</span>
            <span className="bubble-time">{ev.time}</span>
          </div>
          <div className="bubble-content">{ev.text}</div>
        </div>
      </div>
    )
  }

  return null
}
