'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'STOPPED' | 'RUNNING'

interface Agent {
  id: string
  name: string
  systemPrompt: string
  provider: string
  model: string
  repoUrl: string | null
  status: AgentStatus
  containerId: string | null
}

interface AgentMetrics {
  pending: number
  inProgress: number
  done: number
  recentLogs: string[]
  sandboxMetrics: { cpu?: number; mem?: number } | null
}

interface ConfirmModal {
  agentId: string
  agentName: string
  action: 'start' | 'stop' | 'restart'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: AgentStatus) {
  return s === 'RUNNING' ? 'running' : 'idle'
}

function statusClasses(s: AgentStatus) {
  return s === 'RUNNING'
    ? 'bg-green-bg text-green-fg'
    : 'bg-hover text-ink-3'
}

function actionLabel(a: 'start' | 'stop' | 'restart') {
  if (a === 'start') return 'Start'
  if (a === 'stop') return 'Stop'
  return 'Restart'
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
        status === 'RUNNING' ? 'bg-green animate-pulse' : 'bg-ink-4'
      }`}
    />
  )
}

// ─── SandboxBar ───────────────────────────────────────────────────────────────

function SandboxBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-amber-400' : 'bg-green'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-ink-3 w-8 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-line rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-ink-2 w-14 text-right shrink-0">
        {value.toFixed(1)}{unit}
      </span>
    </div>
  )
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  metrics,
  actionLoading,
  onAction,
  onNavigate,
}: {
  agent: Agent
  metrics: AgentMetrics | null
  actionLoading: boolean
  onAction: (action: 'start' | 'stop' | 'restart') => void
  onNavigate: () => void
}) {
  const totalTasks = (metrics?.pending ?? 0) + (metrics?.inProgress ?? 0) + (metrics?.done ?? 0)

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-line bg-raised shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={agent.status} />
          <button
            onClick={onNavigate}
            className="text-[14px] font-semibold text-ink truncate hover:text-accent transition-colors"
          >
            {agent.name}
          </button>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 ${statusClasses(agent.status)}`}>
          {statusLabel(agent.status)}
        </span>
      </div>

      {/* System prompt preview */}
      <p className="text-[11px] text-ink-3 line-clamp-2 leading-snug">{agent.systemPrompt}</p>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-hover text-ink-3">{agent.provider}</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-hover text-ink-3 truncate max-w-[140px]">{agent.model}</span>
        {agent.repoUrl && (
          <span className="text-[10px] font-mono text-ink-4 truncate max-w-[120px]">
            {agent.repoUrl.replace('https://github.com/', 'gh/')}
          </span>
        )}
      </div>

      {/* Task counts */}
      {metrics ? (
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'Pending', value: metrics.pending, color: 'bg-orange-bg text-orange-fg' },
            { label: 'Active', value: metrics.inProgress, color: 'bg-accent-bg text-accent-fg' },
            { label: 'Done', value: metrics.done, color: 'bg-green-bg text-green-fg' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center py-1.5 rounded-lg bg-surface border border-line gap-0.5">
              <span className={`text-[15px] font-bold font-mono ${color.split(' ')[1]}`}>{value}</span>
              <span className="text-[9px] text-ink-3 font-medium uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-surface border border-line animate-pulse" />
          ))}
        </div>
      )}

      {/* Sandbox metrics */}
      {metrics?.sandboxMetrics && (
        <div className="space-y-1.5 pt-1 border-t border-line">
          {metrics.sandboxMetrics.cpu != null && (
            <SandboxBar label="CPU" value={metrics.sandboxMetrics.cpu} max={100} unit="%" />
          )}
          {metrics.sandboxMetrics.mem != null && (
            <SandboxBar label="MEM" value={metrics.sandboxMetrics.mem} max={256} unit=" MB" />
          )}
        </div>
      )}

      {/* Recent logs */}
      {metrics && metrics.recentLogs.length > 0 && (
        <div className="rounded-md bg-surface border border-line p-2 space-y-0.5 max-h-20 overflow-hidden">
          {metrics.recentLogs.slice(-3).map((line, i) => (
            <p key={i} className="text-[10px] font-mono text-ink-4 truncate leading-tight">{line}</p>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-line">
        {agent.status === 'STOPPED' ? (
          <button
            onClick={() => onAction('start')}
            disabled={actionLoading}
            className="flex-1 py-1.5 rounded-md bg-accent text-white text-[11px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            Start
          </button>
        ) : (
          <>
            <button
              onClick={() => onAction('restart')}
              disabled={actionLoading}
              className="flex-1 py-1.5 rounded-md bg-raised border border-line text-ink-2 text-[11px] font-medium hover:bg-hover disabled:opacity-40 transition-colors"
            >
              Restart
            </button>
            <button
              onClick={() => onAction('stop')}
              disabled={actionLoading}
              className="flex-1 py-1.5 rounded-md bg-raised border border-line text-ink-2 text-[11px] font-medium hover:bg-hover disabled:opacity-40 transition-colors"
            >
              Stop
            </button>
          </>
        )}
        <button
          onClick={onNavigate}
          className="px-3 py-1.5 rounded-md bg-raised border border-line text-ink-3 text-[11px] font-medium hover:bg-hover hover:text-ink transition-colors"
        >
          Open
        </button>
      </div>

      {totalTasks > 0 && (
        <p className="text-[10px] text-ink-4 -mt-1">{totalTasks} total task{totalTasks !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  modal,
  onConfirm,
  onCancel,
}: {
  modal: ConfirmModal
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-raised border border-line rounded-xl shadow-xl p-5 w-72 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{actionLabel(modal.action)} agent?</p>
          <p className="text-[12px] text-ink-3 mt-0.5">
            {modal.action === 'restart'
              ? `This will stop and restart "${modal.agentName}". In-flight tasks may be interrupted.`
              : modal.action === 'stop'
              ? `This will stop "${modal.agentName}". In-flight tasks may be interrupted.`
              : `Start "${modal.agentName}" and begin processing tasks.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-1.5 rounded-md border border-line text-ink-2 text-[12px] font-medium hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-1.5 rounded-md text-white text-[12px] font-medium hover:opacity-90 transition-opacity ${
              modal.action === 'start' ? 'bg-accent' : modal.action === 'restart' ? 'bg-amber-500' : 'bg-red-500'
            }`}
          >
            {actionLabel(modal.action)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [metrics, setMetrics] = useState<Record<string, AgentMetrics>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [filter, setFilter] = useState<'all' | 'running' | 'idle'>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const fetchingMetrics = useRef(false)

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
    setAgents(await res.json())
  }, [])

  const fetchAllMetrics = useCallback(async (agentList: Agent[]) => {
    if (fetchingMetrics.current) return
    fetchingMetrics.current = true
    const running = agentList.filter((a) => a.status === 'RUNNING')
    const all = agentList
    const results = await Promise.allSettled(
      all.map(async (a) => {
        const res = await fetch(`/api/agents/${a.id}/metrics`)
        if (!res.ok) return null
        const data: AgentMetrics = await res.json()
        return { id: a.id, data }
      })
    )
    setMetrics((prev) => {
      const next = { ...prev }
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          next[r.value.id] = r.value.data
        }
      }
      return next
    })
    setLastUpdated(new Date())
    fetchingMetrics.current = false
  }, [])

  useEffect(() => {
    fetchAgents()
    const t = setInterval(fetchAgents, 5000)
    return () => clearInterval(t)
  }, [fetchAgents])

  useEffect(() => {
    if (agents.length === 0) return
    fetchAllMetrics(agents)
    const t = setInterval(() => fetchAllMetrics(agents), 8000)
    return () => clearInterval(t)
  }, [agents, fetchAllMetrics])

  async function executeAction(agentId: string, action: 'start' | 'stop' | 'restart') {
    setActionLoading((prev) => ({ ...prev, [agentId]: true }))
    try {
      const res = await fetch(`/api/agents/${agentId}/${action}`, { method: 'POST' })
      if (res.ok) {
        const updated: Agent = await res.json()
        setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [agentId]: false }))
      setTimeout(() => fetchAllMetrics(agents), 1500)
    }
  }

  function requestAction(agentId: string, agentName: string, action: 'start' | 'stop' | 'restart') {
    setConfirmModal({ agentId, agentName, action })
  }

  function confirmAction() {
    if (!confirmModal) return
    const { agentId, action } = confirmModal
    setConfirmModal(null)
    executeAction(agentId, action)
  }

  const filtered = agents.filter((a) => {
    if (filter === 'running') return a.status === 'RUNNING'
    if (filter === 'idle') return a.status === 'STOPPED'
    return true
  })

  const runningCount = agents.filter((a) => a.status === 'RUNNING').length
  const pendingTotal = Object.values(metrics).reduce((s, m) => s + m.pending, 0)
  const activeTotal = Object.values(metrics).reduce((s, m) => s + m.inProgress, 0)

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
              updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
            onClick={() => router.push('/')}
            className="text-[11px] font-medium px-3 py-1 rounded-md border border-line text-ink-2 hover:bg-hover transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Summary bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${runningCount > 0 ? 'bg-green animate-pulse' : 'bg-ink-4'}`} />
          <span className="text-[12px] font-mono text-ink-2">
            <span className="font-semibold text-ink">{runningCount}</span>/{agents.length} agents running
          </span>
        </div>
        {pendingTotal > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-fg" />
            <span className="text-[12px] font-mono text-ink-2">
              <span className="font-semibold text-ink">{pendingTotal}</span> tasks pending
            </span>
          </div>
        )}
        {activeTotal > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[12px] font-mono text-ink-2">
              <span className="font-semibold text-ink">{activeTotal}</span> in progress
            </span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(['all', 'running', 'idle'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                filter === f ? 'bg-ink text-bg' : 'text-ink-3 hover:text-ink hover:bg-hover'
              }`}
            >
              {f === 'all' ? `All (${agents.length})` : f === 'running' ? `Running (${runningCount})` : `Idle (${agents.length - runningCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-sm font-medium text-ink-2">No agents found</p>
            <p className="text-xs text-ink-3">
              {filter !== 'all' ? 'Try changing the filter above.' : 'Create your first agent to get started.'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/agents/new')}
                className="mt-1 text-[12px] font-medium px-4 py-1.5 rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
              >
                New Agent
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                metrics={metrics[agent.id] ?? null}
                actionLoading={actionLoading[agent.id] ?? false}
                onAction={(action) => requestAction(agent.id, agent.name, action)}
                onNavigate={() => router.push('/?agent=' + agent.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Status bar */}
      <div className="h-7 hidden md:flex items-center px-6 border-t border-line bg-raised shrink-0 gap-5">
        <span className="text-[10px] font-mono text-ink-3">
          {filtered.length} agent{filtered.length !== 1 ? 's' : ''} shown
        </span>
        <span className="text-[10px] font-mono text-ink-4">auto-refresh every 5s</span>
      </div>

      {confirmModal && (
        <ConfirmModal
          modal={confirmModal}
          onConfirm={confirmAction}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
