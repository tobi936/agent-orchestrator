import { useEffect, useState } from 'react'
import { AgentSidebar } from './components/AgentSidebar'
import { NewAgentDialog } from './components/NewAgentDialog'
import { AgentDetail } from './components/AgentDetail'
import { StatusBar } from './components/StatusBar'
import { AuthScreen } from './components/AuthScreen'
import { useAgents } from './hooks/useAgents'
import { useAuth } from './hooks/useAuth'

export function App() {
  const { state: authState, email, login, register } = useAuth()
  const { agents, loading, refresh } = useAgents()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-term-bg font-mono text-term-muted text-xs">
        …
      </div>
    )
  }

  if (authState === 'unauthenticated') {
    return (
      <AuthScreen
        onLogin={async (email, password) => {
          await login(email, password)
          window.location.reload()
        }}
        onRegister={async (email, password, serverUrl) => {
          await register(email, password, serverUrl)
          window.location.reload()
        }}
      />
    )
  }

  useEffect(() => {
    if (!selectedId && agents.length > 0) {
      setSelectedId(agents[0].id)
    }
    if (selectedId && !agents.find((a) => a.id === selectedId)) {
      setSelectedId(agents[0]?.id ?? null)
    }
  }, [agents, selectedId])

  const selected = agents.find((a) => a.id === selectedId) ?? null

  return (
    <div className="flex flex-col h-full font-mono text-xs">
      <header className="flex items-center px-3 py-1.5 border-b border-term-border bg-term-panel flex-shrink-0">
        <span className="text-term-accent">▌</span>
        <span className="ml-2 text-xs tracking-widest uppercase text-term-text">agent orchestrator</span>
        <span className="ml-4 text-[10px] text-term-muted font-mono">
          [{agents.length}] AGENT{agents.length === 1 ? '' : 'S'} ACTIVE
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        <AgentSidebar
          agents={agents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setShowNew(true)}
          email={email}
        />
        <main className="flex flex-1 min-w-0">
          {loading ? (
            <div className="m-auto text-term-muted text-sm">loading…</div>
          ) : selected ? (
            <AgentDetail
              agent={selected}
              agents={agents}
              onChanged={refresh}
              onDeleted={refresh}
            />
          ) : (
            <EmptyState onNew={() => setShowNew(true)} />
          )}
        </main>
      </div>

      <StatusBar />

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
    <div className="m-auto flex flex-col items-center gap-6 text-term-muted max-w-sm text-center px-6">
      <div className="text-5xl font-mono">[ _ ]</div>
      <div>
        <p className="text-term-text text-sm font-mono uppercase tracking-wider">[ NO AGENT SELECTED ]</p>
        <p className="text-[10px] mt-2 leading-relaxed font-mono text-term-muted">
          INITIALIZE NEW AGENT TO BEGIN OPERATIONS
        </p>
      </div>
      <button
        onClick={onNew}
        className="px-6 py-2 text-xs font-mono border border-term-accent rounded-sm text-term-accent hover:bg-term-accent hover:text-black transition-colors uppercase tracking-wider"
      >
        [ + CREATE AGENT ]
      </button>
    </div>
  )
}
