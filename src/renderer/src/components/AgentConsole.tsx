import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useAgentLogs } from '../hooks/useAgentLogs'
import { agentsApi } from '../lib/api'
import type { LogLine } from '@shared/types'

interface Props {
  agentId: string
}

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m',
}

function formatLine(line: LogLine): string {
  const ts = line.ts.slice(11, 19)
  const stamp = `${COLOR.dim}[${ts}]${COLOR.reset}`
  const text = line.text.replace(/\r?\n$/, '')
  switch (line.stream) {
    case 'stderr':
      return `${stamp} ${COLOR.red}${text}${COLOR.reset}`
    case 'system':
      return `${stamp} ${COLOR.cyan}${text}${COLOR.reset}`
    default:
      return `${stamp} ${text}`
  }
}

export function AgentConsole({ agentId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 12,
      lineHeight: 1.3,
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      scrollback: 5000,
      theme: {
        background: '#0b0d10',
        foreground: '#d6deeb',
        cursor: '#7fdbca',
        black: '#1e2530',
        brightBlack: '#7a8aa3',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()
    term.writeln(`\x1b[2m── console for agent ${agentId} ──\x1b[0m`)
    termRef.current = term
    fitRef.current = fit

    void agentsApi.logHistory(agentId).then((lines) => {
      if (termRef.current !== term) return
      for (const line of lines) {
        for (const part of line.text.split(/\r?\n/)) {
          if (!part && line.text.endsWith('\n')) continue
          term.writeln(formatLine({ ...line, text: part }))
        }
      }
    })

    const onResize = () => {
      try {
        fit.fit()
      } catch {
        // ignore — terminal not visible
      }
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [agentId])

  useAgentLogs(agentId, (line) => {
    const term = termRef.current
    if (!term) return
    for (const part of line.text.split(/\r?\n/)) {
      if (!part && line.text.endsWith('\n')) continue
      term.writeln(formatLine({ ...line, text: part }))
    }
  })

  return <div ref={containerRef} className="flex-1 min-h-0 px-2 pt-2 bg-term-bg" />
}
