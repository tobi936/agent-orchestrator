import express, { type Request, type Response } from 'express'
import { createServer } from 'node:http'
import { join } from 'node:path'
import {
  createAgent,
  deleteAgent,
  getAgent,
  listAgents,
  listMessages,
  updateAgent,
} from '../main/agent-store.js'
import { hasClaudeAuth } from '../main/auth-sync.js'
import { DockerManager } from '../main/docker-manager.js'
import * as logBuffer from '../main/log-buffer.js'
import { MessageRouter } from '../main/message-router.js'
import { ensureRoot } from '../main/paths.js'
import type { Agent, LogLine, NewAgentInput, SendMessageInput } from '../shared/types.js'

const PORT = Number(process.env.PORT ?? 3000)

const app = express()
app.use(express.json())

// Serve built frontend
const staticDir = join(process.cwd(), 'web-dist')
app.use(express.static(staticDir))

// ── SSE broadcast ─────────────────────────────────────────────
const sseClients = new Set<Response>()

function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients) {
    try {
      client.write(payload)
    } catch {
      sseClients.delete(client)
    }
  }
}

// ── Backend services ──────────────────────────────────────────
ensureRoot()
const docker = new DockerManager()
const router = new MessageRouter()

docker.on('log', (line: LogLine) => {
  logBuffer.append(line)
  broadcast('agent:log', line)
})

docker.on('status', (payload: { agentId: string; status: Agent['status'] }) => {
  void updateAgent(payload.agentId, { status: payload.status }).then((updated) => {
    if (updated) broadcast('agent:status', updated)
  })
})

router.on('message', (msg) => broadcast('message:delivered', msg))
router.on('routing-error', (err) => broadcast('message:error', err))

void router.start()

// ── SSE endpoint ──────────────────────────────────────────────
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write(':\n\n') // keep-alive comment
  sseClients.add(res)
  req.on('close', () => sseClients.delete(res))
})

// ── Auth ──────────────────────────────────────────────────────
app.get('/api/auth/status', (_req, res) => {
  res.json(hasClaudeAuth())
})

// ── Docker ────────────────────────────────────────────────────
app.get('/api/docker/status', async (_req, res) => {
  try {
    res.json({ reachable: await docker.ping(), imageReady: await docker.ensureImage() })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// ── Agents ────────────────────────────────────────────────────
app.get('/api/agents', async (_req, res) => {
  res.json(await listAgents())
})

app.post('/api/agents', async (req, res) => {
  try {
    res.json(await createAgent(req.body as NewAgentInput))
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

app.get('/api/agents/:id', async (req, res) => {
  const agent = await getAgent(req.params.id)
  if (!agent) { res.status(404).json({ error: 'Not found' }); return }
  res.json(agent)
})

app.get('/api/agents/:id/logs', (req, res) => {
  res.json(logBuffer.history(req.params.id))
})

app.post('/api/agents/:id/start', async (req, res) => {
  const { id } = req.params
  const agent = await getAgent(id)
  if (!agent) { res.status(404).json({ error: 'Not found' }); return }

  await updateAgent(id, { status: 'starting', lastError: undefined })

  const emitLog = (text: string) => {
    const line: LogLine = { agentId: id, stream: 'system', ts: new Date().toISOString(), text }
    logBuffer.append(line)
    broadcast('agent:log', line)
  }

  try {
    await docker.ensureDockerRunning(emitLog)
    if (!(await docker.ensureImage())) {
      await docker.buildAgentImage(emitLog)
    }
    const containerId = await docker.startAgent(agent.id, agent.name, agent.systemPrompt, agent.model)
    router.watchAgent(agent.id)
    res.json(await updateAgent(id, { containerId, status: 'running' }))
  } catch (err) {
    await updateAgent(id, { status: 'error', lastError: String(err) })
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/agents/:id/stop', async (req, res) => {
  const { id } = req.params
  const agent = await getAgent(id)
  if (!agent?.containerId) { res.json(null); return }
  await updateAgent(id, { status: 'stopping' })
  await docker.stopAgent(agent.containerId)
  await router.unwatchAgent(id)
  res.json(await updateAgent(id, { status: 'stopped' }))
})

app.delete('/api/agents/:id', async (req, res) => {
  const { id } = req.params
  const agent = await getAgent(id)
  if (agent?.containerId) {
    try { await docker.removeAgent(agent.containerId) } catch { /* already gone */ }
  }
  await router.unwatchAgent(id)
  logBuffer.clear(id)
  await deleteAgent(id)
  res.json({ ok: true })
})

// ── Messages ──────────────────────────────────────────────────
app.get('/api/messages', async (req, res) => {
  const agentId = req.query.agentId as string | undefined
  res.json(await listMessages(agentId))
})

app.post('/api/messages', async (req, res) => {
  try {
    res.json(await router.sendMessage(req.body as SendMessageInput))
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// Fallback: serve frontend for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(join(staticDir, 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────
const server = createServer(app)
server.listen(PORT, () => {
  console.log(`Agent Orchestrator web server → http://localhost:${PORT}`)
})

process.on('SIGTERM', async () => {
  await router.stop()
  server.close()
})
