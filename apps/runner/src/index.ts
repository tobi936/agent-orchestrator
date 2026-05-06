import express from 'express'
import cors from 'cors'
import { prisma } from './db'
import { startPoller } from './poller'
import { appendLog, clearBuffer, getBuffer, onLog, offLog } from './logs'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// ── Start agent ───────────────────────────────────────────────────────────────
app.post('/agents/:id/start', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'RUNNING') return res.status(409).json({ error: 'Already running' })

  clearBuffer(agent.id)
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'RUNNING' },
  })
  appendLog(agent.id, `[${new Date().toISOString()}] Agent "${agent.name}" started`)
  return res.json(updated)
})

// ── Stop agent ────────────────────────────────────────────────────────────────
app.post('/agents/:id/stop', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'STOPPED') return res.status(409).json({ error: 'Already stopped' })

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'STOPPED' },
  })
  appendLog(agent.id, `[${new Date().toISOString()}] Agent "${agent.name}" stopped`)
  return res.json(updated)
})

// ── SSE log stream ────────────────────────────────────────────────────────────
app.get('/agents/:id/logs', (req, res) => {
  const { id } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send buffered lines first
  for (const line of getBuffer(id)) {
    res.write(`data: ${JSON.stringify(line)}\n\n`)
  }

  const handler = (line: string) => {
    res.write(`data: ${JSON.stringify(line)}\n\n`)
  }

  onLog(id, handler)
  req.on('close', () => offLog(id, handler))
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[runner] Listening on http://localhost:${PORT}`)
  startPoller()
})
