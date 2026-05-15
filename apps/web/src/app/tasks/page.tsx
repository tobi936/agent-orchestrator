'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'
type StatusFilter = 'all' | 'active' | 'done'

interface Task {
  id: string
  title: string
  content: string
  status: TaskStatus
  forHuman: boolean
  priority: number
  createdAt: string
  agent: { id: string; name: string; status: string }
  fromAgent: { id: string; name: string } | null
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function statusBadge(status: TaskStatus, forHuman: boolean) {
  if (forHuman) return { label: 'needs you', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' }
  if (status === 'PENDING') return { label: 'pending', cls: 'bg-orange-bg text-orange-fg' }
  if (status === 'IN_PROGRESS') return { label: 'running', cls: 'bg-accent-bg text-accent-fg' }
  return { label: 'done', cls: 'bg-green-bg text-green-fg' }
}

function priorityDot(p: number) {
  if (p === 0) return <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="urgent" />
  if (p === 2) return <span className="w-1.5 h-1.5 rounded-full bg-ink-4/40 shrink-0" title="low" />
  return <span className="w-1.5 h-1.5 rounded-full bg-ink-4/20 shrink-0" title="normal" />
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<StatusFilter>('active')
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async (f: StatusFilter) => {
    const param = f === 'all' ? '' : `?status=${f}`
    const res = await fetch(`/api/tasks${param}`)
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch_(filter)
    const t = setInterval(() => fetch_(filter), 3000)
    return () => clearInterval(t)
  }, [filter, fetch_])

  // Group by agent
  const byAgent = new Map<string, { agent: Task['agent']; tasks: Task[] }>()
  for (const task of tasks) {
    const key = task.agent.id
    if (!byAgent.has(key)) byAgent.set(key, { agent: task.agent, tasks: [] })
    byAgent.get(key)!.tasks.push(task)
  }

  const groups = [...byAgent.values()].sort((a, b) => {
    // Running agents first
    if (a.agent.status === 'RUNNING' && b.agent.status !== 'RUNNING') return -1
    if (b.agent.status === 'RUNNING' && a.agent.status !== 'RUNNING') return 1
    return a.agent.name.localeCompare(b.agent.name)
  })

  const counts = {
    active: tasks.filter((t) => t.status !== 'DONE').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    urgent: tasks.filter((t) => t.priority === 0 && t.status !== 'DONE').length,
    needsYou: tasks.filter((t) => t.forHuman).length,
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      {/* TopBar */}
      <header className="h-11 flex items-center justify-between px-4 border-b border-line bg-raised shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-accent flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm font-semibold tracking-tight text-ink hover:text-accent-fg transition-colors"
          >
            Orchestrator
          </button>
          <span className="h-3.5 w-px bg-line" />
          <span className="text-[11px] text-ink-3">All Tasks</span>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-[11px] text-ink-3 hover:text-ink transition-colors"
        >
          ← Back
        </button>
      </header>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-line bg-raised shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-ink-3">Active</span>
          <span className="text-[12px] font-semibold text-ink font-mono">{counts.active}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-ink-3">Done</span>
          <span className="text-[12px] font-semibold text-ink font-mono">{counts.done}</span>
        </div>
        {counts.urgent > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[11px] text-red-500 font-semibold">{counts.urgent} urgent</span>
          </div>
        )}
        {counts.needsYou > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{counts.needsYou} need you</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(['active', 'all', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filter === f ? 'bg-selected text-ink' : 'text-ink-3 hover:text-ink hover:bg-hover'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <span className="text-[11px] text-ink-3">Loading…</span>
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-[11px] text-ink-3">No {filter === 'all' ? '' : filter} tasks</p>
          </div>
        )}

        <div className="space-y-6 max-w-4xl mx-auto">
          {groups.map(({ agent, tasks: agentTasks }) => (
            <div key={agent.id}>
              {/* Agent header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.status === 'RUNNING' ? 'bg-green' : 'bg-ink-4'}`} />
                <button
                  onClick={() => router.push(`/?agent=${agent.id}`)}
                  className="text-[12px] font-semibold text-ink hover:text-accent-fg transition-colors"
                >
                  {agent.name}
                </button>
                <span className="text-[10px] font-mono text-ink-4">{agentTasks.length} task{agentTasks.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Tasks table */}
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-line">
                    {agentTasks.map((task) => {
                      const badge = statusBadge(task.status, task.forHuman)
                      return (
                        <tr
                          key={task.id}
                          onClick={() => router.push(`/?agent=${agent.id}&task=${task.id}`)}
                          className="hover:bg-hover cursor-pointer transition-colors"
                        >
                          <td className="pl-3 pr-2 py-2.5 w-5">
                            {priorityDot(task.priority)}
                          </td>
                          <td className="pr-3 py-2.5 flex-1">
                            <p className="text-[12px] font-medium text-ink truncate max-w-xs">{task.title}</p>
                            <p className="text-[10px] text-ink-3 truncate max-w-xs mt-px">{task.content}</p>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] text-ink-4 whitespace-nowrap">
                            {task.fromAgent ? (
                              <span>from <span className="text-ink-3">{task.fromAgent.name}</span></span>
                            ) : (
                              <span className="text-ink-4">from human</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[9px] font-mono px-1.5 py-px rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="pl-3 pr-4 py-2.5 text-[10px] font-mono text-ink-4 whitespace-nowrap text-right">
                            {fmtTime(task.createdAt)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
