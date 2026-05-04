import type { LogLine } from '../shared/types.js'

const MAX_LINES_PER_AGENT = 2000

const buffers = new Map<string, LogLine[]>()

function key(userId: string, agentId: string): string {
  return `${userId}:${agentId}`
}

export function append(userId: string, line: LogLine): void {
  const k = key(userId, line.agentId)
  let buf = buffers.get(k)
  if (!buf) {
    buf = []
    buffers.set(k, buf)
  }
  buf.push(line)
  if (buf.length > MAX_LINES_PER_AGENT) {
    buf.splice(0, buf.length - MAX_LINES_PER_AGENT)
  }
}

export function history(userId: string, agentId: string): LogLine[] {
  return buffers.get(key(userId, agentId))?.slice() ?? []
}

export function clear(userId: string, agentId: string): void {
  buffers.delete(key(userId, agentId))
}
