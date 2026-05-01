import { useCallback, useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent } from '@shared/types'
import { ClaudeOutput } from './ClaudeOutput'
import { LogPanel } from './LogPanel'
import { InboxOutbox } from './InboxOutbox'
import { ComposeMessage } from './ComposeMessage'

interface Props {
  agent: Agent
  agents: Agent[]
  onChanged: () => void
  onDeleted: () => void
}

const statusDot: Record<Agent['status'], string> = {
  created: 'bg-term-muted',
  starting: 'bg-term-warn animate-pulse',
  running: 'bg-term-ok',
  idle: 'bg-term-accent',
  stopping: 'bg-term-warn animate-pulse',
  stopped: 'bg-term-muted',
  error: 'bg-term-err',
}

const statusLabel: Record<Agent['status'], string> = {
  created: 'READY',
  starting: 'STARTING',
  running: 'RUNNING',
  idle: 'IDLE',
  stopping: 'STOPPING',
  stopped: 'STOPPED',
  error: 'ERROR',
}

export function AgentDetail({ agent, agents, onChanged, onDeleted }: Props) {
  const [busy, setBusy] = useState<'start' | 'stop' | 'delete' | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyError = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [])

  const start = async () => {
    setBusy('start')
    setStartError(null)
    try {
      await agentsApi.start(agent.id)
      onChanged()
    } catch (err) {
      const msg = String(err)
      if (msg.includes('docker_engine') || msg.includes('ENOENT')) {
        setStartError('DOCKER UNREACHABLE — Please start Docker Desktop and retry.')
      } else {
        setStartError(`START FAILED: ${msg}`)
      }
      onChanged()
    } finally {
      setBusy(null)
    }
  }

  const stop = async () => {
    setBusy('stop')
    try {
      await agentsApi.stop(agent.id)
      onChanged()
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!confirm(`DELETE Agent "${agent.name}"? This action cannot be undone.`)) return
    setBusy('delete')
    try {
      await agentsApi.remove(agent.id)
      onDeleted()
    } finally {
      setBusy(null)
    }
  }

  const isRunning = agent.status === 'running' || agent.status === 'starting'

  return (
    <div className="flex flex-1 min-w-0 min-h-0 font-mono">
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-3 py-1.5 border-b border-term-border bg-term-panel flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${statusDot[agent.status]}`} />
          <span className="text-xs text-term-text font-mono uppercase tracking-wider truncate">{agent.name}</span>
          <span className="text-[10px] text-term-muted font-mono">{statusLabel[agent.status]}</span>
          <div className="ml-auto flex gap-1.5 text-[10px] flex-shrink-0">
            {!isRunning && (
              <button
                onClick={start}
                disabled={busy !== null}
                className="px-2 py-1 border border-term-ok rounded-sm text-term-ok hover:bg-term-ok hover:text-black disabled:opacity-40 transition-colors font-mono uppercase"
              >
                {busy === 'start' ? '...' : 'START'}
              </button>
            )}
            {isRunning && (
              <button
                onClick={stop}
                disabled={busy !== null}
                className="px-2 py-1 border border-term-warn rounded-sm text-term-warn hover:bg-term-warn hover:text-black disabled:opacity-40 transition-colors font-mono uppercase"
              >
                {busy === 'stop' ? '...' : 'STOP'}
              </button>
            )}
            <button
              onClick={remove}
              disabled={busy !== null}
              className="px-2 py-1 border border-term-err rounded-sm text-term-err hover:bg-term-err hover:text-black disabled:opacity-40 transition-colors font-mono uppercase"
            >
              {busy === 'delete' ? '[...]' : '[DEL]'}
            </button>
          </div>
        </header>

        {/* Error banners */}
        {startError && (
          <div className="px-3 py-1.5 text-[10px] text-term-err bg-term-err/10 border-b border-term-err/40 flex items-start gap-2 flex-shrink-0 font-mono">
            <span>[!]</span>
            <span className="flex-1">{startError}</span>
            <button
              onClick={() => copyError(startError)}
              className="opacity-60 hover:opacity-100 px-1.5 py-0.5 border border-term-err/40 rounded-sm hover:bg-term-err/20 transition-colors font-mono uppercase text-[9px]"
            >
              {copied ? '[COPIED]' : '[COPY]'}
            </button>
            <button onClick={() => setStartError(null)} className="opacity-60 hover:opacity-100 font-mono">[X]</button>
          </div>
        )}
        {!startError && agent.lastError && (
          <div className="px-3 py-1.5 text-[10px] text-term-err bg-term-err/10 border-b border-term-err/40 flex items-start gap-2 flex-shrink-0 font-mono">
            <span>[!]</span>
            <span className="flex-1">{agent.lastError}</span>
            <button
              onClick={() => copyError(agent.lastError!)}
              className="opacity-60 hover:opacity-100 px-1.5 py-0.5 border border-term-err/40 rounded-sm hover:bg-term-err/20 transition-colors font-mono uppercase text-[9px]"
            >
              {copied ? '[COPIED]' : '[COPY]'}
            </button>
          </div>
        )}

        {/* Claude output — big main area */}
        <ClaudeOutput agentId={agent.id} agentName={agent.name} />

        {/* Collapsible system logs */}
        <LogPanel agentId={agent.id} />

        {/* Compose */}
        <ComposeMessage target={agent} agents={agents} />
      </div>

      {/* Right: inbox/outbox */}
      <div className="w-80 flex-shrink-0 border-l border-term-border">
        <InboxOutbox agent={agent} agents={agents} />
      </div>
    </div>
  )
}
