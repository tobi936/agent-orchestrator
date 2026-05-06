import { EventEmitter } from 'events'

const MAX_LINES = 200

// Per-agent log buffer + event emitter
const buffers = new Map<string, string[]>()
const emitter = new EventEmitter()
emitter.setMaxListeners(100)

export function appendLog(agentId: string, line: string) {
  if (!buffers.has(agentId)) buffers.set(agentId, [])
  const buf = buffers.get(agentId)!
  buf.push(line)
  if (buf.length > MAX_LINES) buf.shift()
  emitter.emit(`log:${agentId}`, line)
}

export function getBuffer(agentId: string): string[] {
  return buffers.get(agentId) ?? []
}

export function clearBuffer(agentId: string) {
  buffers.delete(agentId)
}

export function onLog(agentId: string, cb: (line: string) => void) {
  emitter.on(`log:${agentId}`, cb)
}

export function offLog(agentId: string, cb: (line: string) => void) {
  emitter.off(`log:${agentId}`, cb)
}
