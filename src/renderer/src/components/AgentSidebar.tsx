import { useState } from 'react'
import type { Agent } from '@shared/types'
import { Icon } from './Icons'
import { SettingsModal } from './SettingsModal'

interface Props {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  email?: string | null
}

type Filter = 'all' | 'running' | 'idle' | 'other'

function agentStatusClass(status: Agent['status']): string {
  switch (status) {
    case 'running': return 'running'
    case 'idle':    return 'idle'
    case 'starting':
    case 'stopping':return 'starting'
    case 'error':   return 'error'
    case 'stopped':
    case 'created': return 'stopped'
    default:        return 'stopped'
  }
}

function uptimeShort(createdAt: string): string {
  const secs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

export function AgentSidebar({ agents, selectedId, onSelect, onNew, email }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showSettings, setShowSettings] = useState(false)

  const counts = {
    all: agents.length,
    running: agents.filter((a) => a.status === 'running').length,
    idle: agents.filter((a) => a.status === 'idle').length,
    other: agents.filter((a) => !['running', 'idle'].includes(a.status)).length,
  }

  const filtered = agents.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'running') return a.status === 'running'
    if (filter === 'idle') return a.status === 'idle'
    return !['running', 'idle'].includes(a.status)
  })

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-section" style={{ paddingBottom: 0 }}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              Agents <span className="sidebar-count">· {agents.length}</span>
            </div>
            <button className="btn-new" onClick={onNew} title="New agent">
              <Icon name="plus" size={12} /> New
            </button>
          </div>
          <div className="filter-pills">
            {(['all', 'running', 'idle', 'other'] as Filter[]).map((k) => (
              <button
                key={k}
                className={`filter-pill${filter === k ? ' active' : ''}`}
                onClick={() => setFilter(k)}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
                <span className="count">{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="agent-list">
          {filtered.length === 0 && (
            <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>
              No agents
            </div>
          )}
          {filtered.map((a) => (
            <div
              key={a.id}
              className={`agent-row${selectedId === a.id ? ' active' : ''}`}
              onClick={() => onSelect(a.id)}
            >
              <span className={`status-dot ${agentStatusClass(a.status)}`} />
              <div className="agent-row-main">
                <div className="agent-row-name">{a.name}</div>
                <div className="agent-row-meta">
                  <span>{a.id.slice(0, 6)}</span>
                  <span className="sep">·</span>
                  <span>{uptimeShort(a.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: '8px 14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Icon name="settings" size={14} />
          </button>
        </div>
      </aside>

      {showSettings && (
        <SettingsModal email={email ?? null} onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}
