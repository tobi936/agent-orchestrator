import express from 'express'
import { createServer } from 'node:http'
import { join } from 'node:path'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'

import { createAuthRouter } from '../main/server/auth-router.js'
import { createCredentialsRouter } from '../main/server/credentials-router.js'
import { createAgentsRouter, setManagers } from '../main/server/agents-router.js'
import { createDockerRouter, setDockerManager } from '../main/server/docker-router.js'
import { createMessagesRouter, setMessageRouter } from '../main/server/messages-router.js'
import type { AuthPayload } from '../main/server/middleware.js'
import { DockerManager } from '../main/docker-manager.js'
import { MessageRouter } from '../main/message-router.js'
import * as logBuffer from '../main/log-buffer.js'
import { updateAgent } from '../main/agent-store.js'
import { ensureRoot } from '../main/paths.js'
import type { Agent, AgentMessage, LogLine } from '../shared/types.js'

const PORT = Number(process.env.PORT ?? 3000)

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var is required and must be at least 32 characters')
}
if (!process.env.CREDENTIALS_SECRET || process.env.CREDENTIALS_SECRET.length < 32) {
  throw new Error('CREDENTIALS_SECRET env var is required and must be at least 32 characters')
}

// ── SSE per-user broadcast ────────────────────────────────────
const sseClients = new Map<string, Set<Response>>()

function broadcast(userId: string, event: string, data: unknown): void {
  const clients = sseClients.get(userId)
  if (!clients?.size) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}

// ── Backend services ──────────────────────────────────────────
ensureRoot()
const docker = new DockerManager()
const msgRouter = new MessageRouter()

docker.on('log', ({ userId, line }: { userId: string; line: LogLine }) => {
  logBuffer.append(userId, line)
  broadcast(userId, 'agent:log', line)
})

docker.on('status', ({ userId, agentId, status }: { userId: string; agentId: string; status: Agent['status'] }) => {
  void updateAgent(userId, agentId, { status }).then((updated) => {
    if (updated) broadcast(userId, 'agent:status', updated)
  })
})

msgRouter.on('message', ({ userId, message }: { userId: string; message: AgentMessage }) => {
  broadcast(userId, 'message:delivered', message)
})

msgRouter.on('routing-error', ({ userId, ...err }: { userId: string; fromId: string; filePath: string; reason: string }) => {
  broadcast(userId, 'message:error', err)
})

void msgRouter.start()

setManagers(docker, msgRouter)
setDockerManager(docker)
setMessageRouter(msgRouter)

// ── Express app ───────────────────────────────────────────────
const app = express()
app.use(express.json())

const staticDir = join(process.cwd(), 'web-dist')
app.use(express.static(staticDir))

// Public auth routes
app.use('/api/auth', createAuthRouter())

// Credentials (own requireAuth inside each handler)
app.use('/api/auth/credentials', createCredentialsRouter())

// Protected routes
app.use('/api/agents', createAgentsRouter())
app.use('/api/docker', createDockerRouter())
app.use('/api/messages', createMessagesRouter())

// SSE – authenticated via ?token= query param (EventSource can't set headers)
app.get('/api/events', (req, res) => {
  const token = req.query.token as string | undefined
  if (!token) { res.status(401).end(); return }
  let userId: string
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    userId = payload.sub
  } catch {
    res.status(401).end()
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write(':\n\n')

  if (!sseClients.has(userId)) sseClients.set(userId, new Set())
  sseClients.get(userId)!.add(res)
  req.on('close', () => sseClients.get(userId)?.delete(res))
})

// SPA fallback
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(staticDir, 'index.html'))
})

// ── Start ─────────────────────────────────────────────────────
const server = createServer(app)
server.listen(PORT, () => {
  console.log(`Agent Orchestrator → http://localhost:${PORT}`)
})

process.on('SIGTERM', async () => {
  await msgRouter.stop()
  server.close()
})
