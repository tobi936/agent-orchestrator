import { useEffect, useState } from 'react'
import { AgentSidebar } from './components/AgentSidebar'
import { NewAgentDialog } from './components/NewAgentDialog'
import { AgentDetail } from './components/AgentDetail'
import { SidePanel } from './components/SidePanel'
import { RightBar } from './components/RightBar'
import { StatusBar } from './components/StatusBar'
import { AuthScreen } from './components/AuthScreen'
import { Icon } from './components/Icons'
import { useAgents } from './hooks/useAgents'
import { useAuth } from './hooks/useAuth'

const ACCENTS = {
  indigo:  { val: '#3D3DF5', soft: '#ECECFE', ink: '#1F1FA8' },
  emerald: { val: '#10b48a', soft: '#E1F5EE', ink: '#0a6b50' },
  violet:  { val: '#7c3aed', soft: '#EDE7FE', ink: '#4c1d95' },
  orange:  { val: '#E8590C', soft: '#FBE8DC', ink: '#A03A04' },
}

export function App() {
  const { state: authState, email, login, register } = useAuth()
  const { agents, loading, docker, refresh } = useAgents()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab] = useState<'chat' | 'config'>('chat')
  const [infraCollapsed, setInfraCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (authState !== 'authenticated') return
    if (!selectedId && agents.length > 0) setSelectedId(agents[0].id)
    if (selectedId && !agents.find((a) => a.id === selectedId)) setSelectedId(agents[0]?.id ?? null)
  }, [agents, selectedId, authState])

  if (authState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: 'var(--font-mono)', color: 'var(--ink-4)', fontSize: 13 }}>
        …
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return <AuthScreen onLogin={login} onRegister={register} />
  }

  const selected = agents.find((a) => a.id === selectedId) ?? null

  const runningCount = agents.filter((a) => a.status === 'running').length

  return (
    <div className="app-shell">
      <div className={`layout${infraCollapsed ? ' infra-collapsed' : ''}`}>
        {/* TOPBAR */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 22 22">
                <rect x="1" y="1" width="20" height="20" rx="5" fill="var(--ink)"/>
                <circle cx="7" cy="11" r="2" fill="var(--accent)"/>
                <circle cx="15" cy="7" r="2" fill="var(--bg-elev)"/>
                <circle cx="15" cy="15" r="2" fill="var(--bg-elev)"/>
                <path d="M7 11L15 7M7 11L15 15" stroke="var(--bg-elev)" strokeWidth="1" opacity="0.5"/>
              </svg>
            </div>
            <div className="brand-name">orchestrator<span className="muted">/v0.8</span></div>
          </div>

          <div className="workspace-pill">
            <span className="dot"></span>
            <span>workspace</span>
            <Icon name="chevron" size={11} />
          </div>

          <div className="topbar-search">
            <Icon name="search" size={12} />
            <input placeholder="Jump to agent, message, log…" readOnly />
            <span className="kbd">⌘K</span>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" title="Notifications"><Icon name="bell" size={14} /></button>
            <button className="icon-btn" title="Help"><Icon name="help" size={14} /></button>
            <button
              className="icon-btn"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            >
              <Icon name="settings" size={14} />
            </button>
            <div className="avatar" title={email ?? ''}>
              {email ? email.slice(0, 2).toUpperCase() : 'ME'}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <AgentSidebar
          agents={agents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setShowNew(true)}
        />

        {/* MAIN */}
        <main className="main">
          {loading ? (
            <div style={{ margin: 'auto', color: 'var(--ink-4)', fontSize: 13 }}>loading…</div>
          ) : selected ? (
            <AgentDetail
              agent={selected}
              agents={agents}
              tab={tab}
              setTab={setTab}
              onChanged={refresh}
              onDeleted={refresh}
            />
          ) : (
            <EmptyState onNew={() => setShowNew(true)} />
          )}
        </main>

        {/* SIDE PANEL — Inbox/Outbox */}
        <SidePanel agent={selected} agents={agents} />

        {/* INFRA RAIL */}
        <RightBar
          docker={docker}
          collapsed={infraCollapsed}
          onToggle={() => setInfraCollapsed((v) => !v)}
          agentCount={agents.length}
          runningCount={runningCount}
        />

        {/* STATUS BAR */}
        <StatusBar
          docker={docker}
          agents={agents}
          runningCount={runningCount}
        />
      </div>

      <NewAgentDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(a) => {
          void refresh()
          setSelectedId(a.id)
        }}
      />
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: 360, textAlign: 'center', padding: '0 24px', color: 'var(--ink-4)' }}>
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No agent selected</div>
      <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Create a new agent to get started.</div>
      <button className="btn primary" onClick={onNew}>
        <Icon name="plus" size={13} /> New agent
      </button>
    </div>
  )
}
