import { useCallback, useState } from 'react'
import { agentsApi } from '../lib/api'
import type { Agent } from '@shared/types'
import { Icon } from './Icons'
import { ChatView } from './ChatView'

interface Props {
  agent: Agent
  agents: Agent[]
  tab: 'chat' | 'config'
  setTab: (t: 'chat' | 'config') => void
  onChanged: () => void
  onDeleted: () => void
}

function agentStatusClass(status: Agent['status']): string {
  switch (status) {
    case 'running':  return 'running'
    case 'idle':     return 'idle'
    case 'starting':
    case 'stopping': return 'starting'
    case 'error':    return 'error'
    case 'stopped':
    case 'created':  return 'stopped'
    default:         return 'stopped'
  }
}

export function AgentDetail({ agent, agents, tab, setTab, onChanged, onDeleted }: Props) {
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
        setStartError('Docker unreachable — please start Docker Desktop and retry.')
      } else {
        setStartError(`Start failed: ${msg}`)
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
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return
    setBusy('delete')
    try {
      await agentsApi.remove(agent.id)
      onDeleted()
    } finally {
      setBusy(null)
    }
  }

  const isRunning = agent.status === 'running' || agent.status === 'starting'
  const dotClass = agentStatusClass(agent.status)

  const uptimeSecs = Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / 1000)
  const formatUptime = (s: number) => {
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
    if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    return `${Math.floor(s / 86400)}d`
  }

  return (
    <>
      <div className="detail-header">
        {/* Error banner */}
        {(startError ?? agent.lastError) && (
          <div style={{
            padding: '8px 12px',
            marginBottom: 12,
            background: 'var(--err-soft)',
            border: '1px solid var(--err)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            color: 'var(--err)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ flex: 1 }}>{startError ?? agent.lastError}</span>
            <button
              style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--err)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }}
              onClick={() => copyError(startError ?? agent.lastError ?? '')}
            >
              {copied ? 'copied' : 'copy'}
            </button>
            {startError && (
              <button style={{ fontSize: 11, color: 'var(--err)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setStartError(null)}>
                ×
              </button>
            )}
          </div>
        )}

        <div className="detail-title-row">
          <div className="detail-title-block">
            <div className="detail-breadcrumb">
              <span>agents</span>
              <span className="crumb-sep">/</span>
              <span style={{ color: 'var(--ink-2)' }}>{agent.name}</span>
            </div>
            <h1 className="detail-title">
              <span className={`status-dot ${dotClass}`} />
              {agent.name}
            </h1>
            <div className="detail-sub">
              <div className="detail-sub-item">
                <span className="label">id</span>
                <span className="value">{agent.id.slice(0, 8)}</span>
              </div>
              <div className="detail-sub-divider" />
              <div className="detail-sub-item">
                <span className="label">model</span>
                <span className="value">{agent.model || 'claude-opus-4-5'}</span>
              </div>
              <div className="detail-sub-divider" />
              <div className="detail-sub-item">
                <span className="label">status</span>
                <span className="value">{agent.status}</span>
              </div>
              <div className="detail-sub-divider" />
              <div className="detail-sub-item">
                <span className="label">uptime</span>
                <span className="value">{formatUptime(uptimeSecs)}</span>
              </div>
            </div>
          </div>

          <div className="detail-actions">
            {!isRunning && (
              <button className="btn" onClick={() => void start()} disabled={busy !== null}>
                <Icon name="play" size={12} />
                {busy === 'start' ? 'Starting…' : 'Start'}
              </button>
            )}
            {isRunning && (
              <button className="btn" onClick={() => void stop()} disabled={busy !== null}>
                <Icon name="stop" size={12} />
                {busy === 'stop' ? 'Stopping…' : 'Stop'}
              </button>
            )}
            <button className="btn danger" onClick={() => void remove()} disabled={busy !== null}>
              <Icon name="x" size={12} />
              {busy === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
            <button className="icon-btn" style={{ border: '1px solid var(--line-strong)' }}>
              <Icon name="more" size={14} />
            </button>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab${tab === 'chat' ? ' active' : ''}`}
            onClick={() => setTab('chat')}
          >
            <Icon name="logs" size={13} />
            Chat
          </button>
          <button
            className={`tab${tab === 'config' ? ' active' : ''}`}
            onClick={() => setTab('config')}
          >
            <Icon name="config" size={13} />
            Config
          </button>
        </div>
      </div>

      {tab === 'chat' && (
        <ChatView agent={agent} agents={agents} />
      )}

      {tab === 'config' && (
        <div className="config-content">
          <div className="config-inner">
            <ConfigSection title="System Prompt" subtitle="Sent on every Claude invocation as the initial system message.">
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 6, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                {agent.systemPrompt || '(no system prompt)'}
              </div>
            </ConfigSection>
            <ConfigSection title="Model" subtitle="Anthropic API model configuration.">
              <ConfigRow k="Model" v={agent.model || 'claude-opus-4-5'} mono />
              <ConfigRow k="Agent ID" v={agent.id} mono />
              <ConfigRow k="Created" v={new Date(agent.createdAt).toLocaleString()} />
            </ConfigSection>
            <ConfigSection title="Container" subtitle="Docker container paths.">
              <ConfigRow k="Inbox path" v="/agent/inbox/" mono />
              <ConfigRow k="Outbox path" v="/agent/outbox/" mono />
              <ConfigRow k="Credentials" v={<><Icon name="lock" size={11} /> ~/.claude (encrypted)</>} />
            </ConfigSection>
          </div>
        </div>
      )}
    </>
  )
}

function ConfigSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div className="config-section-title">{title}</div>
        <div className="config-section-subtitle">{subtitle}</div>
      </div>
      <div className="config-rows">{children}</div>
    </div>
  )
}

function ConfigRow({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="config-row">
      <div className="config-row-key">{k}</div>
      <div className={`config-row-val${mono ? ' mono' : ''}`}>{v}</div>
    </div>
  )
}
