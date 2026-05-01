import { JSONFilePreset } from 'lowdb/node'
import { nanoid } from 'nanoid'
import type { Agent, AgentMessage, NewAgentInput } from '../shared/types.js'
import { dbFile, ensureAgentDirs, ensureRoot } from './paths.js'

interface DBSchema {
  agents: Agent[]
  messages: AgentMessage[]
}

const defaults: DBSchema = { agents: [], messages: [] }

let dbPromise: Promise<Awaited<ReturnType<typeof JSONFilePreset<DBSchema>>>> | null = null

async function db() {
  if (!dbPromise) {
    ensureRoot()
    dbPromise = JSONFilePreset<DBSchema>(dbFile, defaults)
  }
  return dbPromise
}

export async function listAgents(): Promise<Agent[]> {
  const d = await db()
  return d.data.agents
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const d = await db()
  return d.data.agents.find((a) => a.id === id)
}

export async function createAgent(input: NewAgentInput): Promise<Agent> {
  const d = await db()
  const id = nanoid(10)
  const agent: Agent = {
    id,
    name: input.name.trim() || `agent-${id}`,
    systemPrompt: input.systemPrompt,
    model: input.model || 'sonnet',
    createdAt: new Date().toISOString(),
    status: 'created',
  }
  ensureAgentDirs(id)
  d.data.agents.push(agent)
  await d.write()
  return agent
}

export async function updateAgent(id: string, patch: Partial<Agent>): Promise<Agent | undefined> {
  const d = await db()
  const idx = d.data.agents.findIndex((a) => a.id === id)
  if (idx === -1) return undefined
  d.data.agents[idx] = { ...d.data.agents[idx], ...patch }
  await d.write()
  return d.data.agents[idx]
}

export async function deleteAgent(id: string): Promise<void> {
  const d = await db()
  d.data.agents = d.data.agents.filter((a) => a.id !== id)
  d.data.messages = d.data.messages.filter((m) => m.from !== id && m.to !== id)
  await d.write()
}

export async function addMessage(msg: AgentMessage): Promise<void> {
  const d = await db()
  d.data.messages.push(msg)
  await d.write()
}

export async function updateMessage(id: string, patch: Partial<AgentMessage>): Promise<void> {
  const d = await db()
  const idx = d.data.messages.findIndex((m) => m.id === id)
  if (idx === -1) return
  d.data.messages[idx] = { ...d.data.messages[idx], ...patch }
  await d.write()
}

export async function listMessages(agentId?: string): Promise<AgentMessage[]> {
  const d = await db()
  if (!agentId) return d.data.messages
  return d.data.messages.filter((m) => m.from === agentId || m.to === agentId)
}

export async function findAgentByName(name: string): Promise<Agent | undefined> {
  const d = await db()
  return d.data.agents.find((a) => a.name === name)
}
