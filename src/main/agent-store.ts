import { Low, JSONFile } from 'lowdb'
import { nanoid } from 'nanoid'
import type { Agent, AgentMessage, NewAgentInput } from '../shared/types.js'
import { dbFile, ensureAgentDirs, ensureRoot } from './paths.js'

interface DBSchema {
  agents: Agent[]
  messages: AgentMessage[]
}

const defaults: DBSchema = { agents: [], messages: [] }

let dbInstance: Low<DBSchema> | null = null

async function getDb(): Promise<Low<DBSchema>> {
  if (!dbInstance) {
    ensureRoot()
    const adapter = new JSONFile<DBSchema>(dbFile)
    dbInstance = new Low<DBSchema>(adapter)
    await dbInstance.read()
    dbInstance.data ??= { agents: [], messages: [] }
    dbInstance.data.agents ??= []
    dbInstance.data.messages ??= []
  }
  return dbInstance
}

function data(db: Low<DBSchema>): DBSchema {
  return db.data ?? defaults
}

export async function listAgents(): Promise<Agent[]> {
  const db = await getDb()
  return data(db).agents
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const db = await getDb()
  return data(db).agents.find((a) => a.id === id)
}

export async function createAgent(input: NewAgentInput): Promise<Agent> {
  const db = await getDb()
  const d = data(db)
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
  d.agents.push(agent)
  await db.write()
  return agent
}

export async function updateAgent(id: string, patch: Partial<Agent>): Promise<Agent | undefined> {
  const db = await getDb()
  const d = data(db)
  const idx = d.agents.findIndex((a) => a.id === id)
  if (idx === -1) return undefined
  d.agents[idx] = { ...d.agents[idx], ...patch }
  await db.write()
  return d.agents[idx]
}

export async function deleteAgent(id: string): Promise<void> {
  const db = await getDb()
  const d = data(db)
  d.agents = d.agents.filter((a) => a.id !== id)
  d.messages = d.messages.filter((m) => m.from !== id && m.to !== id)
  await db.write()
}

export async function addMessage(msg: AgentMessage): Promise<void> {
  const db = await getDb()
  data(db).messages.push(msg)
  await db.write()
}

export async function updateMessage(id: string, patch: Partial<AgentMessage>): Promise<void> {
  const db = await getDb()
  const d = data(db)
  const idx = d.messages.findIndex((m) => m.id === id)
  if (idx === -1) return
  d.messages[idx] = { ...d.messages[idx], ...patch }
  await db.write()
}

export async function listMessages(agentId?: string): Promise<AgentMessage[]> {
  const db = await getDb()
  const msgs = data(db).messages
  if (!agentId) return msgs
  return msgs.filter((m) => m.from === agentId || m.to === agentId)
}

export async function findAgentByName(name: string): Promise<Agent | undefined> {
  const db = await getDb()
  return data(db).agents.find((a) => a.name === name)
}
