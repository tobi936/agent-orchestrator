'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = 'STOPPED' | 'RUNNING'
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE'

interface Agent {
  id: string
  name: string
  systemPrompt: string
  provider: string
  model: string
  maxToolIterations: number
  repoUrl: string | null
  status: AgentStatus
  containerId: string | null
}

interface TaskMessage {
  id: string
  taskId: string
  role: 'user' | 'agent'
  content: string
  createdAt: string
}

interface Task {
  id: string
  agentId: string
  fromAgentId: string | null
  fromAgent?: { id: string; name: string } | null
  agent?: { id: string; name: string }
  title: string
  content: string
  status: TaskStatus
  forHuman: boolean
  createdAt: string
  thread: TaskMessage[]
}

interface ToolEvent {
  id: string
  type: 'call' | 'result' | 'log' | 'think'
  name?: string
  input?: Record<string, string>
  result?: string
  ok?: boolean
  text?: string
  ts: number
}

type SidebarView = 'agents' | 'human'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusColor(status: TaskStatus) {
  if (status === 'PENDING') return 'bg-orange-bg text-orange-fg'
  if (status === 'IN_PROGRESS') return 'bg-accent-bg text-accent-fg'
  return 'bg-green-bg text-green-fg'
}

// ─── MarkdownContent ─────────────────────────────────────────────────────────

