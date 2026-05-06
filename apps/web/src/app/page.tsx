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

// ─── StatusDot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
        status === 'RUNNING' ? 'bg-[#10b48a]' : 'bg-[#C8C7C3]'
      }`}
    />
  )
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header className="h-11 flex items-center justify-between px-4 border-b border-[#EAE9E4] bg-[#FAFAF8] shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-[5px] bg-[#3D3DF5] flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
            <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
            <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-[#0E0E0C]">Orchestrator</span>
        <span className="h-3.5 w-px bg-[#EAE9E4]" />
        <span className="text-[11px] font-medium text-[#999] px-1.5 py-0.5 bg-[#F0F0EE] rounded border border-[#EAE9E4]">
          local
        </span>
      </div>
      <div className="w-7 h-7 rounded-full bg-[#EAE9E4] flex items-center justify-center">
        <span className="text-[11px] font-semibold text-[#666]">U</span>
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
}: {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: 'all' | 'running' | 'idle'
  onFilterChange: (f: 'all' | 'running' | 'idle') => void
}) {
  const router = useRouter()
  const runningCount = agents.filter((a) => a.status === 'RUNNING').length

  const filtered = agents.filter((a) => {
    if (filter === 'running') return a.status === 'RUNNING'
    if (filter === 'idle') return a.status === 'STOPPED'
    return true
  })

  return (
    <div className="w-[240px] shrink-0 flex flex-col border-r border-[#EAE9E4] bg-[#FAFAF8] overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">Agents</span>
          <span className="text-[10px] font-mono text-[#BBB]">{agents.length}</span>
        </div>
        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {(['all', 'running', 'idle'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                filter === f
                  ? 'bg-[#0E0E0C] text-white'
                  : 'text-[#888] hover:text-[#0E0E0C] hover:bg-[#EEEEED]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'running' ? `Running${runningCount > 0 ? ` ${runningCount}` : ''}` : 'Idle'}
            </button>
          ))}
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-px pb-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[11px] text-[#BBB] py-8">No agents</p>
        ) : (
          filtered.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-md transition-colors text-left ${
                selectedId === agent.id
                  ? 'bg-[#EEEEED] text-[#0E0E0C]'
                  : 'text-[#555] hover:bg-[#F2F2F0] hover:text-[#0E0E0C]'
              }`}
            >
              <span className="mt-[5px]">
                <StatusDot status={agent.status} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate leading-tight">{agent.name}</p>
                <p className="text-[10px] text-[#AAA] truncate mt-0.5 leading-tight">{agent.systemPrompt}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New Agent */}
      <div className="p-2 shrink-0 border-t border-[#EAE9E4]">
        <button
          onClick={() => router.push('/agents/new')}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-[#888] hover:text-[#3D3DF5] hover:bg-[#F0F0FD] rounded-md transition-colors border border-dashed border-[#D4D3CE] hover:border-[#AAAAF0]"
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
  actionLoading,
}: {
  agent: Agent | null
  messages: Message[]
  onSend: (content: string) => void
  onToggle: () => void
  actionLoading: boolean
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center select-none">
          <div className="w-10 h-10 rounded-xl bg-[#F0F0FD] border border-[#D8D8F5] flex items-center justify-center mx-auto mb-3">
            <div className="w-4 h-4 rounded-[3px] bg-[#3D3DF5] opacity-30" />
          </div>
          <p className="text-sm font-medium text-[#888]">Select an agent</p>
          <p className="text-xs text-[#BBB] mt-0.5">Pick one from the left to start</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col border-r border-[#EAE9E4]">
      {/* Header */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-[#EAE9E4] shrink-0 bg-[#FAFAF8]">
        <div className="flex items-center gap-2">
          <StatusDot status={agent.status} />
          <span className="text-sm font-semibold text-[#0E0E0C]">{agent.name}</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full font-mono ${
              agent.status === 'RUNNING'
                ? 'bg-[#D1F5EC] text-[#0d9068]'
                : 'bg-[#F0F0EE] text-[#999]'
            }`}
          >
            {agent.status === 'RUNNING' ? 'running' : 'idle'}
          </span>
        </div>
        <button
          onClick={onToggle}
          disabled={actionLoading}
          className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 ${
            agent.status === 'RUNNING'
              ? 'bg-white border border-[#EAE9E4] text-[#555] hover:bg-[#F5F5F2] hover:text-[#0E0E0C]'
              : 'bg-[#3D3DF5] text-white hover:bg-[#3030e0]'
          }`}
        >
          {actionLoading ? '…' : agent.status === 'RUNNING' ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-[#BBB]">
              {agent.status === 'RUNNING' ? 'No messages yet — send one below.' : 'Start the agent to begin.'}
            </p>
          </div>
        )}

        {messages.map((msg) =>
          msg.direction === 'INBOX' ? (
            /* User bubble — right */
            <div key={msg.id} className="flex items-end gap-2 justify-end">
              <div className="max-w-[70%] rounded-xl rounded-br-sm bg-[#3D3DF5] px-3.5 py-2.5 shadow-sm">
                <p className="text-[13px] text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-indigo-300 mt-1 font-mono text-right">{fmtTime(msg.createdAt)}</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-[#EBEBFF] border border-[#CCCCF5] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-[#3D3DF5]">U</span>
              </div>
            </div>
          ) : (
            /* Agent bubble — left */
            <div key={msg.id} className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0E0E0C] flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-white">C</span>
              </div>
              <div className="max-w-[70%] rounded-xl rounded-bl-sm bg-white border border-[#EAE9E4] px-3.5 py-2.5 shadow-sm">
                <p className="text-[13px] text-[#0E0E0C] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-[#BBB] mt-1 font-mono">{fmtTime(msg.createdAt)}</p>
              </div>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 shrink-0 border-t border-[#EAE9E4] bg-[#FAFAF8]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agent.status === 'RUNNING' ? 'Message…' : 'Start the agent first'}
            disabled={agent.status !== 'RUNNING'}
            className="flex-1 bg-white border border-[#EAE9E4] rounded-lg px-3.5 py-2 text-sm text-[#0E0E0C] placeholder:text-[#C8C7C3] focus:outline-none focus:border-[#3D3DF5] focus:ring-1 focus:ring-[#3D3DF5]/20 transition-colors disabled:opacity-50 disabled:bg-[#F5F5F2]"
          />
          <button
            type="submit"
            disabled={agent.status !== 'RUNNING' || !input.trim()}
            className="bg-[#3D3DF5] hover:bg-[#3030e0] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── InboxOutboxPanel ────────────────────────────────────────────────────────

function InboxOutboxPanel({
  messages,
  agentName,
}: {
  messages: Message[]
  agentName: string | null
}) {
  const [tab, setTab] = useState<'inbox' | 'outbox'>('inbox')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = messages.filter((m) =>
    tab === 'inbox' ? m.direction === 'INBOX' : m.direction === 'OUTBOX'
  )
  const unreadInbox = messages.filter((m) => m.direction === 'INBOX' && !m.processed).length
  const selectedMsg = messages.find((m) => m.id === selectedId) ?? null

  return (
    <div className="w-[320px] shrink-0 flex flex-col border-r border-[#EAE9E4] bg-[#FAFAF8] overflow-hidden">
      {/* Tab header */}
      <div className="h-11 flex items-center gap-1 px-3 border-b border-[#EAE9E4] shrink-0">
        {(['inbox', 'outbox'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              tab === t
                ? 'bg-[#EEEEED] text-[#0E0E0C]'
                : 'text-[#888] hover:text-[#0E0E0C] hover:bg-[#F2F2F0]'
            }`}
          >
            {t === 'inbox' ? 'Inbox' : 'Outbox'}
            {t === 'inbox' && unreadInbox > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#3D3DF5] text-white text-[9px] flex items-center justify-center font-mono leading-none">
                {unreadInbox}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {!agentName ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px] text-[#BBB]">Select an agent</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[11px] text-[#BBB]">No messages</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE9E4]">
            {filtered.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedId(selectedId === msg.id ? null : msg.id)}
                className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-[#F2F2F0] ${
                  selectedId === msg.id ? 'bg-[#F0F0FD]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[#999]">
                    {tab === 'inbox' ? `user → ${agentName}` : `${agentName} → user`}
                  </span>
                  <span className="text-[10px] font-mono text-[#C8C7C3]">{fmtTimeFull(msg.createdAt)}</span>
                </div>
                <p className="text-[11px] text-[#555] line-clamp-2 leading-snug">{msg.content}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`text-[9px] font-medium px-1.5 py-px rounded-full font-mono ${
                      tab === 'inbox' ? 'bg-[#EBEBFF] text-[#3D3DF5]' : 'bg-[#D1F5EC] text-[#0d9068]'
                    }`}
                  >
                    {tab}
                  </span>
                  {tab === 'inbox' && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-px rounded-full ${
                        msg.processed ? 'bg-[#F0F0EE] text-[#AAA]' : 'bg-[#FFF3E0] text-[#C05000]'
                      }`}
                    >
                      {msg.processed ? 'processed' : 'pending'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedMsg && (
        <div className="border-t border-[#EAE9E4] bg-white shrink-0 max-h-[180px] overflow-y-auto">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[9px] font-semibold text-[#AAA] uppercase tracking-widest">Content</span>
            <button
              onClick={() => setSelectedId(null)}
              className="text-[11px] text-[#C8C7C3] hover:text-[#888] leading-none"
            >
              ✕
            </button>
          </div>
          <pre className="px-3 pb-3 text-[11px] font-mono text-[#444] whitespace-pre-wrap break-all leading-relaxed">
            {selectedMsg.content}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── InfraPanel ──────────────────────────────────────────────────────────────

function InfraPanel({
  collapsed,
  onToggle,
  agentsRunning,
  agentsTotal,
}: {
  collapsed: boolean
  onToggle: () => void
  agentsRunning: number
  agentsTotal: number
}) {
  const healthItems = [
    { label: 'Claude Auth', ok: true },
    { label: 'Docker', ok: true },
    { label: 'API Rate', ok: true },
  ]

  return (
    <div
      className={`shrink-0 flex flex-col bg-[#FAFAF8] overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'w-8' : 'w-[240px]'
      }`}
    >
      {/* Toggle row */}
      <div className="h-11 flex items-center px-2 border-b border-[#EAE9E4] shrink-0 gap-1.5">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="w-5 h-5 rounded flex items-center justify-center text-[#AAA] hover:text-[#0E0E0C] hover:bg-[#EEEEED] transition-colors text-xs"
        >
          {collapsed ? '‹' : '›'}
        </button>
        {!collapsed && (
          <span className="text-[9px] font-semibold text-[#AAA] uppercase tracking-widest whitespace-nowrap">
            Infrastructure
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Health */}
          <section>
            <p className="text-[9px] font-semibold text-[#AAA] uppercase tracking-widest mb-2">Health</p>
            <div className="space-y-2">
              {healthItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[#555]">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b48a]" />
                    <span className="text-[10px] font-mono text-[#10b48a]">ok</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Agents */}
          <section>
            <p className="text-[9px] font-semibold text-[#AAA] uppercase tracking-widest mb-2">Agents</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#555]">Running</span>
              <span className="text-[11px] font-mono text-[#0E0E0C]">
                {agentsRunning}/{agentsTotal}
              </span>
            </div>
          </section>
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

  const items = [
    { label: 'claude', value: 'auth', ok: true },
    { label: 'docker', value: 'running', ok: true },
    { label: 'agents', value: `${running}/${agents.length}`, ok: running > 0 },
    { label: 'api', value: 'ok', ok: true },
  ]

  return (
    <div className="h-7 flex items-center px-4 border-t border-[#EAE9E4] bg-[#FAFAF8] shrink-0 gap-5">
      <div className="flex items-center gap-5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-1 h-1 rounded-full shrink-0"
              style={{ background: item.ok ? '#10b48a' : '#C8C7C3' }}
            />
            <span className="text-[10px] font-mono text-[#AAA]">
              {item.label}{' '}
              <span className="text-[#666]">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
      <span className="text-[10px] font-mono text-[#AAA]">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<'all' | 'running' | 'idle'>('all')
  const [infraCollapsed, setInfraCollapsed] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null

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
    if (!selectedAgentId) {
      setMessages([])
      return
    }
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
    const action = selectedAgent.status === 'RUNNING' ? 'stop' : 'start'
    const res = await fetch(`/api/agents/${selectedAgent.id}/${action}`, { method: 'POST' })
    if (res.ok) {
      const updated: Agent = await res.json()
      setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    }
    setActionLoading(false)
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AgentsSidebar
          agents={agents}
          selectedId={selectedAgentId}
          onSelect={setSelectedAgentId}
          filter={filter}
          onFilterChange={setFilter}
        />
        <ChatPanel
          agent={selectedAgent}
          messages={messages}
          onSend={sendMessage}
          onToggle={toggleAgent}
          actionLoading={actionLoading}
        />
        <InboxOutboxPanel messages={messages} agentName={selectedAgent?.name ?? null} />
        <InfraPanel
          collapsed={infraCollapsed}
          onToggle={() => setInfraCollapsed((c) => !c)}
          agentsRunning={agents.filter((a) => a.status === 'RUNNING').length}
          agentsTotal={agents.length}
        />
      </div>
      <StatusBar agents={agents} />
    </div>
  )
}
