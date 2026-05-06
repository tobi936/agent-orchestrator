'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = 'STOPPED' | 'RUNNING'

interface Agent {
  id: string
  name: string
  systemPrompt: string
  status: AgentStatus
  containerId: string | null
}

interface Message {
  id: string
  direction: 'INBOX' | 'OUTBOX'
  content: string
  processed: boolean
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtTimeFull(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 9.5A6 6 0 0 1 4.5 1.5a6 6 0 1 0 8 8z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.3" />
      <line x1="7" y1="0.5" x2="7" y2="2" />
      <line x1="7" y1="12" x2="7" y2="13.5" />
      <line x1="0.5" y1="7" x2="2" y2="7" />
      <line x1="12" y1="7" x2="13.5" y2="7" />
      <line x1="2.4" y1="2.4" x2="3.4" y2="3.4" />
      <line x1="10.6" y1="10.6" x2="11.6" y2="11.6" />
      <line x1="2.4" y1="11.6" x2="3.4" y2="10.6" />
      <line x1="10.6" y1="3.4" x2="11.6" y2="2.4" />
    </svg>
  )
}

// ─── StatusDot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
      status === 'RUNNING' ? 'bg-green' : 'bg-ink-4'
    }`} />
  )
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  return (
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
        <span className="text-sm font-semibold tracking-tight text-ink">Orchestrator</span>
        <span className="h-3.5 w-px bg-line hidden sm:block" />
        <span className="hidden sm:inline text-[11px] font-medium text-ink-3 px-1.5 py-0.5 bg-hover rounded border border-line">
          local
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleDark}
          title={isDark ? 'Light mode' : 'Dark mode'}
          className="w-7 h-7 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-hover transition-colors"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="w-7 h-7 rounded-full bg-hover border border-line flex items-center justify-center">
          <span className="text-[11px] font-semibold text-ink-2">U</span>
        </div>
      </div>
    </header>
  )
}

// ─── AgentsSidebar ───────────────────────────────────────────────────────────

function AgentsSidebar({
  agents,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  mobileVisible,
}: {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: 'all' | 'running' | 'idle'
  onFilterChange: (f: 'all' | 'running' | 'idle') => void
  mobileVisible: boolean
}) {
  const router = useRouter()
  const runningCount = agents.filter((a) => a.status === 'RUNNING').length

  const filtered = agents.filter((a) => {
    if (filter === 'running') return a.status === 'RUNNING'
    if (filter === 'idle') return a.status === 'STOPPED'
    return true
  })

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex w-full md:w-[240px] shrink-0 flex-col border-r border-line bg-surface overflow-hidden`}>
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Agents</span>
          <span className="text-[10px] font-mono text-ink-4">{agents.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'running', 'idle'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                filter === f
                  ? 'bg-ink text-bg'
                  : 'text-ink-3 hover:text-ink hover:bg-hover'
              }`}
            >
              {f === 'all'
                ? 'All'
                : f === 'running'
                ? `Running${runningCount > 0 ? ` ${runningCount}` : ''}`
                : 'Idle'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-px pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[11px] text-ink-4 py-8">No agents</p>
        ) : (
          filtered.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-md transition-colors text-left ${
                selectedId === agent.id
                  ? 'bg-selected text-ink'
                  : 'text-ink-2 hover:bg-hover hover:text-ink'
              }`}
            >
              <span className="mt-[5px]">
                <StatusDot status={agent.status} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate leading-tight">{agent.name}</p>
                <p className="text-[10px] text-ink-3 truncate mt-0.5 leading-tight">{agent.systemPrompt}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-2 shrink-0 border-t border-line">
        <button
          onClick={() => router.push('/agents/new')}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-ink-3 hover:text-accent-fg hover:bg-accent-bg rounded-md transition-colors border border-dashed border-line hover:border-accent-bdr"
        >
          <span className="text-sm leading-none font-light">+</span>
          New Agent
        </button>
      </div>
    </div>
  )
}

