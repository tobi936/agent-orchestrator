import { useEffect, useRef, useState } from 'react'
import { agentsApi } from '../lib/api'
import { useAgentLogs } from '../hooks/useAgentLogs'
import { isWatcherLine } from './ClaudeOutput'
import type { LogLine } from '@shared/types'

interface Props {
  agentId: string
}

function formatLog(line: LogLine): { text: string; color: string } {
  const text = line.text.replace(/\r?\n$/, '')
  if (line.stream === 'system') return { text, color: 'text-term-accent' }
  if (line.stream === 'stderr') return { text, color: 'text-term-err' }
  return { text, color: 'text-term-muted' }
}

export function LogPanel({ agentId }: Props) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLogs([])
    void agentsApi.logHistory(agentId).then((history) => {
      setLogs(history.filter(isWatcherLine))
    })
  }, [agentId])

  useAgentLogs(agentId, (line) => {
    if (!isWatcherLine(line)) return
    setLogs((prev) => [...prev, line])
  })

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, open])

  return (
    <div className="border-t border-term-border bg-term-panel flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1 text-[10px] font-mono text-term-muted hover:text-term-accent transition-colors uppercase tracking-wider"
      >
        <span className="opacity-60">{open ? '▼' : '▶'}</span>
        <span>[ SYSTEM LOGS ]</span>
        <span className="ml-auto opacity-50 font-mono">[{logs.length} LINES]</span>
      </button>
      {open && (
        <div className="h-32 overflow-y-auto px-2 pb-2 font-mono text-[10px] leading-relaxed bg-black">
          {logs.length === 0 && (
            <span className="text-term-muted opacity-50">[ NO LOG ENTRIES ]</span>
          )}
          {logs.map((line, i) => {
            const { text, color } = formatLog(line)
            return (
              <div key={i} className={`${color} whitespace-pre`}>
                <span className="text-term-muted opacity-50 mr-2">{line.ts.slice(11, 19)}</span>
                {text}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
