export type AgentStatus =
  | 'created'
  | 'starting'
  | 'running'
  | 'idle'
  | 'stopping'
  | 'stopped'
  | 'error'

export type ExecutionMode = 'local' | 'remote'

export interface Agent {
  id: string
  name: string
  systemPrompt: string
  model: string
  executionMode: ExecutionMode
  createdAt: string
  containerId?: string
  status: AgentStatus
  lastError?: string
}

export interface AgentMessage {
  id: string
  from: string
  to: string
  subject?: string
  body: string
  createdAt: string
  status: 'queued' | 'delivered' | 'processed' | 'replied' | 'error'
}

export interface NewAgentInput {
  name: string
  systemPrompt: string
  model?: string
  executionMode?: ExecutionMode
}

export interface SendMessageInput {
  from: string
  to: string
  subject?: string
  body: string
}

export interface LogLine {
  agentId: string
  stream: 'stdout' | 'stderr' | 'system'
  ts: string
  text: string
}

export interface OrchestratorEvent<T = unknown> {
  type: string
  payload: T
}
