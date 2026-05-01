import type { Agent } from '@shared/types'

interface Props {
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
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

export function AgentSidebar({ agents, selectedId, onSelect, onNew }: Props) {
  return (
    <aside className="flex flex-col w-64 border-r border-term-border bg-term-panel flex-shrink-0">
      <div className="px-2 py-2 border-b border-term-border">
        <span className="text-[10px] uppercase tracking-widest text-term-muted block mb-2 font-mono">AGENTS</span>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 bg-transparent border border-term-accent rounded-sm text-[10px] text-term-accent hover:bg-term-accent hover:text-black transition-colors font-mono uppercase tracking-wider"
        >
          <span className="text-sm leading-none">+</span>
          <span>NEW AGENT</span>
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto py-0.5">
        {agents.length === 0 && (
          <li className="px-2 py-3 text-[10px] text-term-muted text-center leading-relaxed font-mono">
            NO AGENTS INITIALIZED
          </li>
        )}
        {agents.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onSelect(a.id)}
              className={`w-full text-left px-2 py-1.5 text-[10px] font-mono flex items-center gap-2 border-l-2 transition-colors ${
                selectedId === a.id
                  ? 'border-term-accent bg-term-bg text-term-text'
                  : 'border-transparent hover:bg-term-bg/60 text-term-muted hover:text-term-text'
              }`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-sm flex-shrink-0 ${statusDot[a.status]}`} />
              <span className="flex-1 truncate uppercase tracking-wide">{a.name}</span>
              <span className="text-[9px] opacity-60 flex-shrink-0 font-mono">{statusLabel[a.status]}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
