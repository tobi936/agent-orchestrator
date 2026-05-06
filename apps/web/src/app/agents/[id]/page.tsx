'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
  createdAt: string
}

export default function AgentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [tab, setTab] = useState<'messages' | 'logs'>('messages')
  const [actionLoading, setActionLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const sseRef = useRef<EventSource | null>(null)

  const fetchAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`)
    if (!res.ok) { router.push('/'); return }
    setAgent(await res.json())
  }, [id, router])

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}/messages`)
    if (res.ok) setMessages(await res.json())
  }, [id])

  useEffect(() => {
    fetchAgent()
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [fetchAgent, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // SSE log stream — connect when agent is running and logs tab is active
  useEffect(() => {
    if (agent?.status === 'RUNNING' && tab === 'logs') {
      sseRef.current?.close()
      const es = new EventSource(`/api/agents/${id}/logs`)
      es.onmessage = (e) => setLogs((prev) => [...prev, JSON.parse(e.data)])
      es.onerror = () => es.close()
      sseRef.current = es
      return () => es.close()
    } else {
      sseRef.current?.close()
    }
  }, [agent?.status, tab, id])

  async function toggleAgent() {
    if (!agent) return
    setActionLoading(true)
    const action = agent.status === 'RUNNING' ? 'stop' : 'start'
    const res = await fetch(`/api/agents/${id}/${action}`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setAgent(updated)
      if (action === 'start') setLogs([])
    }
    setActionLoading(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const content = input.trim()
    setInput('')
    await fetch(`/api/agents/${id}/inbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    fetchMessages()
  }

  async function deleteAgent() {
    if (!confirm(`Delete agent "${agent?.name}"?`)) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  if (!agent) {
    return <div className="text-zinc-500 text-sm">Loading…</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                agent.status === 'RUNNING'
                  ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              {agent.status === 'RUNNING' ? 'Running' : 'Stopped'}
            </span>
          </div>
          <p className="text-zinc-400 text-sm">{agent.systemPrompt}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={toggleAgent}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              agent.status === 'RUNNING'
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white'
            }`}
          >
            {actionLoading ? '…' : agent.status === 'RUNNING' ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={deleteAgent}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 mb-4">
        {(['messages', 'logs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'text-indigo-400 border-b-2 border-indigo-400 -mb-px'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          <div className="space-y-3 mb-4 min-h-[200px] max-h-[420px] overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-zinc-500 text-sm text-center py-8">
                {agent.status === 'RUNNING'
                  ? 'No messages yet. Send one below.'
                  : 'Start the agent first, then send a message.'}
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'INBOX' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.direction === 'INBOX'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.direction === 'INBOX' ? 'text-indigo-300' : 'text-zinc-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={agent.status === 'RUNNING' ? 'Send a message…' : 'Start the agent to send messages'}
              disabled={agent.status !== 'RUNNING'}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={agent.status !== 'RUNNING' || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Logs tab */}
      {tab === 'logs' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 min-h-[200px] max-h-[460px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-zinc-600">
              {agent.status === 'RUNNING' ? 'Waiting for logs…' : 'Agent is not running.'}
            </p>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="leading-5">{line}</div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}
