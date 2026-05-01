import type { Agent } from '@shared/types'

interface Props {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

const statusColor: Record<Agent['status'], string> = {
  created: 'bg-term-muted',
  starting: 'bg-term-warn animate-pulse',
  running: 'bg-term-ok',
  idle: 'bg-term-accent',
  stopping: 'bg-term-warn animate-pulse',
  stopped: 'bg-term-muted',
  error: 'bg-term-err',
}

export function AgentSidebar({ agents, selectedId, onSelect, onNew }: Props) {
  return (
    <aside className="flex flex-col w-64 border-r border-term-border bg-term-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-term-border">
        <span className="text-xs uppercase tracking-wider text-term-muted">agents</span>
        <button
          onClick={onNew}
          className="text-xs px-2 py-0.5 border border-term-border rounded hover:bg-term-bg hover:text-term-accent transition-colors"
        >
          + new
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto py-1">
        {agents.length === 0 && (
          <li className="px-3 py-4 text-xs text-term-muted">
            No agents yet. Click <span className="text-term-accent">+ new</span> to create one.
          </li>
        )}
        {agents.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onSelect(a.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-l-2 transition-colors ${
                selectedId === a.id
                  ? 'border-term-accent bg-term-bg text-term-text'
                  : 'border-transparent hover:bg-term-bg/60 text-term-muted hover:text-term-text'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${statusColor[a.status]}`} />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="text-[10px] opacity-50">{a.id.slice(0, 4)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
