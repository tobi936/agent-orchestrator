export interface User {
  id: string
  email: string
  createdAt: string
  claudeCredentials?: string
}

export type AgentStatus =
  | 'created'
  | 'starting'
  | 'running'
  | 'idle'
  | 'stopping'
  | 'stopped'
  | 'error'

export interface Agent {
  id: string
  userId: string
  name: string
  systemPrompt: string
  model: string
  createdAt: string
  containerId?: string
  status: AgentStatus
  lastError?: string
}

export interface AgentMessage {
  id: string
  userId: string
  from: string
  to: string
  subject?: string
  body: string
  createdAt: string
  status: 'queued' | 'delivered' | 'processed' | 'replied' | 'error'
}

export interface LogLine {
  agentId: string
  stream: 'stdout' | 'stderr' | 'system'
  ts: string
  text: string
}

export interface ServiceEvent<T = unknown> {
  type: string
  payload: T
  userId: string
  ts: string
}
