import pg from 'pg'
import type { Agent, AgentStatus } from '../../shared/types.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
})

// ── Agent queries ─────────────────────────────────────────────

export async function listAgents(userId: string): Promise<Agent[]> {
  const { rows } = await pool.query<Agent>(
    'SELECT * FROM agents WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  )
  return rows.map(rowToAgent)
}

export async function getAgent(userId: string, id: string): Promise<Agent | undefined> {
  const { rows } = await pool.query<Agent>(
    'SELECT * FROM agents WHERE id = $1 AND user_id = $2',
    [id, userId],
  )
  return rows[0] ? rowToAgent(rows[0]) : undefined
}

export async function createAgent(
  userId: string,
  data: {
    id: string
    name: string
    systemPrompt: string
    model: string
    provider: string
    providerUrl?: string
  },
): Promise<Agent> {
  const { rows } = await pool.query<Agent>(
    `INSERT INTO agents (id, user_id, name, system_prompt, model, provider, provider_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [data.id, userId, data.name, data.systemPrompt, data.model, data.provider, data.providerUrl ?? null],
  )
  return rowToAgent(rows[0])
}

export async function updateAgent(
  userId: string,
  id: string,
  patch: Partial<Pick<Agent, 'status' | 'containerId' | 'lastError'>>,
): Promise<Agent | undefined> {
  const sets: string[] = ['updated_at = now()']
  const vals: unknown[] = []
  let idx = 1

  if ('status' in patch) { sets.push(`status = $${idx++}`); vals.push(patch.status) }
  if ('containerId' in patch) { sets.push(`container_id = $${idx++}`); vals.push(patch.containerId ?? null) }
  if ('lastError' in patch) { sets.push(`last_error = $${idx++}`); vals.push(patch.lastError ?? null) }

  vals.push(id, userId)
  const { rows } = await pool.query<Agent>(
    `UPDATE agents SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    vals,
  )
  return rows[0] ? rowToAgent(rows[0]) : undefined
}

export async function deleteAgent(userId: string, id: string): Promise<void> {
  await pool.query('DELETE FROM agents WHERE id = $1 AND user_id = $2', [id, userId])
}

// ── Log queries ───────────────────────────────────────────────

export async function appendLog(
  userId: string,
  agentId: string,
  stream: 'stdout' | 'stderr' | 'system',
  text: string,
): Promise<void> {
  await pool.query(
    'INSERT INTO agent_logs (user_id, agent_id, stream, text) VALUES ($1, $2, $3, $4)',
    [userId, agentId, stream, text],
  )
}

export async function getLogs(
  userId: string,
  agentId: string,
  limit = 500,
): Promise<Array<{ stream: string; text: string; ts: string }>> {
  const { rows } = await pool.query(
    'SELECT stream, text, ts FROM agent_logs WHERE user_id = $1 AND agent_id = $2 ORDER BY ts DESC LIMIT $3',
    [userId, agentId, limit],
  )
  return rows.reverse()
}

// ── Helpers ───────────────────────────────────────────────────

function rowToAgent(row: any): Agent {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    systemPrompt: row.system_prompt,
    model: row.model,
    provider: row.provider,
    providerUrl: row.provider_url ?? undefined,
    containerId: row.container_id ?? undefined,
    status: row.status as AgentStatus,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}
