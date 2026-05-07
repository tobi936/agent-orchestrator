'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentStat {
  id: string
  name: string
  status: 'STOPPED' | 'RUNNING'
  provider: string
  model: string
  pending: number
  inProgress: number
  done: number
}

interface Flow {
  from: string
  to: string
  count: number
}

interface InboxItem {
  id: string
  title: string
  agentId: string
  agentName: string
  fromAgentId: string | null
  fromAgentName: string | null
  createdAt: string
}

interface OutboxItem {
  id: string
  title: string
  agentId: string
  agentName: string
  lastReply: string | null
  createdAt: string
}

interface Totals {
  agents: number
  running: number
  pending: number
  inProgress: number
  done: number
}

interface DashboardData {
  totals: Totals
  agentStats: AgentStat[]
  flows: Flow[]
  inbox: InboxItem[]
  outbox: OutboxItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── StatTile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3 rounded-xl border border-line bg-raised">
      <span className={`text-2xl font-bold font-mono tabular-nums ${accent ?? 'text-ink'}`}>{value}</span>
      <span className="text-[10px] font-medium text-ink-3 uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ─── AgentRow ─────────────────────────────────────────────────────────────────

function AgentRow({ agent, flows, agentStats, onNavigate }: {
  agent: AgentStat
  flows: Flow[]
  agentStats: AgentStat[]
  onNavigate: () => void
}) {
  const outgoingFlows = flows.filter((f) => f.from === agent.id).slice(0, 3)
  const total = agent.pending + agent.inProgress + agent.done

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-line bg-raised hover:bg-hover transition-colors group">
      {/* Status dot + name */}
      <div className="flex items-center gap-2 w-40 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${agent.status === 'RUNNING' ? 'bg-green animate-pulse' : 'bg-ink-4'}`} />
        <button
          onClick={onNavigate}
          className="text-[13px] font-semibold text-ink truncate hover:text-accent transition-colors"
        >
          {agent.name}
        </button>
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${
        agent.status === 'RUNNING' ? 'bg-green-bg text-green-fg' : 'bg-hover text-ink-3'
      }`}>
        {agent.status === 'RUNNING' ? 'running' : 'idle'}
      </span>

      {/* Task bars */}
      <div className="flex items-center gap-1 flex-1">
        {/* Pending */}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-fg shrink-0" />
          <span className="text-[11px] font-mono text-ink-2 w-5 text-right">{agent.pending}</span>
        </div>
        {/* Active */}
        <div className="flex items-center gap-1 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="text-[11px] font-mono text-ink-2 w-5 text-right">{agent.inProgress}</span>
        </div>
        {/* Done */}
        <div className="flex items-center gap-1 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green shrink-0" />
          <span className="text-[11px] font-mono text-ink-2 w-5 text-right">{agent.done}</span>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden ml-3 max-w-32">
            <div
              className="h-full bg-green rounded-full transition-all duration-500"
              style={{ width: `${Math.round((agent.done / total) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Forwards to */}
      {outgoingFlows.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-ink-4 font-mono">→</span>
          <div className="flex items-center gap-1">
            {outgoingFlows.map((f) => {
              const target = agentStats.find((a) => a.id === f.to)
              return (
                <span key={f.to} className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-bg text-accent-fg">
                  {target?.name ?? f.to.slice(0, 6)}
                  <span className="opacity-60">×{f.count}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Model */}
      <span className="hidden lg:block text-[10px] font-mono text-ink-4 shrink-0 max-w-28 truncate">{agent.model}</span>
    </div>
  )
}

// ─── InboxFeed ────────────────────────────────────────────────────────────────

function InboxFeed({ items }: { items: InboxItem[] }) {
  if (items.length === 0) {
    return <p className="text-[11px] text-ink-4 italic px-2 py-4 text-center">No pending tasks</p>
  }
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-line bg-raised hover:bg-hover transition-colors">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-medium text-ink leading-snug line-clamp-2">{item.title}</p>
            <span className="text-[10px] font-mono text-ink-4 shrink-0">{relativeTime(item.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-hover text-ink-3">{item.agentName}</span>
            {item.fromAgentName && (
              <>
                <span className="text-[9px] text-ink-4">from</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-bg text-accent-fg">{item.fromAgentName}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── OutboxFeed ───────────────────────────────────────────────────────────────

function OutboxFeed({ items }: { items: OutboxItem[] }) {
  if (items.length === 0) {
    return <p className="text-[11px] text-ink-4 italic px-2 py-4 text-center">No completed tasks yet</p>
  }
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-line bg-raised hover:bg-hover transition-colors">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-medium text-ink leading-snug line-clamp-1">{item.title}</p>
            <span className="text-[10px] font-mono text-ink-4 shrink-0">{relativeTime(item.createdAt)}</span>
          </div>
          {item.lastReply && (
            <p className="text-[11px] text-ink-3 line-clamp-2 leading-snug">{item.lastReply}</p>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-bg text-green-fg self-start">{item.agentName}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [feed, setFeed] = useState<'inbox' | 'outbox'>('inbox')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleDark() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  const fetchDashboard = useCallback(async () => {
    const res = await fetch('/api/dashboard')
    if (!res.ok) return
    setData(await res.json())
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    fetchDashboard()
    const t = setInterval(fetchDashboard, 6000)
    return () => clearInterval(t)
  }, [fetchDashboard])

  const { totals, agentStats, flows, inbox, outbox } = data ?? {
    totals: { agents: 0, running: 0, pending: 0, inProgress: 0, done: 0 },
    agentStats: [],
    flows: [],
    inbox: [],
    outbox: [],
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* TopBar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-line bg-raised shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push('/')}
            className="w-6 h-6 rounded-[5px] bg-accent flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight text-ink">Orchestrator</span>
          <span className="h-3.5 w-px bg-line hidden sm:block" />
          <span className="hidden sm:inline text-[11px] font-medium text-ink-2">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:inline text-[10px] font-mono text-ink-4">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={toggleDark}
            className="w-7 h-7 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-hover transition-colors"
          >
            {isDark ? (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="7" cy="7" r="2.3" />
                <line x1="7" y1="0.5" x2="7" y2="2" /><line x1="7" y1="12" x2="7" y2="13.5" />
                <line x1="0.5" y1="7" x2="2" y2="7" /><line x1="12" y1="7" x2="13.5" y2="7" />
                <line x1="2.4" y1="2.4" x2="3.4" y2="3.4" /><line x1="10.6" y1="10.6" x2="11.6" y2="11.6" />
                <line x1="2.4" y1="11.6" x2="3.4" y2="10.6" /><line x1="10.6" y1="3.4" x2="11.6" y2="2.4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.5 9.5A6 6 0 0 1 4.5 1.5a6 6 0 1 0 8 8z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => router.push('/agents/new')}
            className="text-[11px] font-medium px-3 py-1 rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
          >
            + Agent
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-[11px] font-medium px-3 py-1 rounded-md border border-line text-ink-2 hover:bg-hover transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-line bg-surface shrink-0 overflow-x-auto">
        <StatTile label="Agents" value={totals.agents} />
        <StatTile label="Running" value={totals.running} accent="text-green-fg" />
        <StatTile label="Inbox pending" value={totals.pending} accent={totals.pending > 0 ? 'text-orange-fg' : undefined} />
        <StatTile label="In progress" value={totals.inProgress} accent={totals.inProgress > 0 ? 'text-accent' : undefined} />
        <StatTile label="Done" value={totals.done} accent="text-green-fg" />
      </div>

      {/* Main layout */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Left: agent flow */}
        <div className="flex-1 overflow-y-auto p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold text-ink-2 uppercase tracking-widest">Agent Pipeline</h2>
            <div className="flex items-center gap-2 text-[10px] font-mono text-ink-4">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-fg" />pending</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent" />active</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green" />done</span>
            </div>
          </div>

          {agentStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <p className="text-sm font-medium text-ink-2">No agents yet</p>
              <button
                onClick={() => router.push('/agents/new')}
                className="text-[12px] font-medium px-4 py-1.5 rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
              >
                Create first agent
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {agentStats.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  flows={flows}
                  agentStats={agentStats}
                  onNavigate={() => router.push('/?agent=' + agent.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: inbox / outbox feed */}
        <div className="w-80 shrink-0 border-l border-line flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-line shrink-0">
            <button
              onClick={() => setFeed('inbox')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${
                feed === 'inbox'
                  ? 'text-ink border-b-2 border-accent -mb-px'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Inbox
              {totals.pending > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-bg text-orange-fg text-[9px] font-mono">
                  {totals.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setFeed('outbox')}
              className={`flex-1 py-2.5 text-[11px] font-semibold transition-colors ${
                feed === 'outbox'
                  ? 'text-ink border-b-2 border-accent -mb-px'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Outbox
              {totals.done > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-green-bg text-green-fg text-[9px] font-mono">
                  {totals.done}
                </span>
              )}
            </button>
          </div>

          {/* Feed content */}
          <div className="flex-1 overflow-y-auto p-3">
            {feed === 'inbox' ? <InboxFeed items={inbox} /> : <OutboxFeed items={outbox} />}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-7 hidden md:flex items-center px-6 border-t border-line bg-raised shrink-0 gap-5">
        <span className="text-[10px] font-mono text-ink-3">
          {totals.running}/{totals.agents} running
        </span>
        <span className="text-[10px] font-mono text-ink-4">auto-refresh 6s</span>
      </div>
    </div>
  )
}
