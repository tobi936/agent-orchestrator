import { useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent } from '@shared/types'
import { AgentConsole } from './AgentConsole'
import { InboxOutbox } from './InboxOutbox'
import { ComposeMessage } from './ComposeMessage'

interface Props {
  agent: Agent
  agents: Agent[]
  onChanged: () => void
  onDeleted: () => void
}

const statusLabel: Record<Agent['status'], string> = {
  created: 'created',
  starting: 'starting…',
  running: 'running',
  idle: 'idle',
  stopping: 'stopping…',
  stopped: 'stopped',
  error: 'error',
}

export function AgentDetail({ agent, agents, onChanged, onDeleted }: Props) {
  const [busy, setBusy] = useState<'start' | 'stop' | 'delete' | null>(null)

  const start = async () => {
    setBusy('start')
    try {
      await agentsApi.start(agent.id)
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
    if (!confirm(`Delete agent "${agent.name}" and remove its container?`)) return
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
    <div className="flex flex-col flex-1 min-w-0">
      <header className="flex items-center gap-3 px-3 py-2 border-b border-term-border bg-term-panel">
        <div className="flex flex-col">
          <span className="text-sm text-term-text">{agent.name}</span>
          <span className="text-[10px] text-term-muted">
            {agent.id} · model {agent.model} · {statusLabel[agent.status]}
          </span>
        </div>
        <div className="ml-auto flex gap-2 text-xs">
          {!isRunning && (
            <button
              onClick={start}
              disabled={busy !== null}
              className="px-3 py-1 border border-term-ok rounded text-term-ok hover:bg-term-ok hover:text-term-bg disabled:opacity-40"
            >
              {busy === 'start' ? 'starting…' : '▶ start'}
            </button>
          )}
          {isRunning && (
            <button
              onClick={stop}
              disabled={busy !== null}
              className="px-3 py-1 border border-term-warn rounded text-term-warn hover:bg-term-warn hover:text-term-bg disabled:opacity-40"
            >
              {busy === 'stop' ? 'stopping…' : '■ stop'}
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy !== null}
            className="px-3 py-1 border border-term-err rounded text-term-err hover:bg-term-err hover:text-term-bg disabled:opacity-40"
          >
            {busy === 'delete' ? 'deleting…' : '× delete'}
          </button>
        </div>
      </header>

      {agent.lastError && (
        <div className="px-3 py-1 text-xs text-term-err bg-term-err/10 border-b border-term-err/40">
          {agent.lastError}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0">
          <AgentConsole agentId={agent.id} />
          <ComposeMessage target={agent} agents={agents} />
        </div>
        <div className="w-96 flex-shrink-0">
          <InboxOutbox agent={agent} agents={agents} />
        </div>
      </div>
    </div>
  )
}
