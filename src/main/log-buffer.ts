import type { LogLine } from '../shared/types.js'

const MAX_LINES_PER_AGENT = 2000

const buffers = new Map<string, LogLine[]>()

export function append(line: LogLine): void {
  let buf = buffers.get(line.agentId)
  if (!buf) {
    buf = []
    buffers.set(line.agentId, buf)
  }
  buf.push(line)
  if (buf.length > MAX_LINES_PER_AGENT) {
    buf.splice(0, buf.length - MAX_LINES_PER_AGENT)
  }
}

export function history(agentId: string): LogLine[] {
  return buffers.get(agentId)?.slice() ?? []
}

export function clear(agentId: string): void {
  buffers.delete(agentId)
}
