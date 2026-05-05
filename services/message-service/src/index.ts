import express from 'express'
import { createServer } from 'node:http'
import { Router } from 'express'
import pg from 'pg'
import { nanoid } from 'nanoid'

const { Pool } = pg
const PORT = Number(process.env.PORT ?? 3002)
const GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3000'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

function userId(req: express.Request): string {
  return req.headers['x-user-id'] as string
}

function broadcast(uid: string, event: string, data: unknown): void {
  fetch(`${GATEWAY_URL}/internal/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ userId: uid, event, data }),
  }).catch(() => {})
}

const router = Router()

// List messages (optionally filtered by agent)
router.get('/', async (req, res) => {
  const uid = userId(req)
  const agentId = req.query.agentId as string | undefined
  const { rows } = await pool.query(
    agentId
      ? 'SELECT * FROM agent_messages WHERE user_id = $1 AND (from_agent = $2 OR to_agent = $2) ORDER BY created_at DESC'
      : 'SELECT * FROM agent_messages WHERE user_id = $1 ORDER BY created_at DESC',
    agentId ? [uid, agentId] : [uid],
  )
  res.json(rows.map(rowToMessage))
})

// Send a message
router.post('/', async (req, res) => {
  const uid = userId(req)
  const { from, to, subject, body } = req.body as {
    from: string; to: string; subject?: string; body: string
  }
  if (!from || !to || !body) {
    res.status(400).json({ error: 'from, to, body required' })
    return
  }

  const id = nanoid(12)
  const { rows } = await pool.query(
    `INSERT INTO agent_messages (id, user_id, from_agent, to_agent, subject, body, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued') RETURNING *`,
    [id, uid, from, to, subject ?? null, body],
  )
  const message = rowToMessage(rows[0])
  broadcast(uid, 'message:queued', message)

  // Deliver to target agent's inbox file (same mechanism as existing message-router)
  deliverToAgent(uid, to, message).catch(() => {
    pool.query("UPDATE agent_messages SET status = 'error' WHERE id = $1", [id])
  })

  res.status(201).json(message)
})

// Update message status
router.patch('/:id', async (req, res) => {
  const uid = userId(req)
  const { status } = req.body as { status: string }
  const { rows } = await pool.query(
    `UPDATE agent_messages SET status = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [status, req.params.id, uid],
  )
  if (!rows[0]) { res.status(404).json({ error: 'not found' }); return }
  const message = rowToMessage(rows[0])
  broadcast(uid, 'message:updated', message)
  res.json(message)
})

// Agent inbox poll — containers call this to receive pending messages
router.get('/inbox/:agentId', async (req, res) => {
  const uid = userId(req)
  const { rows } = await pool.query(
    `SELECT * FROM agent_messages
     WHERE user_id = $1 AND to_agent = $2 AND status = 'queued'
     ORDER BY created_at ASC`,
    [uid, req.params.agentId],
  )
  res.json(rows.map(rowToMessage))
})

// ── Delivery ──────────────────────────────────────────────────

async function deliverToAgent(
  userId: string,
  agentId: string,
  message: ReturnType<typeof rowToMessage>,
): Promise<void> {
  // Write to agent's inbox directory (mounted volume) so the in-container
  // watcher picks it up — same protocol as the existing watcher.mjs
  const inboxPath = `${process.env.DATA_ROOT ?? '/data'}/${userId}/agents/${agentId}/inbox`
  const { writeFile, mkdir } = await import('node:fs/promises')
  await mkdir(inboxPath, { recursive: true })
  await writeFile(
    `${inboxPath}/${message.id}.json`,
    JSON.stringify(message, null, 2),
  )
  await pool.query(
    "UPDATE agent_messages SET status = 'delivered', updated_at = now() WHERE id = $1",
    [message.id],
  )
  broadcast(userId, 'message:delivered', { ...message, status: 'delivered' })
}

function rowToMessage(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    from: row.from_agent,
    to: row.to_agent,
    subject: row.subject ?? undefined,
    body: row.body,
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

// ── Start ─────────────────────────────────────────────────────
const app = express()
app.use(express.json({ limit: '20mb' }))
app.use('/api/messages', router)
app.get('/healthz', (_req, res) => res.json({ ok: true }))

const server = createServer(app)
server.listen(PORT, () => console.log(`Message Service → http://localhost:${PORT}`))
process.on('SIGTERM', () => server.close())
