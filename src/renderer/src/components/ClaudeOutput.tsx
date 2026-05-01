import { useEffect, useRef, useState } from 'react'
import { agentsApi } from '../lib/api'
import { useAgentLogs } from '../hooks/useAgentLogs'
import type { LogLine } from '@shared/types'

interface Props {
  agentId: string
}

type ItemKind = 'text' | 'thinking' | 'tool' | 'result' | 'separator'
interface Item { kind: ItemKind; text: string }

export function isWatcherLine(line: LogLine): boolean {
  if (line.stream === 'system' || line.stream === 'stderr') return true
  return /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(line.text)
}

function classifyLine(raw: string): Item {
  if (raw.startsWith('[SESSION_START]')) return { kind: 'separator', text: 'Neue Session' }
  if (raw.startsWith('[TASK_START]'))    return { kind: 'separator', text: 'Neue Aufgabe' }
  if (raw.startsWith('[THINKING] ')) return { kind: 'thinking', text: raw.slice(11) }
  if (raw.startsWith('[TOOL] '))     return { kind: 'tool',     text: raw.slice(7) }
  if (raw.startsWith('[RESULT] '))   return { kind: 'result',   text: raw.slice(9) }
  return { kind: 'text', text: raw }
}

function processChunk(chunk: string, buf: string): [Item[], string] {
  const combined = buf + chunk
  const lines = combined.split('\n')
  const remaining = lines.pop() ?? ''
  const items: Item[] = []
  for (const line of lines) {
    items.push(classifyLine(line))
  }
  return [items, remaining]
}

function ItemRow({ item }: { item: Item }) {
  if (item.kind === 'separator') {
    return (
      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-term-border" />
        <span className="text-term-muted text-xs opacity-50 tracking-widest uppercase">{item.text}</span>
        <div className="flex-1 h-px bg-term-border" />
      </div>
    )
  }
  if (item.kind === 'thinking') {
    return (
      <div className="flex gap-2 my-1 opacity-60 italic text-xs text-term-muted">
        <span className="flex-shrink-0 mt-0.5">💭</span>
        <span className="whitespace-pre-wrap">{item.text}</span>
      </div>
    )
  }
  if (item.kind === 'tool') {
    const colon = item.text.indexOf(': ')
    const name = colon >= 0 ? item.text.slice(0, colon) : item.text
    const input = colon >= 0 ? item.text.slice(colon + 2) : ''
    return (
      <div className="flex gap-2 my-1 text-xs">
        <span className="flex-shrink-0 mt-0.5">🔧</span>
        <span className="text-term-accent font-semibold">{name}</span>
        {input && <span className="text-term-muted truncate max-w-md">{input}</span>}
      </div>
    )
  }
  if (item.kind === 'result') {
    return (
      <div className="flex gap-2 my-1 text-xs text-term-muted">
        <span className="flex-shrink-0 mt-0.5">📋</span>
        <span className="whitespace-pre-wrap opacity-70">{item.text}</span>
      </div>
    )
  }
  // text — only render non-empty lines
  if (!item.text.trim()) return null
  return (
    <span className="whitespace-pre-wrap text-sm text-term-text leading-relaxed">
      {item.text}{'\n'}
    </span>
  )
}

export function ClaudeOutput({ agentId, agentName }: Props & { agentName?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const bufRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const appendChunk = (chunk: string) => {
    const [newItems, remaining] = processChunk(chunk, bufRef.current)
    bufRef.current = remaining
    if (newItems.length > 0) {
      setItems(prev => mergeItems(prev, newItems))
    }
  }

  useEffect(() => {
    bufRef.current = ''
    setItems([])
    void agentsApi.logHistory(agentId).then((history) => {
      const claudeLines = history.filter(l => !isWatcherLine(l))
      for (const line of claudeLines) appendChunk(line.text)
      // flush remaining buffer
      if (bufRef.current) {
        setItems(prev => mergeItems(prev, [classifyLine(bufRef.current)]))
        bufRef.current = ''
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  useAgentLogs(agentId, (line) => {
    if (isWatcherLine(line)) return
    appendChunk(line.text)
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  const hasContent = items.some(i => i.text.trim())

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-term-bg">
      {/* Header showing agent name */}
      {agentName && (
        <div className="mb-3 pb-2 border-b border-term-border flex items-center gap-2">
          <span className="text-term-accent font-semibold">▌ {agentName}</span>
          <span className="text-term-muted text-xs opacity-60">({agentId})</span>
        </div>
      )}
      {!hasContent ? (
        <div className="flex items-center justify-center h-full text-term-muted text-sm">
          Warte auf Antwort… Sende eine Nachricht unten.
        </div>
      ) : (
        <div className="max-w-3xl">
          {items.map((item, i) => <ItemRow key={i} item={item} />)}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}

// Merge consecutive text items
function mergeItems(prev: Item[], incoming: Item[]): Item[] {
  const result = [...prev]
  for (const item of incoming) {
    const last = result[result.length - 1]
    if (last?.kind === 'text' && item.kind === 'text') {
      result[result.length - 1] = { kind: 'text', text: last.text + item.text }
    } else {
      result.push(item)
    }
  }
  return result
}
