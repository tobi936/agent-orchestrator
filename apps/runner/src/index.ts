import express from 'express'
import cors from 'cors'
import { prisma } from './db'
import { startPoller } from './poller'
import { appendLog, getBuffer, onLog, offLog, clearBuffer } from './logs'
import { sandboxes } from './sandboxes'
import { startAgent } from './start'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// ── Start agent ───────────────────────────────────────────────────────────────
app.post('/agents/:id/start', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'RUNNING') return res.status(409).json({ error: 'Already running' })

  const result = await startAgent(req.params.id)
  if (!result.ok) return res.status(500).json({ error: result.error })
  return res.json(await prisma.agent.findUnique({ where: { id: req.params.id } }))
})

// ── Stop agent ────────────────────────────────────────────────────────────────
app.post('/agents/:id/stop', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'STOPPED') return res.status(409).json({ error: 'Already stopped' })

  const sandbox = sandboxes.get(agent.id)
  if (sandbox) {
    sandbox.kill().catch(() => {})
    sandboxes.delete(agent.id)
  }

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

  for (const line of getBuffer(id)) {
    res.write(`data: ${JSON.stringify(line)}\n\n`)
  }

  const handler = (line: string) => res.write(`data: ${JSON.stringify(line)}\n\n`)
  onLog(id, handler)
  req.on('close', () => offLog(id, handler))
})

// ── Metrics ───────────────────────────────────────────────────────────────────
app.get('/agents/:id/metrics', async (req, res) => {
  const { id } = req.params
  const agent = await prisma.agent.findUnique({ where: { id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })

  const [pending, inProgress, done] = await Promise.all([
    prisma.task.count({ where: { agentId: id, status: 'PENDING' } }),
    prisma.task.count({ where: { agentId: id, status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { agentId: id, status: 'DONE' } }),
  ])

  const recentLogs = getBuffer(id).slice(-5)

  let sandboxMetrics: { cpu?: number; mem?: number } | null = null
  const sandbox = sandboxes.get(id)
  if (sandbox) {
    try {
      const m = await (sandbox as { getMetrics?: () => Promise<{ cpuPct: number; memUsedMiB: number }[]> }).getMetrics?.()
      if (m && m.length > 0) sandboxMetrics = { cpu: m[0].cpuPct, mem: m[0].memUsedMiB }
    } catch { /* telemetry not available */ }
  }

  return res.json({ pending, inProgress, done, recentLogs, sandboxMetrics })
})

// ── Restart agent ─────────────────────────────────────────────────────────────
app.post('/agents/:id/restart', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })

  const sandbox = sandboxes.get(agent.id)
  if (sandbox) {
    sandbox.kill().catch(() => {})
    sandboxes.delete(agent.id)
  }
  await prisma.agent.update({ where: { id: agent.id }, data: { status: 'STOPPED' } })
  appendLog(agent.id, `[${new Date().toISOString()}] Agent "${agent.name}" restarting…`)
  clearBuffer(agent.id)

  const result = await startAgent(req.params.id)
  if (!result.ok) return res.status(500).json({ error: result.error })
  return res.json(await prisma.agent.findUnique({ where: { id: req.params.id } }))
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[runner] Listening on http://localhost:${PORT}`)
  startPoller()
})
