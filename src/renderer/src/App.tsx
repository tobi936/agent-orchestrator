import { useEffect, useState } from 'react'
import { AgentSidebar } from './components/AgentSidebar'
import { NewAgentDialog } from './components/NewAgentDialog'
import { AgentDetail } from './components/AgentDetail'
import { StatusBar } from './components/StatusBar'
import { useAgents } from './hooks/useAgents'

export function App() {
  const { agents, loading, refresh } = useAgents()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

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
    <div className="flex flex-col h-full">
      <header className="flex items-center px-3 py-2 border-b border-term-border bg-term-panel">
        <span className="text-term-accent">▌</span>
        <span className="ml-2 text-sm tracking-wider">agent orchestrator</span>
        <span className="ml-3 text-xs text-term-muted">
          {agents.length} agent{agents.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="flex flex-1 min-h-0">
        <AgentSidebar
          agents={agents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => setShowNew(true)}
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
    <div className="m-auto flex flex-col items-center gap-3 text-term-muted">
      <pre className="text-term-accent text-xs leading-tight">
{` _____  _____  _____  _   _  _____
|  _  ||  __ \\|  ___|| \\ | ||_   _|
| |_| || |  \\/| |__  |  \\| |  | |
|  _  || | __ |  __| | . \` |  | |
| | | || |_\\ \\| |___ | |\\  |  | |
\\_| |_/ \\____/\\____/ \\_| \\_/  \\_/`}
      </pre>
      <span className="text-sm">no agent selected</span>
      <button
        onClick={onNew}
        className="px-4 py-2 mt-2 text-xs border border-term-accent rounded text-term-accent hover:bg-term-accent hover:text-term-bg"
      >
        + create your first agent
      </button>
    </div>
  )
}
