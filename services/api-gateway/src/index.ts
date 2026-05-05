import express from 'express'
import { createServer } from 'node:http'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'

import { createAuthRouter } from './routes/auth.js'
import { requireAuth } from './middleware/auth.js'
import type { AuthPayload } from './middleware/auth.js'

const PORT = Number(process.env.PORT ?? 3000)
const AGENT_MANAGER_URL = process.env.AGENT_MANAGER_URL ?? 'http://agent-manager:3001'
const MESSAGE_SERVICE_URL = process.env.MESSAGE_SERVICE_URL ?? 'http://message-service:3002'

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET env var required (min 32 chars)')
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL env var required')
}

// ── SSE broadcast (per user) ──────────────────────────────────
const sseClients = new Map<string, Set<Response>>()

export function broadcast(userId: string, event: string, data: unknown): void {
  const clients = sseClients.get(userId)
  if (!clients?.size) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try { client.write(payload) } catch { clients.delete(client) }
  }
}

// ── App ───────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }))
app.use(express.json({ limit: '20mb' }))

// Inject userId header before proxying so downstream services trust it
function injectUserHeader(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  requireAuth(req, _res, () => {
    req.headers['x-user-id'] = req.userId
    req.headers['x-user-email'] = req.userEmail
    next()
  })
}

// Auth routes (handled locally — need DB access for login/register)
app.use('/api/auth', createAuthRouter())

// Proxy: agent-manager
app.use(
  '/api/agents',
  injectUserHeader,
  createProxyMiddleware({
    target: AGENT_MANAGER_URL,
    changeOrigin: true,
    on: {
      error: (_err, _req, res) => {
        (res as Response).status(502).json({ error: 'Agent Manager unavailable' })
      },
    },
  }),
)

// Proxy: message-service
app.use(
  '/api/messages',
  injectUserHeader,
  createProxyMiddleware({
    target: MESSAGE_SERVICE_URL,
    changeOrigin: true,
    on: {
      error: (_err, _req, res) => {
        (res as Response).status(502).json({ error: 'Message Service unavailable' })
      },
    },
  }),
)

// SSE — clients connect here, services push events via internal webhook
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
  res.write(':\n\n') // keep-alive comment

  if (!sseClients.has(userId)) sseClients.set(userId, new Set())
  sseClients.get(userId)!.add(res)
  req.on('close', () => sseClients.get(userId)?.delete(res))
})

// Internal webhook — downstream services push events to broadcast
app.post('/internal/broadcast', (req, res) => {
  const secret = req.headers['x-internal-secret']
  if (secret !== process.env.INTERNAL_SECRET) { res.status(403).end(); return }
  const { userId, event, data } = req.body as { userId: string; event: string; data: unknown }
  broadcast(userId, event, data)
  res.json({ ok: true })
})

// Serve React frontend in production
const __dirname = dirname(fileURLToPath(import.meta.url))
const staticDir = join(__dirname, '../../frontend/dist')
app.use(express.static(staticDir))
app.get('/{*path}', (_req, res) => res.sendFile(join(staticDir, 'index.html')))

// ── Start ─────────────────────────────────────────────────────
const server = createServer(app)
server.listen(PORT, () => console.log(`API Gateway → http://localhost:${PORT}`))

process.on('SIGTERM', () => server.close())
