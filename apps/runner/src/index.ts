import express from 'express'
import cors from 'cors'
import { spawn, ChildProcess } from 'child_process'
import { prisma } from './db'
import { startPoller } from './poller'
import { appendLog, clearBuffer, getBuffer, onLog, offLog } from './logs'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Track live processes by agent id
const processes = new Map<string, ChildProcess>()

// ── Start agent ───────────────────────────────────────────────────────────────
app.post('/agents/:id/start', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'RUNNING') return res.status(409).json({ error: 'Already running' })

  clearBuffer(agent.id)

  if (agent.command) {
    // Parse command string into executable + args, respecting quoted segments
    const parts = splitCommand(agent.command)
    if (parts.length === 0) return res.status(400).json({ error: 'Invalid command' })

    const [exe, ...args] = parts
    const child = spawn(exe, args, { shell: false })

    processes.set(agent.id, child)

    const ts = () => new Date().toISOString()
    appendLog(agent.id, `[${ts()}] Spawning: ${agent.command}`)

    child.stdout.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        appendLog(agent.id, line)
      }
    })
    child.stderr.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        appendLog(agent.id, `[stderr] ${line}`)
      }
    })
    child.on('error', (err) => {
      appendLog(agent.id, `[${ts()}] ERROR: ${err.message}`)
      processes.delete(agent.id)
      prisma.agent.update({ where: { id: agent.id }, data: { status: 'STOPPED' } }).catch(() => {})
    })
    child.on('close', (code) => {
      appendLog(agent.id, `[${ts()}] Process exited with code ${code}`)
      processes.delete(agent.id)
      prisma.agent.update({ where: { id: agent.id }, data: { status: 'STOPPED' } }).catch(() => {})
    })
  } else {
    appendLog(agent.id, `[${new Date().toISOString()}] Agent "${agent.name}" started (AI mode)`)
  }

  const updated = await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'RUNNING' },
  })
  return res.json(updated)
})

// ── Stop agent ────────────────────────────────────────────────────────────────
app.post('/agents/:id/stop', async (req, res) => {
  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
  if (!agent) return res.status(404).json({ error: 'Not found' })
  if (agent.status === 'STOPPED') return res.status(409).json({ error: 'Already stopped' })

  const child = processes.get(agent.id)
  if (child) {
    child.kill('SIGTERM')
    processes.delete(agent.id)
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

// Split a command string into tokens, respecting double-quoted segments
function splitCommand(cmd: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ' ' && !inQuotes) {
      if (current) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
  }
  if (current) tokens.push(current)
  return tokens
}
