import type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput } from '@shared/types'
import { apiFetch, getToken } from './http'

async function get<T>(path: string): Promise<T> {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

async function del<T>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<T>
}

// Singleton SSE connection that routes events to registered callbacks
class SseBus {
  private source: EventSource | null = null
  private listeners = new Map<string, Set<(d: unknown) => void>>()
  private readonly events = ['agent:log', 'agent:status', 'message:delivered', 'message:error']

  private connect(): void {
    if (this.source) return
    const token = getToken() ?? ''
    this.source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`)
    for (const ev of this.events) {
      this.source.addEventListener(ev, (e: MessageEvent) => {
        const data = JSON.parse(e.data as string) as unknown
        this.listeners.get(ev)?.forEach((cb) => cb(data))
      })
    }
  }

  on<T>(event: string, cb: (data: T) => void): () => void {
    this.connect()
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    const listener = (d: unknown) => cb(d as T)
    this.listeners.get(event)!.add(listener)
    return () => this.listeners.get(event)!.delete(listener)
  }
}

const sse = new SseBus()

export const httpApi = {
  auth: {
    status: () => get<boolean>('/api/auth/status'),
  },
  docker: {
    status: () => get<{ reachable: boolean; imageReady: boolean }>('/api/docker/status'),
  },
  agents: {
    list: () => get<Agent[]>('/api/agents'),
    get: (id: string) => get<Agent | undefined>(`/api/agents/${id}`),
    create: (input: NewAgentInput) => post<Agent>('/api/agents', input),
    start: (id: string) => post<Agent>(`/api/agents/${id}/start`),
    stop: (id: string) => post<Agent>(`/api/agents/${id}/stop`),
    delete: (id: string) => del<{ ok: boolean }>(`/api/agents/${id}`),
    logHistory: (id: string) => get<LogLine[]>(`/api/agents/${id}/logs`),
  },
  messages: {
    list: (agentId?: string) =>
      get<AgentMessage[]>(`/api/messages${agentId ? `?agentId=${encodeURIComponent(agentId)}` : ''}`),
    send: (input: SendMessageInput) => post<AgentMessage>('/api/messages', input),
  },
  events: {
    onLog: (cb: (line: LogLine) => void) => sse.on<LogLine>('agent:log', cb),
    onAgentStatus: (cb: (agent: Agent) => void) => sse.on<Agent>('agent:status', cb),
    onMessageDelivered: (cb: (msg: AgentMessage) => void) =>
      sse.on<AgentMessage>('message:delivered', cb),
    onRoutingError: (
      cb: (err: { fromId: string; filePath: string; reason: string }) => void,
    ) => sse.on<{ fromId: string; filePath: string; reason: string }>('message:error', cb),
  },
}
