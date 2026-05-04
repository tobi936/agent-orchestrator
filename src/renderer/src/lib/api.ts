import type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput } from '@shared/types'
import { httpApi } from './http-api'

// In Electron the preload script injects window.api; in browser we use HTTP/SSE
const backend = typeof window !== 'undefined' && window.api ? window.api : httpApi

export const agentsApi = {
  list: () => backend.agents.list(),
  get: (id: string) => backend.agents.get(id),
  create: (input: NewAgentInput) => backend.agents.create(input),
  start: (id: string) => backend.agents.start(id),
  stop: (id: string) => backend.agents.stop(id),
  remove: (id: string) => backend.agents.delete(id),
  logHistory: (id: string) => backend.agents.logHistory(id),
}

export const messagesApi = {
  list: (agentId?: string) => backend.messages.list(agentId),
  send: (input: SendMessageInput) => backend.messages.send(input),
}

export const dockerApi = {
  status: () => backend.docker.status(),
}

export const events = backend.events

export type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput }
