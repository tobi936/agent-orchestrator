import express from 'express'
import cors from 'cors'
import { Sandbox } from 'e2b'
import { prisma } from './db'
import { startPoller } from './poller'
import { appendLog, clearBuffer, getBuffer, onLog, offLog } from './logs'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Track live sandboxes by agent id
const sandboxes = new Map<string, Sandbox>()

// ── Start agent ───────────────────────────────────────────────────────────────
app.post('/agents/:id/start', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'RUNNING') return res.status(409).json({ error: 'Already running' })

  clearBuffer(agent.id)

  const ts = () => new Date().toISOString()

  if (agent.command) {
    let sandbox: Sandbox
    try {
      appendLog(agent.id, `[${ts()}] Creating E2B sandbox…`)
      sandbox = await Sandbox.create({ timeoutMs: 3_600_000 }) // max 1h
      sandboxes.set(agent.id, sandbox)

      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: 'RUNNING', containerId: sandbox.sandboxId },
      })

      appendLog(agent.id, `[${ts()}] Sandbox ${sandbox.sandboxId} ready — running: ${agent.command}`)

      // Fire-and-forget: run command and stream output
      sandbox.commands.run(agent.command, {
        timeoutMs: 3_600_000,
        onStdout: (data) => appendLog(agent.id, data.line),
        onStderr: (data) => appendLog(agent.id, `[stderr] ${data.line}`),
      }).then((result) => {
        appendLog(agent.id, `[${ts()}] Process exited (code ${result.exitCode})`)
        sandboxes.delete(agent.id)
        prisma.agent.update({ where: { id: agent.id }, data: { status: 'STOPPED' } }).catch(() => {})
      }).catch((err: Error) => {
        appendLog(agent.id, `[${ts()}] ERROR: ${err.message}`)
        sandboxes.delete(agent.id)
        prisma.agent.update({ where: { id: agent.id }, data: { status: 'STOPPED' } }).catch(() => {})
      })

      return res.json(await prisma.agent.findUnique({ where: { id: agent.id } }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(agent.id, `[${ts()}] Failed to create sandbox: ${msg}`)
      return res.status(500).json({ error: msg })
    }
  }

  // AI-provider mode (no command)
  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'RUNNING' },
  })
  appendLog(agent.id, `[${ts()}] Agent "${agent.name}" started (AI mode)`)
  return res.json(updated)
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[runner] Listening on http://localhost:${PORT}`)
  startPoller()
})