function MarkdownContent({ content, light }: { content: string; light?: boolean }) {
  const prose = light ? 'text-white' : 'text-ink'
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className={`text-[13px] leading-relaxed mb-1.5 last:mb-0 ${prose}`}>{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 last:mb-0 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className={`text-[13px] leading-relaxed ${prose}`}>{children}</li>,
        h1: ({ children }) => <h1 className={`text-[15px] font-bold leading-snug mb-1.5 ${prose}`}>{children}</h1>,
        h2: ({ children }) => <h2 className={`text-[14px] font-semibold leading-snug mb-1.5 ${prose}`}>{children}</h2>,
        h3: ({ children }) => <h3 className={`text-[13px] font-semibold leading-snug mb-1 ${prose}`}>{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <code className={`block text-[11px] font-mono bg-black/10 dark:bg-white/10 rounded px-2 py-1.5 whitespace-pre-wrap break-all leading-relaxed ${light ? 'text-white/90' : 'text-ink-2'}`}>
                {children}
              </code>
            )
          }
          return <code className={`text-[11px] font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 ${light ? 'text-white/90' : 'text-ink-2'}`}>{children}</code>
        },
        pre: ({ children }) => <pre className="mb-1.5 last:mb-0 overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className={`border-l-2 ${light ? 'border-white/40 pl-3 opacity-80' : 'border-line pl-3 text-ink-3'} text-[13px] leading-relaxed mb-1.5`}>
            {children}
          </blockquote>
        ),
        strong: ({ children }) => <strong className={`font-semibold ${prose}`}>{children}</strong>,
        em: ({ children }) => <em className={`italic ${prose}`}>{children}</em>,
        hr: () => <hr className={`my-2 ${light ? 'border-white/20' : 'border-line'}`} />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-2 ${light ? 'text-white/80 hover:text-white' : 'text-accent hover:opacity-80'}`}>
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
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

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${status === 'RUNNING' ? 'bg-green' : 'bg-ink-4'}`} />
  )
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  return (
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
        <span className="text-sm font-semibold tracking-tight text-ink">Orchestrator</span>
        <span className="h-3.5 w-px bg-line hidden sm:block" />
        <span className="hidden sm:inline text-[11px] font-medium text-ink-3 px-1.5 py-0.5 bg-hover rounded border border-line">dev</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onToggleDark} title={isDark ? 'Light mode' : 'Dark mode'} className="w-7 h-7 rounded-md flex items-center justify-center text-ink-3 hover:text-ink hover:bg-hover transition-colors">
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="w-7 h-7 rounded-full bg-hover border border-line flex items-center justify-center">
          <span className="text-[11px] font-semibold text-ink-2">U</span>
        </div>
      </div>
    </header>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  agents,
  selectedAgentId,
  onSelectAgent,
  view,
  onViewChange,
  filter,
  onFilterChange,
  humanTaskCount,
  mobileVisible,
}: {
  agents: Agent[]
  selectedAgentId: string | null
  onSelectAgent: (id: string) => void
  view: SidebarView
  onViewChange: (v: SidebarView) => void
  filter: 'all' | 'running' | 'idle'
  onFilterChange: (f: 'all' | 'running' | 'idle') => void
  humanTaskCount: number
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
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex w-full md:w-[240px] shrink-0 flex-col border-r border-line sidebar-panel overflow-hidden`}>
      {/* Human inbox button */}
      <button
        onClick={() => onViewChange('human')}
        className={`mx-2 mt-2 mb-1 flex items-center gap-2 px-2.5 py-2 rounded-md transition-colors text-left ${
          view === 'human' ? 'bg-selected text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink'
        }`}
      >
        <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
            <circle cx="5.5" cy="3.5" r="1.8" />
            <path d="M1.5 9.5c0-2.2 1.8-4 4-4s4 1.8 4 4" />
          </svg>
        </span>
        <span className="text-[12px] font-medium flex-1">Human Inbox</span>
        {humanTaskCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-mono leading-none">
            {humanTaskCount > 9 ? '9+' : humanTaskCount}
          </span>
        )}
      </button>

      <div className="h-px bg-line mx-2 my-1" />

      {/* Agents list */}
      <div className="px-3 pt-2 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Agents</span>
          <span className="text-[10px] font-mono text-ink-4">{agents.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'running', 'idle'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { onFilterChange(f); onViewChange('agents') }}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                view === 'agents' && filter === f ? 'bg-ink text-bg' : 'text-ink-3 hover:text-ink hover:bg-hover'
              }`}
            >
              {f === 'all' ? 'All' : f === 'running' ? `Running${runningCount > 0 ? ` ${runningCount}` : ''}` : 'Idle'}
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
              onClick={() => { onSelectAgent(agent.id); onViewChange('agents') }}
              className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-md transition-colors text-left ${
                view === 'agents' && selectedAgentId === agent.id ? 'bg-selected text-ink' : 'text-ink-2 hover:bg-hover hover:text-ink'
              }`}
            >
              <span className="mt-[5px]"><StatusDot status={agent.status} /></span>
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

// ─── Tool Events ──────────────────────────────────────────────────────────────

function ToolEventRow({ event }: { event: ToolEvent }) {
  const [expanded, setExpanded] = useState(false)

  if (event.type === 'log') {
    return (
      <div className="flex items-start gap-2 px-1">
        <span className="w-4 h-4 rounded flex items-center justify-center bg-hover text-ink-4 shrink-0 mt-0.5">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><circle cx="4.5" cy="4.5" r="1.5" fill="currentColor"/></svg>
        </span>
        <span className="text-[11px] font-mono text-ink-4 leading-tight break-all">{event.text}</span>
      </div>
    )
  }

  if (event.type === 'think') {
    return (
      <div className="flex items-start gap-2 px-1">
        <span className="w-4 h-4 rounded flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-500 shrink-0 mt-0.5">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 3.5v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><circle cx="4.5" cy="6.2" r="0.4" fill="currentColor"/></svg>
        </span>
        <div className="text-left min-w-0 flex-1">
          <button onClick={() => setExpanded((v) => !v)} className="text-left w-full">
            <span className="text-[11px] font-mono text-purple-500 dark:text-purple-400 italic truncate block hover:text-purple-400 transition-colors">
              thinking{expanded ? '' : ': ' + (event.text ?? '').slice(0, 60) + ((event.text?.length ?? 0) > 60 ? '…' : '')}
            </span>
          </button>
          <div className={`grid transition-all duration-200 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <p className="mt-1 text-[11px] text-ink-3 leading-relaxed whitespace-pre-wrap">{event.text}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isCall = event.type === 'call'
  const label = isCall
    ? `${event.name}: ${Object.values(event.input ?? {}).join(', ').slice(0, 60)}`
    : `${event.name} — ${event.ok ? 'ok' : 'error'}`

  return (
    <div className="flex items-start gap-2 px-1">
      <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
        {isCall ? (
          <span className="w-4 h-4 rounded flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 4.5h7M5 1.5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        ) : (
          <span className={`w-4 h-4 rounded flex items-center justify-center ${event.ok ? 'bg-green-bg text-green-fg' : 'bg-red-100 dark:bg-red-900/40 text-red-500'}`}>
            {event.ok
              ? <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 2l5 5M7 2L2 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={() => setExpanded((v) => !v)} className="text-left w-full">
          <span className="text-[11px] font-mono text-ink-3 hover:text-ink-2 transition-colors truncate block">{label}</span>
        </button>
        <div className={`grid transition-all duration-200 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            {isCall && event.input && (
              <pre className="mt-1 text-[10px] font-mono text-ink-3 bg-raised border border-line rounded p-2 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {JSON.stringify(event.input, null, 2)}
              </pre>
            )}
            {!isCall && event.result && (
              <pre className="mt-1 text-[10px] font-mono text-ink-3 bg-raised border border-line rounded p-2 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                {event.result}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityBox({ toolEvents }: { toolEvents: ToolEvent[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-line rounded-lg bg-surface overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-hover transition-colors">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Activity</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`ml-auto text-ink-4 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-line px-3 py-2 space-y-1.5 max-h-80 overflow-y-auto">
            {toolEvents.map((ev) => <ToolEventRow key={ev.id} event={ev} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TaskThread (main chat area for a selected task) ─────────────────────────

function TaskThread({
  task,
  agent,
  toolEvents,
  onSendReply,
  onBack,
  mobileVisible,
}: {
  task: Task
  agent: Agent
  toolEvents: ToolEvent[]
  onSendReply: (taskId: string, content: string) => void
  onBack: () => void
  mobileVisible: boolean
}) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [task.thread.length, toolEvents.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    onSendReply(task.id, input.trim())
    setInput('')
  }

  const canReply = task.forHuman || task.status === 'DONE'

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-line`}>
      <div className="h-11 px-4 flex items-center gap-3 border-b border-line shrink-0 bg-raised">
        <button onClick={onBack} className="text-ink-3 hover:text-ink transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusDot status={agent.status} />
          <span className="text-sm font-semibold text-ink truncate">{agent.name}</span>
          <span className="text-ink-4 text-[11px]">/</span>
          <span className="text-[12px] text-ink-2 truncate">{task.title}</span>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-px rounded-full shrink-0 ${statusColor(task.status)}`}>
          {task.status.toLowerCase().replace('_', ' ')}
        </span>
        {task.forHuman && (
          <span className="text-[10px] font-mono px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
            waiting for you
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 chat-bg">
        {/* Initial task */}
        <div className="flex items-end gap-2 justify-end">
          <div className="max-w-[70%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2.5 shadow-sm dark:shadow-none">
            <p className="text-[10px] text-white/60 mb-1 font-mono">
              {task.fromAgent ? `from ${task.fromAgent.name}` : 'from human'} · {fmtTime(task.createdAt)}
            </p>
            <MarkdownContent content={task.content} light />
          </div>
          <div className="w-6 h-6 rounded-full bg-accent-bg border border-accent-bdr flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-accent-fg">{task.fromAgent ? 'A' : 'U'}</span>
          </div>
        </div>

        {/* Thread messages */}
        {task.thread.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex items-end gap-2 justify-end">
              <div className="max-w-[70%] rounded-xl rounded-br-sm bg-accent px-3.5 py-2.5 shadow-sm dark:shadow-none">
                <MarkdownContent content={msg.content} light />
                <p className="text-[10px] text-white/50 font-mono mt-1">{fmtTime(msg.createdAt)}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-accent-bg border border-accent-bdr flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-accent-fg">U</span>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-bg">A</span>
              </div>
              <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-raised border border-line px-3.5 py-2.5 shadow-sm dark:shadow-none">
                <MarkdownContent content={msg.content} />
                <p className="text-[10px] text-ink-3 font-mono mt-1">{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
          )
        )}

        {toolEvents.length > 0 && <ActivityBox toolEvents={toolEvents} />}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-3 shrink-0 border-t border-line bg-raised">
        {task.forHuman ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Reply to agent…"
              className="flex-1 bg-raised border border-amber-300 dark:border-amber-700 rounded-lg px-3.5 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <button type="submit" disabled={!input.trim()} className="bg-amber-500 hover:opacity-90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity">
              Reply
            </button>
          </form>
        ) : canReply ? (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Follow-up message…"
              className="flex-1 bg-raised border border-line rounded-lg px-3.5 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
            />
            <button type="submit" disabled={!input.trim()} className="bg-accent hover:opacity-90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity">
              Send
            </button>
          </form>
        ) : (
          <p className="text-[11px] text-ink-4 text-center">
            {task.status === 'IN_PROGRESS' ? 'Agent is working…' : 'Task pending — agent will pick it up shortly.'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── AgentChat (no task selected — shows agent overview + send new task) ──────

function AgentChat({
  agent,
  tasks,
  onSendTask,
  onSelectTask,
  onToggle,
  onDelete,
  actionLoading,
  toolEvents,
  mobileVisible,
}: {
  agent: Agent | null
  tasks: Task[]
  onSendTask: (content: string) => void
  onSelectTask: (taskId: string) => void
  onToggle: () => void
  onDelete: () => void
  actionLoading: boolean
  toolEvents: ToolEvent[]
  mobileVisible: boolean
}) {
  const [input, setInput] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !agent || agent.status !== 'RUNNING') return
    onSendTask(input.trim())
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
          <p className="text-xs text-ink-3 mt-0.5">Pick one from the left to start</p>
        </div>
      </div>
    )
  }

  const activeTasks = tasks.filter((t) => t.status !== 'DONE')
  const doneTasks = tasks.filter((t) => t.status === 'DONE')

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-line`}>
      <div className="h-11 px-4 flex items-center justify-between border-b border-line shrink-0 bg-raised">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className="text-sm font-semibold text-ink">{agent.name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full font-mono ${agent.status === 'RUNNING' ? 'bg-green-bg text-green-fg' : 'bg-hover text-ink-3'}`}>
            {agent.status === 'RUNNING' ? 'running' : 'idle'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onToggle} disabled={actionLoading} className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 ${agent.status === 'RUNNING' ? 'bg-raised border border-line text-ink-2 hover:bg-hover hover:text-ink' : 'bg-accent text-white hover:opacity-90'}`}>
            {actionLoading ? '…' : agent.status === 'RUNNING' ? 'Stop' : 'Start'}
          </button>
          <button onClick={onDelete} disabled={actionLoading || agent.status === 'RUNNING'} title="Delete agent" className="text-[11px] font-medium px-2 py-1 rounded-md text-ink-3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {toolEvents.length > 0 && <ActivityBox toolEvents={toolEvents} />}

        {activeTasks.length === 0 && doneTasks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-ink-3">
              {agent.status === 'RUNNING' ? 'No tasks — send one below.' : 'Start the agent to begin.'}
            </p>
          </div>
        )}

        {activeTasks.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-1.5">Active</p>
            <div className="space-y-1.5">
              {activeTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
              ))}
            </div>
          </div>
        )}

        {doneTasks.length > 0 && (
          <div>
            <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-1.5 mt-3">Done</p>
            <div className="space-y-1.5">
              {doneTasks.slice(0, 10).map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 shrink-0 border-t border-line bg-raised">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agent.status === 'RUNNING' ? 'New task…' : 'Start the agent first'}
            disabled={agent.status !== 'RUNNING'}
            className="flex-1 bg-raised border border-line rounded-lg px-3.5 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:bg-hover"
          />
          <button type="submit" disabled={agent.status !== 'RUNNING' || !input.trim()} className="bg-accent hover:opacity-90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-opacity">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg border border-line bg-surface hover:bg-hover transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-[12px] font-medium text-ink truncate flex-1">{task.title}</p>
        <span className={`text-[9px] font-mono px-1.5 py-px rounded-full shrink-0 ${statusColor(task.status)}`}>
          {task.status.toLowerCase().replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-ink-3 line-clamp-1 flex-1">{task.content}</p>
        {task.forHuman && (
          <span className="text-[9px] font-mono px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
            needs you
          </span>
        )}
        <span className="text-[10px] font-mono text-ink-4 shrink-0">{fmtTime(task.createdAt)}</span>
      </div>
      {task.thread.length > 0 && (
        <p className="text-[10px] text-ink-4 mt-1">{task.thread.length} message{task.thread.length !== 1 ? 's' : ''}</p>
      )}
    </button>
  )
}

// ─── HumanInbox ───────────────────────────────────────────────────────────────

function HumanInbox({
  humanTasks,
  agents,
  onSelectTask,
  mobileVisible,
}: {
  humanTasks: Task[]
  agents: Agent[]
  onSelectTask: (agentId: string, taskId: string) => void
  mobileVisible: boolean
}) {
  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-line`}>
      <div className="h-11 px-4 flex items-center border-b border-line shrink-0 bg-raised">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <circle cx="7" cy="4.5" r="2.3" />
            <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" />
          </svg>
          <span className="text-sm font-semibold text-ink">Human Inbox</span>
          {humanTasks.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {humanTasks.length} pending
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {humanTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm font-medium text-ink-2">All clear</p>
              <p className="text-xs text-ink-3 mt-0.5">No agents waiting for your input</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {humanTasks.map((task) => {
              const agent = agents.find((a) => a.id === task.agentId)
              const lastMsg = task.thread[task.thread.length - 1]
              return (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.agentId, task.id)}
                  className="w-full text-left px-3 py-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={agent?.status ?? 'STOPPED'} />
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{agent?.name ?? 'Unknown agent'}</span>
                    <span className="text-[10px] font-mono text-ink-4 ml-auto">{fmtTime(task.createdAt)}</span>
                  </div>
                  <p className="text-[12px] font-medium text-ink mb-0.5">{task.title}</p>
                  {lastMsg && (
                    <p className="text-[11px] text-ink-3 line-clamp-2">{lastMsg.content}</p>
                  )}
                  <div className="mt-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-px rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      tap to reply
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TaskBacklogPanel ─────────────────────────────────────────────────────────

const VALID_PROVIDERS = ['ollama', 'anthropic', 'openai'] as const

function TaskBacklogPanel({
  tasks,
  agentName,
  tab,
  onTabChange,
  selectedTaskId,
  onSelectTask,
  outboxTasks,
  agentsRunning,
  agentsTotal,
  selectedAgent,
  onAgentUpdated,
  mobileVisible,
}: {
  tasks: Task[]
  agentName: string | null
  tab: 'inbox' | 'outbox' | 'infra'
  onTabChange: (t: 'inbox' | 'outbox' | 'infra') => void
  selectedTaskId: string | null
  onSelectTask: (id: string) => void
  outboxTasks: Task[]
  agentsRunning: number
  agentsTotal: number
  selectedAgent: Agent | null
  onAgentUpdated: (agent: Agent) => void
  mobileVisible: boolean
}) {
  const [editName, setEditName] = useState('')
  const [editSystemPrompt, setEditSystemPrompt] = useState('')
  const [editProvider, setEditProvider] = useState('')
  const [editModel, setEditModel] = useState('')
  const [editMaxToolIterations, setEditMaxToolIterations] = useState(50)
  const [editRepoUrl, setEditRepoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (selectedAgent) {
      setEditName(selectedAgent.name)
      setEditSystemPrompt(selectedAgent.systemPrompt)
      setEditProvider(selectedAgent.provider)
      setEditModel(selectedAgent.model)
      setEditMaxToolIterations(selectedAgent.maxToolIterations)
      setEditRepoUrl(selectedAgent.repoUrl ?? '')
      setSaveError('')
    }
  }, [selectedAgent?.id])

  async function handleSave() {
    if (!selectedAgent) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, systemPrompt: editSystemPrompt, provider: editProvider, model: editModel, maxToolIterations: editMaxToolIterations, repoUrl: editRepoUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`)
      onAgentUpdated(data)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    }
    setSaving(false)
  }

  const inboxPending = tasks.filter((t) => t.status !== 'DONE').length

  const displayTasks = tab === 'outbox' ? outboxTasks : tasks

  return (
    <div className={`${mobileVisible ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] shrink-0 flex-col inbox-panel overflow-hidden`}>
      <div className="h-11 flex items-center gap-1 px-3 border-b border-line shrink-0">
        {(['inbox', 'outbox', 'infra'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${tab === t ? 'bg-selected text-ink' : 'text-ink-3 hover:text-ink hover:bg-hover'}`}
          >
            {t === 'inbox' ? 'Inbox' : t === 'outbox' ? 'Outbox' : 'Infra'}
            {t === 'inbox' && inboxPending > 0 && (
              <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] flex items-center justify-center font-mono leading-none">
                {inboxPending}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'infra' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          <section>
            <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-2.5">Agents</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-2">Running</span>
              <span className="text-[11px] font-mono text-ink">{agentsRunning}/{agentsTotal}</span>
            </div>
          </section>
          {selectedAgent && (
            <section>
              <p className="text-[9px] font-semibold text-ink-3 uppercase tracking-widest mb-2.5">Agent Settings</p>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">Name</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">System Prompt</label>
                  <textarea value={editSystemPrompt} onChange={(e) => setEditSystemPrompt(e.target.value)} rows={4} className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-accent resize-none font-sans" />
                </div>
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">Provider</label>
                  <select value={editProvider} onChange={(e) => setEditProvider(e.target.value)} className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-accent">
                    {VALID_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">Model</label>
                  <input value={editModel} onChange={(e) => setEditModel(e.target.value)} className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink font-mono focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">Max Tool Iterations</label>
                  <input type="number" min={1} max={500} value={editMaxToolIterations} onChange={(e) => setEditMaxToolIterations(Number(e.target.value))} className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-[10px] text-ink-3 mb-1">GitHub Repo</label>
                  <input value={editRepoUrl} onChange={(e) => setEditRepoUrl(e.target.value)} placeholder="https://github.com/…" className="w-full bg-raised border border-line rounded px-2 py-1.5 text-[11px] text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent" />
                </div>
                {saveError && <p className="text-[10px] text-red-500">{saveError}</p>}
                <button onClick={handleSave} disabled={saving} className="w-full py-1.5 rounded bg-accent text-white text-[11px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {tab !== 'infra' && (
        <div className="flex-1 overflow-y-auto">
          {!agentName ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] text-ink-3">Select an agent</p>
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] text-ink-3">No {tab} tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {displayTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-hover ${selectedTaskId === task.id ? 'bg-accent-bg' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-[12px] font-medium text-ink truncate flex-1">{task.title}</p>
                    <span className={`text-[9px] font-mono px-1.5 py-px rounded-full shrink-0 ${statusColor(task.status)}`}>
                      {task.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-3 line-clamp-2 leading-snug">{task.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.forHuman && (
                      <span className="text-[9px] font-mono px-1.5 py-px rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">needs you</span>
                    )}
                    {tab === 'outbox' && task.agent && (
                      <span className="text-[9px] text-ink-4">→ {task.agent.name}</span>
                    )}
                    {tab === 'inbox' && task.fromAgent && (
                      <span className="text-[9px] text-ink-4">from {task.fromAgent.name}</span>
                    )}
                    <span className="text-[10px] font-mono text-ink-4 ml-auto">{fmtTime(task.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
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
  return (
    <div className="h-7 hidden md:flex items-center px-4 border-t border-line bg-raised shrink-0 gap-5">
      <div className="flex items-center gap-5 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-1 h-1 rounded-full shrink-0 ${running > 0 ? 'bg-green' : 'bg-ink-4'}`} />
          <span className="text-[10px] font-mono text-ink-3">agents <span className="text-ink-2">{running}/{agents.length}</span></span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-ink-3">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
    </div>
  )
}

// ─── MobileNav ───────────────────────────────────────────────────────────────

function MobileNav({ active, onChange, humanCount }: { active: 'agents' | 'chat' | 'tasks'; onChange: (p: 'agents' | 'chat' | 'tasks') => void; humanCount: number }) {
  const tabs = [
    { id: 'agents' as const, label: 'Agents', icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="3" /><path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" /></svg> },
    { id: 'chat' as const, label: 'Chat', icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6l-4 3V4a1 1 0 0 1 1-1z" /></svg> },
    { id: 'tasks' as const, label: 'Tasks', icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l2-7h10l2 7H2z" /><path d="M2 12h4a3 3 0 0 0 6 0h4" /></svg> },
  ]
  return (
    <nav className="md:hidden flex items-center border-t border-line bg-raised shrink-0 h-14">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${active === tab.id ? 'text-accent' : 'text-ink-3'}`}>
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
          {tab.id === 'tasks' && humanCount > 0 && (
            <span className="absolute top-2 right-1/4 translate-x-2 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-mono leading-none">{humanCount > 9 ? '9+' : humanCount}</span>
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
  const [tasks, setTasks] = useState<Task[]>([])
  const [outboxTasks, setOutboxTasks] = useState<Task[]>([])
  const [humanTasks, setHumanTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [filter, setFilter] = useState<'all' | 'running' | 'idle'>('all')
  const [actionLoading, setActionLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'agents' | 'chat' | 'tasks'>('agents')
  const [error, setError] = useState<string | null>(null)
  const [sidebarView, setSidebarView] = useState<SidebarView>('agents')
  const [backlogTab, setBacklogTab] = useState<'inbox' | 'outbox' | 'infra'>('inbox')
  const toolEventCounter = useRef(0)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null

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

  const fetchTasks = useCallback(async () => {
    if (!selectedAgentId) { setTasks([]); setOutboxTasks([]); return }
    const [inboxRes, outboxRes] = await Promise.all([
      fetch(`/api/agents/${selectedAgentId}/tasks`),
      fetch(`/api/agents/${selectedAgentId}/tasks?direction=outbox`),
    ])
    if (inboxRes.ok) setTasks(await inboxRes.json())
    if (outboxRes.ok) setOutboxTasks(await outboxRes.json())
  }, [selectedAgentId])

  const fetchHumanTasks = useCallback(async () => {
    const res = await fetch('/api/human/tasks')
    if (res.ok) setHumanTasks(await res.json())
  }, [])

  const refreshSelectedTask = useCallback(async () => {
    if (!selectedAgentId || !selectedTaskId) return
    const res = await fetch(`/api/agents/${selectedAgentId}/tasks/${selectedTaskId}`)
    if (res.ok) {
      const updated: Task = await res.json()
      setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    }
  }, [selectedAgentId, selectedTaskId])

  useEffect(() => {
    fetchAgents()
    const t = setInterval(fetchAgents, 5000)
    return () => clearInterval(t)
  }, [fetchAgents])

  useEffect(() => {
    fetchTasks()
    fetchHumanTasks()
    const t = setInterval(() => { fetchTasks(); fetchHumanTasks() }, 3000)
    return () => clearInterval(t)
  }, [fetchTasks, fetchHumanTasks])

  useEffect(() => {
    if (selectedTaskId) {
      const t = setInterval(refreshSelectedTask, 2000)
      return () => clearInterval(t)
    }
  }, [selectedTaskId, refreshSelectedTask])

  useEffect(() => {
    setToolEvents([])
    setSelectedTaskId(null)
  }, [selectedAgentId])

  useEffect(() => {
    if (!selectedAgentId) return
    const agent = agents.find((a) => a.id === selectedAgentId)
    if (agent?.status !== 'RUNNING') return

    const es = new EventSource(`/api/agents/${selectedAgentId}/logs`)
    es.onmessage = (e) => {
      try {
        const line: string = JSON.parse(e.data)
        const id = `te-${++toolEventCounter.current}`
        const ts = Date.now()
        if (line.startsWith('[TOOL]')) {
          const payload = JSON.parse(line.slice(6)) as { type: 'call' | 'result'; name: string; input?: Record<string, string>; result?: string; ok?: boolean }
          setToolEvents((prev) => [...prev.slice(-199), { id, ts, ...payload }])
        } else if (line.startsWith('[THINK]')) {
          const text = line.slice(7).trim()
          if (text) setToolEvents((prev) => [...prev.slice(-199), { id, ts, type: 'think', text }])
        } else if (line.trim()) {
          setToolEvents((prev) => [...prev.slice(-199), { id, ts, type: 'log', text: line.trim() }])
        }
      } catch { /* ignore */ }
    }
    return () => es.close()
  }, [selectedAgentId, agents])

  async function toggleAgent() {
    if (!selectedAgent) return
    setActionLoading(true)
    setError(null)
    const action = selectedAgent.status === 'RUNNING' ? 'stop' : 'start'
    try {
      const res = await fetch(`/api/agents/${selectedAgent.id}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setAgents((prev) => prev.map((a) => (a.id === data.id ? data : a)))
      else setError(data?.error ?? `Failed to ${action} agent`)
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

  async function sendTask(content: string) {
    if (!selectedAgentId) return
    await fetch(`/api/agents/${selectedAgentId}/inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    fetchTasks()
  }

  async function sendReply(taskId: string, content: string) {
    if (!selectedAgentId) return
    await fetch(`/api/agents/${selectedAgentId}/tasks/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    refreshSelectedTask()
  }

  function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId)
    setMobilePanel('chat')
  }

  function handleSelectHumanTask(agentId: string, taskId: string) {
    setSidebarView('agents')
    setSelectedAgentId(agentId)
    setSelectedTaskId(taskId)
    setMobilePanel('chat')
  }

  function handleBackToAgent() {
    setSelectedTaskId(null)
  }

  const showTaskThread = selectedTask && selectedAgent
  const showHumanInbox = sidebarView === 'human'

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
        <Sidebar
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => { setSelectedAgentId(id); setSidebarView('agents'); setMobilePanel('chat') }}
          view={sidebarView}
          onViewChange={setSidebarView}
          filter={filter}
          onFilterChange={setFilter}
          humanTaskCount={humanTasks.length}
          mobileVisible={mobilePanel === 'agents'}
        />

        {showHumanInbox ? (
          <HumanInbox
            humanTasks={humanTasks}
            agents={agents}
            onSelectTask={handleSelectHumanTask}
            mobileVisible={mobilePanel === 'chat'}
          />
        ) : showTaskThread ? (
          <TaskThread
            task={selectedTask}
            agent={selectedAgent}
            toolEvents={toolEvents}
            onSendReply={sendReply}
            onBack={handleBackToAgent}
            mobileVisible={mobilePanel === 'chat'}
          />
        ) : (
          <AgentChat
            agent={selectedAgent}
            tasks={tasks}
            onSendTask={sendTask}
            onSelectTask={handleSelectTask}
            onToggle={toggleAgent}
            onDelete={deleteAgent}
            actionLoading={actionLoading}
            toolEvents={toolEvents}
            mobileVisible={mobilePanel === 'chat'}
          />
        )}

        <TaskBacklogPanel
          tasks={tasks}
          agentName={selectedAgent?.name ?? null}
          tab={backlogTab}
          onTabChange={setBacklogTab}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
          outboxTasks={outboxTasks}
          agentsRunning={agents.filter((a) => a.status === 'RUNNING').length}
          agentsTotal={agents.length}
          selectedAgent={selectedAgent}
          onAgentUpdated={(updated) => setAgents((prev) => prev.map((a) => a.id === updated.id ? updated : a))}
          mobileVisible={mobilePanel === 'tasks'}
        />
      </div>
      <StatusBar agents={agents} />
      <MobileNav active={mobilePanel} onChange={setMobilePanel} humanCount={humanTasks.length} />
    </div>
  )
}
