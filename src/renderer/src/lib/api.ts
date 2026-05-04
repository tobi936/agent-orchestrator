import type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput } from '@shared/types'
import { httpApi } from './http-api'

export const authApi = {
  status: () => httpApi.auth.status(),
}


export const agentsApi = {
  list: () => httpApi.agents.list(),
  get: (id: string) => httpApi.agents.get(id),
  create: (input: NewAgentInput) => httpApi.agents.create(input),
  start: (id: string) => httpApi.agents.start(id),
  stop: (id: string) => httpApi.agents.stop(id),
  remove: (id: string) => httpApi.agents.delete(id),
  logHistory: (id: string) => httpApi.agents.logHistory(id),
}

export const messagesApi = {
  list: (agentId?: string) => httpApi.messages.list(agentId),
  send: (input: SendMessageInput) => httpApi.messages.send(input),
}

export const dockerApi = {
  status: () => httpApi.docker.status(),
}

export const events = httpApi.events

export type { Agent, AgentMessage, LogLine, NewAgentInput, SendMessageInput }
