import type {
  Agent,
  AgentMessage,
  LogLine,
  NewAgentInput,
  SendMessageInput,
} from '@shared/types'

const api = window.api

export const agentsApi = {
  list: () => api.agents.list(),
  get: (id: string) => api.agents.get(id),
  create: (input: NewAgentInput) => api.agents.create(input),
  start: (id: string) => api.agents.start(id),
  stop: (id: string) => api.agents.stop(id),
  remove: (id: string) => api.agents.delete(id),
}

export const messagesApi = {
  list: (agentId?: string) => api.messages.list(agentId),
  send: (input: SendMessageInput) => api.messages.send(input),
}

export const dockerApi = {
  status: () => api.docker.status(),
}

export const events = api.events

export type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput }
