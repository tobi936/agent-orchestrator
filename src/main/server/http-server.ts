import express from 'express'
import { createAuthRouter } from './auth-router.js'
import { createCredentialsRouter } from './credentials-router.js'
import { createAgentsRouter, setManagers } from './agents-router.js'
import { createDockerRouter, setDockerManager } from './docker-router.js'
import { createMessagesRouter, setMessageRouter } from './messages-router.js'
import { requireAuth } from './middleware.js'
import type { DockerManager } from '../docker-manager.js'
import type { MessageRouter } from '../message-router.js'
import type { Server } from 'node:http'

export function wireManagers(docker: DockerManager, router: MessageRouter): void {
  setManagers(docker, router)
  setDockerManager(docker)
  setMessageRouter(router)
}

export function createApp(): express.Express {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET env var is required and must be at least 32 characters')
  }
  if (!process.env.CREDENTIALS_SECRET || process.env.CREDENTIALS_SECRET.length < 32) {
    throw new Error('CREDENTIALS_SECRET env var is required and must be at least 32 characters')
  }

  const app = express()
  app.use(express.json())

  // Public auth routes (must come before requireAuth middleware)
  app.use('/api/auth', createAuthRouter())
  app.use('/api/auth/credentials', createCredentialsRouter())

  // Protected API routes
  app.use('/api/agents', createAgentsRouter())
  app.use('/api/docker', createDockerRouter())
  app.use('/api/messages', createMessagesRouter())

  // Catch-all auth guard for any future /api routes
  app.use('/api', requireAuth)

  return app
}

export function startHttpServer(port: number): Promise<Server> {
  const app = createApp()
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server))
    server.once('error', reject)
  })
}
