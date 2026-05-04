import { Low, JSONFile } from 'lowdb'
import { nanoid } from 'nanoid'
import type { Agent, AgentMessage, NewAgentInput } from '../shared/types.js'
import { userDbFile, ensureUserRoot, ensureAgentDirs } from './paths.js'

interface DBSchema {
  agents: Agent[]
  messages: AgentMessage[]
}

const dbInstances = new Map<string, Low<DBSchema>>()

async function getDb(userId: string): Promise<Low<DBSchema>> {
  let db = dbInstances.get(userId)
  if (!db) {
    ensureUserRoot(userId)
    const adapter = new JSONFile<DBSchema>(userDbFile(userId))
    db = new Low<DBSchema>(adapter)
    await db.read()
    db.data ??= { agents: [], messages: [] }
    db.data.agents ??= []
    db.data.messages ??= []
    dbInstances.set(userId, db)
  }
  return db
}

export async function listAgents(userId: string): Promise<Agent[]> {
  const db = await getDb(userId)
  return db.data!.agents
}

export async function getAgent(userId: string, id: string): Promise<Agent | undefined> {
  const db = await getDb(userId)
  return db.data!.agents.find((a) => a.id === id)
}

export async function createAgent(userId: string, input: NewAgentInput): Promise<Agent> {
  const db = await getDb(userId)
  const id = nanoid(10)
  const agent: Agent = {
    id,
    name: input.name.trim() || `agent-${id}`,
    systemPrompt: input.systemPrompt,
    model: input.model || 'sonnet',
    createdAt: new Date().toISOString(),
    status: 'created',
  }
  ensureAgentDirs(userId, id)
  db.data!.agents.push(agent)
  await db.write()
  return agent
}

export async function updateAgent(
  userId: string,
  id: string,
  patch: Partial<Agent>,
): Promise<Agent | undefined> {
  const db = await getDb(userId)
  const idx = db.data!.agents.findIndex((a) => a.id === id)
  if (idx === -1) return undefined
  db.data!.agents[idx] = { ...db.data!.agents[idx], ...patch }
  await db.write()
  return db.data!.agents[idx]
}

export async function deleteAgent(userId: string, id: string): Promise<void> {
  const db = await getDb(userId)
  db.data!.agents = db.data!.agents.filter((a) => a.id !== id)
  db.data!.messages = db.data!.messages.filter((m) => m.from !== id && m.to !== id)
  await db.write()
}

export async function addMessage(userId: string, msg: AgentMessage): Promise<void> {
  const db = await getDb(userId)
  db.data!.messages.push(msg)
  await db.write()
}

export async function updateMessage(
  userId: string,
  id: string,
  patch: Partial<AgentMessage>,
): Promise<void> {
  const db = await getDb(userId)
  const idx = db.data!.messages.findIndex((m) => m.id === id)
  if (idx === -1) return
  db.data!.messages[idx] = { ...db.data!.messages[idx], ...patch }
  await db.write()
}

export async function listMessages(userId: string, agentId?: string): Promise<AgentMessage[]> {
  const db = await getDb(userId)
  const msgs = db.data!.messages
  if (!agentId) return msgs
  return msgs.filter((m) => m.from === agentId || m.to === agentId)
}

export async function findAgentByName(userId: string, name: string): Promise<Agent | undefined> {
  const db = await getDb(userId)
  return db.data!.agents.find((a) => a.name === name)
}