// ─── ChatPanel ───────────────────────────────────────────────────────────────

function ChatPanel({
  agent,
  messages,
  onSend,
  onToggle,
  onDelete,
  actionLoading,
  mobileVisible,
}: {
  agent: Agent | null
  messages: Message[]
  onSend: (content: string) => void
  onToggle: () => void
  onDelete: () => void
  actionLoading: boolean
  mobileVisible: boolean
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !agent || agent.status !== 'RUNNING') return
    onSend(input.trim())
    setInput('')
  }

  if (!agent) {
    return (
      <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex flex-1 items-center justify-center`}>
        <div className="text-center select-none">
          <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent-bdr flex items-center justify-center mx-auto mb-3">
            <div className="w-4 h-4 rounded-[3px] bg-accent opacity-30" />
          </div>
          <p className="text-sm font-medium text-ink-2">Select an agent</p>
          <p className="text-xs text-ink-3 mt-0.5 hidden md:block">Pick one from the left to start</p>
          <p className="text-xs text-ink-3 mt-0.5 md:hidden">Pick one from the Agents tab</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-line`}>
      <div className="h-11 px-4 flex items-center justify-between border-b border-line shrink-0 bg-surface">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className="text-sm font-semibold text-ink">{agent.name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full font-mono ${
            agent.status === 'RUNNING'
              ? 'bg-green-bg text-green-fg'
              : 'bg-hover text-ink-3'
          }`}>
            {agent.status === 'RUNNING' ? 'running' : 'idle'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggle}
            disabled={actionLoading}
            className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 ${
              agent.status === 'RUNNING'
                ? 'bg-raised border border-line text-ink-2 hover:bg-hover hover:text-ink'
                : 'bg-accent text-white hover:opacity-90'
            }`}
          >
            {actionLoading ? '…' : agent.status === 'RUNNING' ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={onDelete}
            disabled={actionLoading || agent.status === 'RUNNING'}
            title="Delete agent"
            className="text-[11px] font-medium px-2 py-1 rounded-md text-ink-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-ink-3">
              {agent.status === 'RUNNING'
                ? 'No messages yet — send one below.'
                : 'Start the agent to begin.'}
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.direction === 'INBOX' ? (
            <div key={msg.id} className="flex items-end gap-2 justify-end">
              <div className="max-w-[70%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2.5 dark:shadow-none shadow-sm">
                <p className="text-[13px] text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-white/50 mt-1 font-mono text-right">{fmtTime(msg.createdAt)}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-accent-bg border border-accent-bdr flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-accent-fg">U</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-bg">C</span>
              </div>
              <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-raised border border-line px-3.5 py-2.5 dark:shadow-none shadow-sm">
                <p className="text-[13px] text-ink whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-ink-3 mt-1 font-mono">{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 shrink-0 border-t border-line bg-surface">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agent.status === 'RUNNING' ? 'Message…' : 'Start the agent first'}
            disabled={agent.status !== 'RUNNING'}
            className="flex-1 bg-raised border border-line rounded-lg px-3.5 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:bg-hover"
          />
          <button
            type="submit"
            disabled={agent.status !== 'RUNNING' || !input.trim()}
            className="bg-accent hover:opacity-90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── InboxOutboxPanel (Inbox | Outbox | Infra) ───────────────────────────────

const HEALTH_ITEMS = [
  { label: 'Claude Auth', ok: true },
  { label: 'Docker', ok: true },
  { label: 'API Rate', ok: true },
]

function InboxOutboxPanel({
  messages,
  agentName,
  agentsRunning,
  agentsTotal,
  mobileVisible,
}: {
  messages: Message[]
  agentName: string | null
  agentsRunning: number
  agentsTotal: number
  mobileVisible: boolean
}) {
  const [tab, setTab] = useState<'inbox' | 'outbox' | 'infra'>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = messages.filter((m) =>
    tab === 'inbox' ? m.direction === 'INBOX' : m.direction === 'OUTBOX'
  )
  const unreadInbox = messages.filter((m) => m.direction === 'INBOX' && !m.processed).length
  const selectedMsg = messages.find((m) => m.id === selectedId) ?? null

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] shrink-0 flex-col bg-surface overflow-hidden`}>
      <div className="h-11 flex items-center gap-1 px-3 border-b border-line shrink-0">
        {(['inbox', 'outbox', 'infra'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              tab === t
                ? 'bg-selected text-ink'
                : 'text-ink-3 hover:text-ink hover:bg-hover'
            }`}
          >
            {t === 'inbox' ? 'Inbox' : t === 'outbox' ? 'Outbox' : 'Infra'}
            {t === 'inbox' && unreadInbox > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-mono leading-none">
                {unreadInbox}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'infra' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          <section>
            <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-2.5">Health</p>
            <div className="space-y-2.5">
              {HEALTH_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-2">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green" />
                    <span className="text-[10px] font-mono text-green-fg">ok</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-2.5">Agents</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-2">Running</span>
              <span className="text-[11px] font-mono text-ink">{agentsRunning}/{agentsTotal}</span>
            </div>
          </section>
        </div>
      )}

      {tab !== 'infra' && (
        <>
          <div className="flex-1 overflow-y-auto">
            {!agentName ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] text-ink-3">Select an agent</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[11px] text-ink-3">No messages</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {filtered.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedId(selectedId === msg.id ? null : msg.id)}
                    className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-hover ${
                      selectedId === msg.id ? 'bg-accent-bg' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-ink-3">
                        {tab === 'inbox' ? `user → ${agentName}` : `${agentName} → user`}
                      </span>
                      <span className="text-[10px] font-mono text-ink-4">
                        {fmtTimeFull(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-2 line-clamp-2 leading-snug">{msg.content}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-medium px-1.5 py-px rounded-full font-mono ${
                        tab === 'inbox'
                          ? 'bg-accent-bg text-accent-fg'
                          : 'bg-green-bg text-green-fg'
                      }`}>
                        {tab}
                      </span>
                      {tab === 'inbox' && (
                        <span className={`text-[9px] font-mono px-1.5 py-px rounded-full ${
                          msg.processed
                            ? 'bg-hover text-ink-3'
                            : 'bg-orange-bg text-orange-fg'
                        }`}>
                          {msg.processed ? 'processed' : 'pending'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMsg && (
            <div className="border-t border-line bg-raised shrink-0 max-h-[180px] overflow-y-auto">
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <span className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest">Content</span>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-[11px] text-ink-4 hover:text-ink-2 leading-none"
                >
                  ✕
                </button>
              </div>
              <pre className="px-3 pb-3 text-[11px] font-mono text-ink-2 whitespace-pre-wrap break-all leading-relaxed">
                {selectedMsg.content}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── StatusBar ───────────────────────────────────────────────────────────────

function StatusBar({ agents }: { agents: Agent[] }) {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const running = agents.filter((a) => a.status === 'RUNNING').length

  const items = [
    { label: 'claude', value: 'auth', ok: true },
    { label: 'docker', value: 'running', ok: true },
    { label: 'agents', value: `${running}/${agents.length}`, ok: running > 0 },
    { label: 'api', value: 'ok', ok: true },
  ]

  return (
    <div className="h-7 hidden md:flex items-center px-4 border-t border-line bg-surface shrink-0 gap-5">
      <div className="flex items-center gap-5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-1 h-1 rounded-full shrink-0 ${item.ok ? 'bg-green' : 'bg-ink-4'}`} />
            <span className="text-[10px] font-mono text-ink-3">
              {item.label} <span className="text-ink-2">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
      <span className="text-[10px] font-mono text-ink-3">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  )
}

// ─── MobileNav ───────────────────────────────────────────────────────────────

function MobileNav({
  active,
  onChange,
  unreadCount,
}: {
  active: 'agents' | 'chat' | 'inbox'
  onChange: (panel: 'agents' | 'chat' | 'inbox') => void
  unreadCount: number
}) {
  const tabs = [
    {
      id: 'agents' as const,
      label: 'Agents',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="6" r="3" />
          <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" />
        </svg>
      ),
    },
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-4 3V4a1 1 0 0 1 1-1z" />
        </svg>
      ),
    },
    {
      id: 'inbox' as const,
      label: 'Inbox',
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12l2-7h10l2 7H2z" />
          <path d="M2 12h4a3 3 0 0 0 6 0h4" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="md:hidden flex items-center border-t border-line bg-surface shrink-0 h-14">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
            active === tab.id ? 'text-accent' : 'text-ink-3'
          }`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
          {tab.id === 'inbox' && unreadCount > 0 && (
            <span className="absolute top-2 right-1/4 translate-x-2 w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-mono leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<'all' | 'running' | 'idle'>('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'agents' | 'chat' | 'inbox'>('agents')
  const [error, setError] = useState<string | null>(null)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleDark() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    if (!res.ok) return
    const data: Agent[] = await res.json()
    setAgents(data)
    setSelectedAgentId((prev) => {
      if (prev && data.find((a) => a.id === prev)) return prev
      return data.length > 0 ? data[0].id : null
    })
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!selectedAgentId) { setMessages([]); return }
    const res = await fetch(`/api/agents/${selectedAgentId}/messages`)
    if (res.ok) setMessages(await res.json())
  }, [selectedAgentId])

  useEffect(() => {
    fetchAgents()
    const t = setInterval(fetchAgents, 5000)
    return () => clearInterval(t)
  }, [fetchAgents])

  useEffect(() => {
    fetchMessages()
    const t = setInterval(fetchMessages, 3000)
    return () => clearInterval(t)
  }, [fetchMessages])

  async function toggleAgent() {
    if (!selectedAgent) return
    setActionLoading(true)
    setError(null)
    const action = selectedAgent.status === 'RUNNING' ? 'stop' : 'start'
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setAgents((prev) => prev.map((a) => (a.id === data.id ? data : a)))
      } else {
        setError(data?.error ?? `Failed to ${action} agent`)
      }
    } catch {
      setError(`Network error — could not ${action} agent`)
    }
    setActionLoading(false)
  }

  async function deleteAgent() {
    if (!selectedAgent) return
    if (!confirm(`Delete "${selectedAgent.name}"?`)) return
    const res = await fetch(`/api/agents/${selectedAgent.id}`, { method: 'DELETE' })
    if (res.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== selectedAgent.id))
      setSelectedAgentId(null)
    }
  }

  async function sendMessage(content: string) {
    if (!selectedAgentId) return
    await fetch(`/api/agents/${selectedAgentId}/inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    fetchMessages()
  }

  function handleSelectAgent(id: string) {
    setSelectedAgentId(id)
    setMobilePanel('chat')
  }

  const unreadCount = messages.filter((m) => m.direction === 'INBOX' && !m.processed).length

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar isDark={isDark} onToggleDark={toggleDark} />
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-md flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm leading-none shrink-0">✕</button>
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AgentsSidebar
          agents={agents}
          selectedId={selectedAgentId}
          onSelect={handleSelectAgent}
          filter={filter}
          onFilterChange={setFilter}
          mobileVisible={mobilePanel === 'agents'}
        />
        <ChatPanel
          agent={selectedAgent}
          messages={messages}
          onSend={sendMessage}
          onToggle={toggleAgent}
          onDelete={deleteAgent}
          actionLoading={actionLoading}
          mobileVisible={mobilePanel === 'chat'}
        />
        <InboxOutboxPanel
          messages={messages}
          agentName={selectedAgent?.name ?? null}
          agentsRunning={agents.filter((a) => a.status === 'RUNNING').length}
          agentsTotal={agents.length}
          mobileVisible={mobilePanel === 'inbox'}
        />
      </div>
      <StatusBar agents={agents} />
      <MobileNav
        active={mobilePanel}
        onChange={setMobilePanel}
        unreadCount={unreadCount}
      />
    </div>
  )
}
